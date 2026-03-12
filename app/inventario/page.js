"use client";

import { useState, useEffect } from 'react';

export default function InventarioPage() {
    const [products, setProducts] = useState([]);
    const [filter, setFilter] = useState('');
    const [adjustment, setAdjustment] = useState({ productId: '', quantity: '', type: 'add', reason: '' });
    const [loading, setLoading] = useState(true);
    const [adjSearch, setAdjSearch] = useState('');
    const [isAdjSearchFocused, setIsAdjSearchFocused] = useState(false);
    const [usage, setUsage] = useState({});
    const [logs, setLogs] = useState([]);
    const [user, setUser] = useState(null);

    useEffect(() => {
        const stored = JSON.parse(localStorage.getItem('user'));
        if (stored) setUser(stored);
        fetchProducts();
        fetchUsage();
        fetchLogs();
    }, []);

    const fetchUsage = async () => {
        try {
            const res = await fetch('/api/inventory/daily-usage');
            const data = await res.json();
            setUsage(data);
        } catch (e) { console.error(e); }
    };

    const fetchLogs = async () => {
        try {
            const res = await fetch('/api/inventory/logs');
            const data = await res.json();
            setLogs(Array.isArray(data) ? data : []);
        } catch (e) { console.error(e); }
    };

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdjustment = async (e) => {
        e.preventDefault();
        if (!adjustment.productId || !adjustment.quantity) return alert('⚠️ Selecciona un producto y una cantidad');

        const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                productId: adjustment.productId,
                quantity: adjustment.quantity,
                type: adjustment.type,
                reason: adjustment.reason,
                userId: user?._id,
                username: user?.username
            })
        });

        if (res.ok) {
            setAdjustment({ productId: '', quantity: '', type: 'add', reason: '' });
            setAdjSearch('');
            fetchProducts();
            fetchUsage();
            fetchLogs();
            alert('✅ Stock actualizado exitosamente');
        } else {
            const err = await res.json();
            alert(`❌ Error: ${err.error}`);
        }
    };

    const filteredProducts = products.filter(p =>
        (p.name || '').toLowerCase().includes(filter.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-screen font-sans text-slate-900">
            <header className="mb-8 md:mb-12">
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Control Logístico</p>
                <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">Gestión de <span className="text-blue-600">Inventario</span></h1>
            </header>

            {/* RESUMEN DE CONSUMO DIARIO */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
                <div className="bg-slate-900 text-white p-6 rounded-[32px] shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Consumo Diario (Franelas)</p>
                        <h4 className="text-2xl font-black tracking-tight mb-4 text-emerald-400">Bodega CAS</h4>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-4xl font-black">{usage['BODEGA CAS']?.units || 0}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Unidades Usadas</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-slate-200">${(usage['BODEGA CAS']?.costUsd || 0).toFixed(2)}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Costo Total a Reponer</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[32px] shadow-xl border border-blue-100 relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Consumo Diario (Franelas)</p>
                        <h4 className="text-2xl font-black tracking-tight mb-4 text-slate-800 uppercase">Bodega PAL</h4>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-4xl font-black text-blue-600">{usage['BODEGA PAL']?.units || 0}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Unidades Usadas</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-slate-800 tracking-tighter">${(usage['BODEGA PAL']?.costUsd || 0).toFixed(2)}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Costo Total a Reponer</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-emerald-500 text-white p-6 rounded-[32px] shadow-2xl flex items-center justify-center text-center">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-80">Total Consumido Hoy</p>
                        <p className="text-5xl font-black tracking-tighter leading-none">
                            <span className="text-xl">$</span>{(Object.values(usage).reduce((acc, curr) => acc + curr.costUsd, 0)).toFixed(2)}
                        </p>
                        <p className="text-xs font-bold mt-2 opacity-90 uppercase tracking-tight">Debes reponer inventario de inmediato</p>
                    </div>
                </div>
            </div>

            {/* BARRA DE BÚSQUEDA */}
            <div className="mb-10 relative max-w-2xl mx-auto drop-shadow-2xl">
                <input
                    type="text"
                    placeholder="Buscar producto por nombre o código..."
                    className="w-full pl-16 pr-8 py-5 rounded-[28px] border-none shadow-2xl focus:ring-4 focus:ring-blue-100 outline-none font-bold text-lg md:text-xl transition-all placeholder:text-gray-300"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-3xl">🔍</span>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 md:gap-10">
                {/* FORMULARIO DE AJUSTE */}
                <div className="xl:col-span-1">
                    <div className="bg-white p-6 md:p-8 rounded-[32px] md:rounded-[40px] shadow-xl border border-gray-100 sticky top-10">
                        <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-8">Ajuste de Stock</h3>
                        <form onSubmit={handleAdjustment} className="space-y-6">
                            <div className="space-y-2 relative">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Producto a ajustar</label>
                                <div className="relative group/adj">
                                    <input
                                        type="text"
                                        placeholder="Buscar por Nombre o Código..."
                                        className={`w-full p-5 rounded-2xl border-none font-bold text-base transition-all outline-none ${adjustment.productId ? 'bg-blue-50 text-blue-700 ring-2 ring-blue-500' : 'bg-gray-100 text-slate-900 focus:ring-2 focus:ring-blue-500'}`}
                                        value={adjSearch}
                                        onChange={(e) => {
                                            setAdjSearch(e.target.value);
                                            if (adjustment.productId) setAdjustment({ ...adjustment, productId: '' });
                                        }}
                                        onFocus={() => setIsAdjSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsAdjSearchFocused(false), 200)}
                                    />
                                    {adjustment.productId && (
                                        <button
                                            type="button"
                                            onClick={() => { setAdjSearch(''); setAdjustment({ ...adjustment, productId: '' }); }}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black"
                                        >✕</button>
                                    )}
                                </div>

                                {isAdjSearchFocused && !adjustment.productId && (
                                    <div className="absolute top-full left-0 w-full bg-white shadow-2xl rounded-2xl mt-2 max-h-64 overflow-y-auto z-[100] border border-gray-100 p-2 space-y-1">
                                        {products
                                            .filter(p =>
                                                (p.name || '').toLowerCase().includes(adjSearch.toLowerCase()) ||
                                                (p.code || '').toLowerCase().includes(adjSearch.toLowerCase())
                                            )
                                            .slice(0, 50)
                                            .map(p => (
                                                <button
                                                    key={p._id}
                                                    type="button"
                                                    className="w-full text-left p-4 hover:bg-blue-50 rounded-xl transition-colors group flex justify-between items-center"
                                                    onClick={() => {
                                                        setAdjustment({ ...adjustment, productId: p._id });
                                                        setAdjSearch(`${p.name} [${p.code}]`);
                                                    }}
                                                >
                                                    <div className="flex-1 pr-4">
                                                        <p className="font-black text-slate-800 text-sm uppercase leading-tight">{p.name}</p>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{p.code}</p>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${p.stock <= p.minStock ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                            {p.stock} unid.
                                                        </span>
                                                    </div>
                                                </button>
                                            ))}
                                        {products.length > 0 && products.filter(p => (p.name || '').toLowerCase().includes(adjSearch.toLowerCase()) || (p.code || '').toLowerCase().includes(adjSearch.toLowerCase())).length === 0 && (
                                            <div className="p-4 text-center text-xs font-black text-gray-400 uppercase italic">No hay resultados</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4 items-end">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Cantidad</label>
                                    <input
                                        type="number" placeholder="0" min="1"
                                        className="w-full p-5 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-base"
                                        value={adjustment.quantity} onChange={e => setAdjustment({ ...adjustment, quantity: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Tipo</label>
                                    <select
                                        className="w-full p-5 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-base cursor-pointer"
                                        value={adjustment.type} onChange={e => setAdjustment({ ...adjustment, type: e.target.value })}
                                    >
                                        <option value="add">➕ INGRESO</option>
                                        <option value="subtract">➖ EGRESO</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Observación / Motivo</label>
                                <textarea
                                    placeholder="Ej: Reposición de mercancía, Devolución, etc..."
                                    className="w-full p-5 rounded-2xl bg-gray-100 border-none focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-900 text-base h-32 resize-none placeholder:text-gray-400"
                                    value={adjustment.reason} onChange={e => setAdjustment({ ...adjustment, reason: e.target.value })}
                                />
                            </div>

                            <button className="w-full py-6 bg-slate-900 text-white font-black rounded-2xl shadow-2xl hover:bg-black transition-all active:scale-95 uppercase tracking-[0.2em] text-sm">
                                Procesar Ajuste ⚡
                            </button>
                        </form>
                    </div>
                </div>

                {/* LISTA DE EXISTENCIAS */}
                <div className="xl:col-span-2">
                    <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-sm border border-gray-100 p-6 md:p-10">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Existencias Actuales</h3>
                            <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-black text-xs uppercase">{filteredProducts.length} Productos</span>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center animate-pulse font-black uppercase tracking-widest text-gray-300">Consultando stock...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {filteredProducts.map(p => (
                                    <div key={p._id} className="p-6 bg-gray-50 rounded-[28px] border border-gray-100 flex items-center justify-between group hover:bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300">
                                        <div className="flex items-center gap-5">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${p.stock <= p.minStock ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                {p.stock <= p.minStock ? '⚠️' : '📦'}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-800 text-base uppercase leading-tight mb-1">{p.name}</p>
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{p.code}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-3xl font-black leading-none ${p.stock <= p.minStock ? 'text-red-600' : 'text-slate-900'}`}>{p.stock}</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Stk: {p.minStock}+</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!loading && filteredProducts.length === 0 && (
                            <div className="text-center py-20 opacity-20">
                                <span className="text-8xl mb-4 block">🔍</span>
                                <p className="font-black uppercase tracking-widest text-sm">No se encontraron productos</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* REGISTRO DE MOVIMIENTOS RECIENTES */}
            <div className="mt-12 md:mt-16 bg-white rounded-[40px] shadow-2xl border border-gray-100 overflow-hidden mb-10">
                <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Registro de Movimientos (Historial)</h3>
                    <button onClick={fetchLogs} className="text-blue-600 font-black text-xs uppercase hover:underline">🔄 Actualizar History</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800 text-white text-[10px] uppercase font-black tracking-widest">
                                <th className="p-5">Fecha / Hora</th>
                                <th className="p-5">Producto</th>
                                <th className="p-5 text-center">Tipo</th>
                                <th className="p-5 text-center">Cant.</th>
                                <th className="p-5">Bodega</th>
                                <th className="p-5">Motivo / Venta</th>
                                <th className="p-5 text-right">Usuario</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {logs.map((log, idx) => (
                                <tr key={log._id || idx} className="hover:bg-blue-50/30 transition-colors text-sm font-bold text-slate-600">
                                    <td className="p-5">
                                        <p className="text-slate-900">
                                            {new Date(log.date).toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })}
                                        </p>
                                        <p className="text-[10px] text-gray-400">
                                            {new Date(log.date).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </td>
                                    <td className="p-5">
                                        <p className="text-slate-900 uppercase font-black leading-none">{log.productName}</p>
                                        <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-tighter">{log.productCode}</p>
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${log.type === 'add' ? 'bg-emerald-100 text-emerald-600' :
                                            log.type === 'subtract' ? 'bg-orange-100 text-orange-600' :
                                                'bg-blue-100 text-blue-600'
                                            }`}>
                                            {log.type === 'add' ? 'Entrada' : log.type === 'subtract' ? 'Salida' : 'Venta'}
                                        </span>
                                    </td>
                                    <td className={`p-5 text-center font-black ${log.type === 'add' ? 'text-emerald-500' : 'text-slate-800'}`}>
                                        {log.type === 'add' ? '+' : '-'}{log.quantity}
                                    </td>
                                    <td className="p-5 text-xs font-black text-blue-400 uppercase">
                                        {log.warehouseName || 'Principal'}
                                    </td>
                                    <td className="p-5 text-[10px] text-slate-400 leading-tight">
                                        {log.reason}
                                    </td>
                                    <td className="p-5 text-right italic font-bold">
                                        {log.username || 'Sistema'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
