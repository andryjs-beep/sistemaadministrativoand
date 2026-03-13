import dbConnect from '@/lib/db';
import { InventoryLog, Product } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    await dbConnect();
    try {
        const today = new Date();
        today.setDate(today.getDate() - 7); // Ver últimos 7 días
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // Buscar logs donde el nombre contenga "FRANELA" o "MICRO DURAZNO"
        const logs = await InventoryLog.find({
            date: { $gte: today, $lt: tomorrow },
            productName: { $regex: /FRANELA|MICRO\s*DURAZNO/i }
        }).populate('productId');

        const consumption = {};

        logs.forEach(log => {
            const wName = log.warehouseName || 'Sin Bodega';
            if (!consumption[wName]) {
                consumption[wName] = { units: 0, costUsd: 0 };
            }

            // Solo totalizamos salidas (ventas o egresos manuales)
            if (log.type === 'sale' || log.type === 'subtract') {
                consumption[wName].units += log.quantity;
                const unitCost = log.productId?.costUsd || 0;
                consumption[wName].costUsd += (unitCost * log.quantity);
            }
        });

        return NextResponse.json(consumption);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
