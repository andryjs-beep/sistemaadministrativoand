import dbConnect from '@/lib/db';
import { PaymentMethod } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const methods = await PaymentMethod.find({ active: true });
        return NextResponse.json(methods);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const newMethod = await PaymentMethod.create(body);
        return NextResponse.json(newMethod, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
