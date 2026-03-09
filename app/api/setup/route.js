import dbConnect from '@/lib/db';
import { User, PaymentMethod } from '@/lib/models';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const userCount = await User.countDocuments();
        let setupResults = { adminCreated: false, adminUpdated: false, paymentMethodsCreated: false };

        const salt = await bcrypt.genSalt(10);
        const hashedAdminPassword = await bcrypt.hash('admin', salt);

        // 1. Crear Admin si no existe
        if (userCount === 0) {
            await User.create({
                username: 'admin',
                password: hashedAdminPassword,
                role: 'admin',
                permissions: {
                    canEditInventory: true,
                    canCreateSales: true,
                    canViewReports: true
                }
            });
            setupResults.adminCreated = true;
        } else {
            // Actualizar admin si existe pero está en texto plano
            const admin = await User.findOne({ username: 'admin' });
            if (admin && admin.password === 'admin') {
                admin.password = hashedAdminPassword;
                await admin.save();
                setupResults.adminUpdated = true;
            }
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
