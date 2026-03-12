import dbConnect from '@/lib/db';
import { Sale, Expense, CashSession, PaymentMethod, InternalExchange } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'daily';
        const sessionId = searchParams.get('sessionId');
        const userId = searchParams.get('userId'); // Nueva opción de filtrado por usuario
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        let saleQuery = {};
        let expenseQuery = {};

        if (type === 'session' && sessionId) {
            saleQuery = { cashSessionId: sessionId };
            expenseQuery = { cashSessionId: sessionId };
        } else if (type === 'daily' && dateFrom && dateTo) {
            saleQuery = { date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) } };
            expenseQuery = { date: { $gte: new Date(dateFrom), $lte: new Date(dateTo) } };
        } else if (type === 'daily') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            saleQuery = { date: { $gte: today, $lt: tomorrow } };
            expenseQuery = { date: { $gte: today, $lt: tomorrow } };
        } else if (type === 'range' && dateFrom && dateTo) {
            const from = new Date(dateFrom);
            from.setHours(0, 0, 0, 0);
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            saleQuery = { date: { $gte: from, $lte: to } };
            expenseQuery = { date: { $gte: from, $lte: to } };
        }

        // Aplicar filtro de usuario si existe (Vendedores solo ven lo suyo)
        if (userId) {
            saleQuery.userId = userId;
            // Para egresos, solo filtramos si el egreso tiene un usuario asociado (opcional según modelo)
            // expenseQuery.userId = userId; 
        }

        const [sales, expenses, cashSessions, allPaymentMethods, exchanges] = await Promise.all([
            Sale.find(saleQuery)
                .populate('items.productId', 'name code costUsd')
                .populate('customerId', 'name phone idNumber')
                .sort({ date: -1 }),
            Expense.find(expenseQuery)
                .populate('providerId', 'name rif')
                .sort({ date: -1 }),
            CashSession.find({}).sort({ openedAt: -1 }).limit(20),
            PaymentMethod.find({}),
            InternalExchange.find(type === 'session' && sessionId ? { sessionId } : expenseQuery) // use same time query for exchanges
        ]);

        // Aggregate totals
        const totalSalesUsd = sales.reduce((sum, s) => sum + (s.totalUsd || 0), 0);
        const totalSalesBs = sales.reduce((sum, s) => sum + (s.totalBs || 0), 0);
        const totalExpensesUsd = expenses.reduce((sum, e) => sum + (e.amountUsd || 0), 0);
        const totalExpensesBs = expenses.reduce((sum, e) => sum + (e.amountBs || 0), 0);

        // ... (Profit calculations remain the same) ...
        let totalCostOfGoods = 0;
        let totalProfit = 0;
        let wholesaleSalesCount = 0;
        let discountedSalesCount = 0;

        sales.forEach(sale => {
            sale.items?.forEach(item => {
                const cost = item.costUsd || item.productId?.costUsd || 0;
                const itemCost = cost * (item.quantity || 0);
                const itemRevenue = item.subtotalUsd || 0;
                totalCostOfGoods += itemCost;
                totalProfit += (itemRevenue - itemCost);
                if (item.wholesaleApplied) wholesaleSalesCount++;
                if (item.discountPercent > 0) discountedSalesCount++;
            });
        });

        const netUsd = totalSalesUsd - totalExpensesUsd;
        const netBs = totalSalesBs - totalExpensesBs;
        const grossMarginPct = totalSalesUsd > 0 ? ((totalProfit / totalSalesUsd) * 100).toFixed(1) : 0;

        // Payment method breakdown with currency awareness
        const paymentBreakdown = {};
        let collectedUsd = 0;
        let collectedBs = 0;

        sales.forEach(s => {
            const processPayment = (methodName, amountUsd, amountBs) => {
                const methodConfig = allPaymentMethods.find(m => m.name === methodName);
                const currency = methodConfig?.currency || 'USD';

                if (!paymentBreakdown[methodName]) {
                    paymentBreakdown[methodName] = { count: 0, totalUsd: 0, totalBs: 0, currency, mainTotal: 0 };
                }

                paymentBreakdown[methodName].count++;
                paymentBreakdown[methodName].totalUsd += amountUsd || 0;
                paymentBreakdown[methodName].totalBs += amountBs || 0;

                if (currency.toUpperCase().includes('BS')) {
                    paymentBreakdown[methodName].mainTotal += amountBs || 0;
                    collectedBs += amountBs || 0;
                } else {
                    paymentBreakdown[methodName].mainTotal += amountUsd || 0;
                    collectedUsd += amountUsd || 0;
                }
            };

            if (s.payments && s.payments.length > 0) {
                // Multi-payment or detailed payments array
                s.payments.forEach(p => {
                    processPayment(p.method || 'Otro', parseFloat(p.amountUsd || 0), parseFloat(p.amountBs || 0));
                });
            } else {
                // Legacy support for single payment method on older sales
                processPayment(s.paymentMethod || 'Otro', s.totalUsd || 0, s.totalBs || 0);
            }
        });

        // Top products
        const productMap = {};
        sales.forEach(sale => {
            sale.items?.forEach(item => {
                const pid = item.productId?._id?.toString() || 'unknown';
                const pname = item.productId?.name || 'Producto';
                if (!productMap[pid]) productMap[pid] = { name: pname, qty: 0, revenue: 0, cost: 0, profit: 0, wholesaleQty: 0 };
                const cost = (item.costUsd || item.productId?.costUsd || 0) * (item.quantity || 0);
                productMap[pid].qty += item.quantity || 0;
                productMap[pid].revenue += item.subtotalUsd || 0;
                productMap[pid].cost += cost;
                productMap[pid].profit += (item.subtotalUsd || 0) - cost;
                if (item.wholesaleApplied) productMap[pid].wholesaleQty += item.quantity || 0;
            });
        });
        const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 10);

        // Expense breakdown and Net Calculation per Payment Method
        const expenseBreakdown = {};
        let spentUsd = 0;
        let spentBs = 0;

        expenses.forEach(exp => {
            const methodName = exp.paymentMethod || 'Otro';
            const methodConfig = allPaymentMethods.find(m => m.name === methodName);
            const currency = methodConfig?.currency || 'USD';
            const isBs = currency.toUpperCase().includes('BS');

            if (!expenseBreakdown[methodName]) {
                expenseBreakdown[methodName] = { count: 0, totalUsd: 0, totalBs: 0, currency, mainTotal: 0 };
            }
            expenseBreakdown[methodName].count++;

            // Valor literal del egreso
            const expUsd = exp.amountUsd || 0;
            const expBs = exp.amountBs || 0;

            expenseBreakdown[methodName].totalUsd += expUsd;
            expenseBreakdown[methodName].totalBs += expBs;

            if (isBs) {
                expenseBreakdown[methodName].mainTotal += expBs;
                spentBs += expBs;
            } else {
                expenseBreakdown[methodName].mainTotal += expUsd;
                spentUsd += expUsd;
            }

            // Subtract from paymentBreakdown to show Net per method
            if (paymentBreakdown[methodName]) {
                paymentBreakdown[methodName].totalUsd -= expUsd;
                paymentBreakdown[methodName].totalBs -= expBs;
                paymentBreakdown[methodName].mainTotal -= (isBs ? expBs : expUsd);
            }
        });

        // Calculate Net Impact of Exchanges
        let exchangeNetUsd = 0;
        let exchangeNetBs = 0;

        const getMethodNameForEnum = (enumVal) => {
            const up = enumVal?.toUpperCase();
            if (up === 'USD_CASH') {
                return allPaymentMethods.find(m => m.currency === 'USD' && m.name.toUpperCase().includes('EFECTIVO'))?.name || 'DIVISA EN EFECTIVO';
            }
            if (up === 'BS_CASH') {
                return allPaymentMethods.find(m => m.currency.startsWith('BS') && m.name.toUpperCase().includes('EFECTIVO'))?.name || 'EFECTIVO BS';
            }
            if (up === 'BS_TRANSFER') {
                // Try to find Pago Móvil or Transferencia
                return allPaymentMethods.find(m =>
                    m.currency.startsWith('BS') &&
                    (m.name.toUpperCase().includes('PAGO MÓVIL') || m.name.toUpperCase().includes('PAGO MOVIL') || m.name.toUpperCase().includes('TRANSFERENCIA'))
                )?.name || 'PAGO MOVIL BS';
            }
            return 'Otro';
        };

        exchanges.forEach(exc => {
            if (exc.status === 'cancelled') return; // Skip cancelled exchanges

            const fromName = getMethodNameForEnum(exc.fromCurrency);
            const toName = getMethodNameForEnum(exc.toCurrency);

            const applyExchange = (methodName, amount, type) => {
                const methodConfig = allPaymentMethods.find(m => m.name === methodName);
                const currency = methodConfig?.currency || 'USD';
                const isBs = currency.toUpperCase().includes('BS');

                if (!paymentBreakdown[methodName]) {
                    paymentBreakdown[methodName] = { count: 0, totalUsd: 0, totalBs: 0, currency, mainTotal: 0 };
                }

                if (type === 'OUT') {
                    if (isBs) {
                        paymentBreakdown[methodName].totalBs -= amount;
                        paymentBreakdown[methodName].mainTotal -= amount;
                    } else {
                        paymentBreakdown[methodName].totalUsd -= amount;
                        paymentBreakdown[methodName].mainTotal -= amount;
                    }
                } else {
                    if (isBs) {
                        paymentBreakdown[methodName].totalBs += amount;
                        paymentBreakdown[methodName].mainTotal += amount;
                    } else {
                        paymentBreakdown[methodName].totalUsd += amount;
                        paymentBreakdown[methodName].mainTotal += amount;
                    }
                }
            };

            // Process OUT
            applyExchange(fromName, exc.fromAmount, 'OUT');
            if (exc.fromCurrency === 'USD_CASH') exchangeNetUsd -= exc.fromAmount;
            if (exc.fromCurrency === 'BS_CASH' || exc.fromCurrency === 'BS_TRANSFER') exchangeNetBs -= exc.fromAmount;

            // Process IN
            applyExchange(toName, exc.toAmount, 'IN');
            if (exc.toCurrency === 'USD_CASH') exchangeNetUsd += exc.toAmount;
            if (exc.toCurrency === 'BS_CASH' || exc.toCurrency === 'BS_TRANSFER') exchangeNetBs += exc.toAmount;
        });

        return NextResponse.json({
            summary: {
                salesCount: sales.length,
                totalSalesUsd,
                totalSalesBs,
                totalExpensesUsd,
                totalExpensesBs,
                netUsd,
                netBs,
                collectedUsd,
                collectedBs,
                spentUsd,
                spentBs,
                trueNetUsd: collectedUsd - spentUsd + exchangeNetUsd,
                trueNetBs: collectedBs - spentBs + exchangeNetBs,
                totalCostOfGoods,
                totalProfit,
                grossMarginPct,
                wholesaleSalesCount,
                discountedSalesCount,
                exchangeNetUsd,
                exchangeNetBs
            },
            paymentBreakdown,
            expenseBreakdown,
            topProducts,
            sales,
            expenses,
            cashSessions,
            exchanges
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
