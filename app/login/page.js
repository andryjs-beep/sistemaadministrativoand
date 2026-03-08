"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulación de login Senior (en .env se configura JWT_SECRET)
        // Por simplicidad en este MVP, validamos contra el API o localmente
        if (username === 'admin' && password === 'admin') {
            localStorage.setItem('user', JSON.stringify({ username, role: 'admin' }));
            router.push('/dashboard');
        } else {
            alert('Credenciales incorrectas. (Recuerda ejecutar /api/setup si es la primera vez)');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans p-6">
            {/* Fondo Decorativo */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
            </div>

            <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl p-12 rounded-[48px] border border-white/10 shadow-2xl relative z-10">
                <div className="text-center mb-12">
                    <div className="inline-block p-4 bg-blue-600 rounded-3xl shadow-2xl shadow-blue-500/40 mb-6">
                        <span className="text-4xl">🔐</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight uppercase">Sistema <span className="text-blue-500">Admi</span></h1>
                    <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2">Acceso Administrativo v2.0</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Usuario</label>
                        <input
                            type="text" required
                            className="w-full p-5 rounded-3xl bg-white/5 border border-white/10 text-white focus:border-blue-500 outline-none transition-all font-bold"
                            placeholder="nombre de usuario"
                            value={username} onChange={e => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-4">Contraseña</label>
                        <input
                            type="password" required
                            className="w-full p-5 rounded-3xl bg-white/5 border border-white/10 text-white focus:border-blue-500 outline-none transition-all font-bold"
                            placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full py-6 bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-1 transition-all active:scale-95 disabled:bg-gray-800"
                    >
                        {loading ? 'AUTENTICANDO...' : 'ENTRAR AL SISTEMA ⚡'}
                    </button>
                </form>

                <p className="text-center mt-8 text-gray-600 text-[10px] font-bold uppercase tracking-widest">
                    Desarrollado con Lógica Senior v3.0
                </p>
            </div>
        </div>
    );
}
