const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function mapWarehouses() {
    const client = new MongoClient(process.env.MONGODB_URI);
    const dryRun = process.argv.includes('--apply') ? false : true;

    try {
        await client.connect();
        const db = client.db();
        const productsCollection = db.collection('products');
        const warehousesCollection = db.collection('warehouses');

        const warehouses = await warehousesCollection.find({}).toArray();
        const getWhId = (name) => {
            const wh = warehouses.find(w => w.name.toUpperCase().includes(name.toUpperCase()));
            return wh ? wh._id : null;
        };

        const whCasId = getWhId('BODEGA CAS');
        const whPalId = getWhId('BODEGA PAL');
        const whMicroId = getWhId('BODEGA MIRCRODURAZNO');

        console.log('Target Warehouse IDs:');
        console.log(`- CAS: ${whCasId}`);
        console.log(`- PAL: ${whPalId}`);
        console.log(`- MICRO: ${whMicroId}`);

        if (!whCasId || !whPalId || !whMicroId) {
            console.error('Error: Could not find all necessary warehouses.');
            process.exit(1);
        }

        const products = await productsCollection.find({ name: { $regex: /FRANELA|MICRO\s*DURAZNO/i } }).toArray();
        console.log(`\nFound ${products.length} matching products.`);
        if (dryRun) console.log('--- DRY RUN: No changes will be applied ---\n');

        let updatedCas = 0;
        let updatedPal = 0;
        let updatedMicro = 0;

        for (const product of products) {
            const name = product.name.toUpperCase();
            let targetWhId = null;

            // Priority: Microdurazno has its own warehouse, even if it says "Franela"
            if (name.includes('MICRO') && name.includes('DURAZNO')) {
                targetWhId = whMicroId;
            } else if (name.includes('CAS')) {
                targetWhId = whCasId;
            } else {
                targetWhId = whPalId;
            }

            if (product.warehouseId?.toString() !== targetWhId.toString()) {
                const whName = targetWhId === whCasId ? 'CAS' : (targetWhId === whMicroId ? 'MICRO' : 'PAL');
                console.log(`[UPDATE] "${product.name}" -> ${whName}`);

                if (targetWhId === whCasId) updatedCas++;
                else if (targetWhId === whMicroId) updatedMicro++;
                else updatedPal++;

                if (!dryRun) {
                    await productsCollection.updateOne(
                        { _id: product._id },
                        { $set: { warehouseId: targetWhId } }
                    );
                }
            }
        }

        console.log(`\nSummary:`);
        console.log(`- Assigned to CAS: ${updatedCas}`);
        console.log(`- Assigned to PAL: ${updatedPal}`);
        console.log(`- Assigned to MICRO: ${updatedMicro}`);

        if (dryRun && (updatedCas + updatedPal + updatedMicro) > 0) {
            console.log('\nTo apply changes, run with --apply');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

mapWarehouses();
