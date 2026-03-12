"use client";

import { useState, useEffect } from 'react';
import SaleDetailModal from '@/components/modals/SaleDetailModal';

export default function CuentasCobrarPage() {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [selectedSale, setSelectedSale] = useState(null);
    const [detailSale, setDetailSale] = useState(null);
    const [methods, setMethods] = useState([]);
    const [newPayment, setNewPayment] = useState({ method: '', amount: '', currency: 'USD' });
    const [bcvRate, setBcvRate] = useState(36.5);

    useEffect(() => {
        fetchPendingSales();
        fetchMethods();
        fetchBcv();
    }, []);

    const fetchPendingSales = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/sales');
            const data = await res.json();
            // Filtrar solo las que son crédito y no están pagadas completamente
            const pending = data.filter(s => s.isCredit && s.status !== 'paid');
            setSales(pending);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchMethods = async () => {
        const res = await fetch('/api/paymentMethods');
        const data = await res.json();
        setMethods(Array.isArray(data) ? data : []);
    };

    const fetchBcv = async () => {
        try {
            const res = await fetch('/api/bcv');
            const json = await res.json();
            if (json.ok && json.data) {
                setBcvRate(json.data.EUR || 39.8);
            }
        } catch (e) { console.error('Error loading BCV', e); }
    };

    const handlePayment = async () => {
        if (!newPayment.method || !newPayment.amount) return alert('Completa los datos del pago');

        const storedUser = JSON.parse(localStorage.getItem('user'));
        const amount = parseFloat(newPayment.amount);
        const isBs = (newPayment.currency || '').toUpperCase().includes('BS');

        const payload = {
            saleId: selectedSale._id,
            userId: storedUser?._id,
            payment: {
                method: newPayment.method,
                currency: newPayment.currency,
                amountUsd: isBs ? amount / bcvRate : amount,
                amountBs: isBs ? amount : amount * bcvRate
            }
        };

        try {
            const res = await fetch('/api/sales', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Abono registrado con éxito');
                setSelectedSale(null);
                setNewPayment({ method: '', amount: '', currency: 'USD' });
                fetchPendingSales();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (e) {
            alert('Error al procesar el pago');
        }
    };

    const filteredSales = sales.filter(s =>
        (s.saleId || '').toLowerCase().includes(filter.toLowerCase()) ||
        (s.customerId?.name || '').toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="p-4 md:p-10 bg-gray-50 min-h-screen font-sans text-slate-900">
            <header className="mb-10">
                <p className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] mb-2">Administración Financiera</p>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">Cuentas por <span className="text-orange-600">Cobrar</span></h1>
            </header>

            <div className="mb-8 relative max-w-md">
                <input
                    type="text"
                    placeholder="Buscar por cliente o factura..."
                    className="w-full pl-12 pr-6 py-4 rounded-2xl border-none shadow-xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-sm"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-xl">🔍</span>
            </div>

            {loading ? (
                <div className="py-20 text-center animate-pulse font-black uppercase tracking-widest text-gray-400">Cargando deudas...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSales.map(sale => {
                        const total = sale.totalUsd || 0;
                        const paid = sale.totalPaidUsd || 0;
                        const pending = total - paid;
                        const percent = (paid / total) * 100;

                        return (
                            <div key={sale._id} className="bg-white p-6 rounded-[32px] shadow-xl border border-gray-100 flex flex-col group hover:border-orange-200 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{sale.saleId}</p>
                                        <h3 className="text-lg font-black text-slate-800 uppercase">{sale.customerId?.name || 'Cliente Desconocido'}</h3>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${sale.status === 'pending' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {sale.status === 'pending' ? 'Sin Abono' : 'Parcial'}
                                    </span>
                                </div>

                                <div className="space-y-3 flex-1">
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-gray-400">Total Factura:</span>
                                        <span className="text-slate-900">${total.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs font-bold">
                                        <span className="text-emerald-500">Total Pagado:</span>
                                        <span className="text-emerald-600">${paid.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
                                        <span className="text-xs font-black text-gray-500 uppercase">Resta por cobrar</span>
                                        <span className="text-2xl font-black text-red-600">${pending.toFixed(2)}</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden mt-2">
                                        <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${percent}%` }}></div>
                                    </div>
                                </div>

                                <div className="flex gap-2 mt-6">
                                    <button
                                        onClick={() => setDetailSale(sale)}
                                        className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[9px]"
                                    >
                                        Ver Detalle 👁️
                                    </button>
                                    <button
                                        onClick={() => setSelectedSale(sale)}
                                        className="flex-[2] py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg hover:bg-orange-600 transition-all active:scale-95 uppercase tracking-widest text-[9px]"
                                    >
                                        Registrar Abono 💵
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    {filteredSales.length === 0 && (
                        <div className="col-span-full py-20 text-center opacity-20">
                            <span className="text-6xl mb-4 block">🎉</span>
                            <p className="font-black uppercase tracking-[0.3em] text-[10px]">No hay cuentas pendientes</p>
                        </div>
                    )}
                </div>
            )}

            {detailSale && <SaleDetailModal sale={detailSale} onClose={() => setDetailSale(null)} />}

            {/* Modal de Abono */}
            {selectedSale && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border-[10px] border-slate-50 p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 uppercase italic">Nuevo Abono</h3>
                            <button onClick={() => setSelectedSale(null)} className="text-gray-400 hover:text-red-500 text-xl">✕</button>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-2xl mb-6">
                            <p className="text-[10px] font-black text-gray-400 uppercase">Deuda de {selectedSale.customerId?.name}</p>
                            <p className="text-2xl font-black text-red-600">${(selectedSale.totalUsd - selectedSale.totalPaidUsd).toFixed(2)} USD</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-4">Método de Pago</label>
                                <select
                                    className="w-full p-4 rounded-2xl bg-gray-100 outline-none font-bold text-sm appearance-none border-2 border-transparent focus:border-orange-500 transition-all"
                                    value={newPayment.method}
                                    onChange={e => {
                                        const m = methods.find(x => x.name === e.target.value);
                                        setNewPayment({ ...newPayment, method: e.target.value, currency: m?.currency || 'USD' });
                                    }}
                                >
                                    <option value="">Seleccionar...</option>
                                    {methods.map(m => <option key={m._id} value={m.name}>{m.name} ({m.currency})</option>)}
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase ml-4">Monto a Abonar ({newPayment.currency})</label>
                                <div className="relative">
                                    <input
                                        type="number" step="0.01" placeholder="0.00"
                                        className="w-full p-4 rounded-2xl bg-gray-100 outline-none font-black text-xl border-2 border-transparent focus:border-orange-500 transition-all"
                                        value={newPayment.amount}
                                        onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                                        autoFocus
                                    />
                                    {newPayment.currency === 'BS' && (
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 italic">
                                            ≈ ${(parseFloat(newPayment.amount || 0) / bcvRate).toFixed(2)} USD
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl hover:bg-slate-900 transition-all active:scale-95 uppercase tracking-widest text-xs mt-4"
                            >
                                Confirmar Abono ⚡
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
