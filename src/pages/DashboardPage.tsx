import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DashboardStats, Product, TransactionWithItems } from '@/types';
import { DollarSign, ShoppingCart, TrendingDown, AlertTriangle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();

    window.addEventListener('storage', loadDashboardData);
    window.addEventListener('focus', loadDashboardData);
    window.addEventListener('transactions-updated', loadDashboardData);
    return () => {
      window.removeEventListener('storage', loadDashboardData);
      window.removeEventListener('focus', loadDashboardData);
      window.removeEventListener('transactions-updated', loadDashboardData);
    };
  }, []);

  const loadDashboardData = () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Transactions & Sales (Read directly from active localStorage)
      let txns: TransactionWithItems[] = [];
      try {
        const storedTxns = localStorage.getItem('S.S.T POS SYSTEM_transactions');
        if (storedTxns) {
          txns = JSON.parse(storedTxns);
        }
      } catch (e) {
        console.error('Error parsing transactions:', e);
      }

      // Filter only completed transactions that occurred today
      const todayTxns = (txns || []).filter((t) => {
        return Boolean(t.created_at?.startsWith(today) && t.status === 'completed');
      });

      const todaySales = todayTxns.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
      const todayTransactions = todayTxns.length;

      // 2. Expenses (Read directly from active localStorage)
      let expenses: any[] = [];
      try {
        const storedExpenses = localStorage.getItem('S.S.T POS SYSTEM_expenses');
        if (storedExpenses) {
          expenses = JSON.parse(storedExpenses);
        }
      } catch (e) {
        console.error('Error parsing expenses:', e);
      }

      const todayExpenses = (expenses || [])
        .filter((e) => e.expense_date === today)
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      // 3. Products & Low Stock
      let products: Product[] = [];
      try {
        const storedProducts = localStorage.getItem('S.S.T POS SYSTEM_products');
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
      });
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of today's activities</p>
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of today's activities</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Sales Metric */}
        <Card className="border-2 border-emerald-500/40 dark:border-emerald-400/40 hover:border-emerald-500 rounded-xl transition-all shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
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

        {/* Transactions Metric */}
        <Card className="border-2 border-sky-500/40 dark:border-sky-400/40 hover:border-sky-500 rounded-xl transition-all shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
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

        {/* Expenses Metric */}
        <Card className="border-2 border-rose-500/40 dark:border-rose-400/40 hover:border-rose-500 rounded-xl transition-all shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
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
        <Card className="border-2 border-amber-500/40 dark:border-amber-400/40 hover:border-amber-500 rounded-xl transition-all shadow-xs bg-card">
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

      {lowStockProducts.length > 0 && (
        <Card className="border-2 border-amber-500/40 dark:border-amber-400/40 bg-amber-500/5 rounded-xl shadow-xs">
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
                  className="flex items-center justify-between p-3.5 border-2 border-amber-500/30 rounded-xl bg-card shadow-2xs"
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
      <Card className="border-2 border-sky-500/30 dark:border-sky-400/30 rounded-xl shadow-xs">
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
              className="flex flex-col items-center justify-center p-6 border-2 border-emerald-500/40 dark:border-emerald-400/40 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500 transition-all cursor-pointer shadow-xs group"
            >
              <div className="p-3 rounded-full bg-emerald-500/15 mb-3 group-hover:scale-105 transition-transform">
                <ShoppingCart className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <span className="font-semibold text-foreground">New Transaction</span>
              <span className="text-xs text-muted-foreground mt-0.5">Proceed to Checkout</span>
            </Link>

            <Link
              to="/expenses"
              className="flex flex-col items-center justify-center p-6 border-2 border-rose-500/40 dark:border-rose-400/40 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500 transition-all cursor-pointer shadow-xs group"
            >
              <div className="p-3 rounded-full bg-rose-500/15 mb-3 group-hover:scale-105 transition-transform">
                <TrendingDown className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              </div>
              <span className="font-semibold text-foreground">Record Expense</span>
              <span className="text-xs text-muted-foreground mt-0.5">Log store purchases</span>
            </Link>

            <Link
              to="/transactions"
              className="flex flex-col items-center justify-center p-6 border-2 border-sky-500/40 dark:border-sky-400/40 rounded-xl bg-sky-500/5 hover:bg-sky-500/10 hover:border-sky-500 transition-all cursor-pointer shadow-xs group"
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
