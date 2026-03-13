const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function debugLogs() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        console.log(`System 'Today' range: ${today.toISOString()} to ${tomorrow.toISOString()}`);
        console.log(`Current Server Time: ${new Date().toISOString()}`);

        const logs = await db.collection('inventorylogs').find({
            productName: { $regex: /FRANELA|MICRO/i }
        }).sort({ date: -1 }).limit(10).toArray();

        console.log('\nLast 10 Inventory Logs (Franelas/Micro):');
        logs.forEach(l => {
            console.log(`- Date: ${l.date ? l.date.toISOString() : 'MISSING'} | Name: ${l.productName} | WH: ${l.warehouseName} | Reason: ${l.reason}`);
        });

        const sales = await db.collection('sales').find({}).sort({ date: -1 }).limit(5).toArray();
        console.log('\nLast 5 Sales:');
        sales.forEach(s => {
            console.log(`- Date: ${s.date ? s.date.toISOString() : 'MISSING'} | ID: ${s.saleId}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

debugLogs();
