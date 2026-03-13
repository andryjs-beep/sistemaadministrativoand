const { MongoClient, ObjectId } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function backfill() {
    const client = new MongoClient(process.env.MONGODB_URI);
    const dryRun = process.argv.includes('--apply') ? false : true;

    try {
        await client.connect();
        const db = client.db();

        const startOfPeriod = new Date();
        startOfPeriod.setDate(startOfPeriod.getDate() - 7); // Last 7 days

        console.log(`Checking sales since: ${startOfPeriod.toISOString()}`);

        const sales = await db.collection('sales').find({ date: { $gte: startOfPeriod } }).toArray();
        const warehouses = await db.collection('warehouses').find({}).toArray();
        const whMap = {};
        warehouses.forEach(w => whMap[w._id.toString()] = w.name);

        console.log(`Found ${sales.length} sales to check.`);
        if (dryRun) console.log('--- DRY RUN: No logs will be created ---\n');

        let logsCreated = 0;

        for (const sale of sales) {
            for (const item of sale.items) {
                const product = await db.collection('products').findOne({ _id: item.productId });
                if (!product) continue;

                // Only care about Franelas or Microdurazno for the dashboard in question
                const isFranela = /FRANELA|MICRO DURAZNO/i.test(product.name);
                if (!isFranela) continue;

                // Check if log already exists
                const existingLog = await db.collection('inventorylogs').findOne({
                    productId: item.productId,
                    reason: { $regex: new RegExp(sale.saleId) }
                });

                if (!existingLog) {
                    const warehouseName = product.warehouseId ? (whMap[product.warehouseId.toString()] || 'Bodega Principal') : 'Bodega Principal';

                    console.log(`[BACKFILL] Sale ${sale.saleId} | Product: ${product.name} | WH: ${warehouseName}`);
                    logsCreated++;

                    if (!dryRun) {
                        await db.collection('inventorylogs').insertOne({
                            productId: item.productId,
                            productName: product.name,
                            productCode: product.code,
                            quantity: item.quantity,
                            type: 'sale',
                            reason: `Venta ${sale.saleId} (Backfill)`,
                            warehouseId: product.warehouseId,
                            warehouseName: warehouseName,
                            userId: sale.userId,
                            username: 'Sistema (Auto)',
                            date: sale.date
                        });
                    }
                }
            }
        }

        console.log(`\nSummary:`);
        console.log(`- Missing logs found and ${dryRun ? 'would be created' : 'created'}: ${logsCreated}`);

        if (dryRun && logsCreated > 0) {
            console.log('\nTo apply changes, run with --apply');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

backfill();
