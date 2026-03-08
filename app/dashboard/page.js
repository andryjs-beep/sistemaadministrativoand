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
        totalUsdDay: 0
    });
    const [rates, setRates] = useState({ usd: 36.5, eur: 39.8 });
    const [recentSales, setRecentSales] = useState([]);
    const [isEditingRate, setIsEditingRate] = useState(null); // 'USD' o 'EUR'
    const [tempRate, setTempRate] = useState('');

    useEffect(() => {
        fetchStats();
        fetchBcv();
    }, []);

    const fetchStats = async () => {
        try {
            const [prodRes, saleRes, custRes, quoteRes] = await Promise.all([
                fetch('/api/products'),
                fetch('/api/sales'),
                fetch('/api/customers'),
                fetch('/api/quotations')
            ]);

            const products = await prodRes.json();
            const sales = await saleRes.json();
            const customers = await custRes.json();
            const quotes = await quoteRes.json();

            const today = new Date().toISOString().split('T')[0];
            const itemsToday = Array.isArray(sales) ? sales.filter(s => s.createdAt.startsWith(today)) : [];

            setStats({
                products: Array.isArray(products) ? products.length : 0,
                lowStock: Array.isArray(products) ? products.filter(p => p.stock <= p.minStock).length : 0,
                salesToday: itemsToday.length,
                totalUsdDay: itemsToday.reduce((acc, s) => acc + (s.totalUsd || 0), 0),
                customers: Array.isArray(customers) ? customers.length : 0,
                quotations: Array.isArray(quotes) ? quotes.filter(q => q.status === 'open').length : 0
            });

            setRecentSales(itemsToday.slice(0, 5));
        } catch (e) {
            console.error('Error fetching dashboard stats', e);
        }
    };

    const fetchBcv = async () => {
        try {
            const res = await fetch('/api/bcv');
            const data = await res.json();
            if (data.usd && data.eur) {
                setRates({ usd: data.usd.value, eur: data.eur.value });
            }
        } catch (e) {
            console.error('Error fetching BCV', e);
        }
    };

    const handleSaveRate = async () => {
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
                </div>
            </header>

            {/* Modal Edición Tasa */}
            {isEditingRate && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-sm w-full animate-in zoom-in duration-200">
                        <h3 className="font-black text-xl mb-6 uppercase tracking-tighter">Editar Tasa {isEditingRate}</h3>
                        <div className="space-y-4">
                            <input
                                type="number" step="0.01"
                                className="w-full p-4 bg-gray-100 rounded-2xl border-none outline-none font-bold text-lg text-slate-800"
                                value={tempRate} onChange={e => setTempRate(e.target.value)}
                                autoFocus
                            />
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
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">{new Date(sale.createdAt).toLocaleTimeString()} • {new Date(sale.createdAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-emerald-600 text-lg tracking-tighter">${sale.totalUsd.toFixed(2)}</p>
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
        </div>
    );
}
