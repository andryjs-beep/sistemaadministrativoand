import dbConnect from '@/lib/db';
import { Sale, Product, ExchangeRate, Quotation } from '@/lib/models';
import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    await dbConnect();
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const body = await req.json();
        const { items, paymentMethod, accountNumber, quotationId, customerId } = body;

        // Senior Logic: Obtener la tasa más reciente o usar fallback robusto
        const latestRate = await ExchangeRate.findOne().sort({ createdAt: -1 });
        const bcvRate = latestRate ? latestRate.value : 36.5;
        const PERCENTAGE_EXTRA = 0.15; // Comisión por brecha cambiaria

        let totalUsd = 0;
        let totalBs = 0;

        const saleItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId).session(session);
            if (!product) throw new Error(`Producto ${item.productId} no encontrado`);
            if (product.stock < item.quantity) {
                throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`);
            }

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

            // Actualización atómica de stock
            product.stock -= item.quantity;
            await product.save({ session });
        }

        const saleId = `VEN-${Date.now()}`;
        const newSale = await Sale.create([{
            saleId,
            customerId: customerId || null,
            items: saleItems,
            totalUsd,
            totalBs,
            paymentMethod,
            accountNumber,
            quotationId,
            status: 'completed'
        }], { session });

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
        console.error('Sale Transaction Error:', error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    } finally {
        session.endSession();
    }
}

export async function GET() {
    await dbConnect();
    try {
        const sales = await Sale.find({})
            .populate('items.productId')
            .populate('customerId')
            .sort({ createdAt: -1 });
        return NextResponse.json(sales);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
