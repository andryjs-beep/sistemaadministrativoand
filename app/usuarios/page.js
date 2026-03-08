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
            alert('Usuario creado');
        } else {
            const err = await res.json();
            alert(`Error: ${err.error}`);
        }
    };

    const deleteUser = async (id) => {
        if (!confirm('¿Eliminar usuario?')) return;
        const res = await fetch(`/api/users?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchUsers();
    };

    return (
        <div className="p-10 bg-gray-50 min-h-full font-sans">
            <header className="mb-10">
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Seguridad y Accesos</p>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de <span className="text-blue-600">Usuarios</span></h1>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-1">
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">Nuevo Operador</h3>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <input
                                placeholder="Usuario" required
                                className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                            />
                            <input
                                type="password" placeholder="Contraseña" required
                                className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                            />
                            <select
                                className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                            >
                                <option value="vendedor">Vendedor</option>
                                <option value="admin">Administrador</option>
                            </select>
                            <button className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 transition transform active:scale-95 uppercase tracking-widest">
                                Crear Cuenta 👤
                            </button>
                        </form>
                    </div>
                </div>

                <div className="xl:col-span-2">
                    <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="p-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuario</th>
                                    <th className="p-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Rol</th>
                                    <th className="p-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {users.map(u => (
                                    <tr key={u._id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <span className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl">🛡️</span>
                                                <p className="font-black text-slate-800 text-sm uppercase">{u.username}</p>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-600'}`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-6 text-center">
                                            {u.username !== 'admin' && (
                                                <button onClick={() => deleteUser(u._id)} className="p-3 text-red-300 hover:text-red-600 transition">🗑️</button>
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
