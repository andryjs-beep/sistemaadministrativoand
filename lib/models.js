import mongoose from 'mongoose';

// --- USUARIOS ---
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
export const User = mongoose.models.User || mongoose.model('User', UserSchema);

// --- BODEGAS ---
const WarehouseSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: String,
    location: String,
    active: { type: Boolean, default: true }
}, { timestamps: true });
export const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', WarehouseSchema);

// --- PROVEEDORES ---
const ProviderSchema = new mongoose.Schema({
    rif: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: String,
    email: String,
    address: String,
    contact: String,
    active: { type: Boolean, default: true }
}, { timestamps: true });
export const Provider = mongoose.models.Provider || mongoose.model('Provider', ProviderSchema);

// --- EGRESOS / COMPRAS ---
const ExpenseSchema = new mongoose.Schema({
    providerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Provider' },
    providerName: String, // desnormalizado para reportes
    description: { type: String, required: true },
    category: { type: String, default: 'compra_insumos' }, // compra_insumos, servicio, otro
    amountUsd: { type: Number, default: 0 },
    amountBs: { type: Number, default: 0 },
    exchangeRate: Number,
    paymentMethod: String,
    receipt: String, // número de factura
    date: { type: Date, default: Date.now },
    cashSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession' }
}, { timestamps: true });
export const Expense = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);

// --- CAJA / SESIONES ---
const CashSessionSchema = new mongoose.Schema({
    sessionId: { type: String, unique: true },
    openedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    openedAt: { type: Date, default: Date.now },
    closedAt: Date,
    openingBalance: { type: Number, default: 0 }, // efectivo inicial en USD
    closingBalance: Number,
    totalSalesUsd: { type: Number, default: 0 },
    totalSalesBs: { type: Number, default: 0 },
    totalExpensesUsd: { type: Number, default: 0 },
    totalExpensesBs: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    status: { type: String, default: 'open' }, // open | closed
    notes: String
}, { timestamps: true });
export const CashSession = mongoose.models.CashSession || mongoose.model('CashSession', CashSessionSchema);

// --- PRODUCTOS ---
const ProductSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    priceUsd: { type: Number, required: true },
    imageUrl: String,
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 5 },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
}, { timestamps: true });
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// --- CLIENTES ---
const CustomerSchema = new mongoose.Schema({
    idNumber: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    phone: String,
    email: String,
    address: String,
    city: String,
    municipality: String,
}, { timestamps: true });
export const Customer = mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);

// --- TASA DE CAMBIO ---
const ExchangeRateSchema = new mongoose.Schema({
    type: { type: String, default: 'USD' },
    value: { type: Number, required: true },
    date: { type: Date, default: Date.now }
}, { timestamps: true });
export const ExchangeRate = mongoose.models.ExchangeRate || mongoose.model('ExchangeRate', ExchangeRateSchema);

// --- MÉTODOS DE PAGO ---
const PaymentMethodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    accountNumber: String,
    active: { type: Boolean, default: true }
});
export const PaymentMethod = mongoose.models.PaymentMethod || mongoose.model('PaymentMethod', PaymentMethodSchema);

// --- VENTAS ---
const SaleSchema = new mongoose.Schema({
    saleId: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    cashSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession' },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, required: true },
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

// --- COTIZACIONES ---
const QuotationSchema = new mongoose.Schema({
    quotationId: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
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

export default User;
