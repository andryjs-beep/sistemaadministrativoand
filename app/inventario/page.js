"use client";

import { useState, useEffect } from 'react';

export default function InventarioPage() {
    const [products, setProducts] = useState([]);
    const [adjustment, setAdjustment] = useState({ productId: '', quantity: '', type: 'add', reason: '' });

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
    };

    const handleAdjustment = async (e) => {
        e.preventDefault();
        if (!adjustment.productId || !adjustment.quantity) return alert('Campos incompletos');

        const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: adjustment.productId,
                quantity: parseInt(adjustment.quantity),
                type: adjustment.type,
                reason: adjustment.reason
            })
        });

        if (res.ok) {
            setAdjustment({ productId: '', quantity: '', type: 'add', reason: '' });
            fetchProducts();
            alert('Inventario actualizado');
        } else {
            const err = await res.json();
            alert(`Error: ${err.error}`);
        }
    };

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans text-slate-900">
            <header className="mb-8 md:mb-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Control Logístico</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Gestión de <span className="text-blue-600">Inventario</span></h1>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-10">
                <div className="xl:col-span-1">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-xl border border-gray-100 sticky top-10">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">Ajuste de Stock</h3>
                        <form onSubmit={handleAdjustment} className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Producto</label>
                                <select
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm appearance-none"
                                    value={adjustment.productId} onChange={e => setAdjustment({ ...adjustment, productId: e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.stock} uni)</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Cant.</label>
                                    <input
                                        type="number" placeholder="0"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm"
                                        value={adjustment.quantity} onChange={e => setAdjustment({ ...adjustment, quantity: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Tipo</label>
                                    <select
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm"
                                        value={adjustment.type} onChange={e => setAdjustment({ ...adjustment, type: e.target.value })}
                                    >
                                        <option value="add">➕ INGRESO</option>
                                        <option value="subtract">➖ EGRESO</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">Observación</label>
                                <textarea
                                    placeholder="Motivo del ajuste..."
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm h-32 resize-none placeholder:text-gray-400"
                                    value={adjustment.reason} onChange={e => setAdjustment({ ...adjustment, reason: e.target.value })}
                                />
                            </div>

                            <button className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-black transition-all active:scale-95 uppercase tracking-widest text-xs">
                                Procesar Ajuste ⚡
                            </button>
                        </form>
                    </div>
                </div>

                <div className="xl:col-span-2">
                    <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 p-6 md:p-8">
                        <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-8">Existencias</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {products.map(p => (
                                <div key={p._id} className="p-5 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between group hover:shadow-lg transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm bg-white ${p.stock <= p.minStock ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {p.stock <= p.minStock ? '⚠️' : '📦'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 text-[11px] uppercase truncate max-w-[120px]">{p.name}</p>
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{p.code}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xl font-black ${p.stock <= p.minStock ? 'text-red-600' : 'text-slate-900'}`}>{p.stock}</p>
                                        <p className="text-[8px] font-black text-gray-400 uppercase">UNIDADES</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        {products.length === 0 && (
                            <div className="text-center py-20 opacity-20">
                                <span className="text-6xl mb-4 block">📦</span>
                                <p className="font-black uppercase tracking-widest text-[10px]">Vacío</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
