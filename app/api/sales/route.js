import dbConnect from '@/lib/db';
import { Sale, Product, CashSession, ExchangeRate } from '@/lib/models';
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

        // 3. Procesar items y actualizar stock
        let totalUsd = 0;
        let totalBs = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) throw new Error(`Producto no encontrado: ${item.productId}`);
            if (product.stock < item.quantity) throw new Error(`Stock insuficiente para: ${product.name}`);

            let unitPrice = product.priceUsd;
            let isWholesale = false;
            if (product.wholesalePriceUsd > 0 && item.quantity >= (product.minWholesaleQty || 6)) {
                unitPrice = product.wholesalePriceUsd;
                isWholesale = true;
            }

            const discountValue = parseFloat(item.discountValue) || 0;
            if (discountValue > 0) {
                unitPrice = Math.max(0, unitPrice - discountValue);
            }

            const itemSubtotalUsd = unitPrice * item.quantity;
            const itemSubtotalBs = itemSubtotalUsd * bcvRate;
            const itemProfit = itemSubtotalUsd - ((product.costUsd || 0) * item.quantity);

            processedItems.push({
                productId: product._id,
                quantity: item.quantity,
                priceUsd: unitPrice,
                priceBs: unitPrice * bcvRate,
                costUsd: product.costUsd || 0,
                subtotalUsd: itemSubtotalUsd,
                subtotalBs: itemSubtotalBs,
                wholesaleApplied: isWholesale,
                discountValue: discountValue,
                profitUsd: itemProfit
            });

            totalUsd += itemSubtotalUsd;
            totalBs += itemSubtotalBs;

            product.stock -= item.quantity;
            await product.save();
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
        const saleId = `VEN-${Date.now()}`;
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

        // 7. Actualizar totales de la sesión de caja SOLAMENTE CON LO PAGADO REALMENTE
        activeSession.totalSalesUsd += totalPaidUsd;
        activeSession.totalSalesBs += totalPaidBs;
        activeSession.salesCount += 1;
        await activeSession.save();

        return NextResponse.json(newSale, { status: 201 });
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
