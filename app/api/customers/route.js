import dbConnect from '@/lib/db';
import { Customer } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const customers = await Customer.find({}).sort({ name: 1 });
        return NextResponse.json(customers);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();

        // Validación de Senior: Evitar duplicados por Cédula/RIF
        const existing = await Customer.findOne({ idNumber: body.idNumber });
        if (existing) {
            return NextResponse.json({ error: 'Ya existe un cliente con este ID (Cédula/RIF)' }, { status: 400 });
        }

        const newCustomer = await Customer.create(body);
        return NextResponse.json(newCustomer, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { id, ...updateData } = body;
        const updated = await Customer.findByIdAndUpdate(id, updateData, { new: true });
        return NextResponse.json(updated);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        await Customer.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Cliente eliminado' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
