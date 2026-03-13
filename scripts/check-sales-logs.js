const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function diagnose() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        console.log(`Checking data since: ${startOfDay.toISOString()} (Local 00:00)`);

        const sales = await db.collection('sales').find({ date: { $gte: startOfDay } }).toArray();
        console.log(`\nFound ${sales.length} sales today.`);

        const logs = await db.collection('inventorylogs').find({ date: { $gte: startOfDay } }).toArray();
        console.log(`Found ${logs.length} inventory logs today.`);

        if (logs.length > 0) {
            console.log('\n--- Logs Detail ---');
            logs.forEach(l => {
                console.log(`- ${l.productName} (${l.quantity}) | Type: ${l.type} | Warehouse: ${l.warehouseName} | Reason: ${l.reason}`);
            });
        }

        if (sales.length > 0) {
            console.log('\n--- Sales Detail ---');
            for (const s of sales) {
                console.log(`- Sale ${s.saleId} | Total: $${s.totalUsd}`);
                for (const item of s.items) {
                    const product = await db.collection('products').findOne({ _id: item.productId });
                    const hasLog = logs.some(l => l.productId.toString() === item.productId.toString() && l.reason && l.reason.includes(s.saleId));
                    console.log(`  - Item: ${product ? product.name : 'Unknown'} | Qty: ${item.quantity} | Logged: ${hasLog ? 'YES' : 'NO'}`);
                }
            }
        } else {
            // Check yesterday just in case
            const yesterdayStart = new Date(startOfDay);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            const yesterdaySales = await db.collection('sales').find({ date: { $gte: yesterdayStart, $lt: startOfDay } }).toArray();
            console.log(`\nFound ${yesterdaySales.length} sales yesterday.`);
            if (yesterdaySales.length > 0) {
                console.log('Last yesterday sale date:', yesterdaySales[yesterdaySales.length - 1].date);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

diagnose();
