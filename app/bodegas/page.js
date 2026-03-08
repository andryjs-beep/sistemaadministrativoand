"use client";

import { useState, useEffect } from 'react';

export default function BodegasPage() {
    const [warehouses, setWarehouses] = useState([]);
    const [form, setForm] = useState({ name: '', description: '', location: '' });
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => { fetchWarehouses(); }, []);

    const fetchWarehouses = async () => {
        const res = await fetch('/api/warehouses');
        const data = await res.json();
        setWarehouses(Array.isArray(data) ? data : []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const method = editing ? 'PUT' : 'POST';
            const body = editing ? { id: editing, ...form } : form;
            const res = await fetch('/api/warehouses', {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setForm({ name: '', description: '', location: '' });
                setEditing(null);
                fetchWarehouses();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (err) { alert('Error de conexión'); }
        setLoading(false);
    };

    const deleteWarehouse = async (id) => {
        if (!confirm('¿Eliminar esta bodega?')) return;
        await fetch(`/api/warehouses?id=${id}`, { method: 'DELETE' });
        fetchWarehouses();
    };

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full">
            <header className="mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Logística</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Gestión de <span className="text-emerald-600">Bodegas</span></h1>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-1">
                    <div className="bg-white p-6 rounded-[32px] shadow-xl border border-gray-100">
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight mb-6">{editing ? 'Editar Bodega' : 'Nueva Bodega'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3">Nombre</label>
                                <input required placeholder="Bodega Franelas"
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3">Descripción</label>
                                <input placeholder="Almacén principal de camisetas..."
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                                    value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3">Ubicación</label>
                                <input placeholder="Planta baja, galpón 2..."
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm focus:ring-2 focus:ring-emerald-500"
                                    value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                            </div>
                            <button disabled={loading}
                                className="w-full py-4 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition active:scale-95 disabled:bg-gray-300">
                                {loading ? 'GUARDANDO...' : editing ? 'ACTUALIZAR' : 'CREAR BODEGA 🏭'}
                            </button>
                            {editing && <button type="button" onClick={() => { setEditing(null); setForm({ name: '', description: '', location: '' }); }}
                                className="w-full py-2 text-gray-400 font-bold hover:text-slate-700 text-sm">Cancelar</button>}
                        </form>
                    </div>
                </div>

                <div className="xl:col-span-2 space-y-3">
                    {warehouses.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-[40px] border border-gray-100 opacity-40">
                            <span className="text-7xl block mb-3">🏭</span>
                            <p className="font-black uppercase text-xs tracking-widest">Sin bodegas registradas</p>
                        </div>
                    )}
                    {warehouses.map(w => (
                        <div key={w._id} className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-xl transition-all">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl shrink-0">🏭</div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-800 uppercase">{w.name}</p>
                                {w.description && <p className="text-xs text-gray-400 font-medium mt-0.5">{w.description}</p>}
                                {w.location && <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">📍 {w.location}</p>}
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setForm({ name: w.name, description: w.description || '', location: w.location || '' }); setEditing(w._id); }}
                                    className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition">✏️</button>
                                <button onClick={() => deleteWarehouse(w._id)}
                                    className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition">🗑️</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
