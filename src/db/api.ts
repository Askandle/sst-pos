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
import {
  db,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';

const STORAGE_KEYS = {
  PROFILES: 'netpos_profiles',
  PRODUCTS: 'netpos_products',
  SERVICES: 'netpos_services',
  EXPENSES: 'netpos_expenses',
  TRANSACTIONS: 'netpos_transactions',
  INITIALIZED: 'netpos_initialized',
  FIRESTORE_SYNCED: 'netpos_firestore_synced',
};

// Seed initial internet cafe data
const INITIAL_PROFILES: Profile[] = [
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

const INITIAL_SERVICES: Service[] = [
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

const INITIAL_PRODUCTS: Product[] = [
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

const INITIAL_EXPENSES: Expense[] = [
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

const INITIAL_TRANSACTIONS: TransactionWithItems[] = [
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
];

// Local cache helpers
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

// Safely merge local and remote collections by id, preserving newly created or edited items
function safeMergeById<T extends { id: string }>(localList: T[], remoteList: T[]): T[] {
  const map = new Map<string, T>();
  if (Array.isArray(remoteList)) {
    for (const item of remoteList) {
      if (item && item.id) {
        map.set(item.id, item);
      }
    }
  }
  if (Array.isArray(localList)) {
    for (const item of localList) {
      if (item && item.id) {
        map.set(item.id, item);
      }
    }
  }
  return Array.from(map.values());
}

function notifyDataUpdate(eventName: string): void {
  try {
    window.dispatchEvent(new Event(eventName));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

// Bootstrap local storage first
function initializeLocalStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.INITIALIZED)) {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(INITIAL_PROFILES));
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(INITIAL_SERVICES));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(INITIAL_EXPENSES));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
  }
}
initializeLocalStorage();

// Sync Firestore on startup if empty
async function syncFirestoreSeed() {
  if (localStorage.getItem(STORAGE_KEYS.FIRESTORE_SYNCED)) return;
  try {
    const isOnline = await testFirestoreConnection();
    if (!isOnline) return;

    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      const batch = writeBatch(db);

      // Seed profiles
      for (const p of INITIAL_PROFILES) {
        batch.set(doc(db, 'profiles', p.id), p);
      }
      // Seed services
      for (const s of INITIAL_SERVICES) {
        batch.set(doc(db, 'services', s.id), s);
      }
      // Seed products
      for (const pr of INITIAL_PRODUCTS) {
        batch.set(doc(db, 'products', pr.id), pr);
      }
      // Seed expenses
      for (const e of INITIAL_EXPENSES) {
        batch.set(doc(db, 'expenses', e.id), e);
      }
      // Seed transactions
      for (const t of INITIAL_TRANSACTIONS) {
        batch.set(doc(db, 'transactions', t.id), t);
      }

      await batch.commit();
      console.log('Firestore successfully seeded with initial internet cafe data.');
    }
    localStorage.setItem(STORAGE_KEYS.FIRESTORE_SYNCED, 'true');
  } catch (err) {
    console.warn('Firestore initial sync notice:', err);
  }
}

// Trigger background sync
syncFirestoreSeed();

// --- Profiles ---
export async function getAllProfiles(): Promise<Profile[]> {
  const local = getItem<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);

  try {
    const snapshot = await getDocs(collection(db, 'profiles'));
    if (!snapshot.empty) {
      const remoteItems: Profile[] = [];
      snapshot.forEach((d) => remoteItems.push(d.data() as Profile));
      const merged = safeMergeById(local, remoteItems);
      setItem(STORAGE_KEYS.PROFILES, merged);
      return merged;
    }
  } catch (err) {
    console.warn('Falling back to local profiles:', err);
  }
  return local;
}

export async function updateProfileRole(userId: string, newRole: 'staff' | 'admin'): Promise<void> {
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const updated = profiles.map((p) => (p.id === userId ? { ...p, role: newRole } : p));
  setItem(STORAGE_KEYS.PROFILES, updated);
  notifyDataUpdate('profiles-updated');

  try {
    const ref = doc(db, 'profiles', userId);
    await setDoc(ref, { role: newRole }, { merge: true });
  } catch (err) {
    console.warn('Firestore profile update notice:', err);
  }
}

