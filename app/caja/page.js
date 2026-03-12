"use client";

import { useState, useEffect } from 'react';

export default function CajaPage() {
    const [session, setSession] = useState(null);
    const [history, setHistory] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [openForm, setOpenForm] = useState({ usdCash: '', bsCash: '', bsTransfer: '', notes: '' });
    const [closeForm, setCloseForm] = useState({ usdCash: '', bsCash: '', bsTransfer: '', notes: '' });
    const [excForm, setExcForm] = useState({ fromCurrency: 'BS_CASH', toCurrency: 'USD_CASH', fromAmount: '', toAmount: '', notes: '' });
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('user'));
        if (stored) {
            fetchSession(stored._id);
            fetchHistory(stored._id);
        }
    }, []);

    const fetchSession = async (userId) => {
        const res = await fetch(`/api/cash?userId=${userId}`);
        const data = await res.json();
        setSession(data);
        if (data) fetchSessionReport(data._id, userId);
    };

    const fetchHistory = async (userId) => {
        const res = await fetch(`/api/cash?userId=${userId}&history=true`);
        const data = await res.json();
        setHistory(data);
    };

    const fetchSessionReport = async (sessionId, userId) => {
        try {
            const res = await fetch(`/api/reports?type=session&sessionId=${sessionId}&userId=${userId}`);
            const data = await res.json();
            setReportData(data);
        } catch { }
    };

    const openSession = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const stored = JSON.parse(localStorage.getItem('user'));
            const totalOpening = (parseFloat(openForm.usdCash) || 0) + ((parseFloat(openForm.bsCash) || 0) / 36); // ref approx
            const res = await fetch('/api/cash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: stored._id,
                    openingBalance: totalOpening,
                    openingDetails: {
                        usdCash: openForm.usdCash,
                        bsCash: openForm.bsCash,
                        bsTransfer: openForm.bsTransfer
                    },
                    notes: openForm.notes
                })
            });
            if (res.ok) {
                setOpenForm({ usdCash: '', bsCash: '', bsTransfer: '', notes: '' });
                fetchSession(stored._id);
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch { alert('Error de conexión'); }
        setLoading(false);
    };

    const closeSession = async (e) => {
        e.preventDefault();
        if (!confirm('¿Confirmas el cierre de caja? Esta acción no se puede deshacer.')) return;
        setLoading(true);
        try {
            const stored = JSON.parse(localStorage.getItem('user'));
            const totalClosing = (parseFloat(closeForm.usdCash) || 0) + ((parseFloat(closeForm.bsCash) || 0) / 36);
            const res = await fetch('/api/cash', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: session._id,
                    userId: stored._id,
                    closingBalance: totalClosing,
                    closingDetails: {
                        usdCash: closeForm.usdCash,
                        bsCash: closeForm.bsCash,
                        bsTransfer: closeForm.bsTransfer
                    },
                    notes: closeForm.notes
                })
            });
            if (res.ok) {
                setCloseForm({ usdCash: '', bsCash: '', bsTransfer: '', notes: '' });
                fetchSession(stored._id);
                fetchHistory(stored._id);
                alert('✅ Caja cerrada exitosamente');
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch { alert('Error de conexión'); }
        setLoading(false);
    };

    const handleExchange = async (e) => {
        e.preventDefault();
        if (!excForm.fromAmount || !excForm.toAmount) return alert('Ingresa ambos montos');
        setLoading(true);
        try {
            const stored = JSON.parse(localStorage.getItem('user'));
            const res = await fetch('/api/cash/exchange', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: session._id,
                    userId: stored._id,
                    ...excForm
                })
            });
            if (res.ok) {
                setExcForm({ fromCurrency: 'BS_CASH', toCurrency: 'USD_CASH', fromAmount: '', toAmount: '', notes: '' });
                fetchSession(stored._id);
                alert('✅ Intercambio registrado');
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch { alert('Error de conexión'); }
        setLoading(false);
    };

    const deleteExchange = async (id) => {
        const reason = prompt('Motivo de la eliminación (Audit Trail):');
        if (!reason) return;

        setLoading(true);
        try {
            const res = await fetch(`/api/cash/exchange?id=${id}&reason=${encodeURIComponent(reason)}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const stored = JSON.parse(localStorage.getItem('user'));
                fetchSession(stored._id);
                alert('✅ Registro eliminado y guardado en historial');
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch { alert('Error de conexión'); }
        setLoading(false);
    };

    const duration = session ? Math.floor((Date.now() - new Date(session.openedAt).getTime()) / 1000 / 60) : 0;
    const hours = Math.floor(duration / 60);
    const mins = duration % 60;

    const sm = reportData?.summary || {};
    const payBreak = reportData?.paymentBreakdown || {};
    const expBreak = reportData?.expenseBreakdown || {};

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Control de Efectivo</p>
                    <h1 className="text-3xl md:text-5xl font-black text-slate-800 tracking-tight leading-none">Módulo de <span className="text-violet-600">Caja</span></h1>
                </div>
                <button onClick={() => setShowHistory(!showHistory)} className="px-6 py-3 bg-white border border-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest text-slate-600 hover:bg-gray-50 transition">
                    {showHistory ? '🔙 Volver' : '📜 Historial'}
                </button>
            </header>

            {showHistory ? (
                <div className="space-y-6">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Historial de Cierres</h2>
                    <div className="grid gap-4">
                        {history.length > 0 ? history.map(s => (
                            <div key={s._id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{s.sessionId}</p>
                                        <p className="text-base font-black text-slate-700 uppercase">{new Date(s.openedAt).toLocaleDateString()} - {new Date(s.closedAt || s.updatedAt).toLocaleTimeString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-black text-emerald-600 leading-none">${(s.totalSalesUsd || 0).toFixed(2)}</p>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Ventas Totales</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2 border-t pt-4">
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">USD Efec.</p>
                                        <p className="text-sm font-black text-slate-600">${(s.closingDetails?.usdCash || 0).toFixed(2)}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">Bs Efec.</p>
                                        <p className="text-xs font-black text-slate-600">Bs. {(s.closingDetails?.bsCash || 0).toLocaleString()}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">P. Movil</p>
                                        <p className="text-xs font-black text-slate-600">Bs. {(s.closingDetails?.bsTransfer || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        )) : <p className="text-center py-20 italic text-gray-400">No hay cierres registrados recientemente.</p>}
                    </div>
                </div>
            ) : (
                <>
                    <div className={`flex items-center gap-4 p-5 rounded-3xl border mb-8 ${session ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-100 border-gray-200'}`}>
                        <div className={`w-4 h-4 rounded-full ${session ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
                        <div>
                            <p className={`font-black uppercase tracking-widest text-sm ${session ? 'text-emerald-700' : 'text-gray-500'}`}>
                                {session ? '🟢 CAJA ABIERTA' : '🔴 CAJA CERRADA'}
                            </p>
                            {session && <p className="text-xs font-bold text-emerald-600 mt-0.5">Sesión: {session.sessionId} | Activa: {hours}h {mins}m</p>}
                        </div>
                    </div>

                    {!session ? (
                        <div className="max-w-2xl mx-auto">
                            <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100">
                                <div className="text-center mb-8">
                                    <span className="text-6xl">🔓</span>
                                    <h2 className="text-2xl font-black text-slate-800 mt-4 uppercase">Apertura de Caja</h2>
                                    <p className="text-sm text-gray-400 mt-1">Ingresa el fondo inicial detallado por moneda</p>
                                </div>
                                <form onSubmit={openSession} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">USD Efectivo</label>
                                            <input type="number" step="0.01" placeholder="$ 0.00"
                                                className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-black text-slate-900 text-lg text-center"
                                                value={openForm.usdCash} onChange={e => setOpenForm({ ...openForm, usdCash: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Bs Efectivo</label>
                                            <input type="number" step="0.01" placeholder="Bs. 0"
                                                className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-black text-slate-900 text-lg text-center"
                                                value={openForm.bsCash} onChange={e => setOpenForm({ ...openForm, bsCash: e.target.value })} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Bs Movil/Transf</label>
                                            <input type="number" step="0.01" placeholder="Bs. 0"
                                                className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-black text-slate-900 text-lg text-center"
                                                value={openForm.bsTransfer} onChange={e => setOpenForm({ ...openForm, bsTransfer: e.target.value })} />
                                        </div>
                                    </div>
                                    <textarea placeholder="Notas de apertura (opcional)..." rows={2}
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm resize-none"
                                        value={openForm.notes} onChange={e => setOpenForm({ ...openForm, notes: e.target.value })} />
                                    <button disabled={loading} className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-2xl shadow-emerald-100 transition active:scale-95 text-lg">
                                        {loading ? 'ABRIENDO...' : '🔓 ABRIR CAJA'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[
                                    { label: 'Ingreso Diario USD', value: `$${(sm.collectedUsd || 0).toFixed(2)}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                    { label: 'Ingreso Diario Bs', value: `Bs. ${(sm.collectedBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                    { label: 'Egresos USD', value: `$${(sm.spentUsd || 0).toFixed(2)}`, color: 'text-red-600', bg: 'bg-red-50' },
                                    { label: 'Egresos Bs', value: `Bs. ${(sm.spentBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, color: 'text-red-600', bg: 'bg-red-50' },
                                    { label: 'Intercambios USD', value: `${(sm.exchangeNetUsd || 0) >= 0 ? '+' : ''}$${(sm.exchangeNetUsd || 0).toFixed(2)}`, color: (sm.exchangeNetUsd || 0) >= 0 ? 'text-blue-600' : 'text-orange-600', bg: 'bg-blue-50' },
                                    { label: 'Intercambios Bs', value: `${(sm.exchangeNetBs || 0) >= 0 ? '+' : ''}Bs. ${(sm.exchangeNetBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, color: (sm.exchangeNetBs || 0) >= 0 ? 'text-blue-600' : 'text-orange-600', bg: 'bg-blue-50' },
                                ].map(({ label, value, color, bg }) => (
                                    <div key={label} className={`${bg} p-5 rounded-3xl border border-gray-100`}>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center md:text-left">{label}</p>
                                        <p className={`text-xl font-black ${color} text-center md:text-left`}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm">
                                <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 border-b pb-4 flex items-center gap-2">
                                    <span className="text-xl">💰</span> Saldo Neto por Método
                                </h3>
                                <div className="space-y-4">
                                    {Object.entries(payBreak).length > 0 ? Object.entries(payBreak).map(([method, info]) => {
                                        const isBs = info.currency && info.currency.startsWith('BS');
                                        return (
                                            <div key={method} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-inner ${isBs ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>{isBs ? '🇻🇪' : '💵'}</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-slate-700 uppercase truncate">{method}</p>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{info.count} Movimientos</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`text-xl font-black ${isBs ? 'text-orange-500' : 'text-emerald-600'}`}>
                                                        {isBs ? 'Bs. ' : '$'}{(info.mainTotal || (isBs ? info.totalBs : info.totalUsd) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    }) : <div className="py-12 text-center opacity-30 italic text-xs font-bold uppercase tracking-widest">Sin movimientos registrados</div>}
                                </div>
                            </div>

                            {/* SECCIÓN INTERCAMBIO DE DIVISA (COMPRA DE EFECTIVO) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm border-t-4 border-t-blue-500">
                                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 border-b pb-4 flex items-center gap-2">
                                        <span className="text-xl">🔄</span> Comprar Efectivo / Cambio
                                    </h3>
                                    <form onSubmit={handleExchange} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1 text-center">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Entregas...</label>
                                                <select className="w-full p-3 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-700 text-xs"
                                                    value={excForm.fromCurrency} onChange={e => setExcForm({ ...excForm, fromCurrency: e.target.value })}>
                                                    <option value="BS_CASH">🇻🇪 Bs. Efectivo</option>
                                                    <option value="BS_TRANSFER">📱 Pago Móvil</option>
                                                    <option value="USD_CASH">💵 USD Efectivo</option>
                                                </select>
                                                <input type="number" step="0.01" placeholder="Monto" required
                                                    className="w-full mt-2 p-4 rounded-2xl bg-gray-50 border-none outline-none font-black text-slate-900 text-center text-lg"
                                                    value={excForm.fromAmount} onChange={e => setExcForm({ ...excForm, fromAmount: e.target.value })} />
                                            </div>
                                            <div className="space-y-1 text-center">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Recibes...</label>
                                                <select className="w-full p-3 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-700 text-xs"
                                                    value={excForm.toCurrency} onChange={e => setExcForm({ ...excForm, toCurrency: e.target.value })}>
                                                    <option value="USD_CASH">💵 USD Efectivo</option>
                                                    <option value="BS_CASH">🇻🇪 Bs. Efectivo</option>
                                                    <option value="BS_TRANSFER">📱 Pago Móvil</option>
                                                </select>
                                                <input type="number" step="0.01" placeholder="Monto" required
                                                    className="w-full mt-2 p-4 rounded-2xl bg-gray-50 border-none outline-none font-black text-blue-600 text-center text-lg"
                                                    value={excForm.toAmount} onChange={e => setExcForm({ ...excForm, toAmount: e.target.value })} />
                                            </div>
                                        </div>
                                        <input placeholder="Motivo (ej: dar vuelto cliente)..."
                                            className="w-full p-3 rounded-xl bg-gray-50 border-none outline-none font-bold text-slate-600 text-xs"
                                            value={excForm.notes} onChange={e => setExcForm({ ...excForm, notes: e.target.value })} />
                                        <button disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-50 transition active:scale-95 text-xs uppercase tracking-widest">
                                            {loading ? 'REGISTRANDO...' : '⚡ REGISTRAR INTERCAMBIO'}
                                        </button>
                                    </form>
                                </div>

                                <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm">
                                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 border-b pb-4">
                                        Historial de Cambios
                                    </h3>
                                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                                        {(reportData?.exchanges || []).map(exc => (
                                            <div key={exc._id} className={`p-3 rounded-2xl flex items-center justify-between border ${exc.status === 'cancelled' ? 'bg-gray-100 border-gray-200 opacity-60 grayscale' : 'bg-gray-50 border-gray-100'}`}>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-700">{exc.fromAmount} {exc.fromCurrency.split('_')[0]}</span>
                                                        <span className="text-gray-300">➡️</span>
                                                        <span className="text-xs font-black text-blue-600">{exc.toAmount} {exc.toCurrency.split('_')[0]}</span>
                                                        {exc.status === 'cancelled' && <span className="text-[8px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-black uppercase">ELIMINADO</span>}
                                                    </div>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">
                                                        {exc.status === 'cancelled' ? `MOTIVO: ${exc.cancellationReason}` : exc.notes}
                                                    </p>
                                                </div>
                                                <div className="text-right flex items-center gap-3">
                                                    <p className="text-[9px] font-black text-gray-300 uppercase">{new Date(exc.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                    {exc.status !== 'cancelled' && (
                                                        <button onClick={() => deleteExchange(exc._id)} className="p-2 bg-white text-red-300 hover:text-red-500 rounded-xl transition shadow-sm border border-gray-100">
                                                            🗑️
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {(!reportData?.exchanges || reportData.exchanges.length === 0) && (
                                            <p className="text-center py-10 text-[10px] uppercase font-black text-gray-300 italic tracking-widest">Sin intercambios registrados</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border border-gray-100 max-w-xl mx-auto">
                                <div className="text-center mb-6">
                                    <span className="text-5xl">🔒</span>
                                    <h2 className="text-xl font-black text-slate-800 mt-3 uppercase">Cierre de Caja</h2>
                                </div>
                                <form onSubmit={closeSession} className="space-y-5">
                                    <div className="grid gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2 text-center block w-full">USD Efectivo en Mano</label>
                                            <input type="number" step="0.01" placeholder="$ 0.00" required
                                                className="w-full p-5 rounded-2xl bg-gray-100 border-none outline-none font-black text-slate-900 text-2xl text-center focus:ring-2 focus:ring-red-400"
                                                value={closeForm.usdCash} onChange={e => setCloseForm({ ...closeForm, usdCash: e.target.value })} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Bs Efectivo</label>
                                                <input type="number" step="0.01" placeholder="Bs. 0" required
                                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-black text-slate-900 text-lg text-center shadow-inner"
                                                    value={closeForm.bsCash} onChange={e => setCloseForm({ ...closeForm, bsCash: e.target.value })} />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">Pago Móvil/Transf</label>
                                                <input type="number" step="0.01" placeholder="Bs. 0" required
                                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-black text-slate-900 text-lg text-center shadow-inner"
                                                    value={closeForm.bsTransfer} onChange={e => setCloseForm({ ...closeForm, bsTransfer: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>
                                    <textarea placeholder="Observaciones del cierre..." rows={3}
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm resize-none"
                                        value={closeForm.notes} onChange={e => setCloseForm({ ...closeForm, notes: e.target.value })} />
                                    <button disabled={loading} className="w-full py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-xl shadow-red-100 transition active:scale-95 text-base uppercase">
                                        {loading ? 'CERRANDO...' : '🔒 CERRAR CAJA'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
