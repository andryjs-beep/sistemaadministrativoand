import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'vendedor' },
    permissions: {
        canEditInventory: { type: Boolean, default: false },
        canCreateSales: { type: Boolean, default: true },
        canViewReports: { type: Boolean, default: true },
    }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);

// Modelos adicionales que se usarán en el sistema
export const ProductSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    priceUsd: { type: Number, required: true },
    imageUrl: String,
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 5 },
}, { timestamps: true });

export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

export const ExchangeRateSchema = new mongoose.Schema({
    type: { type: String, default: 'USD' },
    value: Number,
    date: { type: Date, default: Date.now }
}, { timestamps: true });

export const ExchangeRate = mongoose.models.ExchangeRate || mongoose.model('ExchangeRate', ExchangeRateSchema);

export const PaymentMethodSchema = new mongoose.Schema({
    name: String,
    accountNumber: String,
    active: { type: Boolean, default: true }
});

export const PaymentMethod = mongoose.models.PaymentMethod || mongoose.model('PaymentMethod', PaymentMethodSchema);

export const SaleSchema = new mongoose.Schema({
    saleId: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number,
        priceUsd: Number,
        priceBs: Number,
        subtotalUsd: Number,
        subtotalBs: Number
    }],
    totalUsd: Number,
    totalBs: Number,
    paymentMethod: String,
    accountNumber: String,
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'completed' },
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' }
}, { timestamps: true });

export const Sale = mongoose.models.Sale || mongoose.model('Sale', SaleSchema);

export const QuotationSchema = new mongoose.Schema({
    quotationId: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: Number,
        priceUsd: Number,
        priceBs: Number,
        subtotalUsd: Number,
        subtotalBs: Number
    }],
    totalUsd: Number,
    totalBs: Number,
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'open' },
    convertedToSaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }
}, { timestamps: true });

export const Quotation = mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);
