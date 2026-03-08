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
    const [bcvRate, setBcvRate] = useState(36.50);
    const [recentSales, setRecentSales] = useState([]);

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
        const res = await fetch('/api/bcv');
        const data = await res.json();
        if (data.value) setBcvRate(data.value);
    };

    const cards = [
        { title: 'Ventas Hoy', value: stats.salesToday, sub: `$${stats.totalUsdDay.toFixed(2)}`, icon: '💰', color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { title: 'Productos', value: stats.products, sub: `${stats.lowStock} en stock bajo`, icon: '📦', color: 'text-blue-600', bg: 'bg-blue-50' },
        { title: 'Clientes', value: stats.customers, sub: 'Registrados', icon: '👥', color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { title: 'Cotizaciones', value: stats.quotations, sub: 'Pendientes', icon: '📄', color: 'text-orange-600', bg: 'bg-orange-50' },
    ];

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans">
            <header className="mb-8 md:mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 sm:gap-0">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Visión General</p>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Dashboard <span className="text-blue-600">Principal</span></h1>
                </div>
                <div className="w-full sm:w-auto bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between sm:justify-start gap-4">
                    <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasa Oficial BCV</p>
                        <p className="text-lg font-black text-emerald-600">Bs. {bcvRate.toFixed(2)}</p>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-xl shrink-0">🏦</div>
                </div>
            </header>

            {/* Grid de Métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
                {cards.map((card) => (
                    <div key={card.title} className="bg-white p-6 md:p-8 rounded-[32px] shadow-sm border border-gray-100 hover:shadow-xl transition-all group">
                        <div className="flex justify-between items-start mb-6">
                            <span className={`text-3xl md:text-4xl ${card.bg} w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                {card.icon}
                            </span>
                            <span className="text-[10px] font-bold text-gray-200 uppercase tracking-widest">Live</span>
                        </div>
                        <h3 className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mb-1">{card.title}</h3>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-3xl md:text-4xl font-black ${card.color}`}>{card.value}</span>
                            <span className="text-[10px] font-bold text-gray-400 truncate">{card.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* Ventas Recientes */}
                <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6 md:mb-8">
                        <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight">Actividad Reciente</h3>
                        <Link href="/pos" className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-600 hover:text-white transition uppercase">Nuevo +</Link>
                    </div>

                    <div className="space-y-4">
                        {recentSales.map(sale => (
                            <div key={sale._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl group hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-lg md:text-xl">🧾</div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-xs md:text-sm truncate max-w-[120px] sm:max-w-none">{sale.saleId}</p>
                                        <p className="text-[9px] text-gray-400 font-black uppercase">{new Date(sale.createdAt).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-slate-800 text-sm md:text-base">${sale.totalUsd.toFixed(2)}</p>
                                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-tighter sm:tracking-widest">{sale.paymentMethod}</p>
                                </div>
                            </div>
                        ))}
                        {recentSales.length === 0 && (
                            <div className="text-center py-16 md:py-20 opacity-30">
                                <span className="text-5xl md:text-6xl mb-4 block">☕</span>
                                <p className="font-bold uppercase tracking-widest text-[10px]">Sin actividad reciente</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Alertas de Inventario */}
                <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100">
                    <h3 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight mb-6 md:mb-8">Alertas <span className="text-red-500">Stock</span></h3>
                    <div className="space-y-4">
                        {stats.lowStock > 0 ? (
                            <div className="p-6 bg-red-50 border border-red-100 rounded-[28px]">
                                <p className="text-red-800 font-black text-xs mb-1 uppercase tracking-widest text-center">Crítico</p>
                                <p className="text-red-600 text-[11px] font-bold text-center mb-4">Hay {stats.lowStock} productos por debajo del mínimo.</p>
                                <Link href="/inventario">
                                    <button className="w-full py-4 bg-red-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] hover:bg-red-700 transition shadow-lg shadow-red-200">Revisar Todo</button>
                                </Link>
                            </div>
                        ) : (
                            <div className="p-8 bg-emerald-50 border border-emerald-100 rounded-[28px] flex flex-col items-center text-center">
                                <span className="text-4xl mb-4">🛡️</span>
                                <p className="text-emerald-800 font-black text-xs mb-1 uppercase tracking-widest">Inventario Seguro</p>
                                <p className="text-emerald-600 text-[11px] font-bold leading-relaxed">Todos los niveles de stock están dentro de los parámetros.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
