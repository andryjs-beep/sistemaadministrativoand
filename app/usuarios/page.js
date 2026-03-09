"use client";

import { useState, useEffect } from 'react';

export default function UsuariosPage() {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({ username: '', password: '', role: 'vendedor' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });

        if (res.ok) {
            setForm({ username: '', password: '', role: 'vendedor' });
            fetchUsers();
            alert('Operador registrado');
        } else {
            const err = await res.json();
            alert(`Error: ${err.error}`);
        }
    };

    const deleteUser = async (id) => {
        if (!confirm('¿Eliminar operador?')) return;
        const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchUsers();
    };

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans">
            <header className="mb-8 md:mb-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Accesos</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Gestión de <span className="text-blue-600">Usuarios</span></h1>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-10">
                <div className="xl:col-span-1">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-xl border border-gray-100">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6 md:mb-8">Nuevo Registro</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Nombre de Usuario</label>
                                <input
                                    placeholder="admin_venta" required
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm"
                                    value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Clave Provisional</label>
                                <input
                                    type="password" placeholder="••••••••" required
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm"
                                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Nivel de Acceso</label>
                                <select
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm appearance-none"
                                    value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                                >
                                    <option value="vendedor">Vendedor / Cajero</option>
                                    <option value="admin">Administrador General</option>
                                </select>
                            </div>
                            <button
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition transform active:scale-95 uppercase tracking-widest text-xs"
                            >
                                Crear Operador 👤
                            </button>
                        </form>
                    </div>
                </div>

                <div className="xl:col-span-2">
                    <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="p-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Operador</th>
                                    <th className="p-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Nivel</th>
                                    <th className="p-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">⚙️</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(u => (
                                    <tr key={u._id} className="hover:bg-blue-50/20 transition-colors">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg">🛡️</div>
                                                <p className="font-black text-slate-800 text-sm uppercase">{u.username}</p>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            {u.username !== 'admin' ? (
                                                <button type="button" onClick={() => deleteUser(u._id)} className="p-3 text-red-200 hover:text-red-500 transition">🗑️</button>
                                            ) : (
                                                <span className="text-[10px] font-black text-gray-300 uppercase">Fijo</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
