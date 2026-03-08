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
        <div className="h-screen flex flex-col bg-gray-100 font-sans overflow-hidden">
            {/* Header Fijo */}
            <header className="bg-white px-8 py-4 shadow-sm flex justify-between items-center z-10">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Terminal de Ventas</h1>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <select
                        className="bg-blue-50 border-none rounded-lg px-4 py-2 font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                    >
                        <option value="">Consumidor Final (General)</option>
                        {customers.map(c => <option key={c._id} value={c._id}>{c.name} ({c.idNumber})</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tasa BCV del día</span>
                        <span className="text-lg font-black text-emerald-600">Bs. {bcvRate.toFixed(2)}</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Lado Izquierdo: Catálogo */}
                <div className="flex-[3] flex flex-col p-6 overflow-hidden">
                    <div className="mb-6 relative">
                        <input
                            type="text"
                            placeholder="Escribe para buscar productos por nombre o código..."
                            className="w-full pl-14 pr-6 py-4 rounded-2xl border-none shadow-lg focus:ring-2 focus:ring-blue-500 outline-none text-lg"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {filteredProducts.map(product => (
                                <div
                                    key={product._id}
                                    onClick={() => addToCart(product)}
                                    className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border border-transparent hover:border-blue-200 flex flex-col group min-h-[220px]"
                                >
                                    <div className="flex-1 flex flex-col items-center">
                                        <div className="w-full aspect-square bg-gray-50 rounded-xl mb-4 overflow-hidden flex items-center justify-center relative">
                                            {product.imageUrl ? (
                                                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                            ) : (
                                                <span className="text-4xl">📦</span>
                                            )}
                                            {product.stock <= 5 && (
                                                <span className="absolute top-2 right-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Bajo Stock</span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-sm line-clamp-2 text-center h-10">{product.name}</h3>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col items-center">
                                        <span className="text-xl font-black text-blue-600">${product.priceUsd.toFixed(2)}</span>
                                        <span className="text-[10px] font-bold text-gray-400">STOCK: {product.stock}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Lado Derecho: Carrito/Checkout */}
                <div className="flex-[1] bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.03)] p-8 flex flex-col z-20 border-l border-gray-100 min-w-[380px]">
                    <div className="flex items-center gap-4 mb-8">
                        <span className="bg-slate-900 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black">{cart.length}</span>
                        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Tu Pedido</h2>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                        {cart.map(item => (
                            <div key={item._id} className="flex gap-4 group animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex-1">
                                    <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                                    <div className="flex items-center mt-2 gap-3">
                                        <div className="flex items-center bg-gray-100 rounded-lg">
                                            <button onClick={(e) => { e.stopPropagation(); updateQuantity(item._id, -1); }} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-l-lg transition">-</button>
                                            <span className="w-8 text-center font-bold text-xs">{item.quantity}</span>
                                            <button onClick={(e) => { e.stopPropagation(); updateQuantity(item._id, 1); }} className="w-8 h-8 flex items-center justify-center hover:bg-gray-200 rounded-r-lg transition">+</button>
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold">${item.priceUsd.toFixed(2)} c/u</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    <span className="font-black text-blue-600 text-sm">${(item.priceUsd * item.quantity).toFixed(2)}</span>
                                    <button onClick={() => removeFromCart(item._id)} className="text-red-300 hover:text-red-500 transition text-xs">ELIMINAR</button>
                                </div>
                            </div>
                        ))}
                        {cart.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full opacity-20 py-20">
                                <span className="text-8xl mb-4">🛸</span>
                                <p className="font-black uppercase tracking-widest text-xs">Esperando artículos...</p>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-8 border-t-4 border-double border-gray-100 space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-gray-400 font-bold text-xs uppercase tracking-widest">
                                <span>Subtotal USD</span>
                                <span>${totalUsd.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-baseline">
                                <span className="text-slate-800 font-black text-3xl tracking-tighter uppercase">Total</span>
                                <span className="text-blue-600 font-black text-4xl tracking-tighter">${totalUsd.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center bg-emerald-50 p-4 rounded-2xl border border-emerald-100 mt-2">
                                <span className="text-emerald-700 font-black text-xs uppercase tracking-widest">Total en Bolívares</span>
                                <span className="text-emerald-700 font-black text-xl">Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        <div className="pt-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Seleccionar Pago</label>
                            <div className="grid grid-cols-2 gap-2">
                                {methods.map(m => (
                                    <button
                                        key={m._id}
                                        onClick={() => setPaymentMethod(m.name)}
                                        className={`py-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${paymentMethod === m.name ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-white border-gray-100 text-slate-400 hover:border-blue-200'
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
                            className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all transform active:scale-95 shadow-2xl ${isProcessing || cart.length === 0 || !paymentMethod
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200'
                                }`}
                        >
                            {isProcessing ? 'PROCESANDO...' : 'FINALIZAR VENTA ⚡'}
                        </button>
                    </div>
                </div>
            </div>

            {lastSale && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-300">
                    <div className="bg-white p-8 rounded-[40px] shadow-2xl max-w-sm w-full relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
                        <BoletaTicket sale={lastSale} />
                        <div className="mt-8 flex gap-3">
                            <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition shadow-xl">🖨️ IMPRIMIR</button>
                            <button onClick={() => setLastSale(null)} className="flex-1 py-4 bg-gray-100 text-slate-400 font-black rounded-2xl hover:bg-gray-200 transition">CERRAR</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
        </div>
    );
}
