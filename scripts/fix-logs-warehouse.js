const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function fixLogs() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();

        // Fix logs that should be in MICRODURAZNO
        const res = await db.collection('inventorylogs').updateMany(
            {
                productName: { $regex: /MICRO\s*DURAZNO/i },
                warehouseName: { $ne: 'BODEGA MIRCRODURAZNO' }
            },
            { $set: { warehouseName: 'BODEGA MIRCRODURAZNO' } }
        );

        console.log(`Updated ${res.modifiedCount} logs to BODEGA MIRCRODURAZNO`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

fixLogs();
