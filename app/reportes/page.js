"use client";

import { useState, useEffect, useCallback } from 'react';

export default function ReportesPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('daily');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            let url = `/api/reports?type=${reportType}`;
            if (reportType === 'range') url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
            const res = await fetch(url);
            const json = await res.json();
            setData(json);
        } catch { }
        setLoading(false);
    }, [reportType, dateFrom, dateTo]);

    useEffect(() => { fetchReport(); }, []);

    const s = data?.summary || {};
    const payBreak = data?.paymentBreakdown || {};
    const topProd = data?.topProducts || [];

    const printReport = () => window.print();

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full" id="report-content">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Análisis</p>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Reportes & <span className="text-blue-600">Cierres</span></h1>
                </div>
                <button onClick={printReport}
                    className="px-6 py-3 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-700 transition no-print">
                    🖨️ Imprimir Reporte
                </button>
            </header>

            {/* Filter bar */}
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-8 flex flex-wrap items-center gap-4 no-print">
                {[['daily', '📅 Hoy'], ['range', '📆 Rango']].map(([key, label]) => (
                    <button key={key} onClick={() => setReportType(key)}
                        className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition ${reportType === key ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                        {label}
                    </button>
                ))}
                {reportType === 'range' && (
                    <>
                        <input type="date" className="p-3 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm"
                            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <span className="text-gray-400 font-bold">→</span>
                        <input type="date" className="p-3 rounded-2xl bg-gray-100 border-none outline-none font-bold text-slate-900 text-sm"
                            value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </>
                )}
                <button onClick={fetchReport}
                    className="ml-auto px-6 py-3 bg-slate-800 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-900 transition">
                    {loading ? '⏳ Cargando...' : '🔍 Generar'}
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                {[
                    { label: 'Ventas $', value: `$${(s.totalSalesUsd || 0).toFixed(2)}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Ventas Bs.', value: `Bs. ${(s.totalSalesBs || 0).toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                    { label: 'Egresos $', value: `$${(s.totalExpensesUsd || 0).toFixed(2)}`, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Egresos Bs.', value: `Bs. ${(s.totalExpensesBs || 0).toLocaleString('es-VE', { maximumFractionDigits: 0 })}`, color: 'text-red-700', bg: 'bg-red-50' },
                    { label: 'Neto $', value: `$${(s.netUsd || 0).toFixed(2)}`, color: s.netUsd >= 0 ? 'text-blue-700' : 'text-red-700', bg: 'bg-blue-50' },
                    { label: 'N° Ventas', value: s.salesCount || 0, color: 'text-violet-700', bg: 'bg-violet-50' },
                ].map(({ label, value, color, bg }) => (
                    <div key={label} className={`${bg} p-4 rounded-3xl border border-gray-100`}>
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
                        <p className={`text-lg font-black ${color} leading-tight`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Grid: Payment breakdown + Top products */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-5">💳 Desglose por Método de Pago</h3>
                    <div className="space-y-3">
                        {Object.keys(payBreak).length === 0 && <p className="text-sm text-gray-300 font-bold text-center py-4">Sin datos</p>}
                        {Object.entries(payBreak).map(([method, info]) => (
                            <div key={method} className="flex items-center gap-4">
                                <div className="flex-1">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-black text-slate-700 uppercase">{method}</span>
                                        <span className="text-xs font-black text-slate-500">{info.count} vta(s)</span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${s.salesCount ? (info.count / s.salesCount) * 100 : 0}%` }}></div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="font-black text-xs text-emerald-600">${info.totalUsd.toFixed(2)}</p>
                                    <p className="text-[9px] text-gray-400 font-bold">Bs. {info.totalBs.toLocaleString('es-VE', { maximumFractionDigits: 0 })}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                    <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest mb-5">📦 Top Productos Vendidos</h3>
                    <div className="space-y-3">
                        {topProd.length === 0 && <p className="text-sm text-gray-300 font-bold text-center py-4">Sin datos</p>}
                        {topProd.map((p, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-700 text-sm truncate">{p.name}</p>
                                    <p className="text-[10px] text-gray-400 font-bold">{p.qty} unidades</p>
                                </div>
                                <p className="font-black text-emerald-600 text-sm shrink-0">${p.revenue.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent sales table */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-50">
                    <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">🧾 Detalle de Ventas</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                {['ID', 'Fecha', 'Items', 'Pago', 'Total $', 'Total Bs.'].map(h => (
                                    <th key={h} className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(data?.sales || []).slice(0, 20).map(sale => (
                                <tr key={sale._id} className="hover:bg-gray-50/50">
                                    <td className="p-4 text-[10px] font-black text-gray-400">{sale.saleId?.slice(-8)}</td>
                                    <td className="p-4 text-xs font-bold text-slate-600">{new Date(sale.date).toLocaleString('es-VE')}</td>
                                    <td className="p-4 text-xs font-bold text-slate-600">{sale.items?.length || 0} artículo(s)</td>
                                    <td className="p-4"><span className="px-3 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-full">{sale.paymentMethod}</span></td>
                                    <td className="p-4 font-black text-emerald-600">${(sale.totalUsd || 0).toFixed(2)}</td>
                                    <td className="p-4 font-black text-slate-600">Bs. {(sale.totalBs || 0).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(data?.sales || []).length === 0 && (
                        <div className="text-center py-12 text-gray-300">
                            <p className="font-black uppercase text-xs tracking-widest">Sin ventas en este período</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Expenses table */}
            {(data?.expenses || []).length > 0 && (
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-50">
                        <h3 className="font-black text-slate-700 uppercase text-xs tracking-widest">💸 Detalle de Egresos</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    {['Descripción', 'Proveedor', 'Categoría', 'Fecha', 'Monto $', 'Monto Bs.'].map(h => (
                                        <th key={h} className="p-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {(data?.expenses || []).map(ex => (
                                    <tr key={ex._id} className="hover:bg-gray-50/50">
                                        <td className="p-4 text-xs font-bold text-slate-700">{ex.description}</td>
                                        <td className="p-4 text-xs text-gray-400 font-bold">{ex.providerName || '—'}</td>
                                        <td className="p-4 text-[10px] text-orange-500 font-bold uppercase">{ex.category}</td>
                                        <td className="p-4 text-xs text-gray-400 font-bold">{new Date(ex.date).toLocaleDateString('es-VE')}</td>
                                        <td className="p-4 font-black text-red-600">${(ex.amountUsd || 0).toFixed(2)}</td>
                                        <td className="p-4 font-black text-slate-600">Bs. {(ex.amountBs || 0).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    #report-content { padding: 20px; }
                }
            `}</style>
        </div>
    );
}
