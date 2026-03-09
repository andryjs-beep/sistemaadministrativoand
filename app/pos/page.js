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
    const [selectedMethods, setSelectedMethods] = useState([]);
    const [methods, setMethods] = useState([]);
    const [lastSale, setLastSale] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCartMobile, setShowCartMobile] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
        fetchMethods();
        fetchBcv();
        const interval = setInterval(fetchBcv, 120000);
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
            return [...prev, { ...product, quantity: 1, discountValue: 0 }];
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

    const updateDiscount = (id, value) => {
        let val = parseFloat(value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        setCart(prev => prev.map(item => {
            if (item._id === id) {
                const { price } = calculateItemPrice({ ...item, discountValue: 0 });
                if (val > price) val = price;
                return { ...item, discountValue: val };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item._id !== id));

    const calculateItemPrice = (item) => {
        let price = item.priceUsd;
        let isWholesale = false;
        if (item.wholesalePriceUsd > 0 && item.quantity >= (item.minWholesaleQty || 6)) {
            price = item.wholesalePriceUsd;
            isWholesale = true;
        }
        if (item.discountValue > 0) {
            price = Math.max(0, price - item.discountValue);
        }
        return { price, isWholesale };
    };

    const totalUsd = cart.reduce((acc, item) => {
        const { price } = calculateItemPrice(item);
        return acc + (price * item.quantity);
    }, 0);

    const totalBs = totalUsd * bcvRate;

    // --- Multi Payment Logic ---
    const toggleMethod = (method) => {
        setSelectedMethods(prev => {
            const exists = prev.find(p => p.methodName === method.name);
            if (exists) {
                return prev.filter(p => p.methodName !== method.name);
            }
            return [...prev, { methodName: method.name, currency: method.currency || 'USD', amount: 0 }];
        });
    };

    const updateMethodAmount = (methodName, amount) => {
        let val = parseFloat(amount);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        setSelectedMethods(prev =>
            prev.map(p => p.methodName === methodName ? { ...p, amount: val } : p)
        );
    };

    const totalAssigned = selectedMethods.reduce((acc, p) => {
        const isBs = (p.currency || '').toUpperCase().includes('BS');
        return acc + (isBs ? p.amount / bcvRate : p.amount);
    }, 0);

    const remaining = totalUsd - totalAssigned;

    const handleSale = async () => {
        if (cart.length === 0) return alert('El carrito está vacío');
        if (selectedMethods.length === 0) return alert('Debes seleccionar al menos un método de pago');

        if (selectedMethods.length === 1 && selectedMethods[0].amount === 0) {
            // Single method with no amount assigned - auto-fill
            const isBs = (selectedMethods[0].currency || '').toUpperCase().includes('BS');
            selectedMethods[0].amount = isBs ? totalBs : totalUsd;
        }

        if (selectedMethods.length > 1 && Math.abs(remaining) > 0.01) {
            return alert(`Los montos asignados no cubren el total. Falta: $${remaining.toFixed(2)} USD`);
        }

        setIsProcessing(true);

        try {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            const paymentsPayload = selectedMethods.map(p => {
                const isBs = (p.currency || '').toUpperCase().includes('BS');
                return {
                    method: p.methodName,
                    currency: p.currency,
                    amountUsd: isBs ? p.amount / bcvRate : p.amount,
                    amountBs: isBs ? p.amount : p.amount * bcvRate
                };
            });

            const primaryMethod = selectedMethods.length === 1
                ? selectedMethods[0].methodName
                : selectedMethods.map(p => p.methodName).join(' + ');

            const res = await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart.map(item => ({
                        productId: item._id,
                        quantity: item.quantity,
                        discountValue: item.discountValue
                    })),
                    paymentMethod: primaryMethod,
                    payments: paymentsPayload,
                    customerId: selectedCustomerId,
                    userId: storedUser?._id
                })
            });

            if (res.ok) {
                const sale = await res.json();
                setLastSale(sale);
                setCart([]);
                setSelectedCustomerId('');
                setCustomerSearch('');
                setSelectedMethods([]);
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
        <div className="h-[100dvh] flex flex-col bg-gray-50 font-sans overflow-hidden text-slate-900">
            {/* Header */}
            <header className="bg-white px-4 md:px-8 py-4 shadow-sm flex flex-col md:flex-row justify-between items-center z-30 gap-4 border-b">
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter w-full text-center md:text-left">Ventas POS</h1>

                    <div className="relative w-full md:w-64">
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
                                        className="w-full text-left p-3 hover:bg-blue-50 text-[10px] font-bold border-b last:border-none flex justify-between items-center bg-white"
                                        onClick={() => { setSelectedCustomerId(c._id); setCustomerSearch(c.name); }}
                                    >
                                        <span className="truncate max-w-[120px]">{c.name}</span>
                                        <span className="text-gray-400 text-[9px] truncate">{c.idNumber}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-6">
                    <div className="text-left md:text-right flex-1">
                        <span className="text-[9px] font-black text-gray-400 uppercase block tracking-widest">Tasa Referencial (BCV)</span>
                        <span className="text-xl font-black text-emerald-600">Bs. {bcvRate.toFixed(2)}</span>
                    </div>
                    <button
                        onClick={() => setShowCartMobile(!showCartMobile)}
                        className="md:hidden relative bg-slate-900 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                    >
                        {showCartMobile ? '✕' : '🛒'}
                        {!showCartMobile && cart.length > 0 && <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-bounce">{cart.length}</span>}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                {/* Catálogo de Productos */}
                <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden">
                    <div className="mb-6 relative">
                        <input
                            type="text"
                            placeholder="Buscar por Nombre o Código (Escáner)..."
                            className="w-full pl-12 pr-6 py-4 md:py-5 rounded-2xl border-none shadow-xl focus:ring-2 focus:ring-blue-500 outline-none text-base md:text-lg font-black text-slate-900 placeholder:text-gray-300 transition-shadow"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl">🔍</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-24 md:pb-0">
                        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 md:gap-4">
                            {filteredProducts.map(product => {
                                const isLowStock = product.stock <= product.minStock;
                                return (
                                    <div
                                        key={product._id}
                                        onClick={() => addToCart(product)}
                                        className="bg-white p-3 md:p-4 rounded-[24px] md:rounded-[32px] shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all cursor-pointer border-2 border-transparent hover:border-blue-200 flex flex-col group min-h-[180px] md:min-h-[220px]"
                                    >
                                        <div className="flex-1 flex flex-col items-center">
                                            <div className="w-full aspect-square bg-gray-50 rounded-2xl mb-3 md:mb-4 overflow-hidden flex items-center justify-center relative shadow-inner">
                                                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /> : <span className="text-4xl md:text-5xl opacity-20">📦</span>}
                                                {isLowStock && <span className="absolute top-2 left-2 bg-red-600 text-white text-[7px] md:text-[8px] px-2 py-0.5 rounded-full font-black uppercase shadow-lg">Stock Crítico</span>}
                                            </div>
                                            <h3 className="font-black text-slate-800 text-[10px] md:text-xs line-clamp-2 text-center leading-tight uppercase tracking-tighter px-1 md:px-2 h-8 md:h-10">{product.name}</h3>
                                        </div>
                                        <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-gray-50 space-y-1 md:space-y-2">
                                            <div className="flex justify-between items-center text-[10px] md:text-xs font-black">
                                                <span className="text-blue-600 text-sm md:text-base">${product.priceUsd.toFixed(2)}</span>
                                                <span className={`${product.stock <= 0 ? 'text-red-500' : 'text-gray-400'}`}>Stock: {product.stock}</span>
                                            </div>
                                            {product.wholesalePriceUsd > 0 && (
                                                <div className="bg-emerald-50 text-emerald-600 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-center">
                                                    <span className="text-[8px] md:text-[9px] font-black uppercase">💡 Mayor: ${product.wholesalePriceUsd.toFixed(2)} (+{product.minWholesaleQty || 6})</span>
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
                <div className={`absolute md:relative top-0 right-0 w-full md:w-[420px] lg:w-[480px] h-full bg-white shadow-2xl z-20 border-l border-gray-100 flex flex-col transition-transform duration-300 ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                    {/* Header fijo del carrito */}
                    <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-900 text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm">{cart.length}</span>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Carrito</h2>
                        </div>
                        <button onClick={() => setCart([])} className="text-[10px] font-black text-red-500 hover:scale-105 transition-transform uppercase italic">Vaciar</button>
                    </div>

                    {/* TODO el contenido del carrito scrollea junto */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 custom-scrollbar">
                        {/* Items del carrito */}
                        <div className="space-y-3">
                            {cart.map(item => {
                                const { price, isWholesale } = calculateItemPrice(item);
                                return (
                                    <div key={item._id} className="bg-gray-50 p-3 md:p-4 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 pr-3">
                                                <p className="font-black text-slate-800 text-[11px] md:text-xs uppercase leading-tight line-clamp-1">{item.name}</p>
                                                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest">{item.code}</p>
                                            </div>
                                            <button onClick={() => removeFromCart(item._id)} className="w-7 h-7 flex items-center justify-center bg-red-50 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors text-[10px] shrink-0">✕</button>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center bg-white shadow-sm rounded-lg p-0.5 border">
                                                <button onClick={() => updateQuantity(item._id, -1)} className="w-7 h-7 flex items-center justify-center text-slate-900 font-black text-sm rounded">-</button>
                                                <span className="w-6 text-center font-black text-sm">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item._id, 1)} className="w-7 h-7 flex items-center justify-center text-slate-900 font-black text-sm rounded">+</button>
                                            </div>
                                            <div className="w-16">
                                                <label className="text-[7px] font-black text-orange-500 uppercase text-center block">Desc.$</label>
                                                <input
                                                    type="number" step="0.01"
                                                    className="w-full bg-white border border-orange-200 focus:border-orange-500 rounded-lg text-xs font-black text-center py-1 outline-none text-slate-900"
                                                    value={item.discountValue || ''}
                                                    onChange={(e) => updateDiscount(item._id, e.target.value)}
                                                    placeholder="0.00" min="0"
                                                />
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[7px] font-black uppercase ${isWholesale ? 'text-violet-600' : 'text-gray-400'}`}>
                                                    {isWholesale ? '🔥Mayor' : 'Detal'}
                                                </span>
                                                <p className="font-black text-slate-800 text-sm tracking-tighter">${(price * item.quantity).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {cart.length === 0 && (
                                <div className="flex flex-col items-center justify-center opacity-20 py-16 grayscale">
                                    <span className="text-7xl mb-4">🛒</span>
                                    <p className="font-black uppercase tracking-[0.3em] text-[10px]">Agrega productos</p>
                                </div>
                            )}
                        </div>

                        {/* Totales compactos */}
                        <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-800 font-black text-lg uppercase tracking-tighter italic">Total USD</span>
                                <span className="text-emerald-600 font-black text-2xl tracking-tighter italic">${totalUsd.toFixed(2)}</span>
                            </div>
                            <div className="bg-slate-900 px-4 py-3 rounded-2xl text-white flex justify-between items-center">
                                <span className="text-[8px] font-black text-white/50 uppercase tracking-widest">Total Bs.</span>
                                <span className="text-lg font-black italic tracking-tighter">Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Métodos de Pago */}
                        <div className="mt-4 pt-3 border-t border-gray-200">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Formas de Pago</p>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                {methods.map(m => {
                                    const isSelected = selectedMethods.some(p => p.methodName === m.name);
                                    return (
                                        <button
                                            key={m._id}
                                            type="button"
                                            onClick={() => toggleMethod(m)}
                                            className={`py-2 px-1 rounded-xl text-[9px] font-black uppercase transition-all border-2 flex flex-col items-center gap-0.5 ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-gray-50 border-gray-50 text-gray-400 hover:border-blue-100'}`}
                                        >
                                            <span className="max-w-full truncate px-1">{m.name}</span>
                                            <span className="text-[7px] border px-1 rounded-sm opacity-70">{m.currency || 'USD'}</span>
                                            {isSelected && <span className="absolute -top-1 -right-1 text-sm">✅</span>}
                                        </button>
                                    );
                                })}
                                {methods.length === 0 && <p className="col-span-full text-[10px] font-black text-red-400 text-center py-3 bg-red-50 rounded-xl uppercase">⚠️ Sin métodos</p>}
                            </div>
                        </div>

                        {/* Distribución de Multi-Pago */}
                        {selectedMethods.length > 1 && (
                            <div className="mt-3 space-y-2 bg-blue-50/50 p-3 rounded-2xl border border-blue-100">
                                <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest text-center">Distribuir Monto</p>
                                {selectedMethods.map(pm => {
                                    const isBs = (pm.currency || '').toUpperCase().includes('BS');
                                    const currLabel = isBs ? 'Bs.' : '$';
                                    return (
                                        <div key={pm.methodName} className="bg-white rounded-xl p-2 border border-blue-50 flex items-center gap-2">
                                            <span className="text-[8px] font-black text-slate-500 uppercase flex-1 truncate">{pm.methodName}</span>
                                            <span className="text-xs font-black text-blue-600">{currLabel}</span>
                                            <input
                                                type="number" step="0.01" placeholder="0.00" min="0"
                                                className="w-24 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg text-sm font-black py-1.5 px-2 outline-none text-slate-900"
                                                value={pm.amount || ''}
                                                onChange={(e) => updateMethodAmount(pm.methodName, e.target.value)}
                                            />
                                        </div>
                                    );
                                })}
                                <div className={`text-center py-1.5 rounded-lg font-black text-[9px] uppercase ${Math.abs(remaining) < 0.01 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                    {Math.abs(remaining) < 0.01 ? '✅ OK' : `⚠️ Falta: $${remaining.toFixed(2)} / Bs. ${(remaining * bcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </div>
                            </div>
                        )}

                        {/* Botón de facturar - dentro del scroll */}
                        <div className="mt-4 pb-4">
                            <button
                                disabled={isProcessing || cart.length === 0 || selectedMethods.length === 0}
                                onClick={handleSale}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all transform active:scale-95 shadow-xl text-center ${isProcessing || cart.length === 0 || selectedMethods.length === 0
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 ring-4 ring-blue-600/10'
                                    }`}
                            >
                                {isProcessing ? '⏳ PROCESANDO...' : (selectedMethods.length > 0 ? '🛒 FACTURAR' : '⚠️ SELECCIONA PAGO')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Float cart button for mobile */}
            {!showCartMobile && cart.length > 0 && (
                <button
                    onClick={() => setShowCartMobile(true)}
                    className="md:hidden fixed bottom-6 right-6 z-[40] bg-blue-600 text-white p-4 rounded-full shadow-[0_10px_40px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2 font-black uppercase tracking-widest text-xs animate-in slide-in-from-bottom"
                >
                    <span className="text-xl">🛒</span>
                    Ver Carrito ({cart.length})
                </button>
            )}

            {/* Modal de Ticket de Impresión */}
            {lastSale && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[200] animate-in fade-in zoom-in duration-300">
                    <div className="bg-white p-6 md:p-10 rounded-[40px] md:rounded-[50px] shadow-2xl max-w-sm w-full relative overflow-hidden border-[8px] md:border-[12px] border-slate-50">
                        <BoletaTicket sale={lastSale} />
                        <div className="mt-8 md:mt-10 flex flex-col gap-3 md:gap-4">
                            <button onClick={() => { window.print(); setLastSale(null); }} className="w-full py-5 md:py-6 bg-slate-900 text-white font-black rounded-2xl md:rounded-3xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform text-xs md:text-sm">🖨️ Imprimir Ticket</button>
                            <button onClick={() => setLastSale(null)} className="w-full py-3 text-gray-400 font-bold uppercase tracking-widest hover:text-red-500 transition-colors text-xs text-center border-t border-gray-100 pt-5">X Cerrar sin Imprimir</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
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
