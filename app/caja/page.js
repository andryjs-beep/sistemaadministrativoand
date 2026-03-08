"use client";

import { useState, useEffect } from 'react';

export default function CajaPage() {
    const [session, setSession] = useState(null);
    const [history, setHistory] = useState([]);
    const [openForm, setOpenForm] = useState({ openingBalance: '', notes: '' });
    const [closeForm, setCloseForm] = useState({ closingBalance: '', notes: '' });
    const [loading, setLoading] = useState(false);
    const [view, setView] = useState('current'); // current | history

    useEffect(() => { fetchSession(); }, []);

    const fetchSession = async () => {
        const res = await fetch('/api/cash');
        const data = await res.json();
        setSession(data);
        // Fetch history (closed sessions) - using reports
        const histRes = await fetch('/api/cash-history').catch(() => ({ json: () => [] }));
    };

    const fetchHistory = async () => {
        const res = await fetch('/api/reports?type=daily');
        const data = await res.json();
        setHistory(Array.isArray(data.cashSessions) ? data.cashSessions : []);
    };

    useEffect(() => { if (view === 'history') fetchHistory(); }, [view]);

    const openSession = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/cash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(openForm)
            });
            if (res.ok) {
                setOpenForm({ openingBalance: '', notes: '' });
                fetchSession();
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
            const res = await fetch('/api/cash', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: session._id, ...closeForm })
            });
            if (res.ok) {
                setCloseForm({ closingBalance: '', notes: '' });
                fetchSession();
                alert('✅ Caja cerrada exitosamente');
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

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full">
            <header className="mb-8">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Control de Efectivo</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Módulo de <span className="text-violet-600">Caja</span></h1>
            </header>

            {/* Status indicator */}
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
                /* OPEN SESSION FORM */
                <div className="max-w-lg mx-auto">
                    <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-gray-100">
                        <div className="text-center mb-8">
                            <span className="text-6xl">🔓</span>
                            <h2 className="text-2xl font-black text-slate-800 mt-4 uppercase">Apertura de Caja</h2>
                            <p className="text-sm text-gray-400 mt-1">Ingresa el monto inicial para comenzar las operaciones del día</p>
                        </div>
                        <form onSubmit={openSession} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Fondo Inicial (USD)</label>
                                <input type="number" step="0.01" placeholder="0.00" required
                                    className="w-full p-5 rounded-2xl bg-gray-100 border-none outline-none font-black text-slate-900 text-2xl text-center focus:ring-2 focus:ring-violet-500"
                                    value={openForm.openingBalance} onChange={e => setOpenForm({ ...openForm, openingBalance: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Observaciones</label>
                                <textarea placeholder="Notas de apertura (opcional)..." rows={2}
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm resize-none"
                                    value={openForm.notes} onChange={e => setOpenForm({ ...openForm, notes: e.target.value })} />
                            </div>
                            <button disabled={loading}
                                className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 shadow-2xl shadow-emerald-100 transition active:scale-95 text-lg">
                                {loading ? 'ABRIENDO...' : '🔓 ABRIR CAJA'}
                            </button>
                        </form>
                    </div>
                </div>
            ) : (
                /* ACTIVE SESSION */
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Session Summary */}
                    <div className="space-y-4">
                        <h3 className="font-black text-slate-600 uppercase text-xs tracking-widest ml-2">Resumen de Sesión</h3>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Fondo Inicial', value: `$${(session.openingBalance || 0).toFixed(2)}`, color: 'text-slate-800', bg: 'bg-white' },
                                { label: 'Ventas Totales', value: `$${(session.totalSalesUsd || 0).toFixed(2)}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Egresos', value: `$${(session.totalExpensesUsd || 0).toFixed(2)}`, color: 'text-red-600', bg: 'bg-red-50' },
                                { label: 'Neto del Día', value: `$${((session.totalSalesUsd || 0) - (session.totalExpensesUsd || 0)).toFixed(2)}`, color: 'text-violet-700', bg: 'bg-violet-50' },
                            ].map(({ label, value, color, bg }) => (
                                <div key={label} className={`${bg} p-5 rounded-3xl border border-gray-100`}>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                                    <p className={`text-xl font-black ${color}`}>{value}</p>
                                </div>
                            ))}
                        </div>
                        <div className="bg-white p-5 rounded-3xl border border-gray-100">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Ventas en Bs.</p>
                            <p className="text-xl font-black text-slate-700">Bs. {(session.totalSalesBs || 0).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-1">{session.salesCount || 0} transacciones</p>
                        </div>
                    </div>

                    {/* Close session */}
                    <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border border-gray-100">
                        <div className="text-center mb-6">
                            <span className="text-5xl">🔒</span>
                            <h2 className="text-xl font-black text-slate-800 mt-3 uppercase">Cierre de Caja</h2>
                        </div>
                        <form onSubmit={closeSession} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Efectivo en Caja (USD)</label>
                                <input type="number" step="0.01" placeholder="0.00" required
                                    className="w-full p-5 rounded-2xl bg-gray-100 border-none outline-none font-black text-slate-900 text-2xl text-center focus:ring-2 focus:ring-red-400"
                                    value={closeForm.closingBalance} onChange={e => setCloseForm({ ...closeForm, closingBalance: e.target.value })} />
                            </div>
                            {closeForm.closingBalance && (
                                <div className={`p-4 rounded-2xl text-center ${parseFloat(closeForm.closingBalance) >= (session.openingBalance + session.totalSalesUsd - session.totalExpensesUsd) * 0.95 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                                    <p className="text-xs font-black text-gray-600">
                                        Diferencia: <span className={parseFloat(closeForm.closingBalance) >= (session.openingBalance || 0) ? 'text-emerald-600' : 'text-red-600'}>
                                            ${(parseFloat(closeForm.closingBalance) - (session.openingBalance || 0) - (session.totalSalesUsd || 0) + (session.totalExpensesUsd || 0)).toFixed(2)}
                                        </span>
                                    </p>
                                </div>
                            )}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Notas de Cierre</label>
                                <textarea placeholder="Observaciones del cierre..." rows={3}
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm resize-none"
                                    value={closeForm.notes} onChange={e => setCloseForm({ ...closeForm, notes: e.target.value })} />
                            </div>
                            <button disabled={loading}
                                className="w-full py-5 bg-red-600 text-white font-black rounded-2xl hover:bg-red-700 shadow-xl shadow-red-100 transition active:scale-95 text-base">
                                {loading ? 'CERRANDO...' : '🔒 CERRAR CAJA'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
