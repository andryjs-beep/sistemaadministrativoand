"use client";

import { useState, useEffect } from 'react';

const emptyForm = { code: '', name: '', description: '', priceUsd: '', stock: '0', minStock: '5', imageUrl: '', warehouseId: '' };

export default function ProductosPage() {
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [isEditing, setIsEditing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchProducts();
        fetchWarehouses();
    }, []);

    const fetchProducts = async () => {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
    };

    const fetchWarehouses = async () => {
        const res = await fetch('/api/warehouses');
        const data = await res.json();
        setWarehouses(Array.isArray(data) ? data : []);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const method = isEditing ? 'PUT' : 'POST';
            const body = isEditing ? { id: isEditing, ...form } : form;
            const res = await fetch('/api/products', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                setForm(emptyForm);
                setIsEditing(null);
                fetchProducts();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (err) {
            alert('Error de conexión. Verifica la configuración.');
        }
        setLoading(false);
    };

    const startEdit = (p) => {
        setForm({
            code: p.code || '',
            name: p.name || '',
            description: p.description || '',
            priceUsd: p.priceUsd || '',
            stock: p.stock ?? '0',
            minStock: p.minStock ?? '5',
            imageUrl: p.imageUrl || '',
            warehouseId: p.warehouseId?._id || p.warehouseId || '',
        });
        setIsEditing(p._id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteProduct = async (id) => {
        if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
        const res = await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        if (res.ok) fetchProducts();
    };

    const filtered = products.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans">
            <header className="mb-8 md:mb-10">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Catálogo Maestro</p>
                <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Gestión de <span className="text-blue-600">Productos</span></h1>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-10">
                {/* Form */}
                <div className="xl:col-span-1">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-xl border border-gray-100 sticky top-10">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">
                            {isEditing ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">SKU / CÓDIGO</label>
                                    <input required placeholder="PROD-001"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                        value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">PRECIO USD</label>
                                    <input required type="number" step="0.01" min="0" placeholder="0.00"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                        value={form.priceUsd} onChange={e => setForm({ ...form, priceUsd: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">NOMBRE</label>
                                <input required placeholder="Nombre del producto"
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">STOCK</label>
                                    <input required type="number" min="0" placeholder="0"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                        value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">MÍNIMO</label>
                                    <input required type="number" min="0" placeholder="5"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                        value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} />
                                </div>
                            </div>

                            {warehouses.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">BODEGA</label>
                                    <select className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm"
                                        value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
                                        <option value="">Sin bodega asignada</option>
                                        {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-4">IMAGEN URL</label>
                                <input placeholder="https://... (opcional)"
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-sm placeholder:text-gray-400"
                                    value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
                            </div>

                            <button disabled={loading}
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none">
                                {loading ? '⏳ GUARDANDO...' : isEditing ? '✅ ACTUALIZAR' : '✨ CREAR PRODUCTO'}
                            </button>

                            {isEditing && (
                                <button type="button" onClick={() => { setIsEditing(null); setForm(emptyForm); }}
                                    className="w-full py-2 text-gray-400 font-bold hover:text-slate-800 text-sm transition">
                                    Cancelar edición
                                </button>
                            )}
                        </form>
                    </div>
                </div>

                {/* Product list */}
                <div className="xl:col-span-2 space-y-4">
                    <input
                        placeholder="🔍 Buscar producto o código..."
                        className="w-full p-4 rounded-2xl bg-white border border-gray-100 shadow-sm outline-none font-bold text-slate-900 text-sm placeholder:text-gray-300 focus:ring-2 focus:ring-blue-400"
                        value={search} onChange={e => setSearch(e.target.value)}
                    />

                    <div className="hidden md:grid grid-cols-4 gap-4 px-6 py-3 bg-gray-200/40 rounded-2xl">
                        {['Producto', 'Stock', 'Precio', '⚙️'].map(h => (
                            <span key={h} className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{h}</span>
                        ))}
                    </div>

                    <div className="space-y-3">
                        {filtered.map(p => (
                            <div key={p._id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:grid md:grid-cols-4 items-center gap-4 hover:shadow-lg transition-all">
                                <div className="w-full flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-inner">
                                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} /> : <span className="text-xl">📦</span>}
                                    </div>
                                    <div className="truncate min-w-0">
                                        <p className="font-bold text-slate-800 text-sm truncate uppercase">{p.name}</p>
                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">{p.code}</p>
                                        {p.warehouseId && <p className="text-[9px] font-bold text-blue-400">🏭 {p.warehouseId.name}</p>}
                                    </div>
                                </div>
                                <div className="w-full flex justify-between md:justify-center items-center">
                                    <span className="md:hidden text-[9px] font-bold text-gray-400 uppercase">Stock:</span>
                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase ${p.stock <= p.minStock ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                        {p.stock} UNI
                                    </span>
                                </div>
                                <div className="w-full flex justify-between md:justify-end items-center">
                                    <span className="md:hidden text-[9px] font-bold text-gray-400 uppercase">Precio:</span>
                                    <span className="font-black text-slate-800">${(p.priceUsd || 0).toFixed(2)}</span>
                                </div>
                                <div className="w-full flex justify-center gap-2">
                                    <button onClick={() => startEdit(p)} className="flex-1 md:flex-none p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition">✏️</button>
                                    <button onClick={() => deleteProduct(p._id)} className="flex-1 md:flex-none p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition">🗑️</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filtered.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-[40px] opacity-30 border border-gray-100">
                            <span className="text-8xl mb-4 block">📦</span>
                            <p className="font-black uppercase tracking-widest text-xs">Sin productos</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
