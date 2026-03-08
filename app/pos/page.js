"use client";

import { useState, useEffect, useRef } from 'react';
import BoletaTicket from '@/components/print/BoletaTicket';

export default function PosPage() {
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
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
        const interval = setInterval(fetchBcv, 60000);
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
            return [...prev, { ...product, quantity: 1 }];
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

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item._id !== id));

    const totalUsd = cart.reduce((acc, item) => acc + (item.priceUsd * item.quantity), 0);
    const totalBs = totalUsd * 1.15 * bcvRate;

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
                    items: cart.map(item => ({ productId: item._id, quantity: item.quantity })),
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
                fetchProducts(); // Refresh stock
                alert('Venta procesada correctamente');
            } else {
                const err = await res.json();
                alert(`Error: ${err.error || 'Error desconocido'}`);
            }
        } catch (e) {
            alert('Error de conexión con el servidor');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="h-screen flex flex-col bg-gray-100 font-sans overflow-hidden relative">
            <header className="bg-white px-4 md:px-8 py-4 shadow-sm flex flex-col md:flex-row justify-between items-center z-10 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h1 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight whitespace-nowrap">Ventas</h1>
                    <div className="hidden md:block h-6 w-px bg-gray-200"></div>
                    <select
                        className="flex-1 md:flex-none bg-blue-50 border-none rounded-lg px-4 py-2 font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-sm"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                        <option value="">Consumidor Final</option>
                        {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-6 bg-gray-50 md:bg-transparent px-4 py-2 md:p-0 rounded-xl">
                    <div className="flex flex-col items-start md:items-end">
                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tasa BCV</span>
                        <span className="text-base md:text-lg font-black text-emerald-600">Bs. {bcvRate.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={() => setShowCartMobile(true)}
                        className="md:hidden relative bg-slate-900 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                    >
                        🛒
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-bounce">
                                {cart.length}
                            </span>
                        )}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Catálogo */}
                <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
                    <div className="mb-4 md:mb-6 relative">
                        <input
                            type="text"
                            placeholder="Buscar productos..."
                            className="w-full pl-12 pr-6 py-4 rounded-2xl border-none shadow-lg focus:ring-2 focus:ring-blue-500 outline-none text-base md:text-lg font-bold text-slate-900 placeholder:text-gray-400"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl md:text-2xl">🔍</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
                            {filteredProducts.map(product => (
                                <div
                                    key={product._id}
                                    onClick={() => addToCart(product)}
                                    className="bg-white p-3 md:p-4 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border-2 border-transparent hover:border-blue-100 flex flex-col group min-h-[180px] md:min-h-[220px]"
                                >
                                    <div className="flex-1 flex flex-col items-center">
                                        <div className="w-full aspect-square bg-gray-50 rounded-2xl mb-3 overflow-hidden flex items-center justify-center relative shadow-inner">
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                            ) : (
                                                <span className="text-3xl md:text-4xl opacity-50">📦</span>
                                            )}
                                            {product.stock <= 5 && (
                                                <span className="absolute top-2 right-2 bg-red-600 text-white text-[8px] md:text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Crítico</span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-[10px] md:text-xs line-clamp-2 text-center h-8 md:h-10 leading-tight uppercase font-mono">{product.name}</h3>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col items-center">
                                        <span className="text-lg md:text-xl font-black text-blue-600">${product.priceUsd.toFixed(2)}</span>
                                        <span className="text-[8px] md:text-[9px] font-black text-gray-300 uppercase tracking-widest mt-1">STOCK: {product.stock}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Checkout - Escritorio */}
                <div className="hidden md:flex flex-col w-[350px] lg:w-[400px] bg-white shadow-2xl p-6 lg:p-8 z-20 border-l border-gray-100 h-full">
                    <div className="flex items-center gap-4 mb-8">
                        <span className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black">{cart.length}</span>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Carrito</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                        {cart.map(item => (
                            <div key={item._id} className="flex gap-4 group">
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 text-[11px] uppercase truncate">{item.name}</p>
                                    <div className="flex items-center mt-2 gap-3">
                                        <div className="flex items-center bg-gray-100 rounded-lg">
                                            <button onClick={(e) => { e.stopPropagation(); updateQuantity(item._id, -1); }} className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-l-lg transition font-bold">-</button>
                                            <span className="w-8 text-center font-black text-[10px] text-slate-900">{item.quantity}</span>
                                            <button onClick={(e) => { e.stopPropagation(); updateQuantity(item._id, 1); }} className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-r-lg transition font-bold">+</button>
                                        </div>
                                        <span className="text-[9px] text-gray-400 font-bold uppercase">${item.priceUsd.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="font-black text-blue-600 text-[11px]">${(item.priceUsd * item.quantity).toFixed(2)}</span>
                                    <button onClick={() => removeFromCart(item._id)} className="text-red-300 hover:text-red-600 transition text-[9px] font-black uppercase">Quitar</button>
                                </div>
                            </div>
                        ))}
                        {cart.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20 py-20 grayscale">
                                <span className="text-8xl mb-4">🛒</span>
                                <p className="font-black uppercase tracking-[0.2em] text-[10px]">Vacío</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t-4 border-double border-gray-50 space-y-4">
                        <div className="space-y-3">
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-800 font-black text-2xl uppercase tracking-tighter">TOTAL</span>
                                <span className="text-blue-600 font-black text-4xl tracking-tighter">${totalUsd.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-emerald-50 px-5 py-4 rounded-[24px] border border-emerald-100">
                                <span className="text-emerald-700 font-black text-[10px] uppercase tracking-widest">Total BS</span>
                                <span className="text-emerald-700 font-black text-xl">Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3 block text-center">Forma de Pago</label>
                            <div className="grid grid-cols-2 gap-2">
                                {methods.map(m => (
                                    <button
                                        key={m._id}
                                        onClick={() => setPaymentMethod(m.name)}
                                        className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border-2 ${paymentMethod === m.name ? 'bg-slate-900 border-slate-900 text-white' : 'bg-gray-50 border-gray-50 text-gray-400 hover:border-blue-200'
                                            }`}
                                    >
                                        {m.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            disabled={isProcessing || cart.length === 0 || !paymentMethod}
                            onClick={handleSale}
                            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all transform active:scale-95 shadow-xl ${isProcessing || cart.length === 0 || !paymentMethod
                                    ? 'bg-gray-200 text-gray-400'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                }`}
                        >
                            {isProcessing ? 'Procesando...' : 'Facturar Venta ⚡'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Checkout - Móvil (Drawer) */}
            {showCartMobile && (
                <div className="md:hidden fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="absolute bottom-0 left-0 w-full h-[90%] bg-white rounded-t-[40px] shadow-2xl flex flex-col p-6 animate-in slide-in-from-bottom duration-500">
                        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" onClick={() => setShowCartMobile(false)}></div>

                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Mi Pedido</h2>
                            <button
                                onClick={() => setShowCartMobile(false)}
                                className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-black"
                            >✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar mb-6">
                            {cart.map(item => (
                                <div key={item._id} className="flex gap-4 items-center">
                                    <div className="flex-1">
                                        <p className="font-bold text-slate-800 text-xs uppercase">{item.name}</p>
                                        <div className="flex items-center mt-2 gap-4">
                                            <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                                                <button onClick={() => updateQuantity(item._id, -1)} className="w-10 h-10 flex items-center justify-center text-lg font-black bg-gray-200">-</button>
                                                <span className="w-8 text-center font-black text-sm text-slate-900">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item._id, 1)} className="w-10 h-10 flex items-center justify-center text-lg font-black bg-gray-200">+</button>
                                            </div>
                                            <span className="font-black text-blue-600">${(item.priceUsd * item.quantity).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeFromCart(item._id)} className="text-red-500 font-bold p-2 text-lg">🗑️</button>
                                </div>
                            ))}
                        </div>

                        <div className="bg-emerald-50 p-5 rounded-3xl border border-emerald-100 mb-6 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Total en Bolívares</p>
                                <p className="text-2xl font-black text-emerald-700">Bs. {totalBs.toLocaleString('es-VE')}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">USD</p>
                                <p className="text-2xl font-black text-blue-600">${totalUsd.toFixed(2)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-6">
                            {methods.slice(0, 4).map(m => (
                                <button
                                    key={m._id}
                                    onClick={() => setPaymentMethod(m.name)}
                                    className={`py-4 rounded-2xl text-[10px] font-black uppercase border-2 transition-all ${paymentMethod === m.name ? 'bg-slate-900 border-slate-900 text-white' : 'bg-gray-100 border-gray-100 text-gray-500'
                                        }`}
                                >
                                    {m.name}
                                </button>
                            ))}
                        </div>

                        <button
                            disabled={isProcessing || cart.length === 0 || !paymentMethod}
                            onClick={handleSale}
                            className="w-full py-5 bg-blue-600 text-white font-black rounded-[24px] uppercase tracking-[0.2em] shadow-xl disabled:bg-gray-200 disabled:text-gray-400 mb-4"
                        >
                            {isProcessing ? 'Procesando...' : 'FINALIZAR VENTA ⚡'}
                        </button>
                    </div>
                </div>
            )}

            {lastSale && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-300">
                    <div className="bg-white p-6 md:p-10 rounded-[40px] shadow-2xl max-w-sm w-full relative overflow-hidden">
                        <BoletaTicket sale={lastSale} />
                        <div className="mt-8 flex flex-col gap-3">
                            <button onClick={() => window.print()} className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl uppercase tracking-widest">Imprimir</button>
                            <button onClick={() => setLastSale(null)} className="w-full py-3 text-gray-400 font-bold uppercase tracking-widest">Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
        </div>
    );
}
