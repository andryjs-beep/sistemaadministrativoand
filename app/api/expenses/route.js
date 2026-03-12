import dbConnect from '@/lib/db';
import { Expense, ExchangeRate, CashSession, PaymentMethod } from '@/lib/models';
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

        // Fetch payment method to check currency
        const methodRecord = await PaymentMethod.findOne({ name: body.paymentMethod });
        const isBs = methodRecord?.currency?.toUpperCase().includes('BS');

        // Prioridad: Tasa manual enviada desde el frontend > Tasa del sistema (BCV)
        let exchangeRate = parseFloat(body.exchangeRate);
        if (!exchangeRate || isNaN(exchangeRate)) {
            const rateRecord = await ExchangeRate.findOne({}).sort({ date: -1 });
            exchangeRate = rateRecord?.value || 1;
        }

        // Si es pago en BS, calculamos el monto en BS. Si es USD, el monto BS es 0 para no duplicar en reportes.
        const amountBs = isBs ? (amountUsd * exchangeRate) : 0;

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

export async function PUT(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { id, ...updateData } = body;

        const oldExpense = await Expense.findById(id);
        if (!oldExpense) return NextResponse.json({ error: 'Egreso no encontrado' }, { status: 404 });

        const amountUsd = parseFloat(updateData.amountUsd) || 0;
        const exchangeRate = parseFloat(updateData.exchangeRate) || oldExpense.exchangeRate;

        // Fetch payment method to check currency
        const methodRecord = await PaymentMethod.findOne({ name: updateData.paymentMethod || oldExpense.paymentMethod });
        const isBs = methodRecord?.currency?.toUpperCase().includes('BS');

        // Respect explicitly sent amountBs but force it to 0 if method is USD
        let amountBs = parseFloat(updateData.amountBs);
        if (!isBs) {
            amountBs = 0;
        } else if (isNaN(amountBs) || amountBs === 0) {
            // Recalculate if it's BS but amount was missing
            amountBs = amountUsd * exchangeRate;
        }

        const updatedExpense = await Expense.findByIdAndUpdate(id, {
            ...updateData,
            amountUsd,
            amountBs,
            exchangeRate,
        }, { new: true });

        // Update cash session totals with the difference
        if (oldExpense.cashSessionId && updateData.cashSessionId) {
            const diffUsd = amountUsd - oldExpense.amountUsd;
            const diffBs = amountBs - oldExpense.amountBs;

            await CashSession.findByIdAndUpdate(updateData.cashSessionId, {
                $inc: { totalExpensesUsd: diffUsd, totalExpensesBs: diffBs }
            });
        }

        return NextResponse.json(updatedExpense, { status: 200 });
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