export async function deleteProfile(userId: string): Promise<void> {
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const updated = profiles.filter((p) => p.id !== userId);
  setItem(STORAGE_KEYS.PROFILES, updated);
  notifyDataUpdate('profiles-updated');

  try {
    const ref = doc(db, 'profiles', userId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('Firestore profile delete notice:', err);
  }
}

// --- Dashboard Stats ---
export async function getDashboardStats(): Promise<DashboardStats> {
  const transactions = await getTransactions(500);
  const expenses = await getExpenses(500);
  const products = await getAllProducts();

  const today = new Date().toISOString().split('T')[0];

  const todayTransactionsList = transactions.filter((t) => {
    return Boolean(t.created_at?.startsWith(today) && t.status === 'completed');
  });

  const todaySales = todayTransactionsList.reduce((sum, t) => sum + Number(t.total_amount || 0), 0);
  const todayTransactions = todayTransactionsList.length;

  const todayExpenses = expenses
    .filter((e) => e.expense_date === today)
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const lowStockProducts = products.filter((p) => Number(p.stock_quantity ?? 0) <= 10).length;

  return {
    todaySales,
    todayTransactions,
    todayExpenses,
    lowStockProducts,
  };
}

export async function getLowStockProducts(threshold = 10): Promise<Product[]> {
  const products = await getAllProducts();
  return products.filter((p) => p.stock_quantity <= threshold);
}

// --- Products ---
export async function getAllProducts(): Promise<Product[]> {
  const local = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, INITIAL_PRODUCTS);

  try {
    const snapshot = await getDocs(collection(db, 'products'));
    if (!snapshot.empty) {
      const remoteItems: Product[] = [];
      snapshot.forEach((d) => remoteItems.push(d.data() as Product));
      const merged = safeMergeById(local, remoteItems);
      setItem(STORAGE_KEYS.PRODUCTS, merged);
      return merged;
    }
  } catch (err) {
    console.warn('Falling back to local products:', err);
  }
  return local;
}

