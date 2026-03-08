import dbConnect from '@/lib/db';
import { User, PaymentMethod } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const userCount = await User.countDocuments();
        let setupResults = { adminCreated: false, paymentMethodsCreated: false };

        // 1. Crear Admin si no existe
        if (userCount === 0) {
            await User.create({
                username: 'admin',
                password: 'admin', // En producción se recomienda cambiar esto inmediatamente
                role: 'admin',
                permissions: {
                    canEditInventory: true,
                    canCreateSales: true,
                    canViewReports: true
                }
            });
            setupResults.adminCreated = true;
        }

        // 2. Crear Métodos de Pago básicos para Venezuela
        const methodCount = await PaymentMethod.countDocuments();
        if (methodCount === 0) {
            const defaultMethods = [
                { name: 'Dólares Efectivo', active: true },
                { name: 'Pago Móvil', active: true },
                { name: 'Zelle', active: true },
                { name: 'Transferencia BS', active: true },
                { name: 'Punto de Venta', active: true }
            ];
            await PaymentMethod.insertMany(defaultMethods);
            setupResults.paymentMethodsCreated = true;
        }

        return NextResponse.json({
            status: 'success',
            message: 'Initial setup completed',
            details: setupResults
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
