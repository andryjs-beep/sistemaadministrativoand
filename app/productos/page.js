"use client";

import { useState, useEffect } from 'react';

export default function ProductosPage() {
    const [products, setProducts] = useState([]);
    const [form, setForm] = useState({ code: '', name: '', description: '', priceUsd: '', minStock: '5', imageUrl: '' });
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const res = await fetch('/api/products');
        const data = await res.json();
        setProducts(data);
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'ml_default'); // Configura esto en Cloudinary

        // Petición directa a Cloudinary (Widget simple)
        const cloudName = 'tu_cloud_name';
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        setForm({ ...form, imageUrl: data.secure_url });
        alert('Imagen cargada');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const method = isEditing ? 'PUT' : 'POST';
        const body = isEditing ? { id: isEditing, ...form } : form;

        const res = await fetch('/api/products', {
            method,
            body: JSON.stringify(body)
        });

        if (res.ok) {
            setForm({ code: '', name: '', description: '', priceUsd: '', minStock: '5', imageUrl: '' });
            setIsEditing(false);
            fetchProducts();
            alert('Operación exitosa');
        }
    };

    return (
        <div className="min-h-screen bg-white p-8 font-sans text-gray-900">
            <div className="max-w-6xl mx-auto flex gap-12">
                {/* Formulario */}
                <div className="flex-1 bg-gray-50 p-8 rounded-3xl border border-gray-100 shadow-sm sticky top-8 h-fit">
                    <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Registro de Producto</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            placeholder="Código"
                            className="w-full p-4 rounded-xl border-2 border-white shadow-sm focus:border-blue-500 outline-none"
                            value={form.code} onChange={e => setForm({ ...form, code: e.target.value })}
                        />
                        <input
                            placeholder="Nombre"
                            className="w-full p-4 rounded-xl border-2 border-white shadow-sm focus:border-blue-500 outline-none"
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                        />
                        <input
                            placeholder="Precio USD" type="number" step="0.01"
                            className="w-full p-4 rounded-xl border-2 border-white shadow-sm focus:border-blue-500 outline-none"
                            value={form.priceUsd} onChange={e => setForm({ ...form, priceUsd: e.target.value })}
                        />
                        <div className="p-4 border-2 border-dashed border-gray-300 rounded-xl text-center">
                            <label className="cursor-pointer block">
                                <span className="text-sm font-bold text-gray-500 italic block mb-2">Cargar Imagen (Cloudinary)</span>
                                <input type="file" onChange={handleUpload} className="hidden" />
                                {form.imageUrl && <img src={form.imageUrl} className="w-20 h-20 mx-auto rounded-lg object-cover" />}
                            </label>
                        </div>
                        <button className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition active:scale-95 shadow-lg shadow-blue-100">
                            {isEditing ? 'Actualizar Producto' : 'Guardar Producto'}
                        </button>
                    </form>
                </div>

                {/* Lista */}
                <div className="flex-[2]">
                    <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Catálogo</h2>
                    <div className="grid grid-cols-1 gap-4">
                        {products.map(p => (
                            <div key={p._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl group border border-transparent hover:border-blue-200 transition">
                                <img src={p.imageUrl || '/placeholder.png'} className="w-20 h-20 rounded-xl object-cover bg-white" />
                                <div className="flex-1">
                                    <h3 className="font-black text-gray-800">{p.name}</h3>
                                    <p className="text-sm text-gray-400 font-mono">${p.priceUsd.toFixed(2)}</p>
                                </div>
                                <button
                                    onClick={() => { setForm(p); setIsEditing(p._id); }}
                                    className="p-3 hover:bg-blue-100 text-blue-600 rounded-xl transition"
                                >
                                    ✏️
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
