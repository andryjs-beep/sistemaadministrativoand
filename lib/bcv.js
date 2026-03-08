export async function getBcvRates() {
    try {
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

        const rates = {
            usd: null,
            eur: null
        };

        // Patrón para USD
        const usdMatch = html.match(/<div id="dolar"[^>]*>.*?<strong>\s*([\d,.]+)\s*<\/strong>/s);
        if (usdMatch) {
            rates.usd = parseFloat(usdMatch[1].replace(',', '.').trim());
        }

        // Patrón para EUR
        const eurMatch = html.match(/<div id="euro"[^>]*>.*?<strong>\s*([\d,.]+)\s*<\/strong>/s);
        if (eurMatch) {
            rates.eur = parseFloat(eurMatch[1].replace(',', '.').trim());
        }

        // Patrón genérico si fallan los IDs rápidos (como en la tabla lateral)
        if (!rates.usd || !rates.eur) {
            const tableRegex = /<div class="row recuadro-tasas[^"]*">.*?CENTRO\s*CAMBIO.*?<\/div>/s;
            const tableMatch = html.match(tableRegex);
            if (tableMatch) {
                const tableHtml = tableMatch[0];
                const usdRow = tableHtml.match(/Dólar.*?([\d,.]+)/s);
                const eurRow = tableHtml.match(/Euro.*?([\d,.]+)/s);
                if (usdRow && !rates.usd) rates.usd = parseFloat(usdRow[1].replace(',', '.').trim());
                if (eurRow && !rates.eur) rates.eur = parseFloat(eurRow[1].replace(',', '.').trim());
            }
        }

        return rates;
    } catch (error) {
        console.error('BCV Scraper Error:', error);
        return { usd: null, eur: null };
    }
}