export async function createProduct(data: {
  name: string;
  description?: string | null;
  price: number;
  stock_quantity: number;
  category: string;
  image_url?: string | null;
}): Promise<Product> {
  const newProduct: Product = {
    id: `prd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    price: Number(data.price),
    stock_quantity: Number(data.stock_quantity),
    category: data.category.toLowerCase().trim(),
    image_url: data.image_url?.trim() || null,
    created_at: new Date().toISOString(),
  };

  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  products.unshift(newProduct);
  setItem(STORAGE_KEYS.PRODUCTS, products);
  notifyDataUpdate('products-updated');

  try {
    await setDoc(doc(db, 'products', newProduct.id), newProduct);
  } catch (err) {
    console.warn('Firestore product creation notice:', err);
  }

  return newProduct;
}

export async function updateProduct(
  id: string,
  updates: Partial<Product>
): Promise<Product> {
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Product not found');

  const cleanUpdates: any = { ...updates };
  if (cleanUpdates.description !== undefined) cleanUpdates.description = cleanUpdates.description?.trim() || null;
  if (cleanUpdates.image_url !== undefined) cleanUpdates.image_url = cleanUpdates.image_url?.trim() || null;

  const updated: Product = {
    ...products[index],
    ...cleanUpdates,
  };
  products[index] = updated;
  setItem(STORAGE_KEYS.PRODUCTS, products);
  notifyDataUpdate('products-updated');

  try {
    await setDoc(doc(db, 'products', id), cleanUpdates, { merge: true });
  } catch (err) {
    console.warn('Firestore product update notice:', err);
  }

  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const filtered = products.filter((p) => p.id !== id);
  setItem(STORAGE_KEYS.PRODUCTS, filtered);
  notifyDataUpdate('products-updated');

  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (err) {
    console.warn('Firestore product delete notice:', err);
  }
}

// --- Services ---
export async function getAllServices(): Promise<Service[]> {
  const local = getItem<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);

  try {
    const snapshot = await getDocs(collection(db, 'services'));
    if (!snapshot.empty) {
      const remoteItems: Service[] = [];
      snapshot.forEach((d) => remoteItems.push(d.data() as Service));
      const merged = safeMergeById(local, remoteItems);
      setItem(STORAGE_KEYS.SERVICES, merged);
      return merged;
    }
  } catch (err) {
    console.warn('Falling back to local services:', err);
  }
  return local;
}

export async function createService(data: {
  name: string;
  description?: string | null;
  base_price: number;
  unit: string;
}): Promise<Service> {
  const newService: Service = {
    id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    base_price: Number(data.base_price),
    unit: data.unit.trim(),
    created_at: new Date().toISOString(),
  };

  const services = getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
  services.unshift(newService);
  setItem(STORAGE_KEYS.SERVICES, services);
  notifyDataUpdate('services-updated');

  try {
    await setDoc(doc(db, 'services', newService.id), newService);
  } catch (err) {
    console.warn('Firestore service creation notice:', err);
  }

  return newService;
}

export async function updateService(
  id: string,
  updates: Partial<Service>
): Promise<Service> {
  const services = getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
  const index = services.findIndex((s) => s.id === id);
  if (index === -1) throw new Error('Service not found');

  const cleanUpdates: any = { ...updates };
  if (cleanUpdates.description !== undefined) cleanUpdates.description = cleanUpdates.description?.trim() || null;

  const updated: Service = {
    ...services[index],
    ...cleanUpdates,
  };
  services[index] = updated;
  setItem(STORAGE_KEYS.SERVICES, services);
  notifyDataUpdate('services-updated');

  try {
    await setDoc(doc(db, 'services', id), cleanUpdates, { merge: true });
  } catch (err) {
    console.warn('Firestore service update notice:', err);
  }

  return updated;
}

export async function deleteService(id: string): Promise<void> {
  const services = getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
  const filtered = services.filter((s) => s.id !== id);
  setItem(STORAGE_KEYS.SERVICES, filtered);
  notifyDataUpdate('services-updated');

  try {
    await deleteDoc(doc(db, 'services', id));
  } catch (err) {
    console.warn('Firestore service delete notice:', err);
  }
}

// --- Expenses ---
export async function getExpenses(limit = 100): Promise<Expense[]> {
  const local = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);

  try {
    const snapshot = await getDocs(collection(db, 'expenses'));
    if (!snapshot.empty) {
      const remoteItems: Expense[] = [];
      snapshot.forEach((d) => remoteItems.push(d.data() as Expense));
      const merged = safeMergeById(local, remoteItems);
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItem(STORAGE_KEYS.EXPENSES, merged);
      return merged.slice(0, limit);
    }
  } catch (err) {
    console.warn('Falling back to local expenses:', err);
  }

  local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return local.slice(0, limit);
}

export async function createExpense(
  staffId: string,
  category: ExpenseCategory,
  description: string,
  amount: number,
  expenseDate: string,
  receiptNotes?: string
): Promise<Expense> {
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const staff = profiles.find((p) => p.id === staffId);

  const newExpense: Expense = {
    id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    staff_id: staffId,
    category,
    description: description.trim(),
    amount: Number(amount),
    expense_date: expenseDate,
    receipt_notes: receiptNotes?.trim() || null,
    created_at: new Date().toISOString(),
    staff: {
      username: staff?.username || 'staff',
    },
  };

  const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  expenses.unshift(newExpense);
  setItem(STORAGE_KEYS.EXPENSES, expenses);
  notifyDataUpdate('expenses-updated');

  try {
    await setDoc(doc(db, 'expenses', newExpense.id), newExpense);
  } catch (err) {
    console.warn('Firestore expense creation notice:', err);
  }

  return newExpense;
}

export async function deleteExpense(id: string): Promise<void> {
  const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const filtered = expenses.filter((e) => e.id !== id);
  setItem(STORAGE_KEYS.EXPENSES, filtered);
  notifyDataUpdate('expenses-updated');

  try {
    await deleteDoc(doc(db, 'expenses', id));
  } catch (err) {
    console.warn('Firestore expense delete notice:', err);
  }
}

// --- Transactions ---
export async function getTransactions(limit = 100): Promise<TransactionWithItems[]> {
  const local = getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);

  try {
    const snapshot = await getDocs(collection(db, 'transactions'));
    if (!snapshot.empty) {
      const remoteItems: TransactionWithItems[] = [];
      snapshot.forEach((d) => remoteItems.push(d.data() as TransactionWithItems));
      const merged = safeMergeById(local, remoteItems);
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setItem(STORAGE_KEYS.TRANSACTIONS, merged);
      return merged.slice(0, limit);
    }
  } catch (err) {
    console.warn('Falling back to local transactions:', err);
  }

  local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return local.slice(0, limit);
}

export async function deleteTransaction(id: string): Promise<void> {
  const transactions = getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, []);
  const filtered = transactions.filter((t) => t.id !== id);
  setItem(STORAGE_KEYS.TRANSACTIONS, filtered);
  notifyDataUpdate('transactions-updated');

  try {
    await deleteDoc(doc(db, 'transactions', id));
  } catch (err) {
    console.warn('Firestore transaction delete notice:', err);
  }
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
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const staff = profiles.find((p) => p.id === userId);

  // Update inventory locally
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
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
        // Update product in Firestore non-blockingly
        setDoc(doc(db, 'products', item.item_id), { stock_quantity: newStock }, { merge: true }).catch(console.warn);
      }
    }
  }
  setItem(STORAGE_KEYS.PRODUCTS, updatedProducts);

  const txNum = `TRX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // CRITICAL: Firestore rejects undefined. All optional values must be null or omitted!
  const cleanNotes = notes?.trim() || null;

  const newTxn: TransactionWithItems = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    transaction_number: txNum,
    user_id: userId,
    staff: {
      username: staff?.username || 'staff',
    },
    transaction_type: transactionType,
    total_amount: Number(totalAmount),
    payment_method: paymentMethod,
    status: 'completed',
    notes: cleanNotes,
    created_at: new Date().toISOString(),
    items: items.map((it, idx) => ({
      id: `item_${Date.now()}_${idx}`,
      item_type: it.item_type,
      item_id: it.item_id,
      item_name: it.item_name,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      subtotal: Number(it.subtotal),
    })),
  };

  const transactions = getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, []);
  transactions.unshift(newTxn);
  setItem(STORAGE_KEYS.TRANSACTIONS, transactions);

  // Trigger reactive UI updates across all components
  notifyDataUpdate('transactions-updated');
  notifyDataUpdate('products-updated');

  // Sync to Firestore non-blockingly so POS checkout NEVER crashes
  try {
    await setDoc(doc(db, 'transactions', newTxn.id), newTxn);
  } catch (err) {
    console.warn('Firestore transaction cloud sync notice:', err);
  }

  return newTxn;
}

