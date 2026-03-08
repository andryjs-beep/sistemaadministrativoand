import dbConnect from '@/lib/db';
import { Sale, Product, CashSession, ExchangeRate } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { items, paymentMethod, customerId, accountNumber } = body;

        // 1. Validar que la caja esté abierta
        const activeSession = await CashSession.findOne({ status: 'open' });
        if (!activeSession) {
            return NextResponse.json({ error: 'Debes abrir la caja antes de procesar ventas' }, { status: 400 });
        }

        // 2. Obtener tasa BCV (Prioridad Euro según usuario)
        const bcvEur = await ExchangeRate.findOne({ type: 'EUR' }).sort({ date: -1 });
        const bcvUsd = await ExchangeRate.findOne({ type: 'USD' }).sort({ date: -1 });
        const bcvRate = bcvEur?.value || bcvUsd?.value || 36.5;

        // 3. Procesar items y actualizar stock + calcular costos/ganancias
        let totalUsd = 0;
        let totalBs = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) throw new Error(`Producto no encontrado: ${item.productId}`);
            if (product.stock < item.quantity) throw new Error(`Stock insuficiente para: ${product.name}`);

            // Determinar precio (Detal vs Mayor)
            let unitPrice = product.priceUsd;
            let isWholesale = false;
            if (product.wholesalePriceUsd > 0 && item.quantity >= (product.minWholesaleQty || 6)) {
                unitPrice = product.wholesalePriceUsd;
                isWholesale = true;
            }

            // Aplicar descuento manual
            const discountPercent = parseFloat(item.discountPercent) || 0;
            if (discountPercent > 0) {
                unitPrice = unitPrice * (1 - (discountPercent / 100));
            }

            const itemSubtotalUsd = unitPrice * item.quantity;
            const itemSubtotalBs = itemSubtotalUsd * bcvRate;
            const itemCostTotal = (product.costUsd || 0) * item.quantity;
            const itemProfit = itemSubtotalUsd - itemCostTotal;

            processedItems.push({
                productId: product._id,
                quantity: item.quantity,
                priceUsd: unitPrice,
                priceBs: unitPrice * bcvRate,
                costUsd: product.costUsd || 0,
                subtotalUsd: itemSubtotalUsd,
                subtotalBs: itemSubtotalBs,
                wholesaleApplied: isWholesale,
                discountPercent: discountPercent,
                profitUsd: itemProfit
            });

            totalUsd += itemSubtotalUsd;
            totalBs += itemSubtotalBs;

            // Descontar stock
            product.stock -= item.quantity;
            await product.save();
        }

        // 4. Crear la venta
        const saleId = `VEN-${Date.now()}`;
        const newSale = await Sale.create({
            saleId,
            customerId: customerId || null,
            cashSessionId: activeSession._id,
            items: processedItems,
            totalUsd,
            totalBs,
            paymentMethod,
            accountNumber,
            date: new Date(),
        });

        // 5. Actualizar totales de la sesión de caja
        activeSession.totalSalesUsd += totalUsd;
        activeSession.totalSalesBs += totalBs;
        activeSession.salesCount += 1;
        await activeSession.save();

        return NextResponse.json(newSale, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
