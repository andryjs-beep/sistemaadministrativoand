import dbConnect from '@/lib/db';
import { Product } from '@/lib/models';
import { getSession, hasPermission } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { productId, quantity, type, reason } = body;

        const qty = parseInt(quantity);
        if (!productId || isNaN(qty) || qty <= 0) {
            return NextResponse.json({ error: 'Producto y cantidad válida son requeridos' }, { status: 400 });
        }

        const product = await Product.findById(productId);
        if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

        const adjustment = type === 'subtract' ? -qty : qty;
        product.stock = (product.stock || 0) + adjustment;
        if (product.stock < 0) product.stock = 0;
        await product.save();

        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
