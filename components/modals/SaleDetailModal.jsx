"use client";

import React from 'react';

const SaleDetailModal = ({ sale, onClose }) => {
    if (!sale) return null;

    return (
        <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-300">
            <div className="min-h-full flex items-center justify-center p-4">
                <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Detalle de Venta</p>
                            <h2 className="text-2xl font-black text-slate-800 tracking-tight">{sale.saleId}</h2>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:border-red-100 transition-all active:scale-90">
                            <span className="text-2xl">×</span>
                        </button>
                    </div>

                    <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {/* Customer Info */}
                        {(sale.customerId?.name || sale.customerName) && (
                            <div className="mb-8 p-5 bg-violet-50 rounded-3xl border border-violet-100">
                                <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2">Cliente</p>
                                <p className="text-lg font-black text-violet-900 uppercase">{sale.customerId?.name || sale.customerName}</p>
                                {(sale.customerId?.phone || sale.customerPhone) && (
                                    <p className="text-sm font-bold text-violet-600/70 mt-1">📞 {sale.customerId?.phone || sale.customerPhone}</p>
                                )}
                            </div>
                        )}

                        <table className="w-full text-left border-separate border-spacing-y-3">
                            <thead>
                                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-4 pb-2">Producto</th>
                                    <th className="px-4 pb-2 text-center">Cant.</th>
                                    <th className="px-4 pb-2 text-right">Unit.</th>
                                    <th className="px-4 pb-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sale.items.map((item, idx) => (
                                    <tr key={idx} className="bg-slate-50/50 hover:bg-slate-50 transition-colors group">
                                        <td className="p-4 rounded-l-2xl border-l border-y border-transparent group-hover:border-slate-100">
                                            <p className="font-black text-slate-700 text-sm uppercase">{item.productId?.name || 'Producto'}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{item.productId?.code || 'S/C'}</p>
                                        </td>
                                        <td className="p-4 text-center font-black text-slate-600 border-y border-transparent group-hover:border-slate-100">{item.quantity}</td>
                                        <td className="p-4 text-right font-bold text-slate-600 border-y border-transparent group-hover:border-slate-100">${(item.priceUsd || 0).toFixed(2)}</td>
                                        <td className="p-4 text-right rounded-r-2xl font-black text-emerald-600 border-r border-y border-transparent group-hover:border-slate-100">
                                            ${(item.subtotalUsd || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-8 bg-slate-800 text-white flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center md:text-left">Total de Venta</p>
                            <p className="text-3xl font-black tracking-tighter">
                                <span className="text-emerald-400">$</span>{sale.totalUsd?.toFixed(2)}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-400">Tasa BCV Aplicada</p>
                            <p className="text-lg font-black text-orange-400 italic">
                                Bs. {sale.totalBs?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SaleDetailModal;
