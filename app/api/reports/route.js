import dbConnect from '@/lib/db';
import { Sale, Expense, CashSession } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'daily';
        const sessionId = searchParams.get('sessionId');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        let saleQuery = {};
        let expenseQuery = {};

        if (type === 'session' && sessionId) {
            saleQuery = { cashSessionId: sessionId };
            expenseQuery = { cashSessionId: sessionId };
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

        const [sales, expenses, cashSessions, allPaymentMethods] = await Promise.all([
            Sale.find({ ...saleQuery, status: 'completed' })
                .populate('items.productId', 'name code costUsd')
                .sort({ date: -1 }),
            Expense.find(expenseQuery)
                .populate('providerId', 'name rif')
                .sort({ date: -1 }),
            CashSession.find({}).sort({ openedAt: -1 }).limit(20),
            PaymentMethod.find({}),
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
        sales.forEach(s => {
            const methodName = s.paymentMethod || 'Otro';
            const methodConfig = allPaymentMethods.find(m => m.name === methodName);
            const currency = methodConfig?.currency || 'USD'; // default to USD if unknown

            if (!paymentBreakdown[methodName]) {
                paymentBreakdown[methodName] = {
                    count: 0,
                    totalUsd: 0,
                    totalBs: 0,
                    currency,
                    mainTotal: 0 // This will be in the method's currency
                };
            }
            paymentBreakdown[methodName].count++;
            paymentBreakdown[methodName].totalUsd += s.totalUsd || 0;
            paymentBreakdown[methodName].totalBs += s.totalBs || 0;

            // Increment the sum in the specific currency of the method
            if (currency === 'BS') {
                paymentBreakdown[methodName].mainTotal += s.totalBs || 0;
            } else {
                paymentBreakdown[methodName].mainTotal += s.totalUsd || 0;
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

        return NextResponse.json({
            summary: {
                salesCount: sales.length,
                totalSalesUsd,
                totalSalesBs,
                totalExpensesUsd,
                totalExpensesBs,
                netUsd,
                netBs,
                totalCostOfGoods,
                totalProfit,
                grossMarginPct,
                wholesaleSalesCount,
                discountedSalesCount,
            },
            paymentBreakdown,
            topProducts,
            sales,
            expenses,
            cashSessions,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
