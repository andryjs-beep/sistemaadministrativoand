"use client";

import { useState, useEffect } from 'react';

const NAV_ITEMS = [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/pos', icon: '🛒', label: 'POS (Ventas)' },
    { href: '/caja', icon: '💰', label: 'Caja' },
    { href: '/inventario', icon: '📦', label: 'Inventario' },
    { href: '/productos', icon: '🏷️', label: 'Productos' },
    { href: '/bodegas', icon: '🏭', label: 'Bodegas' },
    { href: '/clientes', icon: '👥', label: 'Clientes' },
    { href: '/proveedores', icon: '💸', label: 'Proveedores' },
    { href: '/metodos-pago', icon: '💳', label: 'Métodos de Pago' },
    { href: '/cotizaciones', icon: '📋', label: 'Cotizaciones' },
    { href: '/reportes', icon: '📊', label: 'Reportes' },
    { href: '/usuarios', icon: '🛡️', label: 'Usuarios' },
];

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [pathname, setPathname] = useState('');

    useEffect(() => {
        setPathname(window.location.pathname);
    }, []);

    // Hide on login page
    if (pathname === '/login') return null;

    return (
        <>
            {/* Mobile toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 w-11 h-11 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl text-xl"
            >
                {isOpen ? '✕' : '☰'}
            </button>

            {/* Overlay (mobile) */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:sticky top-0 left-0 h-screen z-40
                w-64 bg-slate-950 flex flex-col
                transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo */}
                <div className="p-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-lg">SA</div>
                        <div>
                            <p className="font-black text-white text-sm tracking-tight">SIS.ADMI</p>
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.2em]">Sistema Administrativo</p>
                        </div>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                    {NAV_ITEMS.map(({ href, icon, label }) => {
                        const active = pathname === href || pathname.startsWith(href + '/');
                        return (
                            <a
                                key={href}
                                href={href}
                                onClick={() => setIsOpen(false)}
                                className={`
                                    flex items-center gap-3 px-4 py-3 rounded-2xl transition-all group
                                    ${active ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-400 hover:bg-white/5 hover:text-white'}
                                `}
                            >
                                <span className="text-base">{icon}</span>
                                <span className="font-bold text-sm uppercase tracking-wide">{label}</span>
                                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/60"></span>}
                            </a>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 shrink-0">
                    <a
                        href="/login"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-all"
                    >
                        <span className="text-base">🚪</span>
                        <span className="font-bold text-sm uppercase tracking-wide">Salir</span>
                    </a>
                </div>
            </aside>
        </>
    );
}
