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
    const [bcvData, setBcvData] = useState({ rate: 36.50, usdRate: 36.50, percentage: 0 });
    const [showBannerDialog, setShowBannerDialog] = useState(false);
    const [bannerDims, setBannerDims] = useState({ width: '', height: '' });
    const [selectedMethods, setSelectedMethods] = useState([]);
    const [methods, setMethods] = useState([]);
    const [lastSale, setLastSale] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showCartMobile, setShowCartMobile] = useState(false);
    const [transactionType, setTransactionType] = useState('contado'); // 'contado', 'credito', 'cotizacion'

    const [customRate, setCustomRate] = useState(null);
    const [customUsdRate, setCustomUsdRate] = useState(null);
    const [showRateDialog, setShowRateDialog] = useState(false);
    const [tempRateInput, setTempRateInput] = useState({ eur: '', usd: '' });

    useEffect(() => {
        fetchProducts();
        fetchCustomers();
        fetchMethods();
        fetchBcv();
        // Auto-refresh products every 30s so stock is always up to date
        const productInterval = setInterval(fetchProducts, 30000);
        // User requested near-instant (<5s) updates for Tasa/Ajuste
        const rateInterval = setInterval(fetchBcv, 3000);
        return () => {
            clearInterval(productInterval);
            clearInterval(rateInterval);
        };
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
            const json = await res.json();
            if (json.ok && json.data) {
                setBcvData({
                    rate: json.data.EUR || 39.8,
                    usdRate: json.data.USD || 36.5,
                    percentage: json.data.percentage || 0
                });
            }
        } catch (e) { console.error('Error loading BCV', e); }
    };

    const getAdjustedRate = () => {
        const baseRate = customRate !== null ? customRate : bcvData.rate;
        return baseRate * (1 + (bcvData.percentage / 100));
    };

    const addToCart = (product) => {
        if (product && product.stock <= 0 && !product.isVirtual) return alert('¡Sin stock disponible!');
        setCart(prev => {
            const existing = prev.find(item => item._id === product._id && !item.isVirtual);
            if (existing && !product.isVirtual) {
                if (existing.quantity >= product.stock) {
                    alert('No puedes agregar más de lo que hay en stock');
                    return prev;
                }
                const otherItems = prev.filter(item => item._id !== product._id);
                return [{ ...existing, quantity: existing.quantity + 1 }, ...otherItems];
            }
            return [{ ...product, quantity: product.quantity || 1, discountValue: 0 }, ...prev];
        });
    };

    const addBannerToCart = () => {
        const w = parseFloat(bannerDims.width);
        const h = parseFloat(bannerDims.height);
        if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return alert('Ingresa medidas válidas');

        const m2 = (w * h) / 10000;
        const costPerM2 = 6.5;
        const margin = 1.43; // 43% profit
        const priceUsd = m2 * costPerM2 * margin;

        const bannerProduct = {
            _id: `banner-${Date.now()}`,
            name: `IMPRESIÓN BANNER (${w}x${h}cm)`,
            code: 'BANNER-IMP',
            priceUsd: priceUsd,
            quantity: 1,
            isVirtual: true,
            isBanner: true,
            stock: 999999,
            dims: { width: w, height: h, m2: m2 }
        };

        addToCart(bannerProduct);
        setShowBannerDialog(false);
        setBannerDims({ width: '', height: '' });
    };

    const updateQuantity = (id, delta) => {
        setCart(prev => prev.map(item => {
            if (item._id === id) {
                let currentQty = typeof item.quantity === 'number' ? item.quantity : 1;
                const newQty = currentQty + delta;
                if (newQty < 1) return { ...item, quantity: 1 };
                if (newQty > item.stock) {
                    alert('Excede el stock disponible');
                    return { ...item, quantity: item.stock };
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }));
    };

    const updateQuantityExact = (id, value) => {
        setCart(prev => prev.map(item => {
            if (item._id === id) {
                if (value === '') return { ...item, quantity: '' };
                let val = parseInt(value, 10);
                if (isNaN(val) || val < 1) val = 1;
                if (val > item.stock) {
                    alert('Excede el stock disponible');
                    val = item.stock;
                }
                return { ...item, quantity: val };
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
                const { price } = calculateItemPrice({ ...item, discountValue: 0 }, prev);
                const lineTotal = price * (item.quantity || 1);
                if (val > lineTotal) val = lineTotal;
                return { ...item, discountValue: val };
            }
            return item;
        }));
    };

    const removeFromCart = (id) => setCart(prev => prev.filter(item => item._id !== id));

    const calculateItemPrice = (item, currentCart = cart) => {
        let price = item.priceUsd;
        let isWholesale = false;

        const totalCartQty = currentCart.reduce((acc, currentItem) => acc + (typeof currentItem.quantity === 'number' ? currentItem.quantity : 1), 0);

        if (item.wholesalePriceUsd > 0 && totalCartQty >= 6) {
            price = item.wholesalePriceUsd;
            isWholesale = true;
        }
        return { price, isWholesale };
    };

    const totalUsd = cart.reduce((acc, item) => {
        const { price } = calculateItemPrice(item, cart);
        let qty = typeof item.quantity === 'number' ? item.quantity : 1;
        let lineTotal = (price * qty) - (item.discountValue || 0);
        return acc + Math.max(0, lineTotal);
    }, 0);

    const getRateForItem = (item) => {
        if (item.isBanner) {
            const baseUsd = customUsdRate !== null ? customUsdRate : bcvData.usdRate;
            return baseUsd * (1 + (bcvData.percentage / 100));
        }
        return getAdjustedRate();
    };

    const totalBs = cart.reduce((acc, item) => {
        const { price } = calculateItemPrice(item, cart);
        let qty = typeof item.quantity === 'number' ? item.quantity : 1;
        let lineTotalUsd = (price * qty) - (item.discountValue || 0);
        const rate = getRateForItem(item);
        return acc + (Math.max(0, lineTotalUsd) * rate);
    }, 0);

    const totalAdjustedUsd = totalUsd * (1 + (bcvData.percentage / 100));

    // --- Multi Payment Logic ---
    const toggleMethod = (method) => {
        setSelectedMethods(prev => {
            const exists = prev.find(p => p.methodName === method.name);
            if (exists) {
                return prev.filter(p => p.methodName !== method.name);
            }
            const isCredito = transactionType === 'credito';
            return [...prev, { methodName: method.name, currency: method.currency || 'USD', amount: isCredito ? 0 : 0 }];
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
        return acc + (isBs ? p.amount / getAdjustedRate() : p.amount);
    }, 0);

    const remaining = totalUsd - totalAssigned;

    const handleSale = async () => {
        if (cart.length === 0) return alert('El carrito está vacío');

        // Validaciones previas
        if (transactionType === 'credito' && !selectedCustomerId) {
            return alert('Para ventas a crédito DEBES seleccionar un cliente específico.');
        }

        if (transactionType === 'contado') {
            if (selectedMethods.length === 0) return alert('Debes seleccionar al menos un método de pago');

            // Validar que el monto asignado cubra el total en contado
            const localMethods = selectedMethods.length > 0 ? [...selectedMethods] : [{ methodName: 'EFECTIVO', amount: 0, currency: 'USD' }];

            // Auto-completar monto si solo hay uno y está en 0
            if (localMethods.length === 1 && localMethods[0].amount === 0) {
                const isBs = (localMethods[0].currency || '').toUpperCase().includes('BS');
                localMethods[0].amount = isBs ? totalBs : totalUsd;
            }

            const localAssigned = localMethods.reduce((acc, p) => {
                const isBs = (p.currency || '').toUpperCase().includes('BS');
                return acc + (isBs ? p.amount / getAdjustedRate() : p.amount);
            }, 0);

            const localRemaining = totalUsd - localAssigned;

            if (Math.abs(localRemaining) > 0.01 && transactionType === 'contado') {
                return alert(`Para venta de contado el monto debe ser exacto.\nTotal: $${totalUsd.toFixed(2)}\nAsignado: $${localAssigned.toFixed(2)}\nFalta: $${localRemaining.toFixed(2)} USD`);
            }
        }

        setIsProcessing(true);

        try {
            const storedUser = JSON.parse(localStorage.getItem('user'));
            const isQuote = transactionType === 'cotizacion';
            const endpoint = isQuote ? '/api/quotations' : '/api/sales';

            const paymentsPayload = selectedMethods
                .filter(p => !isQuote && p.amount > 0)
                .map(p => {
                    const isBs = (p.currency || '').toUpperCase().includes('BS');
                    return {
                        method: p.methodName,
                        currency: p.currency,
                        amountUsd: isBs ? p.amount / getAdjustedRate() : p.amount,
                        amountBs: isBs ? p.amount : p.amount * getAdjustedRate()
                    };
                });

            const payload = {
                items: cart.map(item => ({
                    productId: item._id,
                    quantity: item.quantity,
                    discountValue: item.discountValue,
                    priceUsd: item.priceUsd,
                    name: item.name,
                    code: item.code,
                    isVirtual: !!item.isVirtual
                })),
                customerId: selectedCustomerId,
                userId: storedUser?._id,
            };

            if (!isQuote) {
                payload.payments = paymentsPayload;
                payload.isCredit = transactionType === 'credito';
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setLastSale(data);
                setCart([]);
                setSelectedCustomerId('');
                setCustomerSearch('');
                setSelectedMethods([]);
                setTransactionType('contado');
                fetchProducts();

                let msg = '¡Venta completada con éxito!';
                if (transactionType === 'credito') msg = 'Venta a crédito registrada con éxito';
                if (transactionType === 'cotizacion') msg = '¡Cotización generada con éxito!';
                alert(msg);
            } else {
                const err = await res.json();
                alert(`Error: ${err.error || 'No se pudo procesar la solicitud'}`);
            }
        } catch (e) {
            console.error(e);
            alert('Error al conectar con el servidor');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCustomRateUpdate = () => {
        const nrEur = parseFloat(tempRateInput.eur);
        const nrUsd = parseFloat(tempRateInput.usd);
        if (isNaN(nrEur) || nrEur <= 0) setCustomRate(null);
        else setCustomRate(nrEur);

        if (isNaN(nrUsd) || nrUsd <= 0) setCustomUsdRate(null);
        else setCustomUsdRate(nrUsd);

        setShowRateDialog(false);
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
            <header className="bg-white px-4 md:px-8 py-4 shadow-sm flex flex-col md:flex-row justify-between items-center z-[60] relative gap-4 border-b">
                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter w-full text-center md:text-left">Ventas POS</h1>

                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button
                            onClick={() => setTransactionType('contado')}
                            className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase transition-all ${transactionType === 'contado' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 font-bold'}`}
                        >
                            Contado
                        </button>
                        <button
                            onClick={() => setTransactionType('credito')}
                            className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase transition-all ${transactionType === 'credito' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 font-bold'}`}
                        >
                            Crédito
                        </button>
                        <button
                            onClick={() => setTransactionType('cotizacion')}
                            className={`px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase transition-all ${transactionType === 'cotizacion' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-400 font-bold'}`}
                        >
                            Cotización
                        </button>
                    </div>

                    <button
                        onClick={() => setShowBannerDialog(true)}
                        className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <span>🖼️</span> Banner
                    </button>

                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Buscar Cliente (Nombre/ID/Tlf)..."
                            className={`w-full border-2 rounded-xl px-4 py-2.5 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all ${selectedCustomerId ? 'bg-blue-50 border-blue-200' : 'bg-gray-100 border-transparent'}`}
                            value={customerSearch}
                            onChange={(e) => {
                                setCustomerSearch(e.target.value);
                                if (selectedCustomerId) setSelectedCustomerId('');
                            }}
                        />
                        {customerSearch && !selectedCustomerId && (
                            <div className="absolute top-full left-0 w-full md:w-[320px] bg-white shadow-2xl rounded-xl mt-1 max-h-60 overflow-y-auto z-[60] border border-gray-100">
                                {transactionType !== 'credito' && (
                                    <button
                                        className="w-full text-left p-3 hover:bg-gray-50 text-xs font-black uppercase text-blue-600 border-b"
                                        onClick={() => { setSelectedCustomerId(''); setCustomerSearch(''); }}
                                    >
                                        👤 Consumidor Final
                                    </button>
                                )}
                                {filteredCustomers.map(c => (
                                    <button
                                        key={c._id}
                                        className="w-full text-left p-3 hover:bg-blue-50 text-sm font-bold border-b last:border-none flex flex-col justify-center items-start bg-white gap-0.5"
                                        onClick={() => { setSelectedCustomerId(c._id); setCustomerSearch(c.name); }}
                                    >
                                        <span className="whitespace-normal break-words leading-tight w-full text-slate-800">{c.name}</span>
                                        <span className="text-gray-400 text-[10px] uppercase tracking-widest">{c.idNumber} {c.phone ? `- ${c.phone}` : ''}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center justify-between w-full md:w-auto gap-6">
                    <div
                        className="text-left md:text-right flex-1 cursor-pointer group hover:opacity-80 transition-opacity"
                        onClick={() => {
                            setTempRateInput({
                                eur: (customRate || bcvData.rate).toString(),
                                usd: (customUsdRate || bcvData.usdRate).toString()
                            });
                            setShowRateDialog(true);
                        }}
                    >
                        <span className="text-[10px] font-black text-gray-400 uppercase block tracking-widest leading-none mb-1">
                            {customRate ? '⚠️ Tasa Manual' : 'Tasa Euro (BCV)'}
                        </span>
                        <div className="flex items-center justify-end gap-2">
                            <span className="text-xl font-black text-emerald-600">Bs. {(customRate || bcvData.rate).toFixed(2)}</span>
                            <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowCartMobile(!showCartMobile)}
                        className="md:hidden relative bg-slate-900 text-white p-3 rounded-xl shadow-lg active:scale-95 transition-transform"
                    >
                        {showCartMobile ? '✕' : '🛒'}
                        {!showCartMobile && cart.length > 0 && <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-black animate-bounce">{cart.length}</span>}
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
                                                {isLowStock && <span className="absolute top-2 left-2 bg-red-600 text-white text-[10px] md:text-xs px-2 py-0.5 rounded-full font-black uppercase shadow-lg">Stock Crítico</span>}
                                            </div>
                                            <h3 className="font-black text-slate-800 text-sm md:text-lg text-center leading-tight uppercase px-1 md:px-2 flex items-center justify-center break-words">{product.name}</h3>
                                        </div>
                                        <div className="mt-2 md:mt-4 pt-2 md:pt-4 border-t border-gray-50 space-y-1 md:space-y-2">
                                            <div className="flex justify-between items-center text-xs md:text-sm font-black">
                                                <span className="text-blue-600 text-lg md:text-xl">${product.priceUsd.toFixed(2)}</span>
                                                <span className={`${product.stock <= 0 ? 'text-red-500' : 'text-gray-400'}`}>Stock: {product.stock}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <p className="text-[10px] md:text-xs font-black text-orange-600 truncate">Bs. {(product.priceUsd * getAdjustedRate()).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                                                {bcvData.percentage > 0 && <span className="text-[8px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md uppercase">+{bcvData.percentage}%</span>}
                                            </div>
                                            {product.wholesalePriceUsd > 0 && (
                                                <div className="bg-emerald-50 text-emerald-600 px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-center">
                                                    <span className="text-xs md:text-sm font-black uppercase">💡 Mayor: ${product.wholesalePriceUsd.toFixed(2)} (+{product.minWholesaleQty || 6})</span>
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
                {/* Overlay for Mobile Cart */}
                {showCartMobile && (
                    <div
                        className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 animate-in fade-in"
                        onClick={() => setShowCartMobile(false)}
                    />
                )}

                <div className={`fixed md:relative top-0 right-0 w-[90%] md:w-[420px] lg:w-[480px] h-full bg-white shadow-2xl z-50 border-l border-gray-100 flex flex-col transition-transform duration-300 ${showCartMobile ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                    {/* Header fijo del carrito */}
                    <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-3">
                            <span className="bg-slate-900 text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm">{cart.length}</span>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tighter">Carrito</h2>
                        </div>
                        <button onClick={() => setCart([])} className="text-xs font-black text-red-500 hover:scale-105 transition-transform uppercase italic">Vaciar</button>
                    </div>

                    {/* TODO el contenido del carrito scrollea junto */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3 custom-scrollbar">
                        {/* Items del carrito */}
                        <div className="space-y-3">
                            {cart.map(item => {
                                const { price, isWholesale } = calculateItemPrice(item, cart);
                                return (
                                    <div key={item._id} className="bg-gray-50 p-3 md:p-4 rounded-2xl border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex-1 pr-3">
                                                <p className="font-black text-slate-800 text-sm uppercase leading-tight line-clamp-1">{item.name}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.code}</p>
                                            </div>
                                            <button onClick={() => removeFromCart(item._id)} className="w-9 h-9 flex items-center justify-center bg-red-50 text-red-400 rounded-full hover:bg-red-500 hover:text-white transition-colors text-sm shrink-0">✕</button>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center bg-white shadow-sm rounded-lg p-0.5 border">
                                                <button onClick={() => updateQuantity(item._id, -1)} className="w-9 h-9 flex items-center justify-center text-slate-900 font-black text-base rounded hover:bg-gray-100 transition-colors">-</button>
                                                <input
                                                    type="number"
                                                    className="w-10 text-center font-black text-base bg-transparent outline-none m-0 p-0"
                                                    value={item.quantity === '' ? '' : item.quantity}
                                                    onChange={(e) => updateQuantityExact(item._id, e.target.value)}
                                                />
                                                <button onClick={() => updateQuantity(item._id, 1)} className="w-9 h-9 flex items-center justify-center text-slate-900 font-black text-base rounded hover:bg-gray-100 transition-colors">+</button>
                                            </div>
                                            <div className="w-20">
                                                <label className="text-[10px] font-black text-orange-500 uppercase text-center block">Desc.$</label>
                                                <input
                                                    type="number" step="0.01"
                                                    className="w-full bg-white border border-orange-200 focus:border-orange-500 rounded-lg text-sm font-black text-center py-1.5 outline-none text-slate-900"
                                                    value={item.discountValue || ''}
                                                    onChange={(e) => updateDiscount(item._id, e.target.value)}
                                                    placeholder="0.00" min="0"
                                                />
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-[10px] font-black uppercase ${isWholesale ? 'text-violet-600' : 'text-gray-400'}`}>
                                                    {isWholesale ? '🔥Mayor' : 'Detal'}
                                                </span>
                                                <p className="font-black text-slate-800 text-base tracking-tighter">
                                                    ${Math.max(0, (price * (typeof item.quantity === 'number' ? item.quantity : 1)) - (item.discountValue || 0)).toFixed(2)}
                                                </p>
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
                            <div className="bg-slate-900 text-white p-5 rounded-[2.5rem] shadow-xl mb-6 border-b-4 border-slate-700">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Total Bs.</p>
                                    <p className="text-2xl font-black tracking-tighter">
                                        Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </p>
                                </div>
                                <div className="flex justify-end pr-1">
                                    <p className="text-[11px] font-bold text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700/50 italic">
                                        Equivalente: ${totalAdjustedUsd.toFixed(2)} USD
                                    </p>
                                </div>
                            </div>      {/* Métodos de Pago */}
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 text-center">Formas de Pago</p>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                                    {methods.map(m => {
                                        const isSelected = selectedMethods.some(p => p.methodName === m.name);
                                        return (
                                            <button
                                                key={m._id}
                                                type="button"
                                                onClick={() => toggleMethod(m)}
                                                className={`py-3 px-2 rounded-xl text-xs font-black uppercase transition-all border-2 flex flex-col items-center gap-1 relative ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-gray-50 border-gray-50 text-gray-400 hover:border-blue-100'}`}
                                            >
                                                <span className="max-w-full truncate px-1">{m.name}</span>
                                                <span className="text-[10px] border px-2 rounded-sm opacity-70 leading-none">{m.currency || 'USD'}</span>
                                                {isSelected && <span className="absolute -top-2 -right-2 text-base">✅</span>}
                                            </button>
                                        );
                                    })}
                                    {methods.length === 0 && <p className="col-span-full text-xs font-black text-red-400 text-center py-4 bg-red-50 rounded-xl uppercase">⚠️ Sin métodos</p>}
                                </div>
                            </div>

                            {/* Distribución de Multi-Pago o Abono en Crédito */}
                            {(selectedMethods.length > 1 || (transactionType === 'credito' && selectedMethods.length === 1)) && (
                                <div className="mt-4 space-y-3 bg-blue-50/50 p-4 rounded-2xl border border-blue-100 italic transition-all animate-in zoom-in-95">
                                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest text-center">
                                        {transactionType === 'credito' ? 'Monto del Abono' : 'Distribuir Monto'}
                                    </p>
                                    {selectedMethods.map(pm => {
                                        const isBs = (pm.currency || '').toUpperCase().includes('BS');
                                        const currLabel = isBs ? 'Bs.' : '$';
                                        return (
                                            <div key={pm.methodName} className="bg-white rounded-xl p-3 border border-blue-50 flex items-center gap-3">
                                                <span className="text-xs font-black text-slate-500 uppercase flex-1 truncate">{pm.methodName}</span>
                                                <span className="text-sm font-black text-blue-600">{currLabel}</span>
                                                <input
                                                    type="number" step="0.01" placeholder="0.00" min="0"
                                                    className="w-28 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg text-base font-black py-2 px-3 outline-none text-slate-900"
                                                    value={pm.amount || ''}
                                                    onChange={(e) => updateMethodAmount(pm.methodName, e.target.value)}
                                                />
                                            </div>
                                        );
                                    })}
                                    <div className={`text-center py-2.5 rounded-lg font-black text-xs uppercase ${Math.abs(remaining) < 0.01 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                        {Math.abs(remaining) < 0.01 ? '✅ OK' : `⚠️ Falta: $${remaining.toFixed(2)} / Bs. ${(remaining * getAdjustedRate()).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
                                    {isProcessing ? '⏳ PROCESANDO...' : (
                                        transactionType === 'cotizacion' ? '📋 GENERAR COTIZACIÓN' :
                                            transactionType === 'credito' ? '💳 FACTURAR CRÉDITO' :
                                                '🛒 FACTURAR'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal de Banner */}
                {showBannerDialog && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden border-8 border-slate-50">
                            <div className="p-8">
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4 text-center">Cotizar Impresión</h3>
                                <p className="text-xs font-bold text-gray-400 text-center mb-8 uppercase tracking-widest">Ingrese medidas en centímetros</p>

                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Ancho (cm)</label>
                                        <input
                                            type="number"
                                            placeholder="000"
                                            className="w-full bg-gray-50 border-none rounded-2xl p-5 text-xl font-black text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none text-center"
                                            value={bannerDims.width}
                                            onChange={(e) => setBannerDims({ ...bannerDims, width: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Alto (cm)</label>
                                        <input
                                            type="number"
                                            placeholder="000"
                                            className="w-full bg-gray-50 border-none rounded-2xl p-5 text-xl font-black text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none text-center"
                                            value={bannerDims.height}
                                            onChange={(e) => setBannerDims({ ...bannerDims, height: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {bannerDims.width && bannerDims.height && (
                                    <div className="bg-blue-50 p-6 rounded-3xl mb-8 border border-blue-100 italic transition-all animate-in zoom-in-95">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">Superficie:</span>
                                            <span className="text-lg font-black text-blue-600">{((bannerDims.width * bannerDims.height) / 10000).toFixed(2)} m²</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest tracking-tighter">Precio de Venta ($):</span>
                                            <span className="text-2xl font-black text-emerald-600">${(((bannerDims.width * bannerDims.height) / 10000) * 6.5 * 1.43).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-4 px-2 opacity-30 group hover:opacity-100 transition-opacity">
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Costo Proveedor:</span>
                                            <span className="text-[8px] font-black text-slate-500">${(((bannerDims.width * bannerDims.height) / 10000) * 6.5).toFixed(2)}</span>
                                        </div>
                                        <p className="text-[10px] text-center text-blue-400 font-bold mt-2 uppercase tracking-tighter">Calculado a tasa BCV Dólar + 43% Ganancia</p>
                                    </div>
                                )}

                                <div className="flex gap-4">
                                    <button
                                        onClick={() => setShowBannerDialog(false)}
                                        className="flex-1 py-4 font-black text-xs uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors"
                                    > Cancelar </button>
                                    <button
                                        onClick={addBannerToCart}
                                        className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-black active:scale-95 transition-all"
                                    > Agregar al Carrito </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Tasa Manual */}
                {showRateDialog && (
                    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95 duration-300">
                            <div className="bg-slate-900 p-8 text-white relative">
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Editar <span className="text-blue-400">Tasas</span></h3>
                                <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mt-1">Solo para esta venta</p>
                                <button onClick={() => setShowRateDialog(false)} className="absolute top-6 right-6 text-2xl opacity-50 hover:opacity-100 transition-opacity">✕</button>
                            </div>

                            <div className="p-8">
                                <div className="space-y-6 mb-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tasa Euro (Base)</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-300">Bs.</span>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full bg-gray-50 border-none rounded-2xl p-5 pl-12 text-xl font-black text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none"
                                                value={tempRateInput.eur}
                                                onChange={(e) => setTempRateInput({ ...tempRateInput, eur: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Tasa Dólar (Para Banners)</label>
                                        <div className="relative">
                                            <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-300">Bs.</span>
                                            <input
                                                type="number" step="0.01"
                                                className="w-full bg-gray-50 border-none rounded-2xl p-5 pl-12 text-xl font-black text-slate-800 focus:ring-4 focus:ring-blue-100 outline-none"
                                                value={tempRateInput.usd}
                                                onChange={(e) => setTempRateInput({ ...tempRateInput, usd: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleCustomRateUpdate}
                                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all"
                                    > Aplicar Cambios </button>
                                    <button
                                        onClick={() => { setCustomRate(null); setCustomUsdRate(null); setShowRateDialog(false); }}
                                        className="w-full py-4 text-xs font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors"
                                    > Restablecer a BCV Oficial </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de Ticket de Impresión */}
                {
                    lastSale && (
                        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] overflow-y-auto animate-in fade-in duration-300">
                            <div className="min-h-full flex items-center justify-center p-4 md:p-10">
                                <div className="bg-white p-6 md:p-10 rounded-[40px] md:rounded-[50px] shadow-2xl max-w-sm w-full relative border-[8px] md:border-[12px] border-slate-50">
                                    <BoletaTicket sale={lastSale} />
                                    <div className="mt-8 md:mt-10 flex flex-col gap-3 md:gap-4 no-print">
                                        <button onClick={() => { window.print(); setLastSale(null); }} className="w-full py-5 md:py-6 bg-slate-900 text-white font-black rounded-2xl md:rounded-3xl uppercase tracking-widest shadow-2xl hover:scale-105 transition-transform text-xs md:text-sm">🖨️ Imprimir Ticket</button>
                                        <button onClick={() => setLastSale(null)} className="w-full py-3 text-gray-400 font-bold uppercase tracking-widest hover:text-red-500 transition-colors text-xs text-center border-t border-gray-100 pt-5">X Cerrar sin Imprimir</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }

                <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
                @media print { .no-print { display: none !important; } }
                ${lastSale ? 'body { overflow: hidden !important; }' : ''}
            `}</style>
            </div >
        </div>
    );
}
