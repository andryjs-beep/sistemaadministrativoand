"use client";

import { useState, useEffect } from 'react';

const emptyForm = {
    code: '', name: '', description: '',
    priceUsd: '',       // Precio detal
    costUsd: '',        // Costo compra
    wholesalePriceUsd: '', // Precio mayor
    minWholesaleQty: '6',  // Cantidad mínima para mayor
    stock: '0', minStock: '5',
    imageUrl: '', warehouseId: '', size: 'Unica'
};

const SIZES = [
    'Unica', '2', '4', '6', '8', '10', '12', '14', '16',
    'S', 'M', 'L', 'XL', 'XXL', 'XXXL'
];

export default function ProductosPage() {
    const [products, setProducts] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [form, setForm] = useState(emptyForm);
    const [isEditing, setIsEditing] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
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
            const data = await res.json();
            if (res.ok) {
                setForm(emptyForm);
                setIsEditing(null);
                fetchProducts();
            } else {
                alert(`Error: ${data.error || 'No se pudo guardar'}`);
            }
        } catch (err) {
            alert(`Error de red: ${err.message}`);
        }
        setLoading(false);
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                setForm(prev => ({ ...prev, imageUrl: data.url }));
            } else {
                alert(`Error al subir imagen: ${data.error}`);
            }
        } catch (err) {
            alert('Error al subir imagen');
        }
        setUploading(false);
    };

    const startEdit = (p) => {
        setForm({
            code: p.code || '',
            name: p.name || '',
            description: p.description || '',
            priceUsd: p.priceUsd || '',
            costUsd: p.costUsd || '',
            wholesalePriceUsd: p.wholesalePriceUsd || '',
            minWholesaleQty: p.minWholesaleQty || '6',
            stock: p.stock ?? '0',
            minStock: p.minStock ?? '5',
            imageUrl: p.imageUrl || '',
            warehouseId: p.warehouseId?._id || p.warehouseId || '',
            size: p.size || 'Unica',
        });
        setIsEditing(p._id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const deleteProduct = async (id) => {
        if (!confirm('¿Eliminar este producto?')) return;
        await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        fetchProducts();
    };

    const margin = form.priceUsd && form.costUsd
        ? (((parseFloat(form.priceUsd) - parseFloat(form.costUsd)) / parseFloat(form.costUsd)) * 100).toFixed(1)
        : null;

    const filtered = products.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-full font-sans">
            <header className="mb-8 md:mb-10">
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Catálogo Maestro</p>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight">Gestión de <span className="text-blue-600">Productos</span></h1>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-10">
                {/* Form */}
                <div className="xl:col-span-1">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-xl border border-gray-100 sticky top-10">
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-6">
                            {isEditing ? '✏️ Editar Producto' : '✨ Nuevo Producto'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Code + Retail price */}
                            <div className="grid grid-cols-2 gap-3 items-end">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">SKU / Código</label>
                                    <input required placeholder="PROD-001"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-base placeholder:text-gray-400"
                                        value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Venta Detal ($)</label>
                                    <input required type="number" step="0.01" min="0" placeholder="0.00"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-base"
                                        value={form.priceUsd} onChange={e => setForm({ ...form, priceUsd: e.target.value })} />
                                </div>
                            </div>

                            {/* Name */}
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Nombre del Producto</label>
                                <input required placeholder="Nombre del producto"
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-base"
                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>

                            {/* Size Selector */}
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Talla / Medida</label>
                                <select
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-base appearance-none cursor-pointer"
                                    value={form.size} onChange={e => setForm({ ...form, size: e.target.value })}
                                >
                                    {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Cost */}
                            <div className="space-y-1">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Costo de Compra ($)</label>
                                <input type="number" step="0.01" min="0" placeholder="0.00"
                                    className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-emerald-400 outline-none font-bold text-slate-900 text-base"
                                    value={form.costUsd} onChange={e => setForm({ ...form, costUsd: e.target.value })} />
                            </div>

                            {/* Margin preview */}
                            {margin !== null && (
                                <div className={`px-4 py-3 rounded-2xl flex justify-between items-center ${parseFloat(margin) >= 20 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                                    <span className="text-[10px] font-black text-gray-500 uppercase">Margen de Ganancia</span>
                                    <span className={`font-black text-sm ${parseFloat(margin) >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>{margin}%</span>
                                </div>
                            )}

                            {/* Wholesale section */}
                            <div className="border-t border-gray-100 pt-4">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">💼 Precio al Mayor</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-3">Precio Mayor $</label>
                                        <input type="number" step="0.01" min="0" placeholder="0.00"
                                            className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-violet-400 outline-none font-bold text-slate-900 text-base"
                                            value={form.wholesalePriceUsd} onChange={e => setForm({ ...form, wholesalePriceUsd: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-3">Mín. Unidades</label>
                                        <input type="number" min="1" placeholder="6"
                                            className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-violet-400 outline-none font-bold text-slate-900 text-base"
                                            value={form.minWholesaleQty} onChange={e => setForm({ ...form, minWholesaleQty: e.target.value })} />
                                    </div>
                                </div>
                                <p className="text-xs text-gray-400 font-bold ml-3 mt-2">Si compran {form.minWholesaleQty || 6}+ unidades, aplica precio mayor automáticamente.</p>
                            </div>

                            {/* Stock fields */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-3">Stock</label>
                                    <input required type="number" min="0" placeholder="0"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-base"
                                        value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-3">Stock Mínimo</label>
                                    <input required type="number" min="0" placeholder="5"
                                        className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-base"
                                        value={form.minStock} onChange={e => setForm({ ...form, minStock: e.target.value })} />
                                </div>
                            </div>

                            {/* Warehouse */}
                            {warehouses.length > 0 && (
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-3">Bodega</label>
                                    <select className="w-full p-4 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-base"
                                        value={form.warehouseId} onChange={e => setForm({ ...form, warehouseId: e.target.value })}>
                                        <option value="">Sin bodega asignada</option>
                                        {warehouses.map(w => <option key={w._id} value={w._id}>{w.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Image Upload */}
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-3">Imagen del Producto</label>
                                <div className="flex gap-2">
                                    <label className="flex-1 cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-600 font-black p-4 rounded-2xl flex items-center justify-center gap-2 transition text-base">
                                        {uploading ? '⏳ Subiendo...' : '📸 Cargar Imagen'}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                                    </label>
                                    {form.imageUrl && (
                                        <div className="w-14 h-14 bg-gray-100 rounded-2xl overflow-hidden shrink-0 border border-gray-200">
                                            <img src={form.imageUrl} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                </div>
                                <input placeholder="O pega una URL aquí..."
                                    className="w-full mt-2 p-3 rounded-xl bg-gray-50 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-600 text-sm"
                                    value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} />
                            </div>

                            <button disabled={loading}
                                className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:bg-gray-300 disabled:shadow-none">
                                {loading ? '⏳ GUARDANDO...' : isEditing ? '✅ ACTUALIZAR PRODUCTO' : '✨ CREAR PRODUCTO'}
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
                    <input placeholder="🔍 Buscar producto o código..."
                        className="w-full p-4 rounded-2xl bg-white border border-gray-100 shadow-sm outline-none font-black text-slate-900 text-base placeholder:text-gray-300 focus:ring-2 focus:ring-blue-400"
                        value={search} onChange={e => setSearch(e.target.value)} />

                    <div className="space-y-3">
                        {filtered.map(p => {
                            const profitPct = p.costUsd > 0 ? (((p.priceUsd - p.costUsd) / p.costUsd) * 100).toFixed(0) : null;
                            return (
                                <div key={p._id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3 hover:shadow-lg transition-all">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                                            {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} /> : <span className="text-xl">📦</span>}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-slate-800 text-base uppercase leading-tight">{p.name}</p>
                                            <div className="flex gap-2 items-center mt-1">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.code}</p>
                                                <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter">T: {p.size || 'Unica'}</span>
                                            </div>
                                            {p.warehouseId && <p className="text-xs font-bold text-blue-400 mt-1 tracking-tight">🏭 {p.warehouseId.name}</p>}
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="font-black text-blue-600 text-xl tracking-tighter">${(p.priceUsd || 0).toFixed(2)} <span className="text-[9px] text-gray-400 font-bold uppercase">detal</span></p>
                                            {p.wholesalePriceUsd > 0 && <p className="text-xs font-bold text-violet-500 tracking-tight">${p.wholesalePriceUsd.toFixed(2)} mayor ×{p.minWholesaleQty}</p>}
                                            {p.costUsd > 0 && <p className="text-xs font-bold text-gray-400 tracking-tight">Costo: ${p.costUsd.toFixed(2)}</p>}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-2">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-black uppercase shadow-sm ${p.stock <= p.minStock ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {p.stock} UNI
                                            </span>
                                            {profitPct && (
                                                <span className={`px-4 py-1.5 rounded-full text-xs font-black shadow-sm ${parseFloat(profitPct) >= 20 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                                    {profitPct}% margen
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(p)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition text-sm">✏️</button>
                                            <button onClick={() => deleteProduct(p._id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition text-sm">🗑️</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {filtered.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-[40px] opacity-30 border border-gray-100">
                            <span className="text-8xl mb-4 block">📦</span>
                            <p className="font-black uppercase tracking-widest text-xs">Sin productos</p>
                        </div>
                    )}
                </div>
            </div >
        </div >
    );
}
