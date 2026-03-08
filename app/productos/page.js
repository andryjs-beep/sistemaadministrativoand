"use client";

import { useState, useEffect } from 'react';

export default function ProductosPage() {
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({ code: '', name: '', description: '', priceUsd: '', stock: '', minStock: '5', imageUrl: '' });
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const method = isEditing ? 'PATCH' : 'POST';
        const body = isEditing ? { _id: isEditing, ...form } : form;

        const res = await fetch('/api/products', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            setForm({ code: '', name: '', description: '', priceUsd: '', stock: '', minStock: '5', imageUrl: '' });
            setIsEditing(false);
            fetchProducts();
            alert('Producto guardado correctamente');
        } else {
            const err = await res.json();
            alert(`Error: ${err.error}`);
        }
        setLoading(false);
    };

    const deleteProduct = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
        const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchProducts();
    };

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans">
            <header className="mb-8 md:mb-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Catálogo Maestro</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Gestión de <span className="text-blue-600">Productos</span></h1>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-10">
                {/* Formulario */}
                <div className="xl:col-span-1">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-xl border border-gray-100 sticky top-10">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">SKU / CÓDIGO</label>
                                    <input
                                        required placeholder="PROD-001"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                        value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">PRECIO USD</label>
                                    <input
                                        required type="number" step="0.01" placeholder="0.00"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                        value={form.priceUsd} onChange={e => setForm({ ...form, priceUsd: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">NOMBRE</label>
                                <input
                                    required placeholder="Descripción corta del producto"
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">STOCK</label>
                                    <input
                                        required type="number" placeholder="0"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                        value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">MÍNIMO</label>
                                    <input
                                        required type="number" placeholder="5"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                        value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">IMAGEN URL</label>
                                <input
                                    placeholder="https://..."
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                    value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                                />
                            </div>

                            <button
                                disabled={loading}
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 disabled:bg-gray-300"
                            >
                                {loading ? 'PROCESANDO...' : isEditing ? 'ACTUALIZAR' : 'CREAR PRODUCTO'}
                            </button>

                            {isEditing && (
                                <button
                                    type="button" onClick={() => { setIsEditing(false); setForm({ code: '', name: '', description: '', priceUsd: '', stock: '', minStock: '5', imageUrl: '' }); }}
                                    className="w-full py-2 text-gray-400 font-bold hover:text-slate-800"
                                >
                                    Cancelar
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {/* Listado */}
                <div className="xl:col-span-2 space-y-4">
                    <div className="hidden md:grid grid-cols-4 gap-4 px-8 py-4 bg-gray-200/50 rounded-2xl mb-2">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Producto</span>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Stock</span>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Precio</span>
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">⚙️</span>
                    </div>

                    <div className="space-y-3">
                        {products.map(p => (
                            <div key={p._id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:grid md:grid-cols-4 items-center gap-4 group hover:shadow-xl transition-all">
                                <div className="w-full flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <span className="text-xl">📦</span>}
                                    </div>
                                    <div className="truncate">
                                        <p className="font-bold text-slate-800 text-sm truncate uppercase">{p.name}</p>
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{p.code}</p>
                                    </div>
                                </div>
                                <div className="w-full flex justify-between md:justify-center items-center">
                                    <span className="md:hidden text-[9px] font-bold text-gray-400 uppercase">Estado:</span>
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${p.stock <= p.minStock ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {p.stock} UNI
                                    </span>
                                </div>
                                <div className="w-full flex justify-between md:justify-end items-center">
                                    <span className="md:hidden text-[9px] font-bold text-gray-400 uppercase">Unitario:</span>
                                    <span className="font-black text-slate-800">${p.priceUsd.toFixed(2)}</span>
                                </div>
                                <div className="w-full flex justify-center gap-2">
                                    <button onClick={() => { setForm(p); setIsEditing(p._id); }} className="flex-1 md:flex-none p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition">✏️</button>
                                    <button onClick={() => deleteProduct(p._id)} className="flex-1 md:flex-none p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {products.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-[40px] opacity-20 border border-gray-100">
                            <span className="text-8xl mb-4 block">🏚️</span>
                            <p className="font-black uppercase tracking-widest text-xs">Sin registros</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
