import dbConnect from '@/lib/db';
import { InternalExchange, CashSession } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { sessionId, userId, fromCurrency, toCurrency, fromAmount, toAmount, notes } = body;

        if (!sessionId || !userId || !fromAmount || !toAmount) {
            return NextResponse.json({ error: 'Datos incompletos para el intercambio' }, { status: 400 });
        }

        const session = await CashSession.findById(sessionId);
        if (!session || session.status !== 'open') {
            return NextResponse.json({ error: 'Caja no encontrada o ya está cerrada' }, { status: 400 });
        }

        const exchangeRate = parseFloat(fromAmount) / parseFloat(toAmount);

        const exchange = await InternalExchange.create({
            sessionId,
            userId,
            fromCurrency,
            toCurrency,
            fromAmount: parseFloat(fromAmount),
            toAmount: parseFloat(toAmount),
            rate: exchangeRate,
            notes: notes || 'Intercambio interno de divisas'
        });

        return NextResponse.json(exchange, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function GET(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return NextResponse.json({ error: 'SessionId requerido' }, { status: 400 });
        }

        const exchanges = await InternalExchange.find({ sessionId }).sort({ date: -1 });
        return NextResponse.json(exchanges);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const reason = searchParams.get('reason');

        if (!id || !reason) {
            return NextResponse.json({ error: 'ID y motivo son requeridos' }, { status: 400 });
        }

        const exchange = await InternalExchange.findById(id);
        if (!exchange) {
            return NextResponse.json({ error: 'Intercambio no encontrado' }, { status: 404 });
        }

        if (exchange.status === 'cancelled') {
            return NextResponse.json({ error: 'El intercambio ya está cancelado' }, { status: 400 });
        }

        exchange.status = 'cancelled';
        exchange.cancellationReason = reason;
        exchange.cancelledAt = new Date();
        await exchange.save();

        return NextResponse.json({ message: 'Intercambio cancelado exitosamente' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
