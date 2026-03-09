import dbConnect from '@/lib/db';
import { CashSession } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET active session for a specific user
export async function GET(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ error: 'UserId requerido' }, { status: 400 });
        }

        const session = await CashSession.findOne({ status: 'open', openedBy: userId }).sort({ openedAt: -1 });
        return NextResponse.json(session || null);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST = Open a new session for a user
export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { userId, openingBalance, notes } = body;

        if (!userId) {
            return NextResponse.json({ error: 'UserId requerido' }, { status: 400 });
        }

        // Check if THIS user already has an open session
        const existing = await CashSession.findOne({ status: 'open', openedBy: userId });
        if (existing) {
            return NextResponse.json({ error: 'Ya tienes una caja abierta.' }, { status: 400 });
        }

        const sessionId = `CAJA-${Date.now()}`;

        const session = await CashSession.create({
            sessionId,
            openedBy: userId,
            openingBalance: parseFloat(openingBalance) || 0,
            notes: notes || '',
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
        const { id, userId, closingBalance, notes } = body;

        const session = await CashSession.findOne({ _id: id, openedBy: userId });
        if (!session) {
            return NextResponse.json({ error: 'Sesión no encontrada o no pertenece al usuario' }, { status: 404 });
        }

        session.status = 'closed';
        session.closedAt = new Date();
        session.closingBalance = parseFloat(closingBalance) || 0;
        session.notes = notes;
        await session.save();

        return NextResponse.json(session);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
