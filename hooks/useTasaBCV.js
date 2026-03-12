"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export function useTasaBCV(porcentajeExtra = 0) {
    const [state, setState] = useState({
        EUR: null,
        USD: null,
        source: null,
        loading: true,
        error: null,
        lastUpdated: null,
    });

    const intervalRef = useRef(null);

    const fetchTasas = useCallback(async (isFirst = false) => {
        if (isFirst) setState((s) => ({ ...s, loading: true }));

        try {
            const res = await fetch("/api/bcv", { cache: "no-store" });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const json = await res.json();
            if (!json.ok) throw new Error(json.error);

            setState({
                EUR: json.data.EUR,
                USD: json.data.USD,
                source: json.data.source,
                loading: false,
                error: null,
                lastUpdated: json.data.timestamp ? new Date(json.data.timestamp) : new Date(),
            });
        } catch (err) {
            setState((s) => ({ ...s, loading: false, error: err.message }));
        }
    }, []);

    useEffect(() => {
        fetchTasas(true);
        intervalRef.current = setInterval(() => fetchTasas(false), 60 * 60 * 1000); // 60 minutos
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchTasas]);

    // EUR → Bs con porcentaje
    const toBs = useCallback(
        (precioEur) => {
            if (!precioEur || !state.EUR) return null;
            return precioEur * (1 + porcentajeExtra / 100) * state.EUR;
        },
        [state.EUR, porcentajeExtra]
    );

    // EUR → USD
    const toUsd = useCallback(
        (precioEur) => {
            if (!precioEur || !state.EUR || !state.USD) return null;
            return precioEur * (state.EUR / state.USD);
        },
        [state.EUR, state.USD]
    );

    // USD → Bs con porcentaje
    const usdToBs = useCallback(
        (precioUsd) => {
            if (!precioUsd || !state.USD) return null;
            return precioUsd * (1 + porcentajeExtra / 100) * state.USD;
        },
        [state.USD, porcentajeExtra]
    );

    const fmtBs = (v) =>
        v != null
            ? new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + " Bs"
            : "---";

    const fmtUsd = (v) =>
        v != null ? "$ " + new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) : "---";

    const fmtEur = (v) =>
        v != null ? "€ " + new Intl.NumberFormat("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) : "---";

    return {
        EUR: state.EUR,           // Tasa EUR/Bs
        USD: state.USD,           // Tasa USD/Bs
        source: state.source,     // Fuente de cada tasa
        loading: state.loading,
        error: state.error,
        lastUpdated: state.lastUpdated,
        toBs,                     // EUR → Bs
        toUsd,                    // EUR → USD
        usdToBs,                  // USD → Bs
        fmtBs,
        fmtUsd,
        fmtEur,
        refresh: () => fetchTasas(true),
    };
}
