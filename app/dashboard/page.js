"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function DashboardPage() {
    const [stats, setStats] = useState({ products: 0, sales: 0, quotations: 0 });

    useEffect(() => {
        // Aquí cargarías estadísticas reales desde el API
    }, []);

    const menuItems = [
        { title: 'POS (Ventas)', icon: '🛒', href: '/pos', color: 'bg-green-600' },
        { title: 'Inventario', icon: '📦', href: '/inventario', color: 'bg-blue-600' },
        { title: 'Productos', icon: '🏷️', href: '/productos', color: 'bg-purple-600' },
        { title: 'Cotizaciones', icon: '📄', href: '/cotizaciones', color: 'bg-orange-600' },
        { title: 'Usuarios', icon: '👥', href: '/usuarios', color: 'bg-red-600' },
    ];

    return (
        <div className="min-h-screen bg-gray-950 text-white p-8">
            <header className="flex justify-between items-center mb-12">
                <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400 uppercase tracking-tighter">
                    Dashboard Administrativo
                </h1>
                <div className="flex items-center gap-4">
                    <div className="px-4 py-2 bg-gray-800 rounded-full border border-gray-700">
                        Tasa BCV: <span className="text-emerald-400 font-bold">Bs. 36.50</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                {menuItems.map((item) => (
                    <Link key={item.title} href={item.href}>
                        <div className={`p-8 ${item.color} rounded-2xl hover:scale-105 transition-transform cursor-pointer shadow-xl flex flex-col items-center justify-center gap-4 group`}>
                            <span className="text-5xl group-hover:animate-bounce">{item.icon}</span>
                            <span className="font-bold text-lg uppercase tracking-wider">{item.title}</span>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
                    <h3 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">Ventas Recientes</h3>
                    <p className="text-gray-500 italic">No hay ventas registradas hoy.</p>
                </div>
                <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
                    <h3 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">Stock Crítico</h3>
                    <p className="text-emerald-500 font-medium">Todo el inventario está óptimo.</p>
                </div>
                <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-2xl">
                    <h3 className="text-xl font-bold mb-4 border-b border-gray-800 pb-2">Cotizaciones Abiertas</h3>
                    <p className="text-gray-300 font-bold text-4xl">0</p>
                </div>
            </div>
        </div>
    );
}
