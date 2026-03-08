import dbConnect from '@/lib/db';
import { Expense, ExchangeRate, CashSession } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const sessionId = searchParams.get('sessionId');
        const query = sessionId ? { cashSessionId: sessionId } : {};
        const expenses = await Expense.find(query).populate('providerId', 'name rif').sort({ date: -1 });
        return NextResponse.json(expenses);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const amountUsd = parseFloat(body.amountUsd) || 0;

        // Prioridad: Tasa manual enviada desde el frontend > Tasa del sistema (BCV)
        let exchangeRate = parseFloat(body.exchangeRate);
        if (!exchangeRate || isNaN(exchangeRate)) {
            const rateRecord = await ExchangeRate.findOne({}).sort({ date: -1 });
            exchangeRate = rateRecord?.value || 1;
        }

        const amountBs = amountUsd * exchangeRate;

        const expense = await Expense.create({
            ...body,
            amountUsd,
            amountBs,
            exchangeRate,
        });

        // Update cash session totals
        if (body.cashSessionId) {
            await CashSession.findByIdAndUpdate(body.cashSessionId, {
                $inc: { totalExpensesUsd: amountUsd, totalExpensesBs: amountBs }
            });
        }

        return NextResponse.json(expense, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const expense = await Expense.findByIdAndDelete(id);
        // Reverting cash session totals
        if (expense && expense.cashSessionId) {
            await CashSession.findByIdAndUpdate(expense.cashSessionId, {
                $inc: { totalExpensesUsd: -expense.amountUsd, totalExpensesBs: -expense.amountBs }
            });
        }
        return NextResponse.json({ message: 'Egreso eliminado' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
