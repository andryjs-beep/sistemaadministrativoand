import dbConnect from '@/lib/db';
import { Quotation, ExchangeRate, Product } from '@/lib/models';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        const quotations = await Quotation.find({}).populate('items.productId').sort({ createdAt: -1 });
        return NextResponse.json(quotations);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { items } = body;

        const latestRate = await ExchangeRate.findOne().sort({ createdAt: -1 });
        const bcvRate = latestRate ? latestRate.value : 36.5;
        const PERCENTAGE_EXTRA = 0.15;

        let totalUsd = 0;
        let totalBs = 0;

        const quotationItems = [];

        for (const item of items) {
            const product = await Product.findById(item.productId);
            if (!product) throw new Error('Producto no encontrado');

            const priceUsd = product.priceUsd;
            const priceBs = priceUsd * (1 + PERCENTAGE_EXTRA) * bcvRate;

            const subtotalUsd = priceUsd * item.quantity;
            const subtotalBs = priceBs * item.quantity;

            totalUsd += subtotalUsd;
            totalBs += subtotalBs;

            quotationItems.push({
                productId: product._id,
                quantity: item.quantity,
                priceUsd,
                priceBs,
                subtotalUsd,
                subtotalBs
            });
        }

        const newQuotation = await Quotation.create({
            quotationId: `QUOTE-${Date.now()}`,
            items: quotationItems,
            totalUsd,
            totalBs,
            status: 'open'
        });

        return NextResponse.json(newQuotation, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
