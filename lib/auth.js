import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-this';

export async function authenticateUser(username, password) {
    // En una implementación real, buscarías en el modelo de Usuario
    // Para este ejemplo, esto se conectará con el API de login
    // Retornamos un token si las credenciales son válidas
}

export function createToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function getSession() {
    const token = cookies().get('session')?.value;
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

export function hasPermission(user, permission) {
    if (!user || !user.permissions) return false;
    if (user.role === 'admin') return true;
    return !!user.permissions[permission];
}
