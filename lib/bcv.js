/**
 * Tasas BCV - Estrategia dual optimizada
 * USD → API Enzo (principal) + Scraping BCV (fallback)
 * EUR → Scraping BCV (principal) + MongoDB (fallback)
 * EUR = Moneda base del sistema
 */

import dbConnect from "@/lib/db";
import { ExchangeRate } from "@/lib/models";

const CONFIG = {
    CACHE_MS: 60 * 60 * 1000, // 60 minutos
    BCV_URL: "https://www.bcv.org.ve/",
    ENZO_USD_URL: "https://ve.dolarapi.com/v1/dolares/oficial",
    ENZO_EUR_URL: "https://ve.dolarapi.com/v1/euros/oficial",
    RETRIES: 3,
    RETRY_DELAY_MS: 1500,
};

let cache = { EUR: null, USD: null, lastFetch: null };

// ─── Utilidades ───────────────────────────────────────────

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

// Limpia formato venezolano: 41.123,45 → 41123.45
function cleanNumber(raw) {
    if (!raw) return 0;
    return parseFloat(raw.replace(/\./g, "").replace(",", "."));
}

async function fetchWithRetry(fn, label) {
    for (let i = 1; i <= CONFIG.RETRIES; i++) {
        try {
            return await fn();
        } catch (err) {
            console.error(`[${label}] Intento ${i}/${CONFIG.RETRIES}: ${err.message}`);
            if (i === CONFIG.RETRIES) throw err;
            await sleep(CONFIG.RETRY_DELAY_MS * i);
        }
    }
}

// ─── Fuentes de USD ───────────────────────────────────────

