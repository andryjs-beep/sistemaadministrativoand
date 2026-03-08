export async function getBcvRate() {
    try {
        // Usamos una cabecera más real para evitar bloqueos
        const response = await fetch('https://www.bcv.org.ve/', {
            next: { revalidate: 60 },
            cache: 'no-store',
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.ok) throw new Error('BCV unreachable');

        const html = await response.text();

        // El BCV actualizó su sitio o estructura: buscamos patrones más específicos
        // Generalmente está en un div con id "dolar" o similar
        const patterns = [
            /<div id="dolar"[^>]*>.*?<strong>\s*([\d,.]+)\s*<\/strong>/s,
            /USD.*?([\d,.]+)/s, // Fallback pattern
        ];

        for (const regex of patterns) {
            const match = html.match(regex);
            if (match && match[1]) {
                const rateStr = match[1].replace(',', '.').trim();
                const rate = parseFloat(rateStr);
                if (!isNaN(rate) && rate > 0) return rate;
            }
        }

        // Fallback Senior: Si el BCV falla, podríamos consultar una API redundante o usar la última guardada
        console.warn('Scraping failed, using fallback.');
        return null;
    } catch (error) {
        console.error('BCV Scraper Error:', error);
        return null;
    }
}
