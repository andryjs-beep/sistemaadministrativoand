import dbConnect from '@/lib/db';
import { CashSession } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET active session
export async function GET() {
    await dbConnect();
    try {
        const session = await CashSession.findOne({ status: 'open' }).sort({ openedAt: -1 });
        return NextResponse.json(session || null);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST = Open a new session
export async function POST(req) {
    await dbConnect();
    try {
        // Check if there's already an open session
        const existing = await CashSession.findOne({ status: 'open' });
        if (existing) {
            return NextResponse.json({ error: 'Ya existe una caja abierta. Ciérrala antes de abrir una nueva.' }, { status: 400 });
        }

        const body = await req.json();
        const sessionId = `CAJA-${Date.now()}`;

        const session = await CashSession.create({
            sessionId,
            openingBalance: parseFloat(body.openingBalance) || 0,
            notes: body.notes || '',
            status: 'open',
        });

        return NextResponse.json(session, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

// PUT = Close session
export async function PUT(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { id, closingBalance, notes } = body;

        const session = await CashSession.findByIdAndUpdate(id, {
            status: 'closed',
            closedAt: new Date(),
            closingBalance: parseFloat(closingBalance) || 0,
            notes,
        }, { new: true });

        return NextResponse.json(session);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
