"use client";

import { useState, useEffect } from 'react';

export default function InventarioPage() {
    const [products, setProducts] = useState([]);
    const [user, setUser] = useState(null);

    useEffect(() => {
        fetchProducts();
        const storedUser = localStorage.getItem('user');
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    const fetchProducts = async () => {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data);
    };

    const handleAdjust = async (id, currentStock) => {
        const newValue = prompt('Nuevo stock total:', currentStock);
        if (newValue === null) return;

        const adjustment = parseInt(newValue) - currentStock;

        const res = await fetch('/api/inventory', {
            method: 'POST',
            body: JSON.stringify({ productId: id, adjustment })
        });

        if (res.ok) {
            alert('Inventario actualizado');
            fetchProducts();
        } else {
            alert('Error: Posible falta de permisos');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <h1 className="text-3xl font-black text-gray-900 mb-8 uppercase tracking-tighter">Control de Inventario</h1>

            <div className="grid grid-cols-1 gap-4">
                {products.map(product => (
                    <div key={product._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center hover:shadow-md transition">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                                {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover rounded-lg" /> : '📦'}
                            </div>
                            <div>
                                <h2 className="font-bold text-lg text-gray-800">{product.name}</h2>
                                <p className="text-sm text-gray-400">Código: {product.code}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-12">
                            <div className="text-center">
                                <p className="text-xs font-black text-gray-400 uppercase">Stock Actual</p>
                                <p className={`text-2xl font-black ${product.stock <= product.minStock ? 'text-red-500' : 'text-blue-600'}`}>
                                    {product.stock}
                                </p>
                            </div>

                            <button
                                onClick={() => handleAdjust(product._id, product.stock)}
                                className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-gray-800 transition active:scale-95 flex items-center gap-2"
                            >
                                ⚙️ Ajustar
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
