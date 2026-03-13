const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function checkFranelas() {
    const client = new MongoClient(process.env.MONGODB_URI);
    try {
        await client.connect();
        const db = client.db();

        const products = await db.collection('products').find({ name: { $regex: /FRANELA/i } }).toArray();
        const warehouses = await db.collection('warehouses').find({}).toArray();
        const whMap = {};
        warehouses.forEach(w => whMap[w._id.toString()] = w.name);

        const whCounts = {};
        products.forEach(p => {
            const whId = p.warehouseId ? p.warehouseId.toString() : 'missing';
            const whName = whMap[whId] || whId;
            whCounts[whName] = (whCounts[whName] || 0) + 1;
        });

        console.log('Franelas per warehouse:', JSON.stringify(whCounts, null, 2));

        if (whCounts['missing']) {
            console.log('\nSample products with missing warehouse:');
            products.filter(p => !p.warehouseId).slice(0, 5).forEach(p => console.log(`- ${p.name} [${p.code}]`));
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.close();
    }
}

checkFranelas();
