"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard', roles: ['admin', 'vendedor'] },
    { href: '/pos', icon: '🛒', label: 'POS (Ventas)', roles: ['admin', 'vendedor'] },
    { href: '/caja', icon: '💰', label: 'Caja', roles: ['admin', 'vendedor'] },
    { href: '/inventario', icon: '📦', label: 'Inventario', roles: ['admin', 'vendedor'] },
    { href: '/productos', icon: '🏷️', label: 'Productos', roles: ['admin', 'vendedor'] },
    { href: '/bodegas', icon: '🏭', label: 'Bodegas', roles: ['admin', 'vendedor'] },
    { href: '/clientes', icon: '👥', label: 'Clientes', roles: ['admin', 'vendedor'] },
    { href: '/proveedores', icon: '💸', label: 'Proveedores', roles: ['admin'] },
    { href: '/metodos-pago', icon: '💳', label: 'Metodos de Pago', roles: ['admin'] },
    { href: '/cotizaciones', icon: '📋', label: 'Cotizaciones', roles: ['admin', 'vendedor'] },
    { href: '/reportes', icon: '📊', label: 'Reportes', roles: ['admin'] },
    { href: '/usuarios', icon: '🛡️', label: 'Usuarios', roles: ['admin'] },
    { href: '/empresa', icon: '🏢', label: 'Empresa', roles: ['admin'] },
];

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState(null);
    const pathname = usePathname();

    useEffect(() => {
        try {
            const stored = localStorage.getItem('user');
            if (stored) {
                const parsed = JSON.parse(stored);
                // Asegurar que el rol sea siempre minúscula para la comparación
                if (parsed && parsed.role) {
                    parsed.role = parsed.role.toLowerCase();
                    setUser(parsed);
                }
            }
        } catch (e) {
            console.error('Error parsing user session', e);
        }
    }, [pathname]);

    // Hide on login page
    if (pathname === '/login') return null;

    const filteredItems = NAV_ITEMS.filter(item => {
        if (!user) return true;
        const userRole = (user.role || 'vendedor').toLowerCase();
        return item.roles.includes(userRole);
    });

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
                    {user && (
                        <div className="mt-4 p-3 bg-white/5 rounded-2xl">
                            <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Usuario Conectado</p>
                            <p className="text-xs font-bold text-white uppercase mt-0.5 truncate">{user.username}</p>
                            <span className="text-[8px] font-black bg-white/10 text-gray-400 px-2 py-0.5 rounded-full mt-1 inline-block uppercase italic">{user.role}</span>
                        </div>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
                    {filteredItems.map(({ href, icon, label }) => {
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
                        onClick={() => localStorage.removeItem('user')}
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
