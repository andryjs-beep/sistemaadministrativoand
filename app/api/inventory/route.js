import dbConnect from '@/lib/db';
import { Product, InventoryLog } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { productId, quantity, type, reason, userId, username } = body;

        const qty = parseInt(quantity);
        if (!productId || isNaN(qty) || qty <= 0) {
            return NextResponse.json({ error: 'Producto y cantidad válida son requeridos' }, { status: 400 });
        }

        const product = await Product.findById(productId).populate('warehouseId');
        if (!product) return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });

        const adjustment = type === 'subtract' ? -qty : qty;
        product.stock = (product.stock || 0) + adjustment;
        if (product.stock < 0) product.stock = 0;
        await product.save();

        // Crear Log de Inventario
        await InventoryLog.create({
            productId: product._id,
            productName: product.name,
            productCode: product.code,
            quantity: qty,
            type: type, // 'add' or 'subtract'
            reason: reason || (type === 'add' ? 'Ingreso manual' : 'Egreso manual'),
            warehouseId: product.warehouseId?._id,
            warehouseName: product.warehouseId?.name || 'Bodega Principal',
            userId: userId,
            username: username || 'Sistema'
        });

        return NextResponse.json(product);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
