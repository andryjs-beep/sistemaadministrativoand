import dbConnect from '@/lib/db';
import { User } from '@/lib/models';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    await dbConnect();
    try {
        const body = await req.json();
        const { username, password } = body;

        console.log(`[LOGIN ATTEMPT] User: ${username}`);

        if (!username || !password) {
            return NextResponse.json({ error: 'Usuario y clave requeridos' }, { status: 400 });
        }

        // Buscar el usuario
        const user = await User.findOne({ username });

        if (!user) {
            console.log(`[LOGIN FAILED] User not found: ${username}`);
            return NextResponse.json({ error: 'Credenciales no válidas' }, { status: 401 });
        }

        // Comparar contraseña hasheada
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            console.log(`[LOGIN FAILED] Password mismatch for: ${username}`);
            // Fallback temporal si la contraseña aún está en texto plano (para transición)
            if (user.password === password) {
                console.log(`[LOGIN RECOVERY] Plain text match found for: ${username}. Update recommended.`);
            } else {
                return NextResponse.json({ error: 'Credenciales no válidas' }, { status: 401 });
            }
        }

        console.log(`[LOGIN SUCCESS] User: ${username}`);

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
