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
        setCustomers(Array.isArray(data) ? data : []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = isEditing ? 'PUT' : 'POST';
        const body = isEditing ? { id: isEditing, ...form } : form;

        const res = await fetch('/api/customers', {
            method,
            headers: { 'Content-Type': 'application/json' },
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
        <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12">
                {/* Formulario */}
                <div className="w-full lg:flex-1 bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-xl border border-gray-100 h-fit lg:sticky lg:top-8">
                    <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-8 uppercase text-slate-800">Registro de Cliente</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            placeholder="Cédula o RIF (V12345678)" required
                            className="w-full p-4 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-900"
                            value={form.idNumber} onChange={e => setForm({ ...form, idNumber: e.target.value })}
                        />
                        <input
                            placeholder="Nombre Completo" required
                            className="w-full p-4 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-900"
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input
                                placeholder="Teléfono"
                                className="w-full p-4 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-900"
                                value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                            />
                            <input
                                placeholder="Correo (Opcional)"
                                className="w-full p-4 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-900"
                                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                        <input
                            placeholder="Dirección"
                            className="w-full p-4 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-900"
                            value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <input
                                placeholder="Ciudad"
                                className="w-full p-4 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-900"
                                value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                            />
                            <input
                                placeholder="Municipio"
                                className="w-full p-4 rounded-xl border-none bg-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-slate-900"
                                value={form.municipality} onChange={e => setForm({ ...form, municipality: e.target.value })}
                            />
                        </div>
                        <button className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition transform active:scale-95 shadow-xl shadow-blue-100">
                            {isEditing ? 'Actualizar Cliente' : 'Guardar Cliente'}
                        </button>
                        {isEditing && (
                            <button
                                type="button" onClick={() => { setIsEditing(false); setForm({ idNumber: '', name: '', phone: '', email: '', address: '', city: '', municipality: '' }); }}
                                className="w-full py-2 text-gray-400 font-bold hover:text-slate-800"
                            >
                                Cancelar Edición
                            </button>
                        )}
                    </form>
                </div>

                {/* Lista */}
                <div className="w-full lg:flex-[2]">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                        <h2 className="text-xl md:text-2xl font-black uppercase text-gray-400">Directorio de Clientes</h2>
                        <input
                            type="text" placeholder="Buscar cliente..."
                            className="w-full sm:w-64 px-6 py-3 rounded-full border-none bg-white shadow-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900"
                            value={search} onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
                        {filtered.map(c => (
                            <div key={c._id} className="bg-white p-6 rounded-[24px] border border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center group hover:shadow-xl transition shadow-sm gap-4">
                                <div className="flex-1 w-full">
                                    <div className="flex items-center gap-4">
                                        <span className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl shrink-0">
                                            {c.name.charAt(0)}
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="font-bold text-slate-800 uppercase truncate">{c.name}</h3>
                                            <p className="text-[10px] font-black text-gray-400 tracking-widest uppercase">ID: {c.idNumber}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-4 text-[10px] font-black uppercase text-gray-500 tracking-tighter sm:tracking-widest">
                                        <span>📱 {c.phone || 'N/A'}</span>
                                        <span>📍 {c.city}, {c.municipality}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto invisible lg:group-hover:visible transition-all">
                                    <button
                                        onClick={() => { setForm(c); setIsEditing(c._id); }}
                                        className="flex-1 sm:flex-none p-4 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition shadow-sm"
                                    >
                                        ✏️ EDITAR
                                    </button>
                                </div>
                            </div>
                        ))}
                        {filtered.length === 0 && (
                            <div className="text-center py-20 bg-gray-100 rounded-[32px] border-2 border-dashed border-gray-200">
                                <p className="text-gray-400 font-bold uppercase tracking-widest">No hay clientes encontrados</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
