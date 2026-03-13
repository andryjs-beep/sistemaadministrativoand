const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function check() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();

        const products = await db.collection('products').find({ name: { $regex: /MICRO/i } }).toArray();
        console.log('Microdurazno Products:');
        products.forEach(p => {
            console.log(`- ${p.name} | Size: ${p.size} | WH: ${p.warehouseId}`);
        });

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

check();
