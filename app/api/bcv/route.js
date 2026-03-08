import dbConnect from '@/lib/db';
import { ExchangeRate } from '@/lib/models';
import { getBcvRate } from '@/lib/bcv';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const newValue = await getBcvRate();
        const lastRate = await ExchangeRate.findOne().sort({ createdAt: -1 });

        // Lógica Senior: Si no pudimos scrapear, devolvemos la última guardada o 36.5
        if (!newValue) {
            console.warn('Scraping returned null, using last database record.');
            return NextResponse.json(lastRate || { value: 36.50 });
        }

        // Solo guardamos si hay un cambio significativo o no hay registros para ahorrar DB Atlas
        let shouldSave = false;
        if (!lastRate || Math.abs(lastRate.value - newValue) > 0.001) {
            shouldSave = true;
        }

        if (shouldSave) {
            const newRate = await ExchangeRate.create({ value: newValue, date: new Date() });
            return NextResponse.json(newRate);
        }

        return NextResponse.json(lastRate);
    } catch (error) {
        const lastRate = await ExchangeRate.findOne().sort({ createdAt: -1 });
        return NextResponse.json(lastRate || { value: 36.5, error: error.message });
    }
}
