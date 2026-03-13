const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function extractSizes() {
    if (!process.env.MONGODB_URI) {
        console.error('Error: MONGODB_URI not found in .env.local');
        process.exit(1);
    }

    const client = new MongoClient(process.env.MONGODB_URI);
    const dryRun = process.argv.includes('--apply') ? false : true;

    try {
        await client.connect();
        const db = client.db();
        const productsCollection = db.collection('products');

        const products = await productsCollection.find({}).toArray();
        console.log(`Checking ${products.length} products...`);
        if (dryRun) console.log('--- DRY RUN: No changes will be applied ---\n');

        let updatedCount = 0;
        let skippedCount = 0;

        for (const product of products) {
            const name = product.name || '';
            let detectedSize = null;

            // EXCLUDE: Skip if it's a sticker or other non-clothing items as requested
            if (name.toUpperCase().includes('STICKER')) {
                skippedCount++;
                continue;
            }

            // Pattern 1: Talla followed by S, M, L, XL, XXL, etc.
            const patternTallaLetter = /Talla\s+([SMLXL]+)/i;
            const matchTallaLetter = name.match(patternTallaLetter);
            if (matchTallaLetter) {
                detectedSize = matchTallaLetter[1].toUpperCase();
            }

            // Pattern 2: Talla followed by numbers (e.g. Talla 32, Talla 4)
            if (!detectedSize) {
                const patternTallaNum = /Talla\s+(\d+)/i;
                const matchTallaNum = name.match(patternTallaNum);
                if (matchTallaNum) {
                    detectedSize = matchTallaNum[1];
                }
            }

            // Pattern 3: Measurements like 1 METRO, 2 M
            if (!detectedSize) {
                const patternMeasure = /(\d+)\s*(METRO|METROS|M)\b/i;
                const matchMeasure = name.match(patternMeasure);
                if (matchMeasure) {
                    detectedSize = `${matchMeasure[1]} ${matchMeasure[2].toUpperCase()}`;
                    if (detectedSize.endsWith(' M')) detectedSize = detectedSize.replace(' M', ' METRO');
                }
            }

            // Pattern 4: Standalone sizes at the end or middle if they are clearly sizes
            // This is more aggressive and might need refinement
            if (!detectedSize) {
                const standaloneSizes = /\s+(S|M|L|XL|XXO|XXL|XXXL|4XL|5XL)\s+/i;
                const matchStandalone = name.match(standaloneSizes);
                if (matchStandalone) {
                    detectedSize = matchStandalone[1].toUpperCase();
                }
            }

            if (detectedSize) {
                if (product.size !== detectedSize) {
                    console.log(`[MATCH] "${name}" -> Detected: ${detectedSize} (Current: ${product.size || 'N/A'})`);
                    updatedCount++;

                    if (!dryRun) {
                        await productsCollection.updateOne(
                            { _id: product._id },
                            { $set: { size: detectedSize } }
                        );
                    }
                } else {
                    skippedCount++;
                }
            } else {
                skippedCount++;
            }
        }

        console.log(`\nSummary:`);
        console.log(`- Products matched and ${dryRun ? 'would be updated' : 'updated'}: ${updatedCount}`);
        console.log(`- Products skipped (no match or already correct): ${skippedCount}`);

        if (dryRun && updatedCount > 0) {
            console.log('\nTo apply changes, run the command with --apply');
        }

    } catch (err) {
        console.error('An error occurred:', err);
    } finally {
        await client.close();
    }
}

extractSizes();
