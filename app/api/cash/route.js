import dbConnect from '@/lib/db';
import { CashSession } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET active session or history for a specific user
export async function GET(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const history = searchParams.get('history') === 'true';

        if (!userId) {
            return NextResponse.json({ error: 'UserId requerido' }, { status: 400 });
        }

        if (history) {
            const sessions = await CashSession.find({ openedBy: userId, status: 'closed' }).sort({ closedAt: -1 }).limit(50);
            return NextResponse.json(sessions);
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
        const { userId, openingBalance, notes, openingDetails } = body;

        if (!userId) {
            return NextResponse.json({ error: 'UserId requerido' }, { status: 400 });
        }

        const existing = await CashSession.findOne({ status: 'open', openedBy: userId });
        if (existing) {
            return NextResponse.json({ error: 'Ya tienes una caja abierta.' }, { status: 400 });
        }

        const sessionId = `CAJA-${Date.now()}`;

        const session = await CashSession.create({
            sessionId,
            openedBy: userId,
            openingBalance: parseFloat(openingBalance) || 0,
            openingDetails: {
                usdCash: parseFloat(openingDetails?.usdCash) || 0,
                bsCash: parseFloat(openingDetails?.bsCash) || 0,
                bsTransfer: parseFloat(openingDetails?.bsTransfer) || 0
            },
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
        const { id, userId, closingBalance, notes, closingDetails } = body;

        const session = await CashSession.findOne({ _id: id, openedBy: userId });
        if (!session) {
            return NextResponse.json({ error: 'Sesión no encontrada o no pertenece al usuario' }, { status: 404 });
        }

        session.status = 'closed';
        session.closedAt = new Date();
        session.closingBalance = parseFloat(closingBalance) || 0;
        session.closingDetails = {
            usdCash: parseFloat(closingDetails?.usdCash) || 0,
            bsCash: parseFloat(closingDetails?.bsCash) || 0,
            bsTransfer: parseFloat(closingDetails?.bsTransfer) || 0
        };
        session.notes = notes;
        await session.save();

        return NextResponse.json(session);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
