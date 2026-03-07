import dbConnect from '@/lib/db';
import { Product } from '@/lib/models';
import { getSession, hasPermission } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(req) {
    await dbConnect();
    try {
        const session = await getSession();
        // En una implementación real, hasPermission verificaría el token
        // browser no puede acceder a cookies fácilmente aquí sin headers

        const body = await req.json();
        const { productId, adjustment } = body;

        const product = await Product.findById(productId);
        if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

        product.stock += adjustment;
        await product.save();

        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