// --- Database Management & Raw Access ---
export interface DatabaseStatsSummary {
  profilesCount: number;
  productsCount: number;
  servicesCount: number;
  expensesCount: number;
  transactionsCount: number;
  storageSizeKb: number;
  lastUpdated: string;
}

export function getDatabaseStatsSummary(): DatabaseStatsSummary {
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const services = getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
  const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const transactions = getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, []);

  let totalBytes = 0;
  for (const key of Object.values(STORAGE_KEYS)) {
    const raw = localStorage.getItem(key);
    if (raw) totalBytes += raw.length * 2;
  }

  return {
    profilesCount: profiles.length,
    productsCount: products.length,
    servicesCount: services.length,
    expensesCount: expenses.length,
    transactionsCount: transactions.length,
    storageSizeKb: Math.max(1, Math.round(totalBytes / 1024)),
    lastUpdated: new Date().toISOString(),
  };
}

export function exportDatabaseBackup(): string {
  const payload = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    system: 'S.S.T POS - Sanyali School of Technology',
    collections: {
      profiles: getItem<Profile[]>(STORAGE_KEYS.PROFILES, []),
      products: getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []),
      services: getItem<Service[]>(STORAGE_KEYS.SERVICES, []),
      expenses: getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []),
      transactions: getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, []),
    },
  };
  return JSON.stringify(payload, null, 2);
}

export function importDatabaseBackup(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.collections) {
      return { success: false, message: 'Invalid backup file structure: missing collections' };
    }
    const { profiles, products, services, expenses, transactions } = parsed.collections;

    if (Array.isArray(profiles)) setItem(STORAGE_KEYS.PROFILES, profiles);
    if (Array.isArray(products)) setItem(STORAGE_KEYS.PRODUCTS, products);
    if (Array.isArray(services)) setItem(STORAGE_KEYS.SERVICES, services);
    if (Array.isArray(expenses)) setItem(STORAGE_KEYS.EXPENSES, expenses);
    if (Array.isArray(transactions)) setItem(STORAGE_KEYS.TRANSACTIONS, transactions);

    return { success: true, message: 'Database successfully restored from backup' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to parse JSON backup file' };
  }
}

export function resetDatabase(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(key);
  }
  initializeLocalStorage();
  syncFirestoreSeed();
}

export function getRawCollectionData(collectionName: 'profiles' | 'products' | 'services' | 'expenses' | 'transactions'): any[] {
  switch (collectionName) {
    case 'profiles':
      return getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
    case 'products':
      return getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    case 'services':
      return getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
    case 'expenses':
      return getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
    case 'transactions':
      return getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, []);
    default:
      return [];
  }
}
