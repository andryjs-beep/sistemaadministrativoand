"use client";

import { useState, useEffect } from 'react';

export default function EmpresaPage() {
    const [form, setForm] = useState({
        name: '', rif: '', address: '', phone: '', email: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCompany();
    }, []);

    const fetchCompany = async () => {
        try {
            const res = await fetch('/api/company');
            const data = await res.json();
            if (data && !data.error) {
                setForm({
                    name: data.name || '',
                    rif: data.rif || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    email: data.email || ''
                });
            }
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/company', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert('✅ Datos de empresa actualizados correctamente');
            } else {
                alert('Error al guardar');
            }
        } catch (e) {
            alert('Error de conexión');
        }
        setSaving(false);
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-full">
            <div className="animate-pulse text-gray-400 font-black uppercase tracking-widest text-sm">Cargando...</div>
        </div>
    );

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans text-slate-900">
            <header className="mb-8 md:mb-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Configuración</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">
                    Datos de la <span className="text-blue-600 italic">Empresa</span>
                </h1>
                <p className="text-xs text-gray-400 font-bold mt-2">Estos datos aparecerán en las facturas y tickets de venta.</p>
            </header>

            <div className="max-w-2xl">
                <div className="bg-white p-8 md:p-10 rounded-[32px] md:rounded-[40px] shadow-xl border border-gray-100">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg">🏢</div>
                        <div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Membrete de Factura</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Información visible en todos los tickets</p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="space-y-5">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Nombre / Razón Social</label>
                            <input
                                required
                                placeholder="Mi Negocio C.A."
                                className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">RIF</label>
                                <input
                                    placeholder="J-12345678-9"
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                    value={form.rif}
                                    onChange={e => setForm({ ...form, rif: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Teléfono</label>
                                <input
                                    placeholder="0412-000-0000"
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Dirección</label>
                            <input
                                placeholder="Calle Principal, Local 1, Ciudad"
                                className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                value={form.address}
                                onChange={e => setForm({ ...form, address: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Correo Electrónico</label>
                            <input
                                type="email"
                                placeholder="contacto@minegocio.com"
                                className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 transition"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                disabled={saving}
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition transform active:scale-95 shadow-xl shadow-blue-100 text-xs tracking-widest uppercase"
                            >
                                {saving ? '⏳ GUARDANDO...' : '💾 GUARDAR DATOS DE EMPRESA'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Preview del Membrete */}
                <div className="mt-8 bg-white p-6 rounded-[32px] shadow-sm border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Vista Previa del Membrete</p>
                    <div className="border border-dashed border-gray-200 p-6 rounded-2xl text-center font-mono text-sm">
                        <p className="font-bold text-lg">{form.name || 'NOMBRE DE LA EMPRESA'}</p>
                        <p>{form.rif || 'RIF: ---'}</p>
                        {form.address && <p>{form.address}</p>}
                        {form.phone && <p>Tlf: {form.phone}</p>}
                        {form.email && <p>{form.email}</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
