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
    const [bcvRate, setBcvRate] = useState(0);
    const [provForm, setProvForm] = useState({ rif: '', name: '', phone: '', email: '', address: '', contact: '' });
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [expForm, setExpForm] = useState({
        providerId: '',
        description: '',
        category: 'compra_insumos',
        amountUsd: '',
        amountBs: '',
        exchangeRate: '',
        paymentMethod: '',
        receipt: ''
    });
    const [loading, setLoading] = useState(false);
    const [editProv, setEditProv] = useState(null);
    const [editExp, setEditExp] = useState(null);
    const [filterDate, setFilterDate] = useState('');

    useEffect(() => {
        fetchAll();
    }, []);

    // Efecto para auto-calcular montos
    useEffect(() => {
        const isBs = isSelectedMethodBs();
        if (!isBs) {
            // If not BS, ensure amountBs is 0 to avoid discrepancies
            if (expForm.amountBs !== 0 && expForm.amountBs !== '0') {
                setExpForm(prev => ({ ...prev, amountBs: 0 }));
            }
            return;
        }

        if (expForm.activeField === 'usd' || expForm.activeField === 'rate') {
            const usd = parseFloat(expForm.amountUsd) || 0;
            const rate = parseFloat(expForm.exchangeRate) || bcvRate;
            if (rate) {
                setExpForm(prev => ({ ...prev, amountBs: (usd * rate).toFixed(2), activeField: null }));
            }
        } else if (expForm.activeField === 'bs') {
            const bs = parseFloat(expForm.amountBs) || 0;
            const rate = parseFloat(expForm.exchangeRate) || bcvRate;
            if (rate && rate > 0) {
                setExpForm(prev => ({ ...prev, amountUsd: (bs / rate).toFixed(2), activeField: null }));
            }
        }
    }, [expForm.amountUsd, expForm.amountBs, expForm.exchangeRate, expForm.paymentMethod, bcvRate]);

    const isSelectedMethodBs = () => {
        const method = paymentMethods.find(m => m.name === expForm.paymentMethod);
        return method?.currency?.toUpperCase().includes('BS') || false;
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const stored = JSON.parse(localStorage.getItem('user'));
            const userId = stored?._id;

            const [prRes, exRes, casRes, bcvRes, pmRes] = await Promise.allSettled([
                fetch('/api/providers'),
                fetch('/api/expenses'),
                fetch(userId ? `/api/cash?userId=${userId}` : '/api/cash'),
                fetch('/api/bcv'),
                fetch('/api/paymentMethods'),
            ]);

            const pr = prRes.status === 'fulfilled' ? await prRes.value.json() : [];
            const ex = exRes.status === 'fulfilled' ? await exRes.value.json() : [];
            const cas = casRes.status === 'fulfilled' ? await casRes.value.json() : null;
            const bcv = bcvRes.status === 'fulfilled' ? await bcvRes.value.json() : null;
            const pm = pmRes.status === 'fulfilled' ? await pmRes.value.json() : [];

            console.log('Fetch results:', { pr, ex, cas, bcv, pm });

            setProviders(Array.isArray(pr) ? pr : []);
            setExpenses(Array.isArray(ex) ? ex : []);
            setCashSession(cas);
            setPaymentMethods(Array.isArray(pm) ? pm : []);

            const rate = bcv?.value || 0;
            setBcvRate(rate);

            setExpForm(prev => ({
                ...prev,
                exchangeRate: rate.toString(),
                paymentMethod: prev.paymentMethod || pm?.[0]?.name || 'Efectivo'
            }));
        } catch (error) {
            console.error('Error in fetchAll:', error);
        } finally {
            setLoading(false);
        }
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
            const isBs = isSelectedMethodBs();
            const body = {
                ...(editExp && { id: editExp }),
                ...expForm,
                amountBs: isBs ? expForm.amountBs : 0, // If paid in USD, BS is 0
                providerId: expForm.providerId || null,
                cashSessionId: cashSession?._id || null,
                providerName: providers.find(p => p._id === expForm.providerId)?.name || 'Sin proveedor',
            };
            const method = editExp ? 'PUT' : 'POST';
            const res = await fetch('/api/expenses', {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setExpForm({
                    providerId: '',
                    description: '',
                    category: 'compra_insumos',
                    amountUsd: '',
                    amountBs: '',
                    exchangeRate: bcvRate.toString(),
                    paymentMethod: paymentMethods?.[0]?.name || 'Efectivo',
                    receipt: ''
                });
                setEditExp(null);
                fetchAll();
                alert(editExp ? 'Egreso actualizado correctamente' : 'Egreso registrado correctamente');
            } else { const err = await res.json(); alert(err.error); }
        } catch { alert('Error al guardar egreso'); }
        setLoading(false);
    };

    const filteredExpenses = filterDate
        ? expenses.filter(e => new Date(e.date).toISOString().startsWith(filterDate))
        : expenses;

    const totalUsd = filteredExpenses.reduce((s, e) => s + (e.amountUsd || 0), 0);
    const totalBs = filteredExpenses.reduce((s, e) => s + (e.amountBs || 0), 0);

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans text-slate-900">
            <header className="mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Pagos y Compras</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Proveedores & <span className="text-orange-500">Gastos</span></h1>
            </header>

            {/* Stats bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total acumulado $</p>
                    <p className="text-3xl font-black text-red-600 tracking-tighter">${totalUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total acumulado Bs.</p>
                    <p className="text-3xl font-black text-orange-500 tracking-tighter">Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl flex items-center justify-between group">
                    <div>
                        <p className="text-[8px] font-black text-white/40 uppercase tracking-widest mb-1">Tasa Referencial</p>
                        <p className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors">Bs. {bcvRate?.toFixed(2) || '—'}</p>
                    </div>
                    <span className="text-2xl opacity-50 group-hover:scale-110 group-hover:rotate-12 transition-transform">⚖️</span>
                </div>
            </div>

            {/* Breakdown by Method (Senior Logic Addition) */}
            {filteredExpenses.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {Object.entries(
                        filteredExpenses.reduce((acc, exp) => {
                            const method = exp.paymentMethod || 'Otro';
                            if (!acc[method]) acc[method] = { usd: 0, bs: 0, count: 0 };
                            acc[method].usd += exp.amountUsd || 0;
                            acc[method].bs += exp.amountBs || 0;
                            acc[method].count++;
                            return acc;
                        }, {})
                    ).map(([method, totals]) => {
                        const mConfig = paymentMethods.find(m => m.name === method);
                        const isBs = mConfig?.currency?.toUpperCase().includes('BS');
                        return (
                            <div key={method} className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${isBs ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500'}`}>
                                    {isBs ? '🇻🇪' : '💵'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{method}</p>
                                    <p className={`text-base font-black ${isBs ? 'text-orange-600' : 'text-red-600'} tracking-tighter`}>
                                        {isBs ? 'Bs. ' : '$'}
                                        {(isBs ? totals.bs : totals.usd).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-[8px] font-bold text-gray-300 italic">{totals.count} registros</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-2xl w-fit shadow-sm border border-gray-100">
                {[['gastos', '💸 Registro de Egresos'], ['proveedores', '🏢 Directorio Proveedores']].map(([key, label]) => (
                    <button key={key} onClick={() => setTab(key)}
                        className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${tab === key ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-slate-600'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {tab === 'gastos' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-1">
                        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100 sticky top-4">
                            <div className="flex justify-between items-center mb-8 border-b pb-4 border-gray-50">
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">
                                    {editExp ? 'Editar Egreso' : 'Nuevo Egreso'}
                                </h3>
                                {editExp && (
                                    <button onClick={() => {
                                        setEditExp(null);
                                        setExpForm({
                                            providerId: '', description: '', category: 'compra_insumos',
                                            amountUsd: '', amountBs: '', exchangeRate: bcvRate.toString(),
                                            paymentMethod: paymentMethods?.[0]?.name || 'Efectivo', receipt: ''
                                        });
                                    }} className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-500">
                                        Cancelar
                                    </button>
                                )}
                            </div>

                            {!cashSession && (
                                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                                    <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest text-center">⚠️ Caja Cerrada</p>
                                    <p className="text-[10px] text-amber-600 text-center font-bold mt-1">El gasto no se vinculará a una sesión.</p>
                                </div>
                            )}

                            <form onSubmit={handleExpSubmit} className="space-y-5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Proveedor</label>
                                    <select className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-xs focus:ring-2 focus:ring-orange-500 transition"
                                        value={expForm.providerId} onChange={e => setExpForm({ ...expForm, providerId: e.target.value })}>
                                        <option value="">Consumidor / Sin Proveedor</option>
                                        {providers.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Descripción del Pago</label>
                                    <input required placeholder="Ej: Compra de hilaza blanca"
                                        className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-xs focus:ring-2 focus:ring-orange-500 transition"
                                        value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Categoría de Gasto</label>
                                    <select className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-xs focus:ring-2 focus:ring-orange-500 transition"
                                        value={expForm.category} onChange={e => setExpForm({ ...expForm, category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-3">Método de Pago</label>
                                        <select className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-xs uppercase cursor-pointer focus:ring-2 focus:ring-orange-500"
                                            value={expForm.paymentMethod} onChange={e => setExpForm({ ...expForm, paymentMethod: e.target.value, activeField: 'rate' })}>
                                            {paymentMethods.map(m => <option key={m._id} value={m.name}>{m.name} ({m.currency})</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-3">Recibo/Factura</label>
                                        <input placeholder="S/N"
                                            className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-xs uppercase"
                                            value={expForm.receipt} onChange={e => setExpForm({ ...expForm, receipt: e.target.value })} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Monto Total USD ($)</label>
                                        <input required type="number" step="0.01" placeholder="0.00"
                                            className="w-full p-6 rounded-2xl bg-gray-50 border-none outline-none font-black text-slate-800 text-xl focus:ring-2 focus:ring-orange-500 transition"
                                            value={expForm.amountUsd} onChange={e => setExpForm({ ...expForm, amountUsd: e.target.value, activeField: 'usd' })} />
                                    </div>

                                    {isSelectedMethodBs() && (
                                        <div className="space-y-1 transform transition-all">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">Tasa Proveedor (Calculo BS)</label>
                                            <input required type="number" step="0.01" placeholder={bcvRate.toString()}
                                                className="w-full p-6 rounded-2xl bg-slate-100 border-none outline-none font-black text-blue-600 text-xl focus:ring-2 focus:ring-blue-500 transition"
                                                value={expForm.exchangeRate} onChange={e => setExpForm({ ...expForm, exchangeRate: e.target.value, activeField: 'rate' })} />
                                        </div>
                                    )}
                                </div>

                                {isSelectedMethodBs() && (
                                    <div className="space-y-1 transform transition-all">
                                        <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest ml-3">Equivalente a Descontar en BS.</label>
                                        <input required type="number" step="0.01" placeholder="0.00"
                                            className="w-full p-6 rounded-2xl bg-orange-50 border-none outline-none font-black text-orange-600 text-2xl focus:ring-2 focus:ring-orange-500 transition"
                                            value={expForm.amountBs} onChange={e => setExpForm({ ...expForm, amountBs: e.target.value, activeField: 'bs' })} />
                                    </div>
                                )}

                                <button disabled={loading}
                                    className="w-full py-5 bg-orange-500 text-white font-black rounded-3xl hover:bg-orange-600 transition transform active:scale-95 shadow-2xl shadow-orange-100 mt-4 text-xs tracking-widest uppercase">
                                    {loading ? 'PROCESANDO...' : editExp ? 'ACTUALIZAR GASTO 🚀' : 'REGISTRAR GASTO 🚀'}
                                </button>
                            </form>
                        </div>
                    </div>

                    <div className="xl:col-span-2 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                            <div>
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Historial de Gastos</h3>
                                <span className="text-[10px] font-bold text-slate-400 italic">Ordenado por fecha</span>
                            </div>
                            <input type="date"
                                className="p-3 rounded-2xl bg-white border border-gray-200 outline-none font-bold text-slate-600 text-xs shadow-sm focus:ring-2 focus:ring-orange-500 cursor-pointer"
                                value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                        </div>
                        {filteredExpenses.map(ex => (
                            <div key={ex._id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                                <div className="flex flex-col md:flex-row md:items-center gap-6 relative z-10">
                                    <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-2xl shadow-inner shrink-0 group-hover:bg-red-500 group-hover:text-white transition-colors duration-500">
                                        💸
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <p className="font-black text-slate-800 text-sm uppercase tracking-tight">{ex.description}</p>
                                            <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase">{CATEGORIES.find(c => c.value === ex.category)?.label.split(' ')[0] || 'Gasto'}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-[9px] font-black text-gray-400 uppercase tracking-widest items-center">
                                            <span className="flex items-center gap-1"><span className="text-slate-200">🏢</span> {ex.providerName || 'SIN PROVEEDOR'}</span>
                                            <span className="flex items-center gap-1"><span className="text-slate-200">📅</span> {new Date(ex.date).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1"><span className="text-slate-200">🧾</span> {ex.receipt || 'S/RECIBO'}</span>
                                            <span className="flex items-center gap-1 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md">💳 {ex.paymentMethod}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 shrink-0 border-l border-gray-50 pl-6 items-center">
                                        <div className="text-right">
                                            <p className="font-black text-red-600 text-xl tracking-tighter">${(ex.amountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                                            <p className="text-[10px] font-black text-orange-500 italic">Bs. {(ex.amountBs || 0).toLocaleString('es-VE')}</p>
                                            <p className="text-[8px] font-bold text-gray-300">TASA: {ex.exchangeRate || '—'}</p>
                                        </div>
                                        <div className="hidden group-hover:flex flex-col gap-1 ml-4 absolute right-0 top-0 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-lg border border-gray-100 h-full justify-center transform translate-x-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all z-20">
                                            <button onClick={() => {
                                                setEditExp(ex._id);
                                                setExpForm({
                                                    providerId: ex.providerId?._id || ex.providerId || '',
                                                    description: ex.description || '',
                                                    category: ex.category || 'compra_insumos',
                                                    amountUsd: ex.amountUsd?.toString() || '',
                                                    amountBs: ex.amountBs?.toString() || '',
                                                    exchangeRate: ex.exchangeRate?.toString() || bcvRate.toString(),
                                                    paymentMethod: ex.paymentMethod || 'Efectivo',
                                                    receipt: ex.receipt || ''
                                                });
                                                window.scrollTo({ top: 0, behavior: 'smooth' });
                                            }} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Editar Egreso">✏️</button>
                                            <button onClick={async () => { if (confirm('¿Eliminar egreso?')) { await fetch(`/api/expenses?id=${ex._id}`, { method: 'DELETE' }); fetchAll(); } }}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Eliminar Egreso">🗑️</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute -bottom-6 -right-6 text-gray-50 text-7xl font-black italic select-none pointer-events-none group-hover:text-gray-100 transition-colors uppercase">{ex.category}</div>
                            </div>
                        ))}
                        {filteredExpenses.length === 0 && (
                            <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-gray-100 opacity-40">
                                <span className="text-8xl block mb-6">📉</span>
                                <p className="font-black uppercase text-xs tracking-[0.4em]">Sin registros financieros</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {tab === 'proveedores' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-1">
                        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100">
                            <h3 className="text-xl font-black text-slate-800 uppercase mb-8 border-b pb-4 tracking-tighter">{editProv ? 'Editar Ficha' : 'Nuevo Proveedor'}</h3>
                            <form onSubmit={handleProvSubmit} className="space-y-4">
                                {[
                                    { label: 'RIF / Cédula/ ID', key: 'rif', placeholder: 'J-12345678-9', req: true },
                                    { label: 'Razón Social / Nombre', key: 'name', placeholder: 'Empresa Ejemplo S.A.', req: true },
                                    { label: 'Teléfono Contacto', key: 'phone', placeholder: '0412-0000000' },
                                    { label: 'Correo Electrónico', key: 'email', placeholder: 'proveedor@gmail.com' },
                                    { label: 'Dirección Fiscal', key: 'address', placeholder: 'Zona Industrial...' },
                                    { label: 'Persona de Atención', key: 'contact', placeholder: 'Nombre del vendedor' },
                                ].map(({ label, key, placeholder, req }) => (
                                    <div key={key} className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-3">{label}</label>
                                        <input required={req} placeholder={placeholder}
                                            className="w-full p-4 rounded-2xl bg-gray-50 border-none outline-none font-bold text-slate-800 text-xs focus:ring-2 focus:ring-slate-800 transition"
                                            value={provForm[key]} onChange={e => setProvForm({ ...provForm, [key]: e.target.value })} />
                                    </div>
                                ))}
                                <button disabled={loading}
                                    className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl hover:bg-slate-800 transition transform active:scale-95 shadow-xl mt-4 text-[10px] tracking-widest uppercase">
                                    {loading ? 'GUARDANDO...' : editProv ? 'ACTUALIZAR DATOS' : 'REGISTRAR SOCIO 🏢'}
                                </button>
                                {editProv && <button type="button" onClick={() => { setEditProv(null); setProvForm({ rif: '', name: '', phone: '', email: '', address: '', contact: '' }); }}
                                    className="w-full py-2 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-slate-800">Cancelar</button>}
                            </form>
                        </div>
                    </div>

                    <div className="xl:col-span-2 space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Aliados Comerciales</h3>
                            <span className="text-[10px] font-bold text-slate-400 italic">{providers.length} Registrados</span>
                        </div>
                        {providers.map(p => (
                            <div key={p._id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-6 hover:shadow-2xl transition-all group">
                                <div className="w-16 h-16 bg-slate-50 text-slate-400 rounded-3xl flex items-center justify-center text-3xl shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all duration-500">🏢</div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-800 text-lg uppercase tracking-tight">{p.name}</p>
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4">{p.rif}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Teléfono</span>
                                            <span className="text-xs font-bold text-slate-600 truncate">{p.phone || 'S/N'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Contacto</span>
                                            <span className="text-xs font-bold text-slate-600 truncate">{p.contact || 'S/N'}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Email</span>
                                            <span className="text-xs font-bold text-slate-600 truncate">{p.email || 'S/N'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 shrink-0 border-l border-gray-50 pl-6">
                                    <button onClick={() => { setProvForm(p); setEditProv(p._id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                        className="p-4 bg-blue-50 text-blue-500 rounded-2xl hover:bg-blue-600 hover:text-white transition shadow-sm">✏️</button>
                                    <button onClick={async () => { if (confirm('¿Eliminar ficha de proveedor?')) { await fetch(`/api/providers?id=${p._id}`, { method: 'DELETE' }); fetchAll(); } }}
                                        className="p-4 bg-red-50 text-red-500 rounded-2xl hover:bg-red-600 hover:text-white transition shadow-sm">🗑️</button>
                                </div>
                            </div>
                        ))}
                        {providers.length === 0 && (
                            <div className="text-center py-32 bg-white rounded-[40px] border-2 border-dashed border-gray-100 opacity-40">
                                <span className="text-8xl block mb-6">🤝</span>
                                <p className="font-black uppercase text-xs tracking-[0.4em]">Sin aliados comerciales</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
