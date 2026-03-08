import dbConnect from '@/lib/db';
import { Sale, Expense, CashSession, Product } from '@/lib/models';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type') || 'daily'; // daily | session | range
        const sessionId = searchParams.get('sessionId');
        const dateFrom = searchParams.get('dateFrom');
        const dateTo = searchParams.get('dateTo');

        let dateFilter = {};
        let expenseQuery = {};
        let saleQuery = {};

        if (type === 'session' && sessionId) {
            saleQuery = { cashSessionId: sessionId };
            expenseQuery = { cashSessionId: sessionId };
        } else if (type === 'daily') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateFilter = { $gte: today, $lt: tomorrow };
            saleQuery = { date: dateFilter };
            expenseQuery = { date: dateFilter };
        } else if (type === 'range' && dateFrom && dateTo) {
            dateFilter = { $gte: new Date(dateFrom), $lte: new Date(dateTo) };
            saleQuery = { date: dateFilter };
            expenseQuery = { date: dateFilter };
        }

        const [sales, expenses, cashSessions] = await Promise.all([
            Sale.find({ ...saleQuery, status: 'completed' }).populate('items.productId', 'name').sort({ date: -1 }),
            Expense.find(expenseQuery).populate('providerId', 'name').sort({ date: -1 }),
            type === 'session' && sessionId
                ? CashSession.findById(sessionId)
                : CashSession.find(type === 'daily' ? { openedAt: dateFilter } : {}).sort({ openedAt: -1 }).limit(10),
        ]);

        // Aggregate totals
        const totalSalesUsd = sales.reduce((sum, s) => sum + (s.totalUsd || 0), 0);
        const totalSalesBs = sales.reduce((sum, s) => sum + (s.totalBs || 0), 0);
        const totalExpensesUsd = expenses.reduce((sum, e) => sum + (e.amountUsd || 0), 0);
        const totalExpensesBs = expenses.reduce((sum, e) => sum + (e.amountBs || 0), 0);
        const netUsd = totalSalesUsd - totalExpensesUsd;
        const netBs = totalSalesBs - totalExpensesBs;

        // Payment method breakdown
        const paymentBreakdown = {};
        sales.forEach(s => {
            const method = s.paymentMethod || 'Otro';
            if (!paymentBreakdown[method]) paymentBreakdown[method] = { count: 0, totalUsd: 0, totalBs: 0 };
            paymentBreakdown[method].count++;
            paymentBreakdown[method].totalUsd += s.totalUsd || 0;
            paymentBreakdown[method].totalBs += s.totalBs || 0;
        });

        // Top products sold
        const productMap = {};
        sales.forEach(sale => {
            sale.items?.forEach(item => {
                const pid = item.productId?._id?.toString() || 'unknown';
                const pname = item.productId?.name || 'Producto';
                if (!productMap[pid]) productMap[pid] = { name: pname, qty: 0, revenue: 0 };
                productMap[pid].qty += item.quantity || 0;
                productMap[pid].revenue += item.subtotalUsd || 0;
            });
        });
        const topProducts = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5);

        return NextResponse.json({
            summary: {
                salesCount: sales.length,
                totalSalesUsd,
                totalSalesBs,
                totalExpensesUsd,
                totalExpensesBs,
                netUsd,
                netBs,
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
