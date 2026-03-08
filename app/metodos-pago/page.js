"use client";

import { useState, useEffect } from 'react';

export default function MetodosPagoPage() {
    const [methods, setMethods] = useState([]);
    const [form, setForm] = useState({ name: '', accountNumber: '', active: true });
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState(null);

    useEffect(() => {
        fetchMethods();
    }, []);

    const fetchMethods = async () => {
        const res = await fetch('/api/paymentMethods');
        const data = await res.json();
        setMethods(Array.isArray(data) ? data : []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const method = editing ? 'PUT' : 'POST';
            const body = editing ? { id: editing, ...form } : form;
            const res = await fetch('/api/paymentMethods', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setForm({ name: '', accountNumber: '', active: true });
                setEditing(null);
                fetchMethods();
                alert('Método de pago guardado');
            }
        } catch (error) {
            alert('Error al guardar');
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Desactivar este método de pago?')) return;
        await fetch(`/api/paymentMethods?id=${id}`, { method: 'DELETE' });
        fetchMethods();
    };

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans text-slate-900">
            <header className="mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Configuración</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Métodos de <span className="text-blue-600 italic">Pago</span></h1>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Formulario */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100">
                        <h3 className="text-xl font-black text-slate-800 uppercase mb-6 tracking-tighter">
                            {editing ? 'Editar Método' : 'Nuevo Método'}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Nombre del Método</label>
                                <input
                                    required
                                    placeholder="Ej: Zelle, Banesco, Pago Móvil"
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Detalle / N° de Cuenta</label>
                                <input
                                    placeholder="Ej: correo@ejemplo.com o 0102-..."
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                    value={form.accountNumber}
                                    onChange={e => setForm({ ...form, accountNumber: e.target.value })}
                                />
                            </div>
                            <button
                                disabled={loading}
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl hover:bg-blue-700 transition transform active:scale-95 shadow-xl shadow-blue-100 mt-4 text-[10px] tracking-widest uppercase"
                            >
                                {loading ? 'GUARDANDO...' : editing ? 'ACTUALIZAR' : 'REGISTRAR MÉTODO 💳'}
                            </button>
                            {editing && (
                                <button
                                    type="button"
                                    onClick={() => { setEditing(null); setForm({ name: '', accountNumber: '', active: true }); }}
                                    className="w-full py-2 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-800"
                                >
                                    Cancelar
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {/* Lista */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center mb-6 px-4">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Cuentas Registradas</h3>
                    </div>
                    {methods.map(m => (
                        <div key={m._id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex items-center gap-6 hover:shadow-xl transition-all group">
                            <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                💳
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-800 text-lg uppercase tracking-tight">{m.name}</p>
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">{m.accountNumber || 'SIN DETALLES'}</p>
                            </div>
                            <div className="flex gap-2 shrink-0 border-l border-gray-50 pl-6">
                                <button
                                    onClick={() => { setForm({ name: m.name, accountNumber: m.accountNumber || '', active: m.active }); setEditing(m._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className="p-4 bg-gray-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDelete(m._id)}
                                    className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                    {methods.length === 0 && (
                        <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-gray-100 opacity-40">
                            <span className="text-8xl block mb-6">💳</span>
                            <p className="font-black uppercase text-xs tracking-[0.4em]">Sin métodos de pago configurados</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
