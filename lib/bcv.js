export async function getBcvRate() {
    try {
        // Intentamos obtener la tasa directamente de la página del BCV
        const response = await fetch('https://www.bcv.org.ve/', {
            next: { revalidate: 60 },
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = await response.text();

        // El BCV suele tener la tasa en un div con id "dolar"
        // Usamos una regex simple para extraer el valor numérico
        const regex = /<div id="dolar"[^>]*>.*?<strong>\s*([\d,.]+)\s*<\/strong>/s;
        const match = html.match(regex);

        if (match && match[1]) {
            const rateStr = match[1].replace(',', '.');
            return parseFloat(rateStr);
        }

        // Fallback en caso de que el scraping falle o el formato cambie
        // En producción podrías usar una API de terceros como respaldo
        return 36.50; // Tasa por defecto de respaldo
    } catch (error) {
        console.error('Error fetching BCV rate:', error);
        return 36.50;
    }
}
