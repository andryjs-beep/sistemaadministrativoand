"use client";

import { useState, useEffect, useCallback } from 'react';
import SaleDetailModal from '@/components/modals/SaleDetailModal';
import BoletaTicket, { buildTicketHTML } from '@/components/print/BoletaTicket';

export default function ReportesPage() {
    const [user, setUser] = useState(null);
    const [data, setData] = useState(null);
    const [detailSale, setDetailSale] = useState(null);
    const [printSale, setPrintSale] = useState(null);
    const [printCompany, setPrintCompany] = useState({ name: 'MI EMPRESA', rif: '', address: '', phone: '', email: '' });
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState('daily');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [providers, setProviders] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState('');


    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            let url = `/api/reports?type=${reportType}`;
            if (reportType === 'daily') {
                const start = new Date(); start.setHours(0, 0, 0, 0);
                const end = new Date(); end.setHours(23, 59, 59, 999);
                url += `&dateFrom=${start.toISOString()}&dateTo=${end.toISOString()}`;
            } else if (reportType === 'range') {
                url += `&dateFrom=${dateFrom}&dateTo=${dateTo}`;
            }
            if (searchTerm) {
                url += `&search=${encodeURIComponent(searchTerm)}`;
            }
            if (selectedProvider) {
                url += `&providerId=${selectedProvider}`;
            }
            const res = await fetch(url);
            const json = await res.json();
            setData(json);
        } catch (e) { console.error(e); }
        setLoading(false);
    }, [reportType, dateFrom, dateTo, searchTerm]);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('user'));
        if (stored) setUser(stored);

        // Fetch Providers
        fetch('/api/providers').then(res => res.json()).then(p => {
            if (Array.isArray(p)) setProviders(p);
        }).catch(e => console.error(e));

        fetchReport();

        // Preload company data for printing
        fetch('/api/company').then(r => r.json()).then(d => { if (d && !d.error) setPrintCompany(d); }).catch(() => { });
    }, [fetchReport]);

    const deleteSale = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta factura? El stock será revertido y esta acción es permanente.')) return;
        try {
            const res = await fetch(`/api/sales/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user?._id })
            });
            if (res.ok) {
                alert('Factura eliminada con éxito');
                fetchReport();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (e) { alert('Error al eliminar'); }
    };

    const s = data?.summary || {};
    const payBreak = data?.paymentBreakdown || {};
    const expBreak = data?.expenseBreakdown || {};
    const topProd = data?.topProducts || [];

    const printReport = () => window.print();

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full" id="report-content">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Análisis de Negocio</p>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight italic">Cierres & <span className="text-blue-600">Rentabilidad</span></h1>
                </div>
                <button onClick={printReport}
                    className="px-6 py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-800 transition no-print shadow-xl">
                    🖨️ Imprimir Reporte
                </button>
            </header>

            {/* Filter Bar */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-8 flex flex-wrap items-center gap-4 no-print">
                <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                    {[['daily', '📅 Hoy'], ['range', '📆 Rango'], ['all', '📚 Todas']].map(([key, label]) => (
                        <button key={key} onClick={() => {
                            setReportType(key);
                            if (key === 'all') {
                                setShowAll(true);
                            }
                        }}
                            className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${reportType === key ? 'bg-white text-slate-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                            {label}
                        </button>
                    ))}
                </div>
                {reportType === 'range' && (
                    <div className="flex items-center gap-2">
                        <input type="date" className="p-3 rounded-xl bg-gray-100 border-none outline-none font-bold text-slate-800 text-xs"
                            value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                        <span className="text-gray-300 font-black">/</span>
                        <input type="date" className="p-3 rounded-xl bg-gray-100 border-none outline-none font-bold text-slate-800 text-xs"
                            value={dateTo} onChange={e => setDateTo(e.target.value)} />
                    </div>
                )}
                <div className="flex-1 min-w-[150px]">
                    <select
                        className="w-full p-3 rounded-xl bg-gray-100 border-none outline-none font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 transition"
                        value={selectedProvider}
                        onChange={e => setSelectedProvider(e.target.value)}
                    >
                        <option value="">👤 Todos los Proveedores</option>
                        {providers.map(p => (
                            <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1 min-w-[200px] relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40">🔍</span>
                    <input
                        type="text"
                        placeholder="Buscar por cliente o teléfono..."
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 border-none outline-none font-bold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 transition"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button onClick={fetchReport} disabled={loading}
                    className="px-8 py-3 bg-blue-600 text-white font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-700 transition disabled:opacity-50">
                    {loading ? 'Generando...' : 'Actualizar'}
                </button>
            </div>

            {/* main KPIs Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                {/* Ingresos Brutos */}
                <div className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Ingresos Brutos Recaudados</p>
                        <h2 className="text-5xl font-black tracking-tighter mb-6">${(s.collectedUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                        <div className="flex gap-4">
                            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl flex-1">
                                <p className="text-[8px] font-black uppercase opacity-60 mb-1">Total en Bs</p>
                                <p className="font-black text-xs">Bs. {(s.collectedBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl flex-1">
                                <p className="text-[8px] font-black uppercase opacity-60 mb-1">Ventas Realizadas</p>
                                <p className="font-black text-xs">{s.salesCount || 0} Tickets</p>
                            </div>
                        </div>
                    </div>
                    <div className="absolute -bottom-10 -right-10 text-white/5 text-9xl font-black italic">BRUTO</div>
                </div>

                {/* Ganancia Neta */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-gray-100 shadow-xl flex flex-col justify-between relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Utilidad Estimada (Profit)</p>
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black">+{s.grossMarginPct || 0}% Margen</span>
                        </div>
                        <h2 className="text-5xl font-black text-emerald-600 tracking-tighter mb-4">${(s.totalProfit || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h2>
                        <p className="text-xs font-bold text-gray-400 italic">Calculado sobre el Costo de Compra: <span className="text-slate-700">${(s.totalCostOfGoods || 0).toFixed(2)}</span></p>
                    </div>
                    <div className="absolute -bottom-10 -right-10 text-gray-50 text-9xl font-black italic">PROFIT</div>
                </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Gastos / Egresos</p>
                    <p className="text-xl font-black text-red-600">${(s.spentUsd || 0).toFixed(2)} <span className="text-[10px] text-red-400">USD</span></p>
                    <p className="text-lg font-black text-red-500 mt-1">Bs. {(s.spentBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Vales a Empleados</p>
                    <p className="text-xl font-black text-amber-600">${(s.totalValesUsd || 0).toFixed(2)} <span className="text-[10px] text-amber-500">USD</span></p>
                    <p className="text-lg font-black text-amber-500 mt-1">Bs. {(s.totalValesBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-slate-900 p-6 rounded-[32px] text-white flex flex-col justify-center">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Balance Real (Neto)</p>
                    <p className="text-xl font-black text-white">${(s.trueNetUsd || 0).toFixed(2)} <span className="text-[10px] text-gray-400">USD</span></p>
                    <p className="text-lg font-black text-gray-300 mt-1">Bs. {(s.trueNetBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-violet-50 p-6 rounded-[32px] border border-violet-100">
                    <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1">Ventas al Mayor</p>
                    <p className="text-2xl font-black text-violet-600">{s.wholesaleSalesCount || 0}</p>
                </div>
                <div className="bg-orange-50 p-6 rounded-[32px] border border-orange-100">
                    <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">Con Descuento</p>
                    <p className="text-2xl font-black text-orange-600">{s.discountedSalesCount || 0}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                {/* Payment Stats */}
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-8 border-b pb-4">Desglose de Caja por Cuenta</h3>
                    <div className="space-y-6">
                        {Object.entries(payBreak).map(([method, info]) => {
                            const isBs = info.currency && info.currency.startsWith('BS');
                            return (
                                <div key={method} className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${isBs ? 'bg-orange-50 text-orange-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                        {isBs ? '🇻🇪' : '💵'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-baseline mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-700 uppercase">{method}</span>
                                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{info.count} ventas ({info.currency})</span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-lg font-black ${isBs ? 'text-orange-500' : 'text-emerald-600'}`}>
                                                    {isBs ? 'Bs. ' : '$'}
                                                    {info.mainTotal.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                                <p className="text-[8px] font-black text-gray-300 uppercase">Total de Arqueo</p>
                                            </div>
                                        </div>
                                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-1000 ${isBs ? 'bg-orange-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${s.totalSalesUsd ? (info.totalUsd / s.totalSalesUsd) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(payBreak).length === 0 && (
                            <div className="py-20 text-center opacity-30 italic text-xs font-bold uppercase tracking-widest">No hay ventas registradas</div>
                        )}
                    </div>
                </div>

                {/* Top Products */}
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-8 border-b pb-4">Ranking de Rentabilidad</h3>
                    <div className="space-y-4">
                        {topProd.map((p, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition">
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${i < 3 ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-800 text-xs truncate uppercase tracking-tighter">{p.name}</p>
                                    <div className="flex gap-2 text-[9px] font-bold text-gray-400">
                                        <span>CANT: {p.qty}</span>
                                        <span className="text-emerald-500">PROFIT: ${p.profit.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-800 text-xs">${p.revenue.toFixed(2)}</p>
                                    <p className="text-[8px] font-black text-blue-400 uppercase italic">Revenue</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ===== EGRESOS POR MÉTODO DE PAGO ===== */}
            {Object.keys(expBreak).length > 0 && (
                <div className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm mb-8">
                    <h3 className="font-black text-red-600 uppercase text-xs tracking-widest mb-6 border-b pb-4">📤 Egresos por Método de Pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(expBreak).map(([method, info]) => {
                            const isBs = info.currency && info.currency.toUpperCase().includes('BS');
                            return (
                                <div key={method} className="flex items-center gap-4 p-4 rounded-2xl bg-red-50/50 hover:bg-red-50 transition">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${isBs ? 'bg-orange-100 text-orange-500' : 'bg-red-100 text-red-500'}`}>
                                        {isBs ? '🇻🇪' : '📤'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-700 uppercase truncate">{method}</p>
                                        <p className="text-[8px] font-bold text-gray-400">{info.count} egresos ({info.currency})</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-base font-black ${isBs ? 'text-orange-500' : 'text-red-600'}`}>
                                            {isBs ? 'Bs. ' : '$'}
                                            {(info.mainTotal || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                        <p className="text-[8px] font-bold text-gray-400">
                                            {isBs ? `$ ${(info.totalUsd || 0).toFixed(2)}` : `Bs. ${(info.totalBs || 0).toLocaleString('es-VE')}`}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Sales Detail table */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden mb-12">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest text-blue-600">Auditoría de Ventas (Ingresos)</h3>
                        <p className="text-[10px] font-black text-gray-400 mt-1">{showAll ? 'Mostrando todas las facturas' : 'Mostrando últimas 10 facturas'}</p>
                    </div>
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="px-6 py-2.5 bg-white border border-gray-200 text-slate-700 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-gray-100 transition shadow-sm"
                    >
                        {showAll ? 'Ver menos' : 'Ver todas'}
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100 italic">
                                {['Factura / ID', 'Cliente / Tlf', 'Fecha', 'Tasa', 'Total USD', 'Total BS', 'Acciones'].map(h => (
                                    <th key={h} className="p-3 text-left text-[11px] font-black text-gray-500 uppercase tracking-[0.1em]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(() => {
                                const filteredSales = (data?.sales || []).filter(sale => {
                                    const name = (sale.customerId?.name || sale.customerName || '').toLowerCase();
                                    const phone = (sale.customerId?.phone || sale.customerPhone || '').toLowerCase();
                                    const term = searchTerm.toLowerCase();
                                    return name.includes(term) || phone.includes(term);
                                });

                                const displayedSales = showAll ? filteredSales : filteredSales.slice(0, 10);

                                return displayedSales.map(sale => {
                                    const paidUsd = (sale.payments || []).reduce((acc, p) => (p.currency === 'USD' ? acc + (p.amountUsd || 0) : acc), 0);
                                    const paidBs = (sale.payments || []).reduce((acc, p) => (p.currency !== 'USD' ? acc + (p.amountBs || 0) : acc), 0);

                                    return (
                                        <tr key={sale._id} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="p-3">
                                                <p className="text-xs font-black text-slate-800 tracking-tighter uppercase">{sale.saleId}</p>
                                                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded tracking-widest">{sale.status === 'paid' ? 'PAGADA' : 'CRÉDITO'}</span>
                                            </td>
                                            <td className="p-3">
                                                <p className="text-sm font-black text-slate-700 uppercase">{sale.customerId?.name || sale.customerName || 'Venta Rápida'}</p>
                                                <p className="text-[10px] font-bold text-gray-400 italic">{(sale.customerId?.phone || sale.customerPhone) || 'Sin Teléfono'}</p>
                                            </td>
                                            <td className="p-3 text-sm font-bold text-slate-600">{new Date(sale.date).toLocaleDateString('es-VE')}</td>
                                            <td className="p-3 text-xs font-black text-blue-500 italic">{sale.exchangeRate || (sale.totalBs / sale.totalUsd).toFixed(2)}</td>
                                            <td className="p-3 font-black text-emerald-600 text-base tracking-tighter">
                                                {paidUsd > 0 ? `$${paidUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'}
                                            </td>
                                            <td className="p-3 font-black text-slate-800 text-sm">
                                                {paidBs > 0 ? `Bs. ${paidBs.toLocaleString('es-VE')}` : '—'}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-2">
                                                    <button onClick={() => setDetailSale(sale)} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm hover:bg-blue-600 hover:text-white transition">👁️</button>
                                                    <button onClick={() => setPrintSale(sale)} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm hover:bg-blue-600 hover:text-white transition">🖨️</button>
                                                    {user?.role === 'admin' && (
                                                        <button onClick={() => deleteSale(sale._id)} className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-sm hover:bg-red-600 hover:text-white transition">🗑️</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                });
                            })()}
                        </tbody>
                    </table>
                    {(!data?.sales || data.sales.length === 0) && (
                        <div className="py-20 text-center opacity-30 italic text-xs font-bold">No se registraron ventas en este periodo</div>
                    )}
                </div>
            </div>

            {detailSale && <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />}

            {printSale && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] overflow-y-auto animate-in fade-in duration-300">
                    <div className="min-h-full flex items-center justify-center p-4 md:p-10">
                        <div className="bg-white p-6 md:p-10 rounded-[40px] md:rounded-[50px] shadow-2xl max-w-sm w-full relative border-[8px] md:border-[12px] border-slate-50">
                            <BoletaTicket sale={printSale} />
                            <div className="mt-8 md:mt-10 flex flex-col gap-3 md:gap-4 no-print">
                                <button onClick={() => {
                                    const html = buildTicketHTML(printSale, printCompany);
                                    const w = window.open('', '_blank', 'width=420,height=700,toolbar=0,menubar=0,location=0');
                                    if (w) { w.document.write(html); w.document.close(); }
                                }} className="w-full py-5 md:py-6 bg-slate-900 text-white font-black rounded-2xl md:rounded-3xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform text-xs md:text-sm">🖨️ Imprimir Ticket</button>
                                <button onClick={() => setPrintSale(null)} className="w-full py-3 text-gray-400 font-bold uppercase tracking-widest hover:text-red-500 transition-colors text-xs text-center border-t border-gray-100 pt-5">X Cerrar sin Imprimir</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Expenses Detail table */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden mb-8">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest text-red-600">Auditoría de Egresos (Pagos)</h3>
                    <span className="text-[10px] font-black text-gray-400">Desembolsos en el periodo</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                {['Categoría', 'Proveedor', 'Descripción', 'Fecha', 'Método', 'Tasa', 'Monto $', 'Total BS'].map(h => (
                                    <th key={h} className="p-3 text-left text-[11px] font-black text-gray-500 uppercase tracking-[0.1em]">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {(data?.expenses || []).map(exp => (
                                <tr key={exp._id} className="hover:bg-red-50/30 transition-colors">
                                    <td className="p-3">
                                        <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[9px] font-black uppercase">{exp.category}</span>
                                    </td>
                                    <td className="p-3 text-xs font-black text-slate-600 uppercase truncate max-w-[150px]">{exp.providerName || 'Particular'}</td>
                                    <td className="p-3 text-sm font-bold text-slate-500 italic truncate max-w-[180px]">{exp.description}</td>
                                    <td className="p-3 text-sm font-bold text-slate-600">{new Date(exp.date).toLocaleDateString('es-VE')}</td>
                                    <td className="p-3">
                                        <span className="text-[10px] font-black text-slate-500 uppercase">{exp.paymentMethod}</span>
                                    </td>
                                    <td className="p-3 text-xs font-black text-blue-500 italic">{exp.exchangeRate || '—'}</td>
                                    <td className="p-3 font-black text-red-600 text-base tracking-tighter">${(exp.amountUsd || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                                    <td className="p-3 font-black text-slate-800 text-sm">Bs. {(exp.amountBs || 0).toLocaleString('es-VE')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!data?.expenses || data.expenses.length === 0) && (
                        <div className="py-20 text-center opacity-30 italic text-xs font-bold">No se registraron egresos en este periodo</div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; margin: 0; padding: 0; }
                    #report-content { padding: 0 !important; width: 100% !important; }
                    .rounded-[40px], .rounded-[32px] { border-radius: 12px !important; }
                    h1 { font-size: 24pt !important; }
                    table th, table td { padding: 8px !important; font-size: 8pt !important; }
                }
                ${printSale || detailSale ? 'body { overflow: hidden !important; }' : ''}
            `}</style>
        </div>
    );
}
