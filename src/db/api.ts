import type {
  Profile,
  Product,
  Service,
  Expense,
  ExpenseCategory,
  TransactionWithItems,
  PaymentMethod,
  DashboardStats,
} from '@/types';

const STORAGE_KEYS = {
  PROFILES: 'netpos_profiles',
  PRODUCTS: 'netpos_products',
  SERVICES: 'netpos_services',
  EXPENSES: 'netpos_expenses',
  TRANSACTIONS: 'netpos_transactions',
  INITIALIZED: 'netpos_initialized',
};

// Seed initial internet cafe data
function initializeDefaultData() {
  if (localStorage.getItem(STORAGE_KEYS.INITIALIZED)) return;

  const initialProfiles: Profile[] = [
    {
      id: 'usr_admin_1',
      username: 'admin',
      role: 'admin',
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    {
      id: 'usr_staff_1',
      username: 'sarah_pos',
      role: 'staff',
      created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    },
    {
      id: 'usr_staff_2',
      username: 'alex_desk',
      role: 'staff',
      created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    },
  ];

  const initialServices: Service[] = [
    {
      id: 'srv_1',
      name: 'Standard PC Station',
      description: 'High-speed internet access, Office apps, and standard browsing',
      base_price: 2.5,
      unit: 'per hour',
      created_at: new Date().toISOString(),
    },
    {
      id: 'srv_2',
      name: 'VIP Gaming Station',
      description: 'RTX 4080 Rig, 240Hz Gaming Monitor & Mechanical Peripherals',
      base_price: 5.0,
      unit: 'per hour',
      created_at: new Date().toISOString(),
    },
    {
      id: 'srv_3',
      name: 'Black & White Laser Print',
      description: 'Crisp 1200 DPI monochrome document printing (A4)',
      base_price: 0.2,
      unit: 'per page',
      created_at: new Date().toISOString(),
    },
    {
      id: 'srv_4',
      name: 'Color Laser Print',
      description: 'Full-color vibrant graphic and document printing (A4)',
      base_price: 0.6,
      unit: 'per page',
      created_at: new Date().toISOString(),
    },
    {
      id: 'srv_5',
      name: 'High-Res Document Scanning',
      description: 'Color scanner to PDF/USB/Email in 600 DPI',
      base_price: 0.35,
      unit: 'per page',
      created_at: new Date().toISOString(),
    },
    {
      id: 'srv_6',
      name: 'Thermal Document Lamination',
      description: 'Heavy duty waterproof protective lamination for ID/certificates',
      base_price: 1.5,
      unit: 'per sheet',
      created_at: new Date().toISOString(),
    },
  ];

  const initialProducts: Product[] = [
    {
      id: 'prd_1',
      name: 'Logitech G102 Optical Mouse',
      description: '8,000 DPI gaming mouse with RGB Lightsync',
      price: 24.99,
      stock_quantity: 14,
      category: 'accessories',
      image_url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
    {
      id: 'prd_2',
      name: 'Kingston 64GB USB 3.2 Drive',
      description: 'High speed flash drive with metal casing',
      price: 12.5,
      stock_quantity: 20,
      category: 'storage',
      image_url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
    {
      id: 'prd_3',
      name: 'Cat6 Shielded Ethernet Cable 3m',
      description: 'Gigabit high-speed RJ45 network patch cable',
      price: 6.99,
      stock_quantity: 5,
      category: 'cables',
      image_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=500&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
    {
      id: 'prd_4',
      name: 'USB-C Fast Charging Cable 2m',
      description: 'Durable nylon braided 60W power and sync cord',
      price: 8.5,
      stock_quantity: 4,
      category: 'cables',
      image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
    {
      id: 'prd_5',
      name: 'Monster Energy Original 500ml',
      description: 'Chilled energy drink for long study and gaming sessions',
      price: 3.5,
      stock_quantity: 28,
      category: 'snacks & drinks',
      image_url: 'https://images.unsplash.com/photo-1622543925917-763c34d1a86e?w=500&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
    {
      id: 'prd_6',
      name: 'A4 Printing Paper Ream (500 Sheets)',
      description: 'Premium 80gsm bright white laser & inkjet copy paper',
      price: 7.99,
      stock_quantity: 3,
      category: 'stationery',
      image_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=60',
      created_at: new Date().toISOString(),
    },
  ];

  const todayStr = new Date().toISOString().split('T')[0];

  const initialExpenses: Expense[] = [
    {
      id: 'exp_1',
      staff_id: 'usr_admin_1',
      category: 'supplies',
      description: 'Canon Genuine Toner Cartridge 057 & A4 Paper box',
      amount: 88.5,
      expense_date: todayStr,
      receipt_notes: 'Invoice #ST-9943 Office Supplies Depot',
      created_at: new Date().toISOString(),
      staff: { username: 'admin' },
    },
    {
      id: 'exp_2',
      staff_id: 'usr_staff_1',
      category: 'utilities',
      description: 'Fiber Gigabit Broadband Monthly Gateway Subscription',
      amount: 119.0,
      expense_date: todayStr,
      receipt_notes: 'Direct debit receipt ISP-2026',
      created_at: new Date().toISOString(),
      staff: { username: 'sarah_pos' },
    },
    {
      id: 'exp_3',
      staff_id: 'usr_admin_1',
      category: 'maintenance',
      description: 'Disinfectant screen wipes & keyboard air dusters',
      amount: 22.4,
      expense_date: todayStr,
      receipt_notes: 'Local hardware store',
      created_at: new Date().toISOString(),
      staff: { username: 'admin' },
    },
  ];

  const initialTransactions: TransactionWithItems[] = [
    {
      id: 'txn_1001',
      transaction_number: 'TRX-2026-1001',
      user_id: 'usr_staff_1',
      staff: { username: 'sarah_pos' },
      transaction_type: 'service',
      total_amount: 15.0,
      payment_method: 'cash',
      status: 'completed',
      notes: 'Station 4 - 3h Gaming Session + 1 Drink',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      items: [
        {
          id: 'item_1',
          item_type: 'service',
          item_id: 'srv_2',
          item_name: 'VIP Gaming Station',
          quantity: 3,
          unit_price: 5.0,
          subtotal: 15.0,
        },
      ],
    },
    {
      id: 'txn_1002',
      transaction_number: 'TRX-2026-1002',
      user_id: 'usr_staff_1',
      staff: { username: 'sarah_pos' },
      transaction_type: 'product',
      total_amount: 21.0,
      payment_method: 'card',
      status: 'completed',
      notes: 'USB drive & Monster energy',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      items: [
        {
          id: 'item_2',
          item_type: 'product',
          item_id: 'prd_2',
          item_name: 'Kingston 64GB USB 3.2 Drive',
          quantity: 1,
          unit_price: 12.5,
          subtotal: 12.5,
        },
        {
          id: 'item_3',
          item_type: 'product',
          item_id: 'prd_5',
          item_name: 'Monster Energy Original 500ml',
          quantity: 2,
          unit_price: 3.5,
          subtotal: 7.0,
        },
      ],
    },
    {
      id: 'txn_1003',
      transaction_number: 'TRX-2026-1003',
      user_id: 'usr_admin_1',
      staff: { username: 'admin' },
      transaction_type: 'service',
      total_amount: 7.6,
      payment_method: 'mobile',
      status: 'completed',
      notes: 'Printing college resume and cover letter',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      items: [
        {
          id: 'item_4',
          item_type: 'service',
          item_id: 'srv_3',
          item_name: 'Black & White Laser Print',
          quantity: 8,
          unit_price: 0.2,
          subtotal: 1.6,
        },
        {
          id: 'item_5',
          item_type: 'service',
          item_id: 'srv_6',
          item_name: 'Thermal Document Lamination',
          quantity: 4,
          unit_price: 1.5,
          subtotal: 6.0,
        },
      ],
    },
  ];

  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(initialProfiles));
  localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(initialServices));
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(initialProducts));
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(initialExpenses));
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initialTransactions));
  localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
}

