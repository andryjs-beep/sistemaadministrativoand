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
        try {
            const res = await fetch('/api/bcv');
            const json = await res.json();
            if (json.ok && json.data) {
                setBcvRate(json.data.EUR || 39.8);
            }
        } catch (e) { console.error('Error loading BCV', e); }
    };

    const convertToSale = async (quote) => {
        if (!confirm(`¿Facturar cotización ${quote.quotationId}?`)) return;

        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: quote.items.map(i => ({ productId: i.productId?._id || i.productId, quantity: i.quantity })),
                    paymentMethod: 'Dólares Efectivo',
                    quotationId: quote._id,
                    customerId: quote.customerId?._id || quote.customerId
                })
            });

            if (res.ok) {
                alert('Facturado exitosamente');
                fetchQuotes();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (e) { alert('Error de conexión'); }
    };

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans">
            <header className="mb-8 md:mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-1">Pre-Ventas</p>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Cotizaciones</h1>
                </div>
                <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-right">Tasa Referencial</p>
                    <p className="text-lg font-black text-blue-600">Bs. {bcvRate.toFixed(2)}</p>
                </div>
            </header>

            <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-xl border border-gray-100 overflow-hidden">
                {/* Vista Escritorio */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="p-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Documento</th>
                                <th className="p-6 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Cliente</th>
                                <th className="p-6 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Monto USD</th>
                                <th className="p-6 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {quotes.map(q => (
                                <tr key={q._id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="p-6">
                                        <p className="font-black text-slate-800 text-xs uppercase">{q.quotationId}</p>
                                        <p className="text-[9px] font-bold text-gray-400 uppercase">{new Date(q.date).toLocaleDateString()}</p>
                                    </td>
                                    <td className="p-6">
                                        <p className="font-bold text-slate-800 text-xs uppercase">{q.customerId?.name || 'C. General'}</p>
                                    </td>
                                    <td className="p-6 text-right">
                                        <p className="font-black text-slate-900">${q.totalUsd?.toFixed(2)}</p>
                                        <p className="text-[9px] font-bold text-blue-600 uppercase">Bs. {(q.totalUsd * 1.15 * bcvRate).toLocaleString('es-VE')}</p>
                                    </td>
                                    <td className="p-6">
                                        <div className="flex justify-center">
                                            {q.status === 'open' ? (
                                                <button onClick={() => convertToSale(q)} className="px-4 py-2 bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-emerald-700 transition">Facturar</button>
                                            ) : (
                                                <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Procesada</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Vista Móvil */}
                <div className="md:hidden divide-y divide-gray-100">
                    {quotes.map(q => (
                        <div key={q._id} className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-black text-slate-800 text-sm uppercase">{q.quotationId}</p>
                                    <p className="text-[10px] font-bold text-gray-400">{new Date(q.date).toLocaleDateString()}</p>
                                </div>
                                {q.status === 'open' ? (
                                    <button onClick={() => convertToSale(q)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase">Facturar ⚡</button>
                                ) : (
                                    <span className="text-[9px] font-black text-gray-300 uppercase">Procesada</span>
                                )}
                            </div>
                            <div className="flex justify-between items-end border-t border-gray-50 pt-3">
                                <p className="text-[11px] font-bold text-slate-600 uppercase max-w-[150px] truncate">{q.customerId?.name || 'Cliente General'}</p>
                                <div className="text-right">
                                    <p className="font-black text-slate-900 text-base">${q.totalUsd?.toFixed(2)}</p>
                                    <p className="text-[9px] font-bold text-blue-600 uppercase">Bs. {(q.totalUsd * 1.15 * bcvRate).toLocaleString('es-VE')}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {quotes.length === 0 && (
                    <div className="text-center py-20 opacity-20">
                        <span className="text-6xl mb-4 block">📄</span>
                        <p className="font-black uppercase tracking-widest text-[10px]">Sin registros</p>
                    </div>
                )}
            </div>
        </div>
    );
}
