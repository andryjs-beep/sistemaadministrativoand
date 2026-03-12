import dbConnect from '@/lib/db';
import { Sale, Product, CashSession } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function DELETE(req, { params }) {
    await dbConnect();
    try {
        const { id } = params;
        const { userId } = await req.json();

        // 1. Validar permiso (Solo admin puede eliminar facturas)
        // Nota: En un entorno real, esto vendría de un token JWT o sesión de NextAuth
        // Por ahora usamos el userId enviado y validamos en DB
        const { User } = require('@/lib/models');
        const user = await User.findById(userId);
        if (!user || user.role !== 'admin') {
            return NextResponse.json({ error: 'Solo los administradores pueden eliminar facturas' }, { status: 403 });
        }

        const sale = await Sale.findById(id);
        if (!sale) return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 });

        // 2. Revertir Stock de los productos
        for (const item of sale.items) {
            await Product.updateOne(
                { _id: item.productId },
                { $inc: { stock: item.quantity } }
            );
        }

        // 3. Ajustar la sesión de caja si sigue abierta
        const session = await CashSession.findById(sale.cashSessionId);
        if (session && session.status === 'open') {
            session.totalSalesUsd -= (sale.totalUsd || 0);
            session.totalSalesBs -= (sale.totalBs || 0);
            session.salesCount = Math.max(0, session.salesCount - 1);
            await session.save();
        }

        // 4. Eliminar la venta
        await Sale.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Venta eliminada e inventario revertido con éxito' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
