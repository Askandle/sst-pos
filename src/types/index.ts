export type Role = 'staff' | 'admin';

export interface Profile {
  id: string;
  username: string;
  role: Role;
  password_hash?: string;
  created_at: string;
}

export type PaymentMethod = 'cash' | 'card' | 'mobile';

export interface CartItem {
  type: 'service' | 'product';
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit?: string;
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  category: string;
  image_url?: string | null;
  created_at?: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string | null;
  base_price: number;
  unit: string;
  created_at?: string;
}

export type ExpenseCategory = 'supplies' | 'utilities' | 'maintenance' | 'other';

export interface Expense {
  id: string;
  staff_id?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  receipt_notes?: string | null;
  created_at: string;
  staff?: {
    username: string;
  };
}

export interface TransactionItem {
  id?: string;
  item_type: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Transaction {
  id: string;
  transaction_number: string;
  user_id?: string;
  staff?: {
    username: string;
  };
  transaction_type: string;
  total_amount: number;
  payment_method: PaymentMethod;
  status: 'completed' | 'refunded';
  notes?: string | null;
  created_at: string;
}

export interface TransactionWithItems extends Transaction {
  items: TransactionItem[];
}

export interface DashboardStats {
  todaySales: number;
  todayTransactions: number;
  todayExpenses: number;
  lowStockProducts: number;
}
