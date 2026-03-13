const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function diagnose() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();

        // Check warehouses first
        const warehouses = await db.collection('warehouses').find({}).toArray();
        const whMap = {};
        warehouses.forEach(w => whMap[w._id.toString()] = w.name);
        console.log('Warehouses:', JSON.stringify(whMap, null, 2));

        const lastSale = await db.collection('sales').findOne({}, { sort: { date: -1 } });
        if (!lastSale) {
            console.log('No sales found.');
            return;
        }

        console.log(`\nLast Sale: ${lastSale.saleId} (${lastSale.date})`);
        for (const item of lastSale.items) {
            const product = await db.collection('products').findOne({ _id: item.productId });
            const whId = product ? product.warehouseId : 'N/A';
            const whName = whId ? whMap[whId.toString()] : 'Unknown';
            console.log(`- Item: ${product ? product.name : 'Unknown'} | Qty: ${item.quantity} | WH: ${whName} (${whId})`);

            const log = await db.collection('inventorylogs').findOne({
                productId: item.productId,
                reason: { $regex: new RegExp(lastSale.saleId) }
            });
            console.log(`  Log: ${log ? 'FOUND' : 'MISSING'}${log ? ` (WH: ${log.warehouseName})` : ''}`);
        }

        // Check if there are any products with "FRANELA" in their name
        const franelas = await db.collection('products').find({ name: { $regex: /FRANELA/i } }).toArray();
        console.log(`\nTotal Franelas in DB: ${franelas.length}`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

diagnose();
