"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();
    const isLoginPage = pathname === '/login' || pathname === '/';

    if (isLoginPage) return null;

    const menu = [
        { label: 'Dashboard', icon: '🏠', href: '/dashboard' },
        { label: 'POS (Ventas)', icon: '🛒', href: '/pos' },
        { label: 'Inventario', icon: '📦', href: '/inventario' },
        { label: 'Productos', icon: '🏷️', href: '/productos' },
        { label: 'Clientes', icon: '👥', href: '/clientes' },
        { label: 'Cotizaciones', icon: '📄', href: '/cotizaciones' },
        { label: 'Usuarios', icon: '👤', href: '/usuarios' },
    ];

    return (
        <aside className="w-64 bg-slate-900 h-screen sticky top-0 flex flex-col p-6 shadow-2xl z-50 shrink-0">
            <div className="mb-12">
                <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase">
                    SIS<span className="text-blue-500 text-3xl">.</span>ADMI
                </h1>
            </div>

            <nav className="flex-1 space-y-1">
                {menu.map((item) => (
                    <Link key={item.label} href={item.href}>
                        <div className={`p-4 rounded-xl flex items-center gap-4 transition-all group ${pathname === item.href ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}>
                            <span className="text-xl group-hover:scale-125 transition-transform">{item.icon}</span>
                            <span className="font-bold text-sm uppercase tracking-wide">{item.label}</span>
                        </div>
                    </Link>
                ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-slate-800">
                <Link href="/login" onClick={() => localStorage.clear()}>
                    <div className="p-4 rounded-xl text-red-400 hover:bg-red-500/10 flex items-center gap-4 transition-all">
                        <span>🚪</span>
                        <span className="font-black text-xs uppercase tracking-widest">Salir</span>
                    </div>
                </Link>
            </div>
        </aside>
    );
}
