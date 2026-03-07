"use client";

import { useState, useEffect } from 'react';

export default function UsuariosPage() {
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({ username: '', password: '', role: 'vendedor', permissions: { canEditInventory: false, canCreateSales: true, canViewReports: true } });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(data);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const res = await fetch('/api/users', {
            method: 'POST',
            body: JSON.stringify(form)
        });
        if (res.ok) {
            alert('Usuario creado');
            fetchUsers();
            setForm({ username: '', password: '', role: 'vendedor', permissions: { canEditInventory: false, canCreateSales: true, canViewReports: true } });
        }
    };

    const togglePermission = (id, perm) => {
        const user = users.find(u => u._id === id);
        const newPerms = { ...user.permissions, [perm]: !user.permissions[perm] };

        fetch('/api/users', {
            method: 'PUT',
            body: JSON.stringify({ id, permissions: newPerms })
        }).then(() => fetchUsers());
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8 flex flex-col items-center">
            <div className="max-w-4xl w-full">
                <h1 className="text-4xl font-black mb-12 bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-orange-500 uppercase tracking-tighter text-center">
                    Control de Accesos y Usuarios
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Nuevo Usuario */}
                    <div className="bg-gray-900 p-8 rounded-3xl border border-gray-800 shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 italic text-gray-400">Registrar Nuevo Personal</h2>
                        <form onSubmit={handleSave} className="space-y-4">
                            <input
                                placeholder="Nombre de Usuario"
                                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl focus:border-red-500 outline-none"
                                value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                            />
                            <input
                                placeholder="Password" type="password"
                                className="w-full p-4 bg-gray-800 border border-gray-700 rounded-xl focus:border-red-500 outline-none"
                                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                            />
                            <button className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase transition shadow-lg shadow-red-900/20">
                                Crear Usuario
                            </button>
                        </form>
                    </div>

                    {/* Lista de Usuarios */}
                    <div className="space-y-4">
                        {users.map(u => (
                            <div key={u._id} className="bg-gray-900 p-6 rounded-3xl border border-gray-800 flex flex-col gap-4">
                                <div className="flex justify-between items-center">
                                    <span className="font-black text-lg text-gray-200 uppercase">{u.username}</span>
                                    <span className="px-3 py-1 bg-gray-800 text-gray-500 rounded-full text-xs font-bold uppercase">{u.role}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => togglePermission(u._id, 'canEditInventory')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition ${u.permissions.canEditInventory ? 'bg-blue-600' : 'bg-gray-800 text-gray-600'}`}
                                    >
                                        📦 Stock
                                    </button>
                                    <button
                                        onClick={() => togglePermission(u._id, 'canCreateSales')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition ${u.permissions.canCreateSales ? 'bg-green-600' : 'bg-gray-800 text-gray-600'}`}
                                    >
                                        💰 Ventas
                                    </button>
                                    <button
                                        onClick={() => togglePermission(u._id, 'canViewReports')}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition ${u.permissions.canViewReports ? 'bg-purple-600' : 'bg-gray-800 text-gray-600'}`}
                                    >
                                        📊 Reportes
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
