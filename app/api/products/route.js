import dbConnect from '@/lib/db';
import { Product } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const products = await Product.find({}).populate('warehouseId', 'name');
        return NextResponse.json(products);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        // Cast numbers to avoid string validation errors
        const productData = {
            ...body,
            priceUsd: parseFloat(body.priceUsd) || 0,
            stock: parseInt(body.stock) || 0,
            minStock: parseInt(body.minStock) || 5,
        };
        if (!productData.warehouseId) delete productData.warehouseId;
        const newProduct = await Product.create(productData);
        return NextResponse.json(newProduct, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { id, _id, ...updateData } = body;
        const productId = id || _id;
        const data = {
            ...updateData,
            priceUsd: parseFloat(updateData.priceUsd) || 0,
            stock: parseInt(updateData.stock) || 0,
            minStock: parseInt(updateData.minStock) || 5,
        };
        if (!data.warehouseId) delete data.warehouseId;
        const updated = await Product.findByIdAndUpdate(productId, data, { new: true });
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
        await Product.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Producto eliminado' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
