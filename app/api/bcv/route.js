import dbConnect from '@/lib/db';
import { ExchangeRate } from '@/lib/models';
import { getBcvRate } from '@/lib/bcv';
import { NextResponse } from 'next/server';

export async function GET() {
    await dbConnect();
    try {
        // Obtener tasa actual desde el scraper
        const newValue = await getBcvRate();

        // Guardar en la base de datos
        const newRate = await ExchangeRate.create({
            value: newValue,
            date: new Date()
        });

        return NextResponse.json(newRate);
    } catch (error) {
        // Si falla el scraping, devolver la última guardada
        const lastRate = await ExchangeRate.findOne().sort({ createdAt: -1 });
        return NextResponse.json(lastRate || { value: 36.5, error: error.message });
    }
}
