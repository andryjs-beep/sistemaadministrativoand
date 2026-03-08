"use client";

import { useState, useEffect } from 'react';

export default function ClientesPage() {
    const [customers, setCustomers] = useState([]);
    const [search, setSearch] = useState('');
    const [form, setForm] = useState({ idNumber: '', name: '', phone: '', email: '', address: '', city: '', municipality: '' });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        const res = await fetch('/api/customers');
        const data = await res.json();
        setCustomers(data);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = isEditing ? 'PUT' : 'POST';
        const body = isEditing ? { id: isEditing, ...form } : form;

        const res = await fetch('/api/customers', {
            method,
            body: JSON.stringify(body)
        });

        if (res.ok) {
            setForm({ idNumber: '', name: '', phone: '', email: '', address: '', city: '', municipality: '' });
            setIsEditing(false);
            fetchCustomers();
            alert('Operación exitosa');
        } else {
            const err = await res.json();
            alert(`Error: ${err.error}`);
        }
    };

    const filtered = customers.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.idNumber.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-6xl mx-auto flex gap-12">
                {/* Formulario */}
                <div className="flex-1 bg-white p-8 rounded-3xl shadow-xl border border-gray-100 h-fit sticky top-8">
                    <h2 className="text-2xl font-black mb-8 uppercase text-indigo-900">Registro de Cliente</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            placeholder="Cédula o RIF (V12345678)" required
                            className="w-full p-4 rounded-xl border-2 border-gray-50 focus:border-indigo-500 outline-none transition bg-gray-50"
                            value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })}
                        />
                        <input
                            placeholder="Nombre Completo" required
                            className="w-full p-4 rounded-xl border-2 border-gray-50 focus:border-indigo-500 outline-none transition bg-gray-50"
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                placeholder="Teléfono"
                                className="w-full p-4 rounded-xl border-2 border-gray-50 focus:border-indigo-500 outline-none transition bg-gray-50"
                                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                            />
                            <input
                                placeholder="Correo (Opcional)"
                                className="w-full p-4 rounded-xl border-2 border-gray-50 focus:border-indigo-500 outline-none transition bg-gray-50"
                                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                        <input
                            placeholder="Dirección"
                            className="w-full p-4 rounded-xl border-2 border-gray-50 focus:border-indigo-500 outline-none transition bg-gray-50"
                            value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <input
                                placeholder="Ciudad"
                                className="w-full p-4 rounded-xl border-2 border-gray-50 focus:border-indigo-500 outline-none transition bg-gray-50"
                                value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                            />
                            <input
                                placeholder="Municipio"
                                className="w-full p-4 rounded-xl border-2 border-gray-50 focus:border-indigo-500 outline-none transition bg-gray-50"
                                value={form.municipality} onChange={e => setForm({ ...form, municipality: e.target.value })}
                            />
                        </div>
                        <button className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition transform active:scale-95 shadow-lg shadow-indigo-100">
                            {isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}
                        </button>
                        {isEditing && (
                            <button
                                type="button" onClick={() => { setIsEditing(false); setForm({ idNumber: '', name: '', phone: '', email: '', address: '', city: '', municipality: '' }); }}
                                className="w-full py-2 text-indigo-400 font-bold hover:text-indigo-600"
                            >
                                Cancelar Edición
                            </button>
                        )}
                    </form>
                </div>

                {/* Lista */}
                <div className="flex-[2]">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-2xl font-black uppercase text-gray-400">Directorio de Clientes</h2>
                        <input
                            type="text" placeholder="Buscar por nombre o ID..."
                            className="px-6 py-3 rounded-full border-2 border-gray-200 focus:border-indigo-500 outline-none w-64 shadow-sm"
                            value={search} onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4">
                        {filtered.map(c => (
                            <div key={c._id} className="bg-white p-6 rounded-2xl border border-gray-100 flex justify-between items-center group hover:shadow-xl transition shadow-sm">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-black">
                                            {c.name.charAt(0)}
                                        </span>
                                        <div>
                                            <h3 className="font-bold text-gray-800 uppercase">{c.name}</h3>
                                            <p className="text-xs font-mono text-gray-400">ID: {c.idNumber}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex gap-4 text-xs text-gray-500 font-medium overflow-hidden whitespace-nowrap text-ellipsis">
                                        <span>📱 {c.phone || 'N/A'}</span>
                                        <span>📍 {c.city}, {c.municipality}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 invisible group-hover:visible transition-all">
                                    <button
                                        onClick={() => { setForm(c); setIsEditing(c._id); }}
                                        className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition"
                                    >
                                        ✏️
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="text-center py-20 bg-gray-100 rounded-3xl border-2 border-dashed border-gray-300">
                                <p className="text-gray-400 font-bold uppercase tracking-widest">No hay clientes registrados</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
