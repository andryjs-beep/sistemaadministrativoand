import dbConnect from '@/lib/db';
import { Sale, Product, ExchangeRate, Quotation } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const body = await req.json();
        const { items, paymentMethod, accountNumber, quotationId } = body;

        // Obtener tasa BCV más reciente
        const latestRate = await ExchangeRate.findOne().sort({ createdAt: -1 });
        const bcvRate = latestRate ? latestRate.value : 36.5;
        const PERCENTAGE_EXTRA = 0.15; // 15% extra como en los requisitos

        let totalUsd = 0;
        let totalBs = 0;

        const saleItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId).session(session);
            if (!product || product.stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${product?.name || 'producto'}`);
            }

            // Cálculo de precios
            const priceUsd = product.priceUsd;
            const priceBs = priceUsd * (1 + PERCENTAGE_EXTRA) * bcvRate;

            const subtotalUsd = priceUsd * item.quantity;
            const subtotalBs = priceBs * item.quantity;

            totalUsd += subtotalUsd;
            totalBs += subtotalBs;

            saleItems.push({
                productId: product._id,
                quantity: item.quantity,
                priceUsd,
                priceBs,
                subtotalUsd,
                subtotalBs
            });

            // Restar stock
            product.stock -= item.quantity;
            await product.save({ session });
        }

        const newSale = await Sale.create([{
            saleId: `SALE-${Date.now()}`,
            items: saleItems,
            totalUsd,
            totalBs,
            paymentMethod,
            accountNumber,
            quotationId,
            status: 'completed'
        }], { session });

        // Si viene de una cotización, marcarla como convertida
        if (quotationId) {
            await Quotation.findByIdAndUpdate(quotationId, {
                status: 'converted',
                convertedToSaleId: newSale[0]._id
            }, { session });
        }

        await session.commitTransaction();
        return NextResponse.json(newSale[0], { status: 201 });
    } catch (error) {
        await session.abortTransaction();
        return NextResponse.json({ error: error.message }, { status: 400 });
    } finally {
        session.endSession();
    }
}

export async function GET() {
    await dbConnect();
    try {
        const sales = await Sale.find({}).populate('items.productId').sort({ createdAt: -1 });
        return NextResponse.json(sales);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
