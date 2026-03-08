"use client";

import { useState, useEffect, useRef } from 'react';
import BoletaTicket from '@/components/print/BoletaTicket';

export default function PosPage() {
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [bcvRate, setBcvRate] = useState(36.50);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [methods, setMethods] = useState([]);
    const [lastSale, setLastSale] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCartMobile, setShowCartMobile] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
        fetchMethods();
        fetchBcv();
        const interval = setInterval(fetchBcv, 120000); // Cada 2 min para no saturar
        return () => clearInterval(interval);
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch('/api/products');
            const data = await res.json();
            setProducts(Array.isArray(data) ? data : []);
        } catch (e) { console.error('Error loading products', e); }
    };

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            setCustomers(Array.isArray(data) ? data : []);
        } catch (e) { console.error('Error loading customers', e); }
    };

    const fetchMethods = async () => {
        try {
            const res = await fetch('/api/paymentMethods');
            const data = await res.json();
            setMethods(Array.isArray(data) ? data : []);
        } catch (e) { console.error('Error loading methods', e); }
    };

    const fetchBcv = async () => {
        try {
            const res = await fetch('/api/bcv');
            const data = await res.json();
            // El API ahora devuelve { usd, eur, value }
            if (data && data.value) setBcvRate(data.value);
        } catch (e) { console.error('Error loading BCV', e); }
    };

    const addToCart = (product) => {
        if (product.stock <= 0) return alert('¡Sin stock disponible!');
        setCart(prev => {
            const existing = prev.find(item => item._id === product._id);
            if (existing) {
                if (existing.quantity >= product.stock) {
                    alert('No puedes agregar más de lo que hay en stock');
                    return prev;
                }
                return prev.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1, discountPercent: 0 }];
        });
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item._id === id) {
                const newQty = item.quantity + delta;
                if (newQty < 1) return item;
                if (newQty > item.stock) {
                    alert('Excede el stock disponible');
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const updateDiscount = (id, percent) => {
        let val = parseFloat(percent);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;
        setCart(prev => prev.map(item => item._id === id ? { ...item, discountPercent: val } : item));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item._id !== id));

    const calculateItemPrice = (item) => {
        let price = item.priceUsd;
        let isWholesale = false;
        if (item.wholesalePriceUsd > 0 && item.quantity >= (item.minWholesaleQty || 6)) {
            price = item.wholesalePriceUsd;
            isWholesale = true;
        }
        if (item.discountPercent > 0) {
            price = price * (1 - (item.discountPercent / 100));
        }
        return { price, isWholesale };
    };

    const totalUsd = cart.reduce((acc, item) => {
        const { price } = calculateItemPrice(item);
        return acc + (price * item.quantity);
    }, 0);

    const totalBs = totalUsd * bcvRate;

    const handleSale = async () => {
        if (cart.length === 0) return alert('El carrito está vacío');
        if (!paymentMethod) return alert('Debes seleccionar un método de pago');

        setIsProcessing(true);
        const method = methods.find(m => m.name === paymentMethod);

        try {
            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(item => ({
                        productId: item._id,
                        quantity: item.quantity,
                        discountPercent: item.discountPercent
                    })),
                    paymentMethod,
                    accountNumber: method?.accountNumber,
                    customerId: selectedCustomerId
                })
            });

            if (res.ok) {
                const sale = await res.json();
                setLastSale(sale);
                setCart([]);
                setSelectedCustomerId('');
                setCustomerSearch('');
                fetchProducts();
                alert('¡Venta completada con éxito!');
            } else {
                const err = await res.json();
                alert(`Error: ${err.error || 'No se pudo procesar la venta'}`);
            }
        } catch (e) {
            alert('Error de conexión con el servidor');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredProducts = products.filter(p =>
        (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.code || '').toLowerCase().includes(search.toLowerCase())
    );

    const filteredCustomers = customers.filter(c =>
        (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.idNumber || '').toLowerCase().includes(customerSearch.toLowerCase()) ||
        (c.phone || '').toLowerCase().includes(customerSearch.toLowerCase())
    );

    return (
        <div className="h-screen flex flex-col bg-gray-50 font-sans overflow-hidden text-slate-900">
            {/* Header mejorado */}
            <header className="bg-white px-4 md:px-8 py-4 shadow-sm flex flex-col md:flex-row justify-between items-center z-10 gap-4 border-b">
                <div className="flex items-center gap-6 w-full md:w-auto">
                    <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Ventas POS</h1>

                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Buscar Cliente (Nombre/ID/Tlf)..."
                            className="w-full bg-gray-100 border-none rounded-xl px-4 py-2.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                            value={customerSearch}
                            onChange={(e) => setCustomerSearch(e.target.value)}
                        />
                        {customerSearch && (
                            <div className="absolute top-full left-0 w-full bg-white shadow-2xl rounded-xl mt-1 max-h-48 overflow-y-auto z-[60] border border-gray-100">
                                <button
                                    className="w-full text-left p-3 hover:bg-gray-50 text-[10px] font-black uppercase text-blue-600 border-b"
                                    onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); }}
                                >
                                    👤 Consumidor Final
                                </button>
                                {filteredCustomers.map(c => (
                                    <button
                                        key={c._id}
                                        className="w-full text-left p-3 hover:bg-blue-50 text-[10px] font-bold border-b last:border-none flex justify-between"
                                        onClick={() => { setSelectedCustomerId(c._id); setCustomerSearch(c.name); }}
                                    >
                                        <span>{c.name}</span>
                                        <span className="text-gray-400">{c.idNumber}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <span className="text-[9px] font-black text-gray-400 uppercase block tracking-widest">Tasa Referencial (BCV)</span>
                        <span className="text-xl font-black text-emerald-600">Bs. {bcvRate.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={() => setShowCartMobile(true)}
                        className="md:hidden relative bg-slate-900 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                    >
                        🛒 {cart.length > 0 && <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-bounce">{cart.length}</span>}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Catálogo de Productos */}
                <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
                    <div className="mb-6 relative">
                        <input
                            type="text"
                            placeholder="Buscar por Nombre o Código (Escáner)..."
                            className="w-full pl-12 pr-6 py-5 rounded-2xl border-none shadow-xl focus:ring-2 focus:ring-blue-500 outline-none text-lg font-black text-slate-900 placeholder:text-gray-300 transition-shadow"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {filteredProducts.map(product => {
                                const isLowStock = product.stock <= product.minStock;
                                return (
                                    <div
                                        key={product._id}
                                        onClick={() => addToCart(product)}
                                        className="bg-white p-4 rounded-[32px] shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer border-2 border-transparent hover:border-blue-200 flex flex-col group min-h-[220px]"
                                    >
                                        <div className="flex-1 flex flex-col items-center">
                                            <div className="w-full aspect-square bg-gray-50 rounded-2xl mb-4 overflow-hidden flex items-center justify-center relative shadow-inner">
                                                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <span className="text-5xl opacity-20">📦</span>}
                                                {isLowStock && <span className="absolute top-3 left-3 bg-red-600 text-white text-[8px] px-2 py-0.5 rounded-full font-black uppercase shadow-lg">Stock Crítico</span>}
                                            </div>
                                            <h3 className="font-black text-slate-800 text-xs md:text-sm line-clamp-2 text-center leading-tight uppercase tracking-tighter px-2 h-10">{product.name}</h3>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
                                            <div className="flex justify-between items-center text-xs font-black">
                                                <span className="text-blue-600 text-base">${product.priceUsd.toFixed(2)}</span>
                                                <span className={`${product.stock <= 0 ? 'text-red-500' : 'text-gray-400'}`}>Stock: {product.stock}</span>
                                            </div>
                                            {product.wholesalePriceUsd > 0 && (
                                                <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl text-center">
                                                    <span className="text-[10px] font-black uppercase">💡 Mayor: ${product.wholesalePriceUsd.toFixed(2)} (+{product.minWholesaleQty || 6})</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Panel lateral - Carrito y Pagos */}
                <div className="hidden md:flex flex-col w-[420px] lg:w-[480px] bg-white shadow-2xl p-6 lg:p-8 z-20 border-l border-gray-100 h-full">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <span className="bg-slate-900 text-white w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg">{cart.length}</span>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Carrito de Venta</h2>
                        </div>
                        <button onClick={() => setCart([])} className="text-xs font-black text-red-500 hover:scale-105 transition-transform uppercase italic">Vaciar Carrito</button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        {cart.map(item => {
                            const { price, isWholesale } = calculateItemPrice(item);
                            return (
                                <div key={item._id} className="bg-gray-50 p-5 rounded-[28px] border border-gray-100 relative group animate-in slide-in-from-right duration-300">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <p className="font-black text-slate-800 text-sm uppercase leading-tight line-clamp-2 mb-1">{item.name}</p>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.code}</p>
                                        </div>
                                        <button onClick={() => removeFromCart(item._id)} className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 text-sm">✕</button>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center bg-white shadow-sm rounded-2xl p-1 border">
                                            <button onClick={() => updateQuantity(item._id, -1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-slate-900 font-black text-lg">-</button>
                                            <span className="w-10 text-center font-black text-base">{item.quantity}</span>
                                            <button onClick={() => updateQuantity(item._id, 1)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-50 text-slate-900 font-black text-lg">+</button>
                                        </div>

                                        <div className="space-y-1 flex-1 px-4">
                                            <label className="text-[10px] font-black text-gray-400 uppercase block ml-1 underline decoration-blue-500/30">Descuento %</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white border-2 border-transparent focus:border-blue-500 rounded-xl text-sm font-black text-center py-2 outline-none shadow-sm text-slate-900"
                                                value={item.discountPercent}
                                                onChange={(e) => updateDiscount(item._id, e.target.value)}
                                                min="0" max="100"
                                            />
                                        </div>

                                        <div className="text-right flex flex-col items-end">
                                            <span className={`text-[10px] font-black uppercase mb-1 ${isWholesale ? 'text-violet-600 animate-pulse' : 'text-gray-400'}`}>
                                                {isWholesale ? '🔥 Mayor' : 'Precio Detal'}
                                            </span>
                                            <span className="font-black text-slate-800 text-lg tracking-tighter">${(price * item.quantity).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {cart.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20 py-24 grayscale">
                                <span className="text-9xl mb-6">🛒</span>
                                <p className="font-black uppercase tracking-[0.3em] text-xs">Agrega productos</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-800 font-black text-2xl uppercase tracking-tighter italic">Subtotal USD</span>
                                <span className="text-slate-800 font-black text-4xl tracking-tighter italic">${totalUsd.toFixed(2)}</span>
                            </div>
                            <div className="bg-slate-900 p-6 rounded-[32px] text-white shadow-2xl relative overflow-hidden flex justify-between items-center group">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] mb-1">Total en Bolívares</p>
                                    <p className="text-3xl font-black italic tracking-tighter">Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                                </div>
                                <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-white/10 to-transparent skew-x-[30deg] translate-x-12"></div>
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block text-center border-b pb-2">Elegir Forma de Pago</p>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                {methods.map(m => (
                                    <button
                                        key={m._id}
                                        onClick={() => setPaymentMethod(m.name)}
                                        className={`group relative py-4 px-2 rounded-2xl text-[10px] font-black uppercase transition-all border-2 overflow-hidden flex flex-col items-center gap-1 ${paymentMethod === m.name ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-gray-50 border-gray-50 text-gray-400 hover:border-blue-100 hover:bg-white'}`}
                                    >
                                        <span className="relative z-10">{m.name}</span>
                                        {m.accountNumber && <span className={`text-[8px] font-bold truncate w-full px-1 ${paymentMethod === m.name ? 'text-white/70' : 'text-gray-300'}`}>{m.accountNumber}</span>}
                                        {paymentMethod === m.name && <span className="absolute -top-1 -right-1 text-lg">✨</span>}
                                    </button>
                                ))}
                                {methods.length === 0 && <p className="col-span-full text-[10px] font-black text-red-400 text-center py-4 bg-red-50 rounded-xl uppercase">⚠️ No hay métodos de pago creados</p>}
                            </div>
                        </div>

                        <button
                            disabled={isProcessing || cart.length === 0 || !paymentMethod}
                            onClick={handleSale}
                            className={`w-full py-6 rounded-[28px] font-black text-base uppercase tracking-[0.3em] transition-all transform active:scale-95 shadow-xl hover:-translate-y-1 ${isProcessing || cart.length === 0 || !paymentMethod
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 ring-4 ring-blue-600/10'
                                }`}
                        >
                            {isProcessing ? '⚡ Generando Factura...' : (paymentMethod ? `Facturar Venta 🚀` : 'Selecciona Pago')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Modal de Ticket de Impresión */}
            {lastSale && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[200] animate-in fade-in zoom-in duration-300">
                    <div className="bg-white p-6 md:p-10 rounded-[50px] shadow-2xl max-w-sm w-full relative overflow-hidden border-[12px] border-slate-50">
                        <BoletaTicket sale={lastSale} />
                        <div className="mt-10 flex flex-col gap-4">
                            <button onClick={() => { window.print(); setLastSale(null); }} className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform">🖨️ Imprimir Ticket</button>
                            <button onClick={() => setLastSale(null)} className="w-full py-3 text-gray-400 font-bold uppercase tracking-widest hover:text-red-500 transition-colors">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                @media print { .no-print { display: none !important; } }
            `}</style>
        </div>
    );
}
