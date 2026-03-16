import dbConnect from '@/lib/db';
import { Sale, Product, CashSession, ExchangeRate, InventoryLog, User, Warehouse } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit')) || 100;

        const sales = await Sale.find({})
            .populate('customerId', 'name idNumber')
            .populate('items.productId', 'name code')
            .sort({ date: -1 })
            .limit(limit);

        return NextResponse.json(sales);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { items, paymentMethod, customerId, accountNumber, userId, payments, isCredit } = body;

        if (!userId) {
            return NextResponse.json({ error: 'UserId requerido para procesar venta' }, { status: 400 });
        }

        // 1. Validar que la caja del usuario esté abierta
        const activeSession = await CashSession.findOne({ status: 'open', openedBy: userId });
        if (!activeSession) {
            return NextResponse.json({ error: 'Debes abrir tu caja antes de procesar ventas' }, { status: 400 });
        }

        // 2. Obtener tasa BCV
        const bcvEur = await ExchangeRate.findOne({ type: 'EUR' }).sort({ date: -1 });
        const bcvUsd = await ExchangeRate.findOne({ type: 'USD' }).sort({ date: -1 });
        const bcvRate = bcvEur?.value || bcvUsd?.value || 36.5;

        // 3. Generar ID de venta y preparar mapeo de bodegas
        const saleId = `VEN-${Date.now()}`;
        const warehouses = await Warehouse.find({});
        const whMap = {};
        warehouses.forEach(w => whMap[w._id.toString()] = w.name);

        // 4. Procesar items y actualizar stock
        let totalUsd = 0;
        let totalBs = 0;
        const processedItems = [];

        for (const item of items) {
            let productName = item.name;
            let productCode = item.code;
            let unitPrice = item.priceUsd;
            let costUsd = item.costUsd || 0;
            let isWholesale = false;
            let product = null;

            if (!item.isVirtual) {
                product = await Product.findById(item.productId);
                if (!product) throw new Error(`Producto no encontrado: ${item.productId}`);
                if (product.stock < item.quantity) throw new Error(`Stock insuficiente para: ${product.name}`);

                productName = product.name;
                productCode = product.code;
                unitPrice = product.priceUsd;
                costUsd = product.costUsd || 0;

                // Calc total cart quantity to apply wholesale (solo para productos reales)
                const totalCartQty = items.reduce((acc, currentItem) => acc + (currentItem.quantity || 1), 0);
                if (product.wholesalePriceUsd > 0 && totalCartQty >= 6) {
                    unitPrice = product.wholesalePriceUsd;
                    isWholesale = true;
                }
            }

            const discountValue = parseFloat(item.discountValue) || 0;
            let itemSubtotalUsd = (unitPrice * item.quantity) - discountValue;
            if (itemSubtotalUsd < 0) itemSubtotalUsd = 0;
            const itemSubtotalBs = itemSubtotalUsd * bcvRate;
            const itemProfit = itemSubtotalUsd - (costUsd * item.quantity);

            processedItems.push({
                productId: item.isVirtual ? null : item.productId,
                productName,
                productCode,
                quantity: item.quantity,
                priceUsd: unitPrice,
                priceBs: unitPrice * bcvRate,
                costUsd: costUsd,
                subtotalUsd: itemSubtotalUsd,
                subtotalBs: itemSubtotalBs,
                wholesaleApplied: isWholesale,
                discountValue: discountValue,
                profitUsd: itemProfit
            });

            totalUsd += itemSubtotalUsd;
            totalBs += itemSubtotalBs;

            if (product) {
                product.stock -= item.quantity;
                await product.save();

                // Log de Inventario para Venta
                const seller = await User.findById(userId);
                const warehouseName = product.warehouseId ? (whMap[product.warehouseId.toString()] || 'Bodega Principal') : 'Bodega Principal';

                await InventoryLog.create({
                    productId: product._id,
                    productName: product.name,
                    productCode: product.code,
                    quantity: item.quantity,
                    type: 'sale',
                    reason: `Venta ${saleId}`,
                    warehouseId: product.warehouseId,
                    warehouseName: warehouseName,
                    userId: userId,
                    username: seller?.username || 'Sistema'
                });
            }
        }

        // 4. Calcular pagos realizados (abono inicial)
        let totalPaidUsd = 0;
        let totalPaidBs = 0;
        const processedPayments = (payments || []).map(p => {
            totalPaidUsd += parseFloat(p.amountUsd) || 0;
            totalPaidBs += parseFloat(p.amountBs) || 0;
            return {
                ...p,
                date: new Date(),
                processedBy: userId
            };
        });

        // 5. Determinar estado de la venta
        let status = 'paid';
        if (isCredit) {
            if (totalPaidUsd <= 0) status = 'pending';
            else if (totalPaidUsd < totalUsd - 0.01) status = 'partial';
        }

        // 6. Crear la venta
        const newSale = await Sale.create({
            saleId,
            userId,
            customerId: customerId || null,
            cashSessionId: activeSession._id,
            items: processedItems,
            totalUsd,
            totalBs,
            totalPaidUsd,
            totalPaidBs,
            isCredit: !!isCredit,
            status,
            paymentMethod: paymentMethod || (payments?.length > 0 ? payments.map(p => p.method).join(' + ') : (isCredit ? 'Crédito' : 'Varios')),
            accountNumber,
            payments: processedPayments,
            date: new Date(),
        });

        // 7. Actualizar totales de la sesión de caja CON EL TOTAL DE LA VENTA (Inmediato para crédito)
        // Según lo pedido por el usuario: reconocer el ingreso de inmediato incluso en crédito
        activeSession.totalSalesUsd += totalUsd;
        activeSession.totalSalesBs += totalBs;
        activeSession.salesCount += 1;
        await activeSession.save();

        const populatedSale = await Sale.findById(newSale._id).populate('items.productId', 'name code');

        return NextResponse.json(populatedSale, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// NUEVA RUTA: Obtener ventas pendientes o a crédito
export async function PATCH(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { saleId, payment, userId } = body;

        const sale = await Sale.findById(saleId);
        if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

        // Validar sesión de caja para el abono
        const activeSession = await CashSession.findOne({ status: 'open', openedBy: userId });
        if (!activeSession) return NextResponse.json({ error: 'Caja cerrada' }, { status: 400 });

        // Registrar el nuevo pago
        const amtUsd = parseFloat(payment.amountUsd) || 0;
        const amtBs = parseFloat(payment.amountBs) || 0;

        sale.payments.push({
            ...payment,
            date: new Date(),
            processedBy: userId
        });

        sale.totalPaidUsd += amtUsd;
        sale.totalPaidBs += amtBs;

        // Actualizar status
        if (sale.totalPaidUsd >= sale.totalUsd - 0.01) {
            sale.status = 'paid';
        } else {
            sale.status = 'partial';
        }

        await sale.save();

        // Sumar a la caja
        activeSession.totalSalesUsd += amtUsd;
        activeSession.totalSalesBs += amtBs;
        await activeSession.save();

        return NextResponse.json(sale);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
