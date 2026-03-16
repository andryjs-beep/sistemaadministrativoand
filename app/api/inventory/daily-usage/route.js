import dbConnect from '@/lib/db';
import { InventoryLog, Product } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const dateParam = searchParams.get('date');

        // Venezuela is UTC-4. Para asegurar consistencia, calculamos el rango 
        // basándonos en la fecha solicitada o la actual.
        let targetDate;
        if (dateParam) {
            targetDate = new Date(dateParam + 'T12:00:00-04:00');
        } else {
            targetDate = new Date();
        }

        // Definir inicio y fin del día en hora local VET (UTC-4)
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        // Ajustar a UTC-4 si la zona horaria del servidor es distinta (ej. GMT/UTC)
        // Pero MongoDB guarda en UTC, así que necesitamos el rango que cubra el día VET

        // Forma robusta: Crear fechas específicas para el rango
        const y = targetDate.getFullYear();
        const m = targetDate.getMonth();
        const d = targetDate.getDate();

        // 00:00:00 VET del día solicitado
        const vetStart = new Date(Date.UTC(y, m, d, 4, 0, 0)); // 04:00 UTC = 00:00 VET
        // 23:59:59 VET del día solicitado
        const vetEnd = new Date(Date.UTC(y, m, d + 1, 3, 59, 59, 999)); // 03:59 UTC del día siguiente = 23:59 VET

        // Buscar logs en ese rango específico
        const logs = await InventoryLog.find({
            date: { $gte: vetStart, $lte: vetEnd },
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

        return NextResponse.json({
            consumption,
            dateRange: {
                start: vetStart.toISOString(),
                end: vetEnd.toISOString(),
                requested: dateParam || 'today'
            }
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

