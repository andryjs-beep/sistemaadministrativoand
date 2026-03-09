import dbConnect from '@/lib/db';
import { User } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { username, password } = body;

        if (!username || !password) {
            return NextResponse.json({ error: 'Usuario y clave requeridos' }, { status: 400 });
        }

        // Buscar el usuario
        const user = await User.findOne({ username });

        if (!user) {
            return NextResponse.json({ error: 'Credenciales no válidas' }, { status: 401 });
        }

        // Validación simple de contraseña (texto plano según lo visto en setup y users API)
        // TODO: En el futuro implementar bcrypt para mayor seguridad
        if (user.password !== password) {
            return NextResponse.json({ error: 'Credenciales no válidas' }, { status: 401 });
        }

        // Login exitoso
        const { password: _, ...userWithoutPassword } = user._doc;

        return NextResponse.json({
            message: 'Login exitoso',
            user: userWithoutPassword
        });

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
