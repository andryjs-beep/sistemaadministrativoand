"use client";

import { useState, useEffect } from 'react';

export default function CotizacionesPage() {
    const [quotes, setQuotes] = useState([]);
    const [bcvRate, setBcvRate] = useState(36.50);

    useEffect(() => {
        fetchQuotes();
        fetchBcv();
    }, []);

    const fetchQuotes = async () => {
        const res = await fetch('/api/quotations');
        const data = await res.json();
        setQuotes(Array.isArray(data) ? data : []);
    };

    const fetchBcv = async () => {
        const res = await fetch('/api/bcv');
        const data = await res.json();
        if (data.value) setBcvRate(data.value);
    };

    const convertToSale = async (quote) => {
        if (!confirm(`¿Convertir cotización ${quote.quotationId} en una venta final?`)) return;

        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: quote.items.map(i => ({ productId: i.productId?._id || i.productId, quantity: i.quantity })),
                    paymentMethod: 'Dólares Efectivo', // Default
                    quotationId: quote._id,
                    customerId: quote.customerId?._id || quote.customerId
                })
            });

            if (res.ok) {
                alert('Cotización convertida en venta exitosamente');
                fetchQuotes();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (e) {
            alert('Error de conexión');
        }
    };

    return (
        <div className="p-10 bg-gray-50 min-h-full font-sans">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Pre-Ventas</p>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de <span className="text-blue-600">Cotizaciones</span></h1>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tasa para conversión</p>
                        <p className="text-lg font-black text-blue-600">Bs. {bcvRate.toFixed(2)}</p>
                    </div>
                </div>
            </header>

            <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cotización</th>
                            <th className="p-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                            <th className="p-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Items</th>
                            <th className="p-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Total USD</th>
                            <th className="p-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {quotes.map(q => (
                            <tr key={q._id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="p-6">
                                    <div className="flex items-center gap-4">
                                        <span className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-xl">📄</span>
                                        <div>
                                            <p className="font-black text-slate-800 text-sm uppercase">{q.quotationId}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(q.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6">
                                    <p className="font-bold text-slate-800 text-sm uppercase">{q.customerId?.name || 'Cliente General'}</p>
                                    <p className="text-[10px] font-bold text-gray-400">{q.customerId?.idNumber || 'Sin ID'}</p>
                                </td>
                                <td className="p-6 text-center">
                                    <span className="px-3 py-1 bg-gray-100 rounded-full text-[10px] font-black text-slate-600">{q.items?.length || 0} PROD</span>
                                </td>
                                <td className="p-6 text-right">
                                    <p className="font-black text-slate-800 text-lg">${q.totalUsd?.toFixed(2)}</p>
                                    <p className="text-[10px] font-bold text-blue-600">Bs. {(q.totalUsd * 1.15 * bcvRate).toLocaleString('es-VE')}</p>
                                </td>
                                <td className="p-6">
                                    <div className="flex justify-center gap-2">
                                        {q.status === 'open' ? (
                                            <button
                                                onClick={() => convertToSale(q)}
                                                className="px-6 py-2 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-100"
                                            >
                                                ⚡ Facturar
                                            </button>
                                        ) : (
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CONVERTIDA</span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {quotes.length === 0 && (
                    <div className="text-center py-20 opacity-20">
                        <span className="text-8xl mb-4 block">📑</span>
                        <p className="font-black uppercase tracking-widest text-sm">No hay cotizaciones pendientes</p>
                    </div>
                )}
            </div>
        </div>
    );
}
