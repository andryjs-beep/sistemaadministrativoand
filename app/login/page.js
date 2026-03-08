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

        // Simulación de login (setup API prepara el admin original)
        if (username === 'admin' && password === 'admin') {
            localStorage.setItem('user', JSON.stringify({ username, role: 'admin' }));
            router.push('/dashboard');
        } else {
            alert('Credenciales no válidas. Consulte al administrador.');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950 font-sans p-4 md:p-8 overflow-hidden relative">
            {/* Fondo Ambientado */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/30 rounded-full blur-[150px]"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/30 rounded-full blur-[150px]"></div>
            </div>

            <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl p-8 md:p-12 rounded-[48px] border border-white/10 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-10 md:mb-12">
                    <div className="inline-block p-5 bg-blue-600 rounded-[32px] shadow-2xl shadow-blue-500/40 mb-8">
                        <span className="text-4xl md:text-5xl">🔐</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter uppercase italic leading-none">
                        SIS<span className="text-blue-500">.</span>ADMI
                    </h1>
                    <p className="text-gray-400 font-bold text-[10px] md:text-xs uppercase tracking-[0.3em] mt-3">Control de Operaciones</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 md:space-y-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-6">Identidad Especial</label>
                        <input
                            type="text" required
                            className="w-full p-5 rounded-3xl bg-white/10 border border-white/5 text-white focus:border-blue-500 focus:bg-white/20 outline-none transition-all font-bold text-sm md:text-base placeholder:text-gray-600"
                            placeholder="Escriba su usuario..."
                            value={username} onChange={e => setUsername(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-6">Código de Acceso</label>
                        <input
                            type="password" required
                            className="w-full p-5 rounded-3xl bg-white/10 border border-white/5 text-white focus:border-blue-500 focus:bg-white/20 outline-none transition-all font-bold text-sm md:text-base placeholder:text-gray-600"
                            placeholder="••••••••"
                            value={password} onChange={e => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        disabled={loading}
                        className="w-full py-5 md:py-6 bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-500/20 hover:bg-blue-500 hover:-translate-y-1 transition-all active:scale-95 disabled:bg-gray-800 disabled:shadow-none"
                    >
                        {loading ? 'AUTENTICANDO...' : 'INICIAR SESIÓN ⚡'}
                    </button>
                </form>

                <div className="text-center mt-10 md:mt-12 flex flex-col gap-2">
                    <p className="text-gray-600 text-[9px] md:text-[10px] font-bold uppercase tracking-widest">Lógica Senior v3.0 | 2024</p>
                    <div className="flex justify-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[8px] font-black text-emerald-500/50 uppercase tracking-[0.3em]">Servidor en Línea</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
