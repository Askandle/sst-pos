import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTransactions, getExpenses, getAllProducts } from '@/db/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStats, Product, TransactionWithItems } from '@/types';
import {
  DollarSign,
  ShoppingCart,
  TrendingDown,
  AlertTriangle,
  CalendarRange,
  Wallet,
  Layers,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface DailySummaryRow {
  date: string;
  sales: number;
  transactions: number;
  expenses: number;
  net: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dailyBreakdown, setDailyBreakdown] = useState<DailySummaryRow[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Trigger background Firestore sync so mobile/other devices stay updated
    getTransactions(2000).catch(console.warn);
    getExpenses(2000).catch(console.warn);
    getAllProducts().catch(console.warn);

    const handleFocus = () => {
      getTransactions(2000).catch(console.warn);
      getExpenses(2000).catch(console.warn);
      getAllProducts().catch(console.warn);
      loadDashboardData();
    };

    window.addEventListener('storage', loadDashboardData);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('transactions-updated', loadDashboardData);
    window.addEventListener('expenses-updated', loadDashboardData);
    window.addEventListener('products-updated', loadDashboardData);
    return () => {
      window.removeEventListener('storage', loadDashboardData);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('transactions-updated', loadDashboardData);
      window.removeEventListener('expenses-updated', loadDashboardData);
      window.removeEventListener('products-updated', loadDashboardData);
    };
  }, []);

  const loadDashboardData = () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Transactions & Sales (Read directly from active localStorage)
      let txns: TransactionWithItems[] = [];
      try {
        const storedTxns = localStorage.getItem('netpos_transactions');
        if (storedTxns) {
          txns = JSON.parse(storedTxns);
        }
      } catch (e) {
        console.error('Error parsing transactions:', e);
      }

      const completedTxns = (txns || []).filter((t) => t.status === 'completed');

      // Filter only completed transactions that occurred today
      const todayTxns = completedTxns.filter((t) => Boolean(t.created_at?.startsWith(today)));

      const todaySales = todayTxns.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
      const todayTransactions = todayTxns.length;

      // Overall sales & transactions across all days
      const overallSales = completedTxns.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
      const overallTransactions = completedTxns.length;

      // 2. Expenses (Read directly from active localStorage)
      let expenses: any[] = [];
      try {
        const storedExpenses = localStorage.getItem('netpos_expenses');
        if (storedExpenses) {
          expenses = JSON.parse(storedExpenses);
        }
      } catch (e) {
        console.error('Error parsing expenses:', e);
      }

      const todayExpenses = (expenses || [])
        .filter((e) => e.expense_date === today)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      const overallExpenses = (expenses || []).reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      );
      const overallNetTotal = overallSales - overallExpenses;

      // Group daily totals across all recorded dates
      const dayMap = new Map<string, DailySummaryRow>();

      for (const txn of completedTxns) {
        const dayKey = txn.created_at ? txn.created_at.slice(0, 10) : today;
        const current = dayMap.get(dayKey) || {
          date: dayKey,
          sales: 0,
          transactions: 0,
          expenses: 0,
          net: 0,
        };
        current.sales += Number(txn.total_amount || 0);
        current.transactions += 1;
        current.net = current.sales - current.expenses;
        dayMap.set(dayKey, current);
      }

      for (const exp of expenses || []) {
        const dayKey = exp.expense_date
          ? String(exp.expense_date).slice(0, 10)
          : exp.created_at
            ? String(exp.created_at).slice(0, 10)
            : today;
        const current = dayMap.get(dayKey) || {
          date: dayKey,
          sales: 0,
          transactions: 0,
          expenses: 0,
          net: 0,
        };
        current.expenses += Number(exp.amount || 0);
        current.net = current.sales - current.expenses;
        dayMap.set(dayKey, current);
      }

      const sortedDaily = Array.from(dayMap.values()).sort((a, b) =>
        b.date.localeCompare(a.date)
      );

      // 3. Products & Low Stock
      let products: Product[] = [];
      try {
        const storedProducts = localStorage.getItem('netpos_products');
        if (storedProducts) {
          products = JSON.parse(storedProducts);
        }
      } catch (e) {
        console.error('Error parsing products:', e);
      }

      const lowStock = (products || []).filter((p) => Number(p.stock_quantity ?? 0) <= 10);

      setStats({
        todaySales,
        todayTransactions,
        todayExpenses,
        lowStockProducts: lowStock.length,
        overallSales,
        overallTransactions,
        overallExpenses,
        overallNetTotal,
        activeDaysCount: sortedDaily.length,
      });
      setDailyBreakdown(sortedDaily);
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDayLabel = (dateStr: string) => {
    const parsed = new Date(`${dateStr}T00:00:00`);
    if (isNaN(parsed.getTime())) return dateStr;
    return format(parsed, 'MMM dd, yyyy');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="glass-surface glass-header-bar glass-section">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of today&apos;s activities &amp; all-days totals</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-2 border-border/80">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24 bg-muted" />
                <Skeleton className="h-4 w-4 bg-muted" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-surface glass-header-bar glass-section flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of today&apos;s activities and cumulative totals across all days
          </p>
        </div>
        <div className="text-xs text-muted-foreground font-medium tabular-nums">
          <span>Today</span>
          <span aria-hidden="true" className="mx-1.5">·</span>
          <span>{stats?.activeDaysCount || 0} day(s) recorded</span>
        </div>
      </div>

      {/* Today's Metrics */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">
          Today&apos;s Overview
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Today's Sales Metric */}
          <Card className="glass-stagger-1 border-2 border-emerald-500/40 dark:border-emerald-400/40 hover:border-emerald-500 rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Sales</CardTitle>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                GH₵{stats?.todaySales.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total revenue today</p>
            </CardContent>
          </Card>

          {/* Today's Transactions Metric */}
          <Card className="glass-stagger-2 border-2 border-sky-500/40 dark:border-sky-400/40 hover:border-sky-500 rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Transactions</CardTitle>
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
                <ShoppingCart className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                {stats?.todayTransactions || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Completed today</p>
            </CardContent>
          </Card>

          {/* Today's Expenses Metric */}
          <Card className="glass-stagger-3 border-2 border-rose-500/40 dark:border-rose-400/40 hover:border-rose-500 rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Expenses</CardTitle>
              <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                <TrendingDown className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                GH₵{stats?.todayExpenses.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Spent today</p>
            </CardContent>
          </Card>

          {/* Low Stock Metric */}
          <Card className="glass-stagger-4 border-2 border-amber-500/40 dark:border-amber-400/40 hover:border-amber-500 rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {stats?.lowStockProducts || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Products need restock</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Overall Total of All the Days */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground tracking-wide">
            Overall Total (All Days)
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            Cumulative across {stats?.activeDaysCount || 0} day(s)
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="glass-stagger-1 border-2 border-emerald-500/45 dark:border-emerald-400/40 hover:border-emerald-500 rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Total Sales</CardTitle>
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <Wallet className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                GH₵{stats?.overallSales.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All days combined sales revenue
              </p>
            </CardContent>
          </Card>

          <Card className="glass-stagger-2 border-2 border-sky-500/45 dark:border-sky-400/40 hover:border-sky-500 rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Transactions</CardTitle>
              <div className="p-1.5 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <Layers className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sky-600 dark:text-sky-400 tabular-nums">
                {stats?.overallTransactions || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Completed sales across all days
              </p>
            </CardContent>
          </Card>

          <Card className="glass-stagger-3 border-2 border-rose-500/45 dark:border-rose-400/40 hover:border-rose-500 rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Total Expenses</CardTitle>
              <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
                <TrendingDown className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                GH₵{stats?.overallExpenses.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All days combined expenses
              </p>
            </CardContent>
          </Card>

          <Card className="glass-stagger-4 border-2 border-indigo-500/45 dark:border-indigo-400/40 hover:border-indigo-500 rounded-xl shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Net Total</CardTitle>
              <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                <CalendarRange className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold tabular-nums ${
                  (stats?.overallNetTotal ?? 0) >= 0
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {(stats?.overallNetTotal ?? 0) < 0 ? '-' : ''}GH₵
                {Math.abs(stats?.overallNetTotal ?? 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {(stats?.overallNetTotal ?? 0) >= 0
                  ? 'Net surplus (sales minus expenses)'
                  : 'Net deficit (expenses exceed sales)'}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Day-by-Day Totals & Grand Total Table */}
      <Card className="glass-stagger-3 border-2 border-indigo-500/35 dark:border-indigo-400/35 rounded-xl shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Daily Totals &amp; Overall Grand Total
            </CardTitle>
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {dailyBreakdown.length} day(s)
          </span>
        </CardHeader>
        <CardContent>
          {dailyBreakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No completed transactions or expenses recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Daily Sales</TableHead>
                    <TableHead className="text-right">Daily Expenses</TableHead>
                    <TableHead className="text-right">Daily Net</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyBreakdown.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{formatDayLabel(day.date)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {day.transactions}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        GH₵{day.sales.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
                        GH₵{day.expenses.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-bold tabular-nums ${
                          day.net >= 0
                            ? 'text-foreground'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {day.net < 0 ? '-' : ''}GH₵{Math.abs(day.net).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-primary/8 dark:bg-sky-400/10 font-bold">
                    <TableCell>Overall Total (All Days)</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {stats?.overallTransactions || 0}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400 tabular-nums">
                      GH₵{(stats?.overallSales ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-rose-600 dark:text-rose-400 tabular-nums">
                      GH₵{(stats?.overallExpenses ?? 0).toFixed(2)}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        (stats?.overallNetTotal ?? 0) >= 0
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {(stats?.overallNetTotal ?? 0) < 0 ? '-' : ''}GH₵
                      {Math.abs(stats?.overallNetTotal ?? 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {lowStockProducts.length > 0 && (
        <Card className="glass-stagger-4 border-2 border-amber-500/40 dark:border-amber-400/40 rounded-xl shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="glass-surface glass-animated flex items-center justify-between p-3.5 border border-amber-500/35 rounded-xl shadow-2xs"
                >
                  <div>
                    <p className="font-semibold text-foreground">{product.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{product.category}</p>
                  </div>
                  <Badge
                    variant={product.stock_quantity === 0 ? 'destructive' : 'secondary'}
                    className={
                      product.stock_quantity > 0
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold'
                        : ''
                    }
                  >
                    {product.stock_quantity} left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="glass-stagger-5 border-2 border-sky-500/30 dark:border-sky-400/30 rounded-xl shadow-xs">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link
              to="/checkout"
              className="glass-surface glass-animated flex flex-col items-center justify-center p-6 border-2 border-emerald-500/40 dark:border-emerald-400/40 hover:border-emerald-500 rounded-xl cursor-pointer shadow-xs group"
            >
              <div className="p-3 rounded-full bg-emerald-500/15 mb-3 group-hover:scale-105 transition-transform">
                <ShoppingCart className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="font-semibold text-foreground">New Transaction</span>
              <span className="text-xs text-muted-foreground mt-0.5">Proceed to Checkout</span>
            </Link>

            <Link
              to="/expenses"
              className="glass-surface glass-animated flex flex-col items-center justify-center p-6 border-2 border-rose-500/40 dark:border-rose-400/40 hover:border-rose-500 rounded-xl cursor-pointer shadow-xs group"
            >
              <div className="p-3 rounded-full bg-rose-500/15 mb-3 group-hover:scale-105 transition-transform">
                <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="font-semibold text-foreground">Record Expense</span>
              <span className="text-xs text-muted-foreground mt-0.5">Log store purchases</span>
            </Link>

            <Link
              to="/transactions"
              className="glass-surface glass-animated flex flex-col items-center justify-center p-6 border-2 border-sky-500/40 dark:border-sky-400/40 hover:border-sky-500 rounded-xl cursor-pointer shadow-xs group"
            >
              <div className="p-3 rounded-full bg-sky-500/15 mb-3 group-hover:scale-105 transition-transform">
                <DollarSign className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              </div>
              <span className="font-semibold text-foreground">View History</span>
              <span className="text-xs text-muted-foreground mt-0.5">Audit transaction logs</span>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