// Ensure default data is present
initializeDefaultData();

function getItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (err) {
    console.error(`Error reading ${key}:`, err);
    return defaultValue;
  }
}

function setItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Error saving ${key}:`, err);
  }
}

// --- Profiles ---
export async function getAllProfiles(): Promise<Profile[]> {
  return getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
}

export async function updateProfileRole(userId: string, newRole: 'staff' | 'admin'): Promise<void> {
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const updated = profiles.map((p) => (p.id === userId ? { ...p, role: newRole } : p));
  setItem(STORAGE_KEYS.PROFILES, updated);
}

// --- Dashboard Stats ---
export async function getDashboardStats(): Promise<DashboardStats> {
  const transactions = getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, []);
  const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const todayTransactionsList = transactions.filter((t) => {
    return t.created_at.startsWith(todayStr) && t.status === 'completed';
  });

  const todaySales = todayTransactionsList.reduce((sum, t) => sum + Number(t.total_amount), 0);
  const todayTransactions = todayTransactionsList.length;

  const todayExpenses = expenses
    .filter((e) => e.expense_date === todayStr)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const lowStockProducts = products.filter((p) => p.stock_quantity <= 10).length;

  return {
    todaySales,
    todayTransactions,
    todayExpenses,
    lowStockProducts,
  };
}

export async function getLowStockProducts(threshold = 10): Promise<Product[]> {
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  return products.filter((p) => p.stock_quantity <= threshold);
}

// --- Products ---
export async function getAllProducts(): Promise<Product[]> {
  return getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
}

export async function createProduct(data: {
  name: string;
  description?: string | null;
  price: number;
  stock_quantity: number;
  category: string;
  image_url?: string | null;
}): Promise<Product> {
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const newProduct: Product = {
    id: `prd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: data.name,
    description: data.description || null,
    price: data.price,
    stock_quantity: data.stock_quantity,
    category: data.category.toLowerCase().trim(),
    image_url: data.image_url || null,
    created_at: new Date().toISOString(),
  };
  products.unshift(newProduct);
  setItem(STORAGE_KEYS.PRODUCTS, products);
  return newProduct;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product> {
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Product not found');

  const updated: Product = {
    ...products[index],
    ...updates,
  };
  products[index] = updated;
  setItem(STORAGE_KEYS.PRODUCTS, products);
  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const filtered = products.filter((p) => p.id !== id);
  setItem(STORAGE_KEYS.PRODUCTS, filtered);
}

