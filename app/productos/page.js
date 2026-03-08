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

        // Si es edición, el API espera el ID en el body
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
        <div className="p-10 bg-gray-50 min-h-full font-sans">
            <header className="mb-10">
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Catálogo Maestro</p>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Gestión de <span className="text-blue-600">Productos</span></h1>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                {/* Formulario Lateral */}
                <div className="xl:col-span-1">
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 sticky top-10">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">{isEditing ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Código/SKU</label>
                                    <input
                                        required placeholder="PROD-001"
                                        className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                        value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Precio USD</label>
                                    <input
                                        required type="number" step="0.01" placeholder="0.00"
                                        className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                        value={form.priceUsd} onChange={e => setForm({ ...form, priceUsd: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Nombre del Producto</label>
                                <input
                                    required placeholder="Ej. Harina Pan 1kg"
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Stock Inicial</label>
                                    <input
                                        required type="number" placeholder="0"
                                        className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                        value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Stock Mínimo</label>
                                    <input
                                        required type="number" placeholder="5"
                                        className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                        value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">Imagen URL (Cloudinary)</label>
                                <input
                                    placeholder="https://..."
                                    className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                                    value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                                />
                            </div>

                            <button
                                disabled={loading}
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 hover:-translate-y-1 transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none"
                            >
                                {loading ? 'GUARDANDO...' : isEditing ? 'ACTUALIZAR PRODUCTO' : 'CREAR PRODUCTO 🚀'}
                            </button>

                            {isEditing && (
                                <button
                                    type="button" onClick={() => { setIsEditing(false); setForm({ code: '', name: '', description: '', priceUsd: '', stock: '', minStock: '5', imageUrl: '' }); }}
                                    className="w-full py-2 text-gray-400 font-bold hover:text-slate-800 transition"
                                >
                                    Cancelar Edición
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {/* Listado Principal */}
                <div className="xl:col-span-2">
                    <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="p-6 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Producto</th>
                                    <th className="p-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock</th>
                                    <th className="p-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Precio USD</th>
                                    <th className="p-6 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {products.map(p => (
                                    <tr key={p._id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                                                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <span className="text-2xl">📦</span>}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase">{p.code}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center">
                                            <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${p.stock <= p.minStock ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {p.stock} UNIDADES
                                            </span>
                                        </td>
                                        <td className="p-6 text-right">
                                            <span className="font-black text-slate-800">${p.priceUsd.toFixed(2)}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex justify-center gap-2 invisible group-hover:visible transition-all">
                                                <button onClick={() => { setForm(p); setIsEditing(p._id); }} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition">✏️</button>
                                                <button onClick={() => deleteProduct(p._id)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {products.length === 0 && (
                            <div className="text-center py-20 opacity-20">
                                <span className="text-8xl mb-4 block">🏚️</span>
                                <p className="font-black uppercase tracking-widest text-sm">Sin productos en bodega</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
