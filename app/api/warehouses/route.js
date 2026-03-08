import dbConnect from '@/lib/db';
import { Warehouse } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const warehouses = await Warehouse.find({}).sort({ name: 1 });
        return NextResponse.json(warehouses);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const warehouse = await Warehouse.create(body);
        return NextResponse.json(warehouse, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { id, ...data } = body;
        const updated = await Warehouse.findByIdAndUpdate(id, data, { new: true });
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
        await Warehouse.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Bodega eliminada' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
