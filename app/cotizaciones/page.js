"use client";

import { useState, useEffect } from 'react';

export default function CotizacionesPage() {
    const [quotes, setQuotes] = useState([]);

    useEffect(() => {
        fetchQuotes();
    }, []);

    const fetchQuotes = async () => {
        const res = await fetch('/api/quotations');
        const data = await res.json();
        setQuotes(data);
    };

    const convertToSale = async (id) => {
        const quote = quotes.find(q => q._id === id);
        if (!quote) return;

        const paymentMethod = prompt('Ingresa el método de pago (ej: Pago Móvil):');
        if (!paymentMethod) return;

        const res = await fetch('/api/sales', {
            method: 'POST',
            body: JSON.stringify({
                items: quote.items.map(item => ({ productId: item.productId._id, quantity: item.quantity })),
                paymentMethod,
                quotationId: id
            })
        });

        if (res.ok) {
            alert('Convertido a venta con éxito');
            fetchQuotes();
        } else {
            const err = await res.json();
            alert(`Error: ${err.error}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <h1 className="text-3xl font-black mb-8 border-l-4 border-orange-500 pl-4">Gestión de Cotizaciones</h1>

            <div className="overflow-x-auto rounded-2xl border border-gray-800 shadow-2xl">
                <table className="w-full text-left">
                    <thead className="bg-gray-900 text-gray-400 text-xs uppercase font-black">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Fecha</th>
                            <th className="p-4">Items</th>
                            <th className="p-4">Total USD</th>
                            <th className="p-4">Estatus</th>
                            <th className="p-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                        {quotes.map(quote => (
                            <tr key={quote._id} className="hover:bg-gray-900/50 transition">
                                <td className="p-4 font-mono text-orange-400">{quote.quotationId}</td>
                                <td className="p-4">{new Date(quote.date).toLocaleDateString()}</td>
                                <td className="p-4">{quote.items.length} productos</td>
                                <td className="p-4 font-bold">${quote.totalUsd.toFixed(2)}</td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${quote.status === 'open' ? 'bg-orange-900/40 text-orange-400' :
                                            quote.status === 'converted' ? 'bg-green-900/40 text-green-400' :
                                                'bg-gray-800 text-gray-500'
                                        }`}>
                                        {quote.status}
                                    </span>
                                </td>
                                <td className="p-4 text-right">
                                    {quote.status === 'open' && (
                                        <button
                                            onClick={() => convertToSale(quote._id)}
                                            className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded-lg text-xs font-black uppercase transition transform active:scale-95"
                                        >
                                            ✓ Convertir a Venta
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
