"use client";

import { useState, useEffect } from 'react';
import BoletaTicket from '@/components/print/BoletaTicket';

export default function PosPage() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [bcvRate, setBcvRate] = useState(36.50);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [methods, setMethods] = useState([]);
    const [lastSale, setLastSale] = useState(null);

    useEffect(() => {
        fetchProducts();
        fetchMethods();
        fetchBcv();
        const interval = setInterval(fetchBcv, 60000);
        return () => clearInterval(interval);
    }, []);

    const fetchProducts = async () => {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data);
    };

    const fetchMethods = async () => {
        const res = await fetch('/api/paymentMethods');
        const data = await res.json();
        setMethods(data);
    };

    const fetchBcv = async () => {
        const res = await fetch('/api/bcv');
        const data = await res.json();
        if (data.value) setBcvRate(data.value);
    };

    const addToCart = (product) => {
        if (product.stock <= 0) return alert('Sin stock');
        const existing = cart.find(item => item._id === product._id);
        if (existing) {
            setCart(cart.map(item => item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
    };

    const removeFromCart = (id) => {
        setCart(cart.filter(item => item._id !== id));
    };

    const totalUsd = cart.reduce((acc, item) => acc + (item.priceUsd * item.quantity), 0);
    const totalBs = totalUsd * 1.15 * bcvRate;

    const handleSale = async () => {
        if (cart.length === 0) return;
        if (!paymentMethod) return alert('Selecciona un método de pago');

        const method = methods.find(m => m.name === paymentMethod);

        const res = await fetch('/api/sales', {
            method: 'POST',
            body: JSON.stringify({
                items: cart.map(item => ({ productId: item._id, quantity: item.quantity })),
                paymentMethod,
                accountNumber: method?.accountNumber
            })
        });

        if (res.ok) {
            const sale = await res.json();
            setLastSale(sale);
            setCart([]);
            fetchProducts();
            alert('Venta realizada con éxito');
        } else {
            const err = await res.json();
            alert(`Error: ${err.error}`);
        }
    };

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col font-sans">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Punto de Venta (POS)</h1>
                <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                    <span className="text-blue-600 font-semibold">Tasa del Día: Bs. {bcvRate.toFixed(2)}</span>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Productos */}
                <div className="flex-[2] p-4 overflow-y-auto">
                    <input
                        type="text"
                        placeholder="Buscar por nombre o código..."
                        className="w-full p-4 mb-6 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none transition shadow-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                            <div
                                key={product._id}
                                onClick={() => addToCart(product)}
                                className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-100 flex flex-col items-center group"
                            >
                                <div className="w-full aspect-square bg-gray-50 rounded-lg mb-3 overflow-hidden">
                                    {product.imageUrl ? (
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-300">🖼️</div>
                                    )}
                                </div>
                                <h3 className="font-bold text-gray-800 text-center text-sm truncate w-full">{product.name}</h3>
                                <p className="text-blue-600 font-black text-lg">${product.priceUsd.toFixed(2)}</p>
                                <p className={`text-xs mt-1 ${product.stock < 5 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>Stock: {product.stock}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Carrito */}
                <div className="flex-1 bg-white shadow-2xl p-6 flex flex-col border-l border-gray-200">
                    <div className="flex-1 overflow-y-auto space-y-4">
                        <h2 className="text-xl font-black uppercase tracking-widest text-gray-400 mb-6">Detalle de Compra</h2>
                        {cart.map(item => (
                            <div key={item._id} className="flex justify-between items-center group">
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800">{item.name}</p>
                                    <p className="text-sm text-gray-500">{item.quantity} x ${item.priceUsd.toFixed(2)}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-blue-600">${(item.priceUsd * item.quantity).toFixed(2)}</span>
                                    <button onClick={() => removeFromCart(item._id)} className="text-red-400 hover:text-red-600">✕</button>
                                </div>
                            </div>
                        ))}
                        {cart.length === 0 && (
                            <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                                <span className="text-6xl mb-4">🛒</span>
                                <p>Carrito vacío</p>
                            </div>
                        )}
                    </div>

                    <div className="border-t-2 border-dashed border-gray-100 mt-6 pt-6 space-y-4">
                        <div className="flex justify-between text-gray-500 uppercase font-bold tracking-tighter">
                            <span>Subtotal USD</span>
                            <span>${totalUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-2xl font-black text-gray-900 uppercase">
                            <span>Total USD</span>
                            <span className="text-blue-600">${totalUsd.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-emerald-600">
                            <span>Total BS</span>
                            <span>Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                        </div>

                        <div className="mt-8">
                            <label className="block text-xs font-black text-gray-400 uppercase mb-2">Método de Pago</label>
                            <select
                                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                            >
                                <option value="">Selecciona...</option>
                                {methods.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
                            </select>
                        </div>

                        <button
                            onClick={handleSale}
                            className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-xl shadow-blue-200 transition active:scale-95 text-lg uppercase tracking-widest mt-4"
                        >
                            Completar Venta
                        </button>
                    </div>
                </div>
            </div>

            {lastSale && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-2xl max-w-sm w-full">
                        <BoletaTicket sale={lastSale} />
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => window.print()}
                                className="flex-1 py-3 bg-gray-950 text-white font-bold rounded-xl"
                            >
                                🖨️ Imprimir
                            </button>
                            <button
                                onClick={() => setLastSale(null)}
                                className="flex-1 py-3 bg-gray-200 text-gray-800 font-bold rounded-xl"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