// --- Services ---
export async function getAllServices(): Promise<Service[]> {
  return getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
}

export async function createService(data: {
  name: string;
  description?: string | null;
  base_price: number;
  unit: string;
}): Promise<Service> {
  const services = getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
  const newService: Service = {
    id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: data.name,
    description: data.description || null,
    base_price: data.base_price,
    unit: data.unit,
    created_at: new Date().toISOString(),
  };
  services.push(newService);
  setItem(STORAGE_KEYS.SERVICES, services);
  return newService;
}

export async function updateService(
  id: string,
  updates: Partial<Service>
): Promise<Service> {
  const services = getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
  const index = services.findIndex((s) => s.id === id);
  if (index === -1) throw new Error('Service not found');

  const updated: Service = {
    ...services[index],
    ...updates,
  };
  services[index] = updated;
  setItem(STORAGE_KEYS.SERVICES, services);
  return updated;
}

export async function deleteService(id: string): Promise<void> {
  const services = getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
  const filtered = services.filter((s) => s.id !== id);
  setItem(STORAGE_KEYS.SERVICES, filtered);
}

// --- Expenses ---
export async function getExpenses(limit = 100): Promise<Expense[]> {
  const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  return expenses.slice(0, limit);
}

export async function createExpense(
  staffId: string,
  category: ExpenseCategory,
  description: string,
  amount: number,
  expenseDate: string,
  receiptNotes?: string
): Promise<Expense> {
  const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const staff = profiles.find((p) => p.id === staffId);

  const newExpense: Expense = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    staff_id: staffId,
    category,
    description,
    amount,
    expense_date: expenseDate,
    receipt_notes: receiptNotes || null,
    created_at: new Date().toISOString(),
    staff: {
      username: staff?.username || 'staff',
    },
  };

  expenses.unshift(newExpense);
  setItem(STORAGE_KEYS.EXPENSES, expenses);
  return newExpense;
}

export async function deleteExpense(id: string): Promise<void> {
  const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const filtered = expenses.filter((e) => e.id !== id);
  setItem(STORAGE_KEYS.EXPENSES, filtered);
}

// --- Transactions ---
export async function getTransactions(limit = 100): Promise<TransactionWithItems[]> {
  const transactions = getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, []);
  return transactions.slice(0, limit);
}

export async function createTransaction(
  userId: string,
  transactionType: string,
  totalAmount: number,
  paymentMethod: PaymentMethod,
  items: Array<{
    item_type: string;
    item_id: string;
    item_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>,
  notes?: string
): Promise<TransactionWithItems> {
  const transactions = getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, []);
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const staff = profiles.find((p) => p.id === userId);

  // Deduct inventory stock for product items
  const updatedProducts = [...products];
  for (const item of items) {
    if (item.item_type === 'product') {
      const prodIndex = updatedProducts.findIndex((p) => p.id === item.item_id);
      if (prodIndex !== -1) {
        const newStock = Math.max(0, updatedProducts[prodIndex].stock_quantity - item.quantity);
        updatedProducts[prodIndex] = {
          ...updatedProducts[prodIndex],
          stock_quantity: newStock,
        };
      }
    }
  }
  setItem(STORAGE_KEYS.PRODUCTS, updatedProducts);

  const txNum = `TRX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newTxn: TransactionWithItems = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    transaction_number: txNum,
    user_id: userId,
    staff: {
      username: staff?.username || 'staff',
    },
    transaction_type: transactionType,
    total_amount: totalAmount,
    payment_method: paymentMethod,
    status: 'completed',
    notes: notes || undefined,
    created_at: new Date().toISOString(),
    items: items.map((it, idx) => ({
      ...it,
      id: `item_${Date.now()}_${idx}`,
    })),
  };

  transactions.unshift(newTxn);
  setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
  return newTxn;
}
