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
    openingDetails: {
        usdCash: { type: Number, default: 0 },
        bsCash: { type: Number, default: 0 },
        bsTransfer: { type: Number, default: 0 }
    },
    closingDetails: {
        usdCash: { type: Number, default: 0 },
        bsCash: { type: Number, default: 0 },
        bsTransfer: { type: Number, default: 0 }
    },
    notes: String
}, { timestamps: true });
export const CashSession = mongoose.models.CashSession || mongoose.model('CashSession', CashSessionSchema);

// --- PRODUCTOS ---
const ProductSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    priceUsd: { type: Number, required: true },        // Precio venta unitario (detal)
    costUsd: { type: Number, default: 0 },             // Costo de compra
    wholesalePriceUsd: { type: Number, default: 0 },   // Precio al mayor
    minWholesaleQty: { type: Number, default: 6 },     // Cantidad mínima para precio mayor
    imageUrl: String,
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 5 },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    size: { type: String, default: 'Unica' },
}, { timestamps: true });
export const Product = mongoose.models.Product || mongoose.model('Product', ProductSchema);

// --- LOGS DE INVENTARIO ---
const InventoryLogSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    productName: String,
    productCode: String,
    quantity: { type: Number, required: true },
    type: { type: String, enum: ['add', 'subtract', 'sale'], required: true },
    reason: String,
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    warehouseName: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    date: { type: Date, default: Date.now }
}, { timestamps: true });
export const InventoryLog = mongoose.models.InventoryLog || mongoose.model('InventoryLog', InventoryLogSchema);

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
    type: { type: String, enum: ['USD', 'EUR'], default: 'USD' },
    value: { type: Number, required: true },
    percentage: { type: Number, default: 0 },
    source: { type: String, default: 'BCV' },
    date: { type: Date, default: Date.now }
}, { timestamps: true });
export const ExchangeRate = mongoose.models.ExchangeRate || mongoose.model('ExchangeRate', ExchangeRateSchema);

// --- MÉTODOS DE PAGO ---
const PaymentMethodSchema = new mongoose.Schema({
    name: { type: String, required: true },
    accountNumber: String,
    currency: { type: String, default: 'USD' },
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
        productName: String,
        productCode: String,
        quantity: { type: Number, required: true },
        priceUsd: Number,
        priceBs: Number,
        costUsd: Number,
        subtotalUsd: Number,
        subtotalBs: Number,
        wholesaleApplied: { type: Boolean, default: false },
        discountPercent: { type: Number, default: 0 },
        discountValue: { type: Number, default: 0 },
        profitUsd: Number,
    }],
    totalUsd: Number,
    totalBs: Number,
    totalPaidUsd: { type: Number, default: 0 },
    totalPaidBs: { type: Number, default: 0 },
    paymentMethod: String,
    accountNumber: String,
    isCredit: { type: Boolean, default: false },
    status: { type: String, default: 'paid', enum: ['paid', 'pending', 'partial'] },
    payments: [{
        method: String,
        currency: String,
        amountUsd: { type: Number, default: 0 },
        amountBs: { type: Number, default: 0 },
        date: { type: Date, default: Date.now },
        processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    date: { type: Date, default: Date.now },
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
        productName: String,
        productCode: String,
        quantity: Number,
        priceUsd: Number,
        priceBs: Number,
        subtotalUsd: Number,
        subtotalBs: Number,
        discountValue: { type: Number, default: 0 }
    }],
    totalUsd: Number,
    totalBs: Number,
    date: { type: Date, default: Date.now },
    status: { type: String, default: 'open' },
    convertedToSaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' }
}, { timestamps: true });
export const Quotation = mongoose.models.Quotation || mongoose.model('Quotation', QuotationSchema);

// --- CONFIGURACIÓN DE EMPRESA ---
const CompanySettingsSchema = new mongoose.Schema({
    name: { type: String, default: 'Mi Empresa' },
    rif: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    logo: String
}, { timestamps: true });
export const CompanySettings = mongoose.models.CompanySettings || mongoose.model('CompanySettings', CompanySettingsSchema);

// --- INTERCAMBIOS DE DIVISA (COMPRA/VENTA DE EFECTIVO) ---
const InternalExchangeSchema = new mongoose.Schema({
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashSession', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fromCurrency: { type: String, enum: ['USD_CASH', 'BS_CASH', 'BS_TRANSFER'], required: true },
    toCurrency: { type: String, enum: ['USD_CASH', 'BS_CASH', 'BS_TRANSFER'], required: true },
    fromAmount: { type: Number, required: true },
    toAmount: { type: Number, required: true },
    rate: { type: Number, required: true },
    notes: String,
    status: { type: String, enum: ['active', 'cancelled'], default: 'active' },
    cancellationReason: String,
    cancelledAt: Date,
    date: { type: Date, default: Date.now }
}, { timestamps: true });
export const InternalExchange = mongoose.models.InternalExchange || mongoose.model('InternalExchange', InternalExchangeSchema);

// --- LIQUIDACIONES DE GANANCIAS ---
const SettlementSchema = new mongoose.Schema({
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    recipient: String, // Receptor del pago

    // Ingresos
    incomeUsd: { type: Number, default: 0 },
    incomeApp: { type: Number, default: 0 }, // APP u otra plataforma

    // Egresos (Costos)
    deliveryCostsUsd: { type: Number, default: 0 },
    supplyCostsUsd: { type: Number, default: 0 },
    commissionsUsd: { type: Number, default: 0 },
    otherCostsUsd: { type: Number, default: 0 },

    // Totales calculados
    totalIncomeUsd: { type: Number, default: 0 },
    totalExpensesUsd: { type: Number, default: 0 },
    netProfitUsd: { type: Number, default: 0 },

    // Partición (50/50 o personalizado)
    split: {
        partner1Name: String,
        partner1Amount: { type: Number, default: 0 },
        partner2Name: String,
        partner2Amount: { type: Number, default: 0 },
        balance: { type: Number, default: 0 }
    },

    status: { type: String, enum: ['draft', 'final'], default: 'final' },
    notes: String,
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
export const Settlement = mongoose.models.Settlement || mongoose.model('Settlement', SettlementSchema);

export default User;
