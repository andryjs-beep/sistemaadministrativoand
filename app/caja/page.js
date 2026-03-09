"use client";

import { useState, useEffect } from 'react';

export default function CajaPage() {
    const [session, setSession] = useState(null);
    const [openForm, setOpenForm] = useState({ openingBalance: '', notes: '' });
    const [closeForm, setCloseForm] = useState({ closingBalance: '', notes: '' });
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('user'));
        if (stored) fetchSession(stored._id);
    }, []);

    const fetchSession = async (userId) => {
        const res = await fetch(`/api/cash?userId=${userId}`);
        const data = await res.json();
        setSession(data);
        if (data) fetchSessionReport(data._id, userId);
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
            const res = await fetch('/api/cash', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...openForm, userId: stored._id })
            });
            if (res.ok) {
                setOpenForm({ openingBalance: '', notes: '' });
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
            const res = await fetch('/api/cash', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: session._id, userId: stored._id, ...closeForm })
            });
            if (res.ok) {
                setCloseForm({ closingBalance: '', notes: '' });
                fetchSession(stored._id);
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

    const sm = reportData?.summary || {};
    const payBreak = reportData?.paymentBreakdown || {};

    // Group expense breakdown by method
    const expenseBreak = {};
    (reportData?.expenses || []).forEach(exp => {
        const method = exp.paymentMethod || 'Otro';
        if (!expenseBreak[method]) expenseBreak[method] = { totalUsd: 0, totalBs: 0, count: 0 };
        expenseBreak[method].totalUsd += exp.amountUsd || 0;
        expenseBreak[method].totalBs += exp.amountBs || 0;
        expenseBreak[method].count++;
    });

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
                <div className="space-y-8">
                    {/* Session Summary */}
                    <div>
                        <h3 className="font-black text-slate-600 uppercase text-xs tracking-widest ml-2 mb-4">Resumen de Sesión</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { label: 'Fondo Inicial', value: `$${(session.openingBalance || 0).toFixed(2)}`, color: 'text-slate-800', bg: 'bg-white' },
                                { label: 'Ventas Totales', value: `$${(sm.totalSalesUsd || session.totalSalesUsd || 0).toFixed(2)}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { label: 'Egresos', value: `$${(sm.totalExpensesUsd || session.totalExpensesUsd || 0).toFixed(2)}`, color: 'text-red-600', bg: 'bg-red-50' },
                                { label: 'Neto del Día', value: `$${((sm.totalSalesUsd || session.totalSalesUsd || 0) - (sm.totalExpensesUsd || session.totalExpensesUsd || 0)).toFixed(2)}`, color: 'text-violet-700', bg: 'bg-violet-50' },
                            ].map(({ label, value, color, bg }) => (
                                <div key={label} className={`${bg} p-5 rounded-3xl border border-gray-100`}>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                                    <p className={`text-xl font-black ${color}`}>{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ===== DESGLOSE POR MÉTODO DE PAGO (VENTAS) ===== */}
                    <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm">
                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 border-b pb-4 flex items-center gap-2">
                            💰 Ingresos por Método de Pago
                        </h3>
                        <div className="space-y-4">
                            {Object.entries(payBreak).length > 0 ? Object.entries(payBreak).map(([method, info]) => {
                                const isBs = info.currency && info.currency.startsWith('BS');
                                return (
                                    <div key={method} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-inner ${isBs ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                            {isBs ? '🇻🇪' : '💵'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-700 uppercase truncate">{method}</p>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{info.count} ventas • {info.currency || 'USD'}</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className={`text-lg font-black ${isBs ? 'text-orange-500' : 'text-emerald-600'}`}>
                                                {isBs ? 'Bs. ' : '$'}
                                                {(info.mainTotal || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                            {!isBs && <p className="text-[9px] font-bold text-gray-400">Bs. {(info.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>}
                                            {isBs && <p className="text-[9px] font-bold text-gray-400">${(info.totalUsd || 0).toFixed(2)} ref.</p>}
                                        </div>
                                    </div>
                                );
                            }) : (
                                <div className="py-12 text-center opacity-30 italic text-xs font-bold uppercase tracking-widest">Sin ventas registradas en esta sesión</div>
                            )}
                        </div>
                    </div>

                    {/* ===== DESGLOSE POR MÉTODO DE PAGO (EGRESOS) ===== */}
                    {Object.keys(expenseBreak).length > 0 && (
                        <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm">
                            <h3 className="font-black text-red-600 uppercase text-xs tracking-widest mb-6 border-b pb-4 flex items-center gap-2">
                                📤 Egresos por Método de Pago
                            </h3>
                            <div className="space-y-4">
                                {Object.entries(expenseBreak).map(([method, info]) => (
                                    <div key={method} className="flex items-center gap-4 p-4 rounded-2xl bg-red-50/50 hover:bg-red-50 transition">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-inner bg-red-50 text-red-500">📤</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-slate-700 uppercase truncate">{method}</p>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{info.count} egresos</p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-lg font-black text-red-600">${(info.totalUsd || 0).toFixed(2)}</p>
                                            <p className="text-[9px] font-bold text-gray-400">Bs. {(info.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Close session */}
                    <div className="bg-white p-6 md:p-8 rounded-[40px] shadow-xl border border-gray-100 max-w-xl mx-auto">
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
                                <div className={`p-4 rounded-2xl text-center ${parseFloat(closeForm.closingBalance) >= (session.openingBalance + (sm.totalSalesUsd || session.totalSalesUsd || 0) - (sm.totalExpensesUsd || session.totalExpensesUsd || 0)) * 0.95 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                                    <p className="text-xs font-black text-gray-600">
                                        Diferencia: <span className={parseFloat(closeForm.closingBalance) >= (session.openingBalance || 0) ? 'text-emerald-600' : 'text-red-600'}>
                                            ${(parseFloat(closeForm.closingBalance) - (session.openingBalance || 0) - (sm.totalSalesUsd || session.totalSalesUsd || 0) + (sm.totalExpensesUsd || session.totalExpensesUsd || 0)).toFixed(2)}
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
