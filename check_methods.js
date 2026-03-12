const mongoose = require('mongoose');

// Fallback to local if no env var
const MONGODB_URI = process.env.MONGODB_URI_PRODUCTION || process.env.MONGODB_URI || 'mongodb://localhost:27017/sistema_inventario';

const PaymentMethodSchema = new mongoose.Schema({
    name: String,
    currency: String,
    active: Boolean
});

const PaymentMethod = mongoose.models.PaymentMethod || mongoose.model('PaymentMethod', PaymentMethodSchema);

async function run() {
    try {
        console.log('CONNECTING TO:', MONGODB_URI);
        await mongoose.connect(MONGODB_URI);
        const methods = await PaymentMethod.find({ active: true });
        console.log('ACTIVE_METHODS:', JSON.stringify(methods));
        process.exit(0);
    } catch (err) {
        console.error('ERROR:', err.message);
        process.exit(1);
    }
}

run();
