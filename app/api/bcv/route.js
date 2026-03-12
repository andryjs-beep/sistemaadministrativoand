import { NextResponse } from "next/server";
import { getTasasBCV } from "@/lib/bcv";

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const tasas = await getTasasBCV();

        // Buscar el último registro para obtener el porcentaje manual actual
        await dbConnect();
        const lastRate = await ExchangeRate.findOne({ type: 'USD' }).sort({ createdAt: -1 });
        const percentage = lastRate?.percentage || 0;

        return NextResponse.json(
            {
                ok: true,
                data: {
                    EUR: tasas.EUR,
                    USD: tasas.USD,
                    percentage: percentage, // Incluimos el porcentaje para el POS
                    source: tasas.source,
                    timestamp: tasas.lastFetch,
                },
                // Mantenemos compatibilidad con el frontend antiguo
                usd: { value: tasas.USD, percentage },
                eur: { value: tasas.EUR, percentage },
                value: tasas.EUR,
                percentage: percentage
            },
            { status: 200, headers: { "Cache-Control": "no-store" } }
        );
    } catch (err) {
        console.error("[API /bcv] Error:", err.message);
        return NextResponse.json(
            { ok: false, error: err.message },
            { status: 500 }
        );
    }
}

// Mantenemos el POST si el usuario quiere forzar cambios manuales (como estaba antes)
import dbConnect from '@/lib/db';
import { ExchangeRate } from '@/lib/models';

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { type, percentage } = body;
        let { value } = body;

        if (!type) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

        // Si no mandan valor (típico al guardar solo porcentaje), usamos la tasa actual del sistema
        if (value === undefined || value === null || isNaN(parseFloat(value))) {
            const currentTasas = await getTasasBCV();
            value = type.toUpperCase() === 'EUR' ? currentTasas.EUR : currentTasas.USD;
        }

        const newRate = await ExchangeRate.create({
            type: type.toUpperCase(),
            value: parseFloat(value),
            percentage: parseFloat(percentage || 0),
            source: 'Manual',
            date: new Date()
        });

        return NextResponse.json(newRate);
    } catch (error) {
        console.error("Error en POST /api/bcv:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
