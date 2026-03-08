"use client";

import { useState, useEffect } from 'react';

const CATEGORIES = [
    { value: 'compra_insumos', label: '📦 Compra de Insumos' },
    { value: 'servicio', label: '🔧 Servicio / Mantenimiento' },
    { value: 'alquiler', label: '🏢 Alquiler / Arrendamiento' },
    { value: 'transporte', label: '🚚 Transporte / Fletes' },
    { value: 'nomina', label: '👷 Nómina / Personal' },
    { value: 'otro', label: '📋 Otro' },
];

export default function ProveedoresPage() {
    const [tab, setTab] = useState('gastos'); // gastos | proveedores
    const [providers, setProviders] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [cashSession, setCashSession] = useState(null);
    const [bcvRate, setBcvRate] = useState(null);
    const [provForm, setProvForm] = useState({ rif: '', name: '', phone: '', email: '', address: '', contact: '' });
    const [expForm, setExpForm] = useState({ providerId: '', description: '', category: 'compra_insumos', amountUsd: '', paymentMethod: 'Efectivo', receipt: '' });
    const [loading, setLoading] = useState(false);
    const [editProv, setEditProv] = useState(null);

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        const [pr, ex, cas, bcv] = await Promise.all([
            fetch('/api/providers').then(r => r.json()),
            fetch('/api/expenses').then(r => r.json()),
            fetch('/api/cash').then(r => r.json()),
            fetch('/api/bcv').then(r => r.json()),
        ]);
        setProviders(Array.isArray(pr) ? pr : []);
        setExpenses(Array.isArray(ex) ? ex : []);
        setCashSession(cas);
        setBcvRate(bcv?.value || 0);
    };

    const handleProvSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const method = editProv ? 'PUT' : 'POST';
            const body = editProv ? { id: editProv, ...provForm } : provForm;
            const res = await fetch('/api/providers', {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setProvForm({ rif: '', name: '', phone: '', email: '', address: '', contact: '' });
                setEditProv(null);
                fetchAll();
            } else { const err = await res.json(); alert(err.error); }
        } catch { alert('Error'); }
        setLoading(false);
    };

    const handleExpSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const body = {
                ...expForm,
                cashSessionId: cashSession?._id || null,
                providerName: providers.find(p => p._id === expForm.providerId)?.name || 'Sin proveedor',
            };
            const res = await fetch('/api/expenses', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setExpForm({ providerId: '', description: '', category: 'compra_insumos', amountUsd: '', paymentMethod: 'Efectivo', receipt: '' });
                fetchAll();
            } else { const err = await res.json(); alert(err.error); }
        } catch { alert('Error'); }
        setLoading(false);
    };

    const totalUsd = expenses.reduce((s, e) => s + (e.amountUsd || 0), 0);
    const totalBs = expenses.reduce((s, e) => s + (e.amountBs || 0), 0);

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full">
            <header className="mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Control Financiero</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Proveedores & <span className="text-orange-500">Egresos</span></h1>
            </header>

            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Egresos $</p>
                    <p className="text-2xl font-black text-red-600">${totalUsd.toFixed(2)}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Egresos Bs.</p>
                    <p className="text-2xl font-black text-orange-500">Bs. {totalBs.toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm col-span-2 md:col-span-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Tasa BCV</p>
                    <p className="text-2xl font-black text-slate-700">Bs. {bcvRate?.toFixed(2) || '—'}</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8">
                {[['gastos', '💸 Egresos'], ['proveedores', '🏢 Proveedores']].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition ${tab === key ? 'bg-orange-500 text-white shadow-lg' : 'bg-white text-gray-400 border border-gray-100 hover:border-orange-200'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'gastos' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-1">
                        <div className="bg-white p-6 rounded-[32px] shadow-xl border border-gray-100">
                            <h3 className="text-lg font-black text-slate-800 uppercase mb-5">Registrar Egreso</h3>
                            {!cashSession && (
                                <div className="mb-4 p-4 bg-amber-50 rounded-2xl">
                                    <p className="text-xs font-bold text-amber-700">⚠️ No hay caja abierta. El egreso se registrará sin sesión.</p>
                                </div>
                            )}
                            <form onSubmit={handleExpSubmit} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3">Proveedor (Opcional)</label>
                                    <select className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm"
                                        value={expForm.providerId} onChange={e => setExpForm({ ...expForm, providerId: e.target.value })}>
                                        <option value="">Sin proveedor</option>
                                        {providers.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3">Descripción</label>
                                    <input required placeholder="Compra de telas blancas..."
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm"
                                        value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3">Categoría</label>
                                    <select className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm"
                                        value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3">Monto USD</label>
                                        <input required type="number" step="0.01" placeholder="0.00"
                                            className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm"
                                            value={expForm.amountUsd} onChange={e => setExpForm({ ...expForm, amountUsd: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3">N° Factura</label>
                                        <input placeholder="001-0001"
                                            className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm"
                                            value={expForm.receipt} onChange={e => setExpForm({ ...expForm, receipt: e.target.value })} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3">Método de Pago</label>
                                    <select className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm"
                                        value={expForm.paymentMethod} onChange={e => setExpForm({ ...expForm, paymentMethod: e.target.value })}>
                                        {['Efectivo', 'Transferencia', 'Pago Móvil', 'Zelle', 'Otro'].map(m => <option key={m}>{m}</option>)}
                                    </select>
                                </div>
                                {expForm.amountUsd && bcvRate && (
                                    <div className="bg-orange-50 rounded-2xl p-4">
                                        <p className="text-xs font-black text-orange-600">≈ Bs. {(parseFloat(expForm.amountUsd) * bcvRate).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                    </div>
                                )}
                                <button disabled={loading}
                                    className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 transition active:scale-95 disabled:bg-gray-300">
                                    {loading ? 'GUARDANDO...' : 'REGISTRAR EGRESO 💸'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="xl:col-span-2 space-y-3">
                        {expenses.map(ex => (
                            <div key={ex._id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="w-11 h-11 bg-red-50 rounded-2xl flex items-center justify-center text-xl shrink-0">💸</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-800 text-sm">{ex.description}</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {ex.providerName && <span className="text-[9px] font-bold text-gray-400 uppercase">{ex.providerName}</span>}
                                            <span className="text-[9px] font-bold text-orange-400 uppercase">{CATEGORIES.find(c => c.value === ex.category)?.label || ex.category}</span>
                                            {ex.receipt && <span className="text-[9px] font-bold text-gray-300">Fac: {ex.receipt}</span>}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="font-black text-red-600 text-base">${(ex.amountUsd || 0).toFixed(2)}</p>
                                        <p className="text-[10px] font-bold text-gray-400">Bs. {(ex.amountBs || 0).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                                        <p className="text-[9px] text-gray-300">{new Date(ex.date).toLocaleDateString('es-VE')}</p>
                                    </div>
                                    <button onClick={async () => { if (confirm('¿Eliminar egreso?')) { await fetch(`/api/expenses?id=${ex._id}`, { method: 'DELETE' }); fetchAll(); } }}
                                        className="p-2 text-red-200 hover:text-red-500 transition shrink-0">🗑️</button>
                                </div>
                            </div>
                        ))}
                        {expenses.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-[40px] border border-gray-100 opacity-40">
                                <span className="text-7xl block mb-3">💸</span>
                                <p className="font-black uppercase text-xs tracking-widest">Sin egresos registrados</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {tab === 'proveedores' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-1">
                        <div className="bg-white p-6 rounded-[32px] shadow-xl border border-gray-100">
                            <h3 className="text-lg font-black text-slate-800 uppercase mb-5">{editProv ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
                            <form onSubmit={handleProvSubmit} className="space-y-4">
                                {[
                                    { label: 'RIF / Cédula', key: 'rif', placeholder: 'J-12345678-9', req: true },
                                    { label: 'Razón Social', key: 'name', placeholder: 'Distribuidora Ejemplo C.A.', req: true },
                                    { label: 'Teléfono', key: 'phone', placeholder: '0414-1234567' },
                                    { label: 'Email', key: 'email', placeholder: 'proveedor@email.com' },
                                    { label: 'Dirección', key: 'address', placeholder: 'Av. Principal...' },
                                    { label: 'Contacto', key: 'contact', placeholder: 'Nombre del representante' },
                                ].map(({ label, key, placeholder, req }) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-3">{label}</label>
                                        <input required={req} placeholder={placeholder}
                                            className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm"
                                            value={provForm[key]} onChange={e => setProvForm({ ...provForm, [key]: e.target.value })} />
                                    </div>
                                ))}
                                <button disabled={loading}
                                    className="w-full py-4 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-900 transition active:scale-95 disabled:bg-gray-300">
                                    {loading ? 'GUARDANDO...' : editProv ? 'ACTUALIZAR' : 'REGISTRAR PROVEEDOR 🏢'}
                                </button>
                                {editProv && <button type="button" onClick={() => { setEditProv(null); setProvForm({ rif: '', name: '', phone: '', email: '', address: '', contact: '' }); }}
                                    className="w-full py-2 text-gray-400 font-bold text-sm">Cancelar</button>}
                            </form>
                        </div>
                    </div>

                    <div className="xl:col-span-2 space-y-3">
                        {providers.map(p => (
                            <div key={p._id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-md transition-all">
                                <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-xl shrink-0">🏢</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-800">{p.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{p.rif}</p>
                                    <div className="flex flex-wrap gap-3 mt-1.5 text-[10px] text-gray-400">
                                        {p.phone && <span>📞 {p.phone}</span>}
                                        {p.email && <span>✉️ {p.email}</span>}
                                        {p.contact && <span>👤 {p.contact}</span>}
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button onClick={() => { setProvForm({ rif: p.rif, name: p.name, phone: p.phone || '', email: p.email || '', address: p.address || '', contact: p.contact || '' }); setEditProv(p._id); }}
                                        className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white transition">✏️</button>
                                    <button onClick={async () => { if (confirm('¿Eliminar?')) { await fetch(`/api/providers?id=${p._id}`, { method: 'DELETE' }); fetchAll(); } }}
                                        className="p-3 bg-red-50 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition">🗑️</button>
                                </div>
                            </div>
                        ))}
                        {providers.length === 0 && (
                            <div className="text-center py-20 bg-white rounded-[40px] border border-gray-100 opacity-40">
                                <span className="text-7xl block mb-3">🏢</span>
                                <p className="font-black uppercase text-xs tracking-widest">Sin proveedores registrados</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
