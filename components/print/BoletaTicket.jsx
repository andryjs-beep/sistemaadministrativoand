"use client";

import React, { useState, useEffect } from 'react';

const BoletaTicket = ({ sale }) => {
    const [company, setCompany] = useState({ name: 'MI EMPRESA', rif: '', address: '', phone: '', email: '' });

    useEffect(() => {
        fetchCompany();
    }, []);

    const fetchCompany = async () => {
        try {
            const res = await fetch('/api/company');
            const data = await res.json();
            if (data && !data.error) setCompany(data);
        } catch (e) { /* silencioso */ }
    };

    if (!sale) return null;

    return (
        <div id="ticket-print" className="p-4 bg-white text-black font-mono text-sm max-w-xs mx-auto border border-gray-200">
            <div className="text-center mb-4">
                <h2 className="font-bold text-lg uppercase">{company.name}</h2>
                {company.rif && <p>RIF: {company.rif}</p>}
                {company.address && <p className="text-xs">{company.address}</p>}
                {company.phone && <p className="text-xs">Tlf: {company.phone}</p>}
                {company.email && <p className="text-xs">{company.email}</p>}
                <div className="border-t border-dashed my-2"></div>
                <p>Fecha: {new Date(sale.date).toLocaleString()}</p>
                <p>ID: {sale.saleId}</p>
            </div>

            <div className="border-t border-dashed my-2"></div>

            <table className="w-full text-left">
                <thead>
                    <tr>
                        <th>Cant.</th>
                        <th>Producto</th>
                        <th className="text-right">Total USD</th>
                    </tr>
                </thead>
                <tbody>
                    {sale.items.map((item, idx) => (
                        <tr key={idx}>
                            <td>{item.quantity}</td>
                            <td>{item.productId?.name || 'Producto'}</td>
                            <td className="text-right">${item.subtotalUsd.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="border-t border-dashed my-2"></div>

            <div className="space-y-1">
                <p className="flex justify-between">
                    <span className="font-bold uppercase text-lg">Total USD:</span>
                    <span className="font-bold text-lg">${sale.totalUsd.toFixed(2)}</span>
                </p>
                <p className="flex justify-between">
                    <span className="font-bold uppercase text-lg">Total BS:</span>
                    <span className="font-bold text-lg">Bs. {sale.totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                </p>
            </div>

            <div className="border-t border-dashed my-2"></div>

            <div className="mt-4">
                <p><strong>Método de Pago:</strong> {sale.paymentMethod}</p>
                {sale.accountNumber && <p><strong>Cuenta:</strong> {sale.accountNumber}</p>}

                {/* Multi-pagos detallados */}
                {sale.payments && sale.payments.length > 1 && (
                    <div className="mt-2 border-t border-dashed pt-2">
                        <p className="font-bold text-xs uppercase mb-1">Desglose de Pagos:</p>
                        {sale.payments.map((p, idx) => (
                            <p key={idx} className="text-xs flex justify-between">
                                <span>{p.method} ({p.currency})</span>
                                <span>${p.amountUsd.toFixed(2)}</span>
                            </p>
                        ))}
                    </div>
                )}
            </div>

            <div className="text-center mt-6 text-xs italic">
                <p>¡Gracias por su compra!</p>
            </div>

            <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #ticket-print, #ticket-print * { visibility: visible; }
          #ticket-print { 
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
        </div>
    );
};

export default BoletaTicket;
