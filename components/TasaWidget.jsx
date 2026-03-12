"use client";

import { useTasaBCV } from "@/hooks/useTasaBCV";

export default function TasaWidget() {
    const { EUR, USD, loading, error, lastUpdated, source, fmtBs, refresh } = useTasaBCV();

    if (loading && !EUR) {
        return (
            <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/5 animate-pulse">
                <div className="w-16 h-3 bg-white/10 rounded-full"></div>
                <div className="w-4 h-4 rounded-full bg-white/10"></div>
                <div className="w-16 h-3 bg-white/10 rounded-full"></div>
            </div>
        );
    }

    if (error && !EUR) {
        return (
            <button onClick={refresh} className="text-[10px] font-black text-red-400 uppercase tracking-widest hover:text-red-300 transition-colors">
                ⚠️ Error Tasas · Reintentar
            </button>
        );
    }

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-3 shadow-xl">
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em]">Tasas BCV</span>
                    <span className="text-[8px] font-medium text-gray-500 italic">
                        {lastUpdated?.toLocaleTimeString("es-VE", { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex-1">
                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Dólar USD</p>
                        <p className="text-sm font-black text-white tracking-tighter">{fmtBs(USD)}</p>
                    </div>

                    <div className="w-px h-5 bg-white/10"></div>

                    <div className="flex-1 text-right">
                        <p className="text-[8px] font-bold text-gray-500 uppercase tracking-widest">Euro EUR</p>
                        <p className="text-sm font-black text-white tracking-tighter">{fmtBs(EUR)}</p>
                    </div>
                </div>

                {(source?.USD === "estimated" || source?.EUR === "estimated") && (
                    <div className="mt-1 flex items-center gap-1">
                        <span className="text-yellow-500 text-[8px]">⚠️</span>
                        <span className="text-yellow-500/80 text-[7px] font-black uppercase tracking-widest">Valores Estimados</span>
                    </div>
                )}
            </div>
        </div>
    );
}
