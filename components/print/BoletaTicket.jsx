"use client";

import React, { useState, useEffect } from 'react';

// ─── Helper: genera HTML puro del ticket para imprimir en ventana nueva ───────
export function buildTicketHTML(sale, company) {
    const customerName = sale.customerId?.name || sale.customerName || null;
    const customerIdNumber = sale.customerId?.idNumber || sale.customerIdNumber || null;
    const customerPhone = sale.customerId?.phone || sale.customerPhone || null;

    const itemsRows = (sale.items || []).map(item => `
        <tr>
            <td style="padding:4px 2px;">${item.quantity}</td>
            <td style="padding:4px 4px 4px 2px;font-weight:bold;font-size:11px;text-transform:uppercase;">
                ${item.productId?.name || item.productName || item.productCode || 'Producto'}
            </td>
            <td style="padding:4px 2px;text-align:right;white-space:nowrap;">$${(item.priceUsd || 0).toFixed(2)}</td>
            <td style="padding:4px 2px;text-align:right;white-space:nowrap;font-weight:bold;">$${(item.subtotalUsd || 0).toFixed(2)}</td>
        </tr>
    `).join('');

    const paymentMethodSection = !sale.quotationId ? `
        <p><strong>Método de Pago:</strong> ${sale.paymentMethod || ''}</p>
        ${sale.accountNumber ? `<p><strong>Cuenta:</strong> ${sale.accountNumber}</p>` : ''}
        ${sale.payments && sale.payments.length > 1 ? `
            <div style="border-top:1px dashed #000;margin-top:8px;padding-top:8px;">
                <p style="font-weight:bold;font-size:11px;text-transform:uppercase;margin:0 0 4px;">Desglose de Pagos:</p>
                ${sale.payments.map(p => `
                    <p style="font-size:11px;display:flex;justify-content:space-between;margin:2px 0;">
                        <span>${p.method} (${p.currency})</span>
                        <span>$${(p.amountUsd || 0).toFixed(2)}</span>
                    </p>
                `).join('')}
            </div>
        ` : ''}
    ` : '';

    const creditSection = sale.isCredit ? `
        <p style="display:flex;justify-content:space-between;font-size:12px;">
            <span style="font-weight:bold;text-transform:uppercase;">Monto Abonado:</span>
            <span>$${(sale.totalPaidUsd || 0).toFixed(2)}</span>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:4px 0;">
        <p style="display:flex;justify-content:space-between;font-size:13px;">
            <span style="font-weight:bold;text-transform:uppercase;">Saldo Pendiente:</span>
            <span style="font-weight:bold;color:#dc2626;">$${Math.max(0, sale.totalUsd - (sale.totalPaidUsd || 0)).toFixed(2)}</span>
        </p>
    ` : '';

    const footer = sale.quotationId
        ? '¡Atención! El total en Bs. está sujeto a cambios según la tasa de cambio del día al momento del pago.'
        : '¡Gracias por su compra!';

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Ticket ${sale.saleId || sale.quotationId || ''}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 13px;
            color: #000;
            background: #fff;
            width: 80mm;
            margin: 0 auto;
            padding: 10px;
        }
        h2 { font-size: 15px; font-weight: bold; text-transform: uppercase; }
        p { margin: 2px 0; }
        .center { text-align: center; }
        .dashed { border-top: 1px dashed #000; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { border-bottom: 1px solid #000; padding: 4px 2px; text-align: left; font-size: 11px; }
        th:nth-child(3), th:nth-child(4) { text-align: right; }
        .total-line { display: flex; justify-content: space-between; }
        .client-box { border: 1px solid #ddd; padding: 4px; border-radius: 4px; margin-top: 8px; font-size: 12px; }
        @page { margin: 0; size: 80mm auto; }
    </style>
</head>
<body>
    <div class="center">
        <h2>${company.name || 'MI EMPRESA'}</h2>
        ${company.rif ? `<p>RIF: ${company.rif}</p>` : ''}
        ${company.address ? `<p style="font-size:11px;">${company.address}</p>` : ''}
        ${company.phone ? `<p style="font-size:11px;">Tlf: ${company.phone}</p>` : ''}
        ${company.email ? `<p style="font-size:11px;">${company.email}</p>` : ''}
        <div class="dashed"></div>
        <p>Fecha: ${new Date(sale.date).toLocaleString('es-VE')}</p>
        <p style="font-weight:bold;font-size:14px;">${sale.quotationId ? 'COTIZACIÓN' : 'VENTA'}: ${sale.quotationId || sale.saleId}</p>
        ${customerName ? `
        <div class="client-box" style="text-align:left;">
            <p style="font-weight:bold;">CLIENTE: ${customerName}</p>
            ${customerIdNumber ? `<p>C.I/RIF: ${customerIdNumber}</p>` : ''}
            ${customerPhone ? `<p>TLF: ${customerPhone}</p>` : ''}
        </div>
        ` : ''}
    </div>

    <div class="dashed"></div>

    <table>
        <thead>
            <tr>
                <th>Cant.</th>
                <th>Producto</th>
                <th style="text-align:right;">P.U</th>
                <th style="text-align:right;">Total</th>
            </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
    </table>

    <div class="dashed"></div>

    <div>
        <p class="total-line" style="font-size:15px;font-weight:bold;">
            <span style="text-transform:uppercase;">${sale.isCredit ? 'Total a Pagar:' : 'TOTAL USD:'}</span>
            <span>$${(sale.totalUsd || 0).toFixed(2)}</span>
        </p>
        ${creditSection}
        <p class="total-line" style="font-size:15px;font-weight:bold;margin-top:4px;">
            <span>TOTAL BS:</span>
            <span>Bs. ${(sale.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
        </p>
    </div>

    <div class="dashed"></div>

    <div style="margin-top:8px;">
        ${paymentMethodSection}
    </div>

    <div class="center" style="margin-top:16px;font-size:10px;font-style:italic;">
        <p>${footer}</p>
    </div>

    <script>
        window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
        };
    </script>
</body>
</html>`;
}

// ─── Componente visual del ticket (preview en pantalla) ────────────────────────
const BoletaTicket = ({ sale }) => {
    const [company, setCompany] = useState({ name: 'MI EMPRESA', rif: '', address: '', phone: '', email: '' });

    useEffect(() => {
        fetch('/api/company')
            .then(r => r.json())
            .then(d => { if (d && !d.error) setCompany(d); })
            .catch(() => { });
    }, []);

    if (!sale) return null;

    const customerName = sale.customerId?.name || sale.customerName || null;
    const customerIdNumber = sale.customerId?.idNumber || sale.customerIdNumber || null;
    const customerPhone = sale.customerId?.phone || sale.customerPhone || null;

    return (
        <div className="w-full">
            <div id="ticket-print" className="p-4 bg-white text-black font-mono text-sm max-w-[300px] mx-auto border border-gray-200">
                <div className="text-center mb-4">
                    <h2 className="font-bold text-lg uppercase">{company.name}</h2>
                    {company.rif && <p>RIF: {company.rif}</p>}
                    {company.address && <p className="text-xs">{company.address}</p>}
                    {company.phone && <p className="text-xs">Tlf: {company.phone}</p>}
                    {company.email && <p className="text-xs">{company.email}</p>}
                    <div className="border-t border-dashed my-2"></div>
                    <p>Fecha: {new Date(sale.date).toLocaleString()}</p>
                    <p className="font-bold text-base">{sale.quotationId ? 'COTIZACIÓN' : 'VENTA'}: {sale.quotationId || sale.saleId}</p>
                    {customerName && (
                        <div className="mt-2 text-xs border border-gray-100 p-1 rounded text-left">
                            <p className="font-bold">CLIENTE: {customerName}</p>
                            {customerIdNumber && <p>C.I/RIF: {customerIdNumber}</p>}
                            {customerPhone && <p>TLF: {customerPhone}</p>}
                        </div>
                    )}
                </div>

                <div className="border-t border-dashed my-2"></div>

                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="py-1">Cant.</th>
                            <th className="py-1">Producto</th>
                            <th className="py-1 text-right">P.U</th>
                            <th className="py-1 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="align-top">
                        {sale.items.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-100 last:border-none">
                                <td className="py-1">{item.quantity}</td>
                                <td className="py-1 pr-2">
                                    <div className="font-bold text-[11px] leading-tight uppercase">
                                        {item.productId?.name || item.productName || item.productCode || 'Producto'}
                                    </div>
                                </td>
                                <td className="py-1 text-right whitespace-nowrap pl-4">${(item.priceUsd || 0).toFixed(2)}</td>
                                <td className="py-1 text-right whitespace-nowrap pl-4 font-bold">${(item.subtotalUsd || 0).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="border-t border-dashed my-2"></div>

                <div className="space-y-1">
                    <p className="flex justify-between">
                        <span className="font-bold uppercase text-lg">{sale.isCredit ? 'Total a Pagar:' : 'Total USD:'}</span>
                        <span className="font-bold text-lg">${(sale.totalUsd || 0).toFixed(2)}</span>
                    </p>
                    {sale.isCredit && (
                        <>
                            <p className="flex justify-between text-sm">
                                <span className="font-bold uppercase">Monto Abonado:</span>
                                <span>${(sale.totalPaidUsd || 0).toFixed(2)}</span>
                            </p>
                            <div className="border-t border-gray-100 my-1"></div>
                            <p className="flex justify-between text-base">
                                <span className="font-bold uppercase">Saldo Pendiente:</span>
                                <span className="font-bold text-red-600">${Math.max(0, sale.totalUsd - (sale.totalPaidUsd || 0)).toFixed(2)}</span>
                            </p>
                        </>
                    )}
                    <p className="flex justify-between">
                        <span className="font-bold uppercase text-lg">Total BS:</span>
                        <span className="font-bold text-lg">Bs. {(sale.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </p>
                </div>

                <div className="border-t border-dashed my-2"></div>

                <div className="mt-4">
                    {!sale.quotationId && (
                        <>
                            <p><strong>Método de Pago:</strong> {sale.paymentMethod}</p>
                            {sale.accountNumber && <p><strong>Cuenta:</strong> {sale.accountNumber}</p>}
                        </>
                    )}
                    {!sale.quotationId && sale.payments && sale.payments.length > 1 && (
                        <div className="mt-2 border-t border-dashed pt-2">
                            <p className="font-bold text-xs uppercase mb-1">Desglose de Pagos:</p>
                            {sale.payments.map((p, idx) => (
                                <p key={idx} className="text-xs flex justify-between">
                                    <span>{p.method} ({p.currency})</span>
                                    <span>${(p.amountUsd || 0).toFixed(2)}</span>
                                </p>
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-center mt-6 text-[10px] italic">
                    <p>{sale.quotationId ? '¡Atención! El total en Bs. está sujeto a cambios según la tasa de cambio del día al momento del pago.' : '¡Gracias por su compra!'}</p>
                </div>
            </div>
        </div>
    );
};

export default BoletaTicket;