async function fetchUsdFromEnzo() {
    return fetchWithRetry(async () => {
        const res = await fetch(CONFIG.ENZO_USD_URL, {
            headers: { Accept: "application/json" },
            next: { revalidate: 0 },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const value = data.venta ?? data.promedio ?? data.compra;
        if (!value) throw new Error("Respuesta vacía de API Enzo");

        return { value: parseFloat(value), source: "enzo_api" };
    }, "USD/Enzo");
}

async function fetchUsdFromBCV(html) {
    const patterns = [
        /<div id="dolar"[^>]*>.*?<strong>\s*([\d,.]+)\s*<\/strong>/s,
        /USD[\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/i,
        /D[oó]lar[\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/i,
    ];

    for (const p of patterns) {
        const match = html.match(p);
        if (match?.[1]) {
            return { value: cleanNumber(match[1]), source: "bcv_scraping" };
        }
    }
    throw new Error("USD no encontrado en HTML del BCV");
}

// ─── Fuentes de EUR ───────────────────────────────────────

async function fetchEurFromBCV(html) {
    const patterns = [
        /<div id="euro"[^>]*>.*?<strong>\s*([\d,.]+)\s*<\/strong>/s,
        /EUR[\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/i,
        /Euro[\s\S]*?<strong>\s*([\d,.]+)\s*<\/strong>/i,
    ];

    for (const p of patterns) {
        const match = html.match(p);
        if (match?.[1]) {
            return { value: cleanNumber(match[1]), source: "bcv_scraping" };
        }
    }
    throw new Error("EUR no encontrado en HTML del BCV");
}

async function fetchEurFromEnzo() {
    return fetchWithRetry(async () => {
        const res = await fetch(CONFIG.ENZO_EUR_URL, {
            headers: { Accept: "application/json" },
            next: { revalidate: 0 },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        const value = data.venta ?? data.promedio ?? data.compra;
        if (!value) throw new Error("Respuesta vacía de API Enzo EUR");

        return { value: parseFloat(value), source: "enzo_api" };
    }, "EUR/Enzo");
}

// ─── Scraping del BCV (HTML compartido para EUR y USD) ────

async function scrapeBCV() {
    return fetchWithRetry(async () => {
        const res = await fetch(CONFIG.BCV_URL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                Accept: "text/html",
            },
            next: { revalidate: 0 },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    }, "BCV/Scraping");
}

// ─── Fallback MongoDB ─────────────────────────────────────

async function getFromDB(type) {
    await dbConnect();
    const doc = await ExchangeRate.findOne({ type }).sort({ createdAt: -1 }).lean();
    if (!doc) throw new Error(`Sin datos de ${type} en MongoDB`);
    return { value: doc.value, source: "db_fallback" };
}

// ─── Guardar en MongoDB ───────────────────────────────────

async function saveToDB(eurData, usdData) {
    try {
        await dbConnect();
        // Solo guardar si hay un cambio real o no hay registros
        const [lastEur, lastUsd] = await Promise.all([
            ExchangeRate.findOne({ type: 'EUR' }).sort({ createdAt: -1 }),
            ExchangeRate.findOne({ type: 'USD' }).sort({ createdAt: -1 })
        ]);

        const tasks = [];
        if (!lastEur || Math.abs(lastEur.value - eurData.value) > 0.0001) {
            tasks.push(ExchangeRate.create({ type: "EUR", value: eurData.value, source: eurData.source, date: new Date() }));
        }
        if (!lastUsd || Math.abs(lastUsd.value - usdData.value) > 0.0001) {
            tasks.push(ExchangeRate.create({ type: "USD", value: usdData.value, source: usdData.source, date: new Date() }));
        }

        if (tasks.length > 0) await Promise.all(tasks);
    } catch (err) {
        console.error("[BCV] Error guardando en MongoDB:", err.message);
    }
}

// ─── Función principal ────────────────────────────────────

export async function getTasasBCV() {
    const now = Date.now();

    // Cache vigente → retorna inmediatamente
    if (cache.lastFetch && now - cache.lastFetch < CONFIG.CACHE_MS && cache.EUR && cache.USD) {
        return { EUR: cache.EUR, USD: cache.USD, source: { EUR: "cache", USD: "cache" }, lastFetch: cache.lastFetch };
    }

    let eurData, usdData;

    // 1. Intentar USD (Enzo)
    try {
        usdData = await fetchUsdFromEnzo();
    } catch (err) {
        console.warn(`[USD] Enzo falló: ${err.message}. Intentando scraping BCV...`);
    }

    // 2. Intentar EUR (Enzo) - Nuevo fallback más confiable que scraping
    try {
        eurData = await fetchEurFromEnzo();
    } catch (err) {
        console.warn(`[EUR] Enzo falló: ${err.message}. Intentando scraping BCV...`);
    }

    // 3. Scraping BCV como fallback para ambos
    if (!usdData || !eurData) {
        try {
            const html = await scrapeBCV();
            if (!usdData) {
                try {
                    usdData = await fetchUsdFromBCV(html);
                } catch (err) {
                    console.warn(`[USD] Scraping BCV falló: ${err.message}.`);
                }
            }
            if (!eurData) {
                try {
                    eurData = await fetchEurFromBCV(html);
                } catch (err) {
                    console.warn(`[EUR] Scraping BCV falló: ${err.message}.`);
                }
            }
        } catch (err) {
            console.error("[BCV] Scraping falló:", err.message);
        }
    }

    // 4. Fallback final: MongoDB
    if (!usdData) {
        console.warn("[USD] Intentando MongoDB...");
        try { usdData = await getFromDB("USD"); }
        catch (err) {
            console.warn(`[USD] MongoDB falló: ${err.message}. Usando valor hardcodeado.`);
            usdData = { value: 36.5, source: "hardcoded" };
        }
    }
    if (!eurData) {
        console.warn("[EUR] Intentando MongoDB...");
        try { eurData = await getFromDB("EUR"); }
        catch (err) {
            console.warn(`[EUR] MongoDB falló: ${err.message}. Estimando desde USD.`);
            // Último recurso: estima EUR desde USD (proporción histórica ~1.08)
            eurData = { value: usdData.value * 1.08, source: "estimated" };
        }
    }

    // Actualiza cache
    cache = { EUR: eurData.value, USD: usdData.value, lastFetch: now };

    // Persiste en MongoDB en background
    saveToDB(eurData, usdData);

    return {
        EUR: eurData.value,
        USD: usdData.value,
        source: { EUR: eurData.source, USD: usdData.source },
        lastFetch: now,
    };
}

// ─── Cálculos (EUR como moneda base) ──────────────────────

/**
 * EUR → Bs con porcentaje de brecha
 */
export function eurToBs(precioEur, tasaEur, porcentaje = 0) {
    if (!precioEur || !tasaEur) return null;
    return precioEur * (1 + porcentaje / 100) * tasaEur;
}

/**
 * EUR → USD usando relación de tasas BCV
 */
export function eurToUsd(precioEur, tasaEur, tasaUsd) {
    if (!precioEur || !tasaEur || !tasaUsd) return null;
    return precioEur * (tasaEur / tasaUsd);
}

/**
 * USD → Bs con porcentaje de brecha
 */
export function usdToBs(precioUsd, tasaUsd, porcentaje = 0) {
    if (!precioUsd || !tasaUsd) return null;
    return precioUsd * (1 + porcentaje / 100) * tasaUsd;
}
