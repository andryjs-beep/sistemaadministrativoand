"use client";

import React from 'react';

const BoletaTicket = ({ sale }) => {
    if (!sale) return null;

    return (
        <div id="ticket-print" className="p-4 bg-white text-black font-mono text-sm max-w-xs mx-auto border border-gray-200">
            <div className="text-center mb-4">
                <h2 className="font-bold text-lg">SISTEMA DE INVENTARIO</h2>
                <p>RIF: J-12345678-9</p>
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
