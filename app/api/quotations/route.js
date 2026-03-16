import dbConnect from '@/lib/db';
import { Quotation, ExchangeRate, Product } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

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
        const { items, customerId, userId } = body;

        const latestRate = await ExchangeRate.findOne({ type: 'EUR' }).sort({ date: -1 });
        const bcvRate = latestRate ? latestRate.value : 36.5;

        let totalUsd = 0;
        let totalBs = 0;

        const quotationItems = [];

        for (const item of items) {
            let productName = item.name;
            let productCode = item.code;
            let unitPriceUsd = item.priceUsd;

            // Si es un producto real, podemos verificarlo pero usamos los valores del POS
            if (!item.isVirtual) {
                const product = await Product.findById(item.productId);
                if (product) {
                    productName = product.name;
                    productCode = product.code;
                }
            }

            const discountValue = parseFloat(item.discountValue) || 0;
            const subtotalUsd = (unitPriceUsd * (item.quantity || 1)) - discountValue;
            const subtotalBs = subtotalUsd * bcvRate;

            totalUsd += Math.max(0, subtotalUsd);
            totalBs += Math.max(0, subtotalBs);

            quotationItems.push({
                productId: item.isVirtual ? null : item.productId,
                productName,
                productCode,
                quantity: item.quantity,
                priceUsd: unitPriceUsd,
                priceBs: unitPriceUsd * bcvRate,
                subtotalUsd,
                subtotalBs,
                discountValue
            });
        }

        const newQuotation = await Quotation.create({
            quotationId: `QUOTE-${Date.now()}`,
            items: quotationItems,
            totalUsd,
            totalBs,
            customerId: customerId || null,
            userId: userId || null,
            status: 'open',
            date: new Date()
        });

        const populatedQuote = await Quotation.findById(newQuotation._id)
            .populate('customerId', 'name idNumber')
            .populate('userId', 'username');

        return NextResponse.json(populatedQuote, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

