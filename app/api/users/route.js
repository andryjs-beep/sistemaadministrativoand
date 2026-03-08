import dbConnect from '@/lib/db';
import User from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    await dbConnect();
    try {
        const users = await User.find({}, '-password');
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        // Nota: En producción, hashear la contraseña aquí antes de guardar
        const newUser = await User.create(body);
        const { password, ...userWithoutPassword } = newUser._doc;
        return NextResponse.json(userWithoutPassword, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function PUT(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { id, ...updateData } = body;
        const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
        return NextResponse.json(updatedUser);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

export async function DELETE(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        await User.findByIdAndDelete(id);
        return NextResponse.json({ message: 'Usuario eliminado' });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
