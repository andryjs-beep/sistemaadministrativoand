import dbConnect from '@/lib/db';
import { ExchangeRate } from '@/lib/models';
import { getBcvRates } from '@/lib/bcv';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET: Obtiene las tasas actuales (intenta scrapear y si no, usa la DB)
export async function GET() {
    await dbConnect();
    try {
        const scraped = await getBcvRates();

        // Buscamos las últimas tasas guardadas para cada tipo
        const lastUsd = await ExchangeRate.findOne({ type: 'USD' }).sort({ createdAt: -1 });
        const lastEur = await ExchangeRate.findOne({ type: 'EUR' }).sort({ createdAt: -1 });

        // Si scrapeamos con éxito, guardamos si hay cambio (Dólar)
        if (scraped.usd && (!lastUsd || Math.abs(lastUsd.value - scraped.usd) > 0.001)) {
            await ExchangeRate.create({ type: 'USD', value: scraped.usd, source: 'BCV' });
        }

        // Si scrapeamos con éxito, guardamos si hay cambio (Euro)
        if (scraped.eur && (!lastEur || Math.abs(lastEur.value - scraped.eur) > 0.001)) {
            await ExchangeRate.create({ type: 'EUR', value: scraped.eur, source: 'BCV' });
        }

        // Obtener los registros finales (ya sean nuevos o los que estaban)
        const finalUsd = await ExchangeRate.findOne({ type: 'USD' }).sort({ createdAt: -1 });
        const finalEur = await ExchangeRate.findOne({ type: 'EUR' }).sort({ createdAt: -1 });

        return NextResponse.json({
            usd: finalUsd || { value: 36.5, type: 'USD' },
            eur: finalEur || { value: 39.8, type: 'EUR' },
            // Mantenemos compatible con el frontend viejo si solo pide .value (asumimos USD por defecto o el que pida)
            value: finalEur?.value || finalUsd?.value || 36.5
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST/PUT: Permite al usuario editar la tasa manual
export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { type, value } = body; // type: 'USD' o 'EUR'

        if (!type || !value) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });

        const newRate = await ExchangeRate.create({
            type: type.toUpperCase(),
            value: parseFloat(value),
            source: 'Manual',
            date: new Date()
        });

        return NextResponse.json(newRate);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
