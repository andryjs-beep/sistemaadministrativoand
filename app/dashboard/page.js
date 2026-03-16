"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
    const [stats, setStats] = useState({
        products: 0,
        salesToday: 0,
        lowStock: 0,
        customers: 0,
        quotations: 0,
        totalUsdDay: 0,
        totalExpensesUsd: 0,
        totalProfit: 0,
        grossMarginPct: 0,
        collectedUsd: 0,
        collectedBs: 0,
        spentUsd: 0,
        spentBs: 0,
        trueNetUsd: 0,
        trueNetBs: 0,
        totalValesUsd: 0,
        totalValesBs: 0
    });
    const [rates, setRates] = useState({ usd: 36.5, eur: 39.8 });
    const [recentSales, setRecentSales] = useState([]);
    const [payBreak, setPayBreak] = useState({});
    const [expenseBreak, setExpenseBreak] = useState({});
    const [isEditingRate, setIsEditingRate] = useState(null);
    const [tempRate, setTempRate] = useState('');
    const [tempPercentage, setTempPercentage] = useState(0);

    useEffect(() => {
        fetchStats();
        fetchTodayReport();
        fetchBcv();
        const interval = setInterval(() => {
            fetchStats();
            fetchTodayReport();
        }, 60000);
        const rateInterval = setInterval(fetchBcv, 60 * 60 * 1000); // 60 minutos
        return () => {
            clearInterval(interval);
            clearInterval(rateInterval);
        };
    }, []);

    const fetchStats = async () => {
        try {
            const [prodRes, custRes, quoteRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/customers'),
                fetch('/api/quotations')
            ]);

            const products = await prodRes.json();
            const customers = await custRes.json();
            const quotes = await quoteRes.json();

            setStats(prev => ({
                ...prev,
                products: Array.isArray(products) ? products.length : 0,
                lowStock: Array.isArray(products) ? products.filter(p => p.stock <= p.minStock).length : 0,
                customers: Array.isArray(customers) ? customers.length : 0,
                quotations: Array.isArray(quotes) ? quotes.filter(q => q.status === 'open').length : 0
            }));
        } catch (e) {
            console.error('Error fetching dashboard stats', e);
        }
    };

    const fetchTodayReport = async () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            const userId = storedUser?._id;

            // 1. Intentar obtener la sesión de caja activa para este usuario
            const cashRes = await fetch(userId ? `/api/cash?userId=${userId}` : '/api/cash');
            const activeSession = await cashRes.json();

            let url = '/api/reports?type=daily';

            if (activeSession && activeSession._id) {
                // Si hay una sesión abierta, mostramos los datos de esa sesión exclusivamente
                url = `/api/reports?type=session&sessionId=${activeSession._id}`;
            } else {
                // Si no hay sesión, mostramos el reporte del día actual como respaldo
                const start = new Date(); start.setHours(0, 0, 0, 0);
                const end = new Date(); end.setHours(23, 59, 59, 999);
                url += `&dateFrom=${start.toISOString()}&dateTo=${end.toISOString()}`;
            }

            // Si es vendedor, filtrar por su ID (aunque el reporte de sesión ya suele ser específico)
            if (storedUser && storedUser.role === 'vendedor') {
                url += `&userId=${userId}`;
            }

            const res = await fetch(url);
            const data = await res.json();

            if (data?.summary) {
                setStats(prev => ({
                    ...prev,
                    salesToday: data.summary.salesCount || 0,
                    totalUsdDay: data.summary.totalSalesUsd || 0,
                    totalExpensesUsd: data.summary.totalExpensesUsd || 0,
                    totalProfit: data.summary.totalProfit || 0,
                    grossMarginPct: data.summary.grossMarginPct || 0,
                    collectedUsd: data.summary.collectedUsd || 0,
                    collectedBs: data.summary.collectedBs || 0,
                    spentUsd: data.summary.spentUsd || 0,
                    spentBs: data.summary.spentBs || 0,
                    trueNetUsd: data.summary.trueNetUsd || 0,
                    trueNetBs: data.summary.trueNetBs || 0,
                    totalValesUsd: data.summary.totalValesUsd || 0,
                    totalValesBs: data.summary.totalValesBs || 0
                }));
            }

            setPayBreak(data?.paymentBreakdown || {});
            setExpenseBreak(data?.expenseBreakdown || {});
            setRecentSales((data?.sales || []).slice(0, 5));
        } catch (e) {
            console.error('Error fetching dashboard report', e);
        }
    };

    const fetchBcv = async () => {
        try {
            const res = await fetch('/api/bcv');
            const json = await res.json();
            if (json.ok && json.data) {
                setRates({
                    usd: json.data.USD,
                    eur: json.data.EUR,
                    percentage: json.data.percentage || 0
                });
            }
        } catch (e) {
            console.error('Error fetching BCV', e);
        }
    };

    const handleSaveRate = async () => {
        if (isEditingRate === 'PERCENT') {
            if (isNaN(tempPercentage)) return;
            try {
                const res = await fetch('/api/bcv', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'USD', percentage: tempPercentage })
                });
                if (res.ok) {
                    fetchBcv();
                    setIsEditingRate(null);
                    alert('Porcentaje actualizado correctamente');
                }
            } catch (e) { alert('Error al guardar porcentaje'); }
            return;
        }

        if (!tempRate || isNaN(tempRate)) return;
        try {
            const res = await fetch('/api/bcv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: isEditingRate, value: tempRate })
            });
            if (res.ok) {
                fetchBcv();
                setIsEditingRate(null);
                setTempRate('');
                alert('Tasa actualizada correctamente');
            }
        } catch (e) {
            alert('Error al guardar tasa');
        }
    };

    const cards = [
        { title: 'Ventas Hoy', value: stats.salesToday, sub: `$${stats.totalUsdDay.toFixed(2)}`, icon: '💰', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { title: 'Productos', value: stats.products, sub: `${stats.lowStock} en stock bajo`, icon: '📦', color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Clientes', value: stats.customers, sub: 'Registrados', icon: '👥', color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { title: 'Cotizaciones', value: stats.quotations, sub: 'Pendientes', icon: '📄', color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans">
            <header className="mb-8 md:mb-10 flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Visión General</p>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Dashboard <span className="text-blue-600 italic">Control</span></h1>
                </div>

                <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                    {/* Tasa EUR */}
                    <div className="flex-1 min-w-[180px] bg-white px-6 py-4 rounded-3xl shadow-sm border-2 border-transparent hover:border-blue-100 transition-all flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tasa EUR (BCV)</p>
                            <p className="text-xl font-black text-blue-600">Bs. {rates.eur.toFixed(2)}</p>
                        </div>
                        <button onClick={() => { setIsEditingRate('EUR'); setTempRate(rates.eur); }} className="p-2 hover:bg-gray-50 rounded-lg text-lg">✏️</button>
                    </div>
                    {/* Tasa USD */}
                    <div className="flex-1 min-w-[180px] bg-white px-6 py-4 rounded-3xl shadow-sm border-2 border-transparent hover:border-emerald-100 transition-all flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tasa USD (BCV)</p>
                            <p className="text-xl font-black text-emerald-600">Bs. {rates.usd.toFixed(2)}</p>
                        </div>
                        <button onClick={() => { setIsEditingRate('USD'); setTempRate(rates.usd); }} className="p-2 hover:bg-gray-50 rounded-lg text-lg">✏️</button>
                    </div>
                    {/* % Ajuste */}
                    <div className="flex-1 min-w-[180px] bg-white px-6 py-4 rounded-3xl shadow-sm border-2 border-transparent hover:border-orange-100 transition-all flex items-center justify-between gap-4 border-l-4 border-l-orange-500">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Ajuste BS (%)</p>
                            <p className="text-xl font-black text-orange-600">+{rates.percentage}%</p>
                        </div>
                        <button onClick={() => { setIsEditingRate('PERCENT'); setTempPercentage(rates.percentage); }} className="p-2 hover:bg-gray-50 rounded-lg text-lg">⚙️</button>
                    </div>
                </div>
            </header>

            {/* Modal Edición Tasa / Porcentaje */}
            {isEditingRate && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-sm w-full animate-in zoom-in duration-200">
                        <h3 className="font-black text-xl mb-6 uppercase tracking-tighter">
                            {isEditingRate === 'PERCENT' ? 'Ajuste Porcentual BS' : `Editar Tasa ${isEditingRate}`}
                        </h3>
                        <div className="space-y-4">
                            <div className="relative">
                                <input
                                    type="number" step={isEditingRate === 'PERCENT' ? "1" : "0.01"}
                                    className="w-full p-4 bg-gray-100 rounded-2xl border-none outline-none font-bold text-lg text-slate-800"
                                    value={isEditingRate === 'PERCENT' ? tempPercentage : tempRate}
                                    onChange={e => isEditingRate === 'PERCENT' ? setTempPercentage(e.target.value) : setTempRate(e.target.value)}
                                    autoFocus
                                />
                                {isEditingRate === 'PERCENT' && <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-gray-400">%</span>}
                            </div>
                            {isEditingRate === 'PERCENT' && (
                                <p className="text-[10px] font-bold text-gray-400 uppercase italic">
                                    Tasa Actual: {rates.usd} <br />
                                    Nueva Tasa Ajustada: {(rates.usd * (1 + parseFloat(tempPercentage || 0) / 100)).toFixed(2)}
                                </p>
                            )}
                            <div className="flex gap-3">
                                <button onClick={handleSaveRate} className="flex-1 py-4 bg-blue-600 text-white font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-blue-100">Guardar</button>
                                <button onClick={() => setIsEditingRate(null)} className="flex-1 py-4 bg-gray-50 text-gray-400 font-black rounded-2xl uppercase tracking-widest text-xs">Cancelar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Grid de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
                {cards.map((card) => (
                    <div key={card.title} className="bg-white p-6 md:p-8 rounded-[38px] shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-start mb-6">
                            <span className={`text-3xl md:text-4xl ${card.bg} w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner`}>
                                {card.icon}
                            </span>
                        </div>
                        <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">{card.title}</h3>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-4xl font-black ${card.color} tracking-tighter`}>{card.value}</span>
                            <span className="text-[10px] font-bold text-gray-400 truncate">{card.sub}</span>
                        </div>
                        <div className="absolute -bottom-4 -right-4 opacity-5 text-6xl font-black uppercase italic tracking-tighter">{card.title.split(' ')[0]}</div>
                    </div>
                ))}
            </div>

            {/* ===== TOTALES DEL DÍA ===== */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[32px] text-white shadow-xl col-span-2">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-80 mb-1">Ingresos Brutos Recaudados</p>
                    <div className="flex justify-between items-end mt-2">
                        <div>
                            <p className="text-3xl font-black tracking-tighter text-emerald-300">${stats.collectedUsd.toFixed(2)}</p>
                            <p className="text-[10px] uppercase tracking-widest opacity-70">En Divisas</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black tracking-tighter text-orange-300">Bs. {stats.collectedBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                            <p className="text-[10px] uppercase tracking-widest opacity-70">En Bolívares</p>
                        </div>
                    </div>
                </div>
                <div className="bg-red-50 p-6 rounded-[32px] border border-red-100 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Gastos / Egresos</p>
                    <p className="text-xl font-black text-red-600">${stats.spentUsd.toFixed(2)} <span className="text-[10px] text-red-400">USD</span></p>
                    <p className="text-lg font-black text-red-500 mt-1">Bs. {stats.spentBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 flex flex-col justify-center">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Vales a Empleados</p>
                    <p className="text-xl font-black text-amber-600">${stats.totalValesUsd.toFixed(2)} <span className="text-[10px] text-amber-500">USD</span></p>
                    <p className="text-lg font-black text-amber-500 mt-1">Bs. {stats.totalValesBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-[32px] border border-emerald-100 flex flex-col justify-center relative">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Caja Neta Diaria</p>
                    <p className="text-xl font-black text-emerald-600">${stats.trueNetUsd.toFixed(2)} <span className="text-[10px] text-emerald-400">USD</span></p>
                    <p className="text-lg font-black text-emerald-500 mt-1">Bs. {stats.trueNetBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                    <p className="absolute top-4 right-4 text-[8px] font-bold text-emerald-400 px-2 py-1 bg-emerald-100 rounded-full">+{stats.grossMarginPct}% margen</p>
                </div>
            </div>

            {/* ===== INGRESOS POR MÉTODO DE PAGO ===== */}
            {Object.keys(payBreak).length > 0 && (
                <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm mb-8">
                    <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest mb-6 border-b pb-4">💰 Ventas por Método de Pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(payBreak).map(([method, info]) => {
                            const isBs = info.currency && info.currency.startsWith('BS');
                            return (
                                <div key={method} className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${isBs ? 'bg-orange-100 text-orange-500' : 'bg-emerald-100 text-emerald-500'}`}>
                                        {isBs ? '🇻🇪' : '💵'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-700 uppercase truncate">{method}</p>
                                        <p className="text-[8px] font-bold text-gray-400">{info.count} ventas</p>
                                    </div>
                                    <p className={`text-base font-black ${isBs ? 'text-orange-500' : 'text-emerald-600'}`}>
                                        {isBs ? 'Bs. ' : '$'}
                                        {(info.mainTotal || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ===== EGRESOS POR MÉTODO ===== */}
            {Object.keys(expenseBreak).length > 0 && (
                <div className="bg-white p-6 md:p-8 rounded-[40px] border border-gray-100 shadow-sm mb-8">
                    <h3 className="font-black text-red-600 uppercase text-xs tracking-widest mb-6 border-b pb-4">📤 Egresos por Método de Pago</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(expenseBreak).map(([method, info]) => {
                            const isBs = info.currency && info.currency.startsWith('BS');
                            return (
                                <div key={method} className="flex items-center gap-3 p-4 rounded-2xl bg-red-50/50">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${isBs ? 'bg-orange-100 text-orange-500' : 'bg-red-100 text-red-500'}`}>
                                        {isBs ? '🇻🇪' : '📤'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-black text-slate-700 uppercase truncate">{method}</p>
                                        <p className="text-[8px] font-bold text-gray-400">{info.count} egresos</p>
                                    </div>
                                    <p className={`text-base font-black ${isBs ? 'text-orange-500' : 'text-red-600'}`}>
                                        {isBs ? 'Bs. ' : '$'}
                                        {(info.mainTotal || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Ventas Recientes */}
                <div className="lg:col-span-2 bg-white p-6 md:p-10 rounded-[40px] shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="flex justify-between items-center mb-8 relative z-10">
                        <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tighter">Últimas Operaciones</h3>
                        <Link href="/pos" className="text-[10px] font-black text-blue-600 bg-blue-50 px-5 py-3 rounded-xl hover:bg-blue-600 hover:text-white transition uppercase tracking-widest shadow-sm">Nueva Venta +</Link>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {recentSales.map(sale => (
                            <div key={sale._id} className="flex items-center justify-between p-5 bg-gray-50/50 rounded-3xl group hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-blue-50">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-xl border border-gray-50">🧾</div>
                                    <div>
                                        <p className="font-black text-slate-800 text-sm tracking-tight">{sale.saleId}</p>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{new Date(sale.createdAt || sale.date).toLocaleTimeString()} • {new Date(sale.createdAt || sale.date).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-emerald-600 text-lg tracking-tighter">${(sale.totalUsd || 0).toFixed(2)}</p>
                                    <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full uppercase italic">{sale.paymentMethod}</span>
                                </div>
                            </div>
                        ))}
                        {recentSales.length === 0 && (
                            <div className="text-center py-24 opacity-20">
                                <span className="text-7xl mb-6 block">⚖️</span>
                                <p className="font-black uppercase tracking-[0.4em] text-xs">Sin actividad comercial</p>
                            </div>
                        )}
                    </div>
                    <div className="absolute top-0 right-0 p-10 text-gray-50 text-9xl font-black italic tracking-tighter select-none pointer-events-none">SALES</div>
                </div>

                {/* Info / Alertas */}
                <div className="space-y-6">
                    <div className="bg-slate-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-4 relative z-10">Acceso <span className="text-blue-400">Rápido</span></h3>
                        <div className="grid grid-cols-2 gap-3 relative z-10">
                            {[
                                { h: '/caja', l: 'Caja', i: '🏧' },
                                { h: '/reportes', l: 'Reportes', i: '📊' },
                                { h: '/clientes', l: 'Clientes', i: '👥' },
                                { h: '/productos', l: 'Stock', i: '📦' }
                            ].map(btn => (
                                <Link key={btn.l} href={btn.h}>
                                    <button className="w-full p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition flex flex-col items-center gap-2 border border-white/5">
                                        <span className="text-2xl">{btn.i}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest">{btn.l}</span>
                                    </button>
                                </Link>
                            ))}
                        </div>
                        <div className="absolute -bottom-8 -right-8 text-white/5 text-8xl font-black italic">MENU</div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-8 flex items-center gap-2">
                            Alertas <span className="text-red-500">Stock</span>
                        </h3>
                        {stats.lowStock > 0 ? (
                            <div className="p-6 bg-red-50 border border-red-100 rounded-3xl text-center">
                                <p className="text-red-800 font-black text-[10px] uppercase mb-1 tracking-[0.2em]">Atención Necesaria</p>
                                <p className="text-red-600 text-xs font-bold mb-6">Hay {stats.lowStock} productos en niveles críticos de existencia.</p>
                                <Link href="/productos">
                                    <button className="w-full py-4 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-red-700 transition shadow-lg shadow-red-100">Gestionar Inventario</button>
                                </Link>
                            </div>
                        ) : (
                            <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-3xl flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm mb-4">✅</div>
                                <p className="text-emerald-800 font-black text-[10px] mb-1 uppercase tracking-widest">Estado Seguro</p>
                                <p className="text-emerald-600 text-[11px] font-bold">Todos los niveles de inventario están en parámetros normales.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <button onClick={fetchTodayReport} className="fixed bottom-6 right-6 bg-blue-600 text-white font-black px-6 py-4 rounded-2xl shadow-2xl hover:bg-blue-700 transition active:scale-95 text-xs uppercase tracking-widest z-50">
                🔄 Actualizar
            </button>
        </div>
    );
}
