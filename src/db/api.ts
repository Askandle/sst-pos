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
  onSnapshot,
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
  DELETED_IDS: 'netpos_deleted_ids',
  PENDING_WRITES: 'netpos_pending_writes',
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

function getDeletedIds(): Set<string> {
  const arr = getItem<string[]>(STORAGE_KEYS.DELETED_IDS, []);
  return new Set(Array.isArray(arr) ? arr : []);
}

function markIdDeleted(id: string): void {
  const ids = getDeletedIds();
  ids.add(id);
  setItem(STORAGE_KEYS.DELETED_IDS, Array.from(ids));
  clearPendingWrite(id);
}

function clearDeletedId(id: string): void {
  const ids = getDeletedIds();
  if (ids.has(id)) {
    ids.delete(id);
    setItem(STORAGE_KEYS.DELETED_IDS, Array.from(ids));
  }
}

function getPendingWrites(): Set<string> {
  const arr = getItem<string[]>(STORAGE_KEYS.PENDING_WRITES, []);
  return new Set(Array.isArray(arr) ? arr : []);
}

function markPendingWrite(id: string): void {
  const pending = getPendingWrites();
  pending.add(id);
  setItem(STORAGE_KEYS.PENDING_WRITES, Array.from(pending));
}

function clearPendingWrite(id: string): void {
  const pending = getPendingWrites();
  if (pending.has(id)) {
    pending.delete(id);
    setItem(STORAGE_KEYS.PENDING_WRITES, Array.from(pending));
  }
}

// Reconcile remote Firestore state with local cache:
// - Remote items win (so edits from other devices apply locally), unless id has an in-flight local pending write.
// - Items missing from remote are removed (reflecting deletions on other devices), unless id has a local pending write.
// - Locally deleted IDs are always excluded until cloud delete settles.
function reconcileWithRemote<T extends { id: string }>(localList: T[], remoteList: T[]): T[] {
  const deleted = getDeletedIds();
  const pending = getPendingWrites();
  const map = new Map<string, T>();

  if (Array.isArray(remoteList)) {
    for (const item of remoteList) {
      if (item && item.id && !deleted.has(item.id)) {
        map.set(item.id, item);
      }
    }
  }

  if (Array.isArray(localList)) {
    for (const item of localList) {
      if (item && item.id && !deleted.has(item.id) && pending.has(item.id)) {
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

// Track last background sync timestamp per collection to avoid redundant cloud fetches
const lastSyncTime: Record<string, number> = {};
const inflightSync: Record<string, boolean> = {};
const SYNC_COOLDOWN_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms = 5000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), ms)),
  ]);
}

function reportFirestoreNotice(err: unknown, operation: OperationType, path: string): void {
  try {
    handleFirestoreError(err, operation, path);
  } catch (structuredErr) {
    console.warn(`Firestore ${operation} notice (${path}):`, structuredErr);
  }
}

function applyRemoteSnapshot<T extends { id: string }>(
  remoteItems: T[],
  storageKey: string,
  eventName: string,
  sortFn?: (a: T, b: T) => number
): void {
  const local = getItem<T[]>(storageKey, []);
  const reconciled = reconcileWithRemote(local, remoteItems);
  if (sortFn) reconciled.sort(sortFn);

  if (JSON.stringify(reconciled) !== JSON.stringify(local)) {
    setItem(storageKey, reconciled);
    notifyDataUpdate(eventName);
  }
}

function syncCollectionInBackground<T extends { id: string }>(
  collectionName: string,
  storageKey: string,
  eventName: string,
  sortFn?: (a: T, b: T) => number
): void {
  const now = Date.now();
  if (inflightSync[collectionName]) return;
  if (lastSyncTime[collectionName] && now - lastSyncTime[collectionName] < SYNC_COOLDOWN_MS) return;

  inflightSync[collectionName] = true;

  withTimeout(getDocs(collection(db, collectionName)), 5000)
    .then((snapshot) => {
      // Only skip empty remote snapshot if Firestore hasn't been confirmed seeded yet
      if (snapshot.empty && !localStorage.getItem(STORAGE_KEYS.FIRESTORE_SYNCED)) return;
      lastSyncTime[collectionName] = Date.now();
      localStorage.setItem(STORAGE_KEYS.FIRESTORE_SYNCED, 'true');

      const remoteItems: T[] = [];
      snapshot.forEach((d) => remoteItems.push(d.data() as T));
      applyRemoteSnapshot(remoteItems, storageKey, eventName, sortFn);
    })
    .catch((err) => {
      reportFirestoreNotice(err, OperationType.LIST, collectionName);
    })
    .finally(() => {
      inflightSync[collectionName] = false;
    });
}

// Track active real-time listeners so any connected device receives live Firestore updates
let realtimeStarted = false;
function subscribeCollectionRealtime<T extends { id: string }>(
  collectionName: string,
  storageKey: string,
  eventName: string,
  sortFn?: (a: T, b: T) => number
): void {
  onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      if (snapshot.empty && !localStorage.getItem(STORAGE_KEYS.FIRESTORE_SYNCED)) {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.FIRESTORE_SYNCED, 'true');
      const remoteItems: T[] = [];
      snapshot.forEach((d) => remoteItems.push(d.data() as T));
      applyRemoteSnapshot(remoteItems, storageKey, eventName, sortFn);
    },
    (err) => {
      reportFirestoreNotice(err, OperationType.LIST, collectionName);
    }
  );
}

function startRealtimeListeners(): void {
  if (realtimeStarted) return;
  realtimeStarted = true;

  subscribeCollectionRealtime<Profile>('profiles', STORAGE_KEYS.PROFILES, 'profiles-updated');
  subscribeCollectionRealtime<Service>('services', STORAGE_KEYS.SERVICES, 'services-updated');
  subscribeCollectionRealtime<Product>('products', STORAGE_KEYS.PRODUCTS, 'products-updated');
  subscribeCollectionRealtime<Expense>(
    'expenses',
    STORAGE_KEYS.EXPENSES,
    'expenses-updated',
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  subscribeCollectionRealtime<TransactionWithItems>(
    'transactions',
    STORAGE_KEYS.TRANSACTIONS,
    'transactions-updated',
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
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

// Validate Firestore connection on startup, seed only if database is completely empty, and attach live listeners
async function initializeFirestoreSync() {
  try {
    // Run initial connection check in parallel so listeners attach immediately
    const connPromise = withTimeout(testFirestoreConnection(), 5000);

    if (!localStorage.getItem(STORAGE_KEYS.FIRESTORE_SYNCED)) {
      const isOnline = await connPromise;
      if (isOnline) {
        const [productsSnap, profilesSnap, servicesSnap] = await withTimeout(
          Promise.all([
            getDocs(collection(db, 'products')),
            getDocs(collection(db, 'profiles')),
            getDocs(collection(db, 'services')),
          ]),
          5000
        );

        if (productsSnap.empty && profilesSnap.empty && servicesSnap.empty) {
          const batch = writeBatch(db);

          for (const p of INITIAL_PROFILES) {
            batch.set(doc(db, 'profiles', p.id), p);
          }
          for (const s of INITIAL_SERVICES) {
            batch.set(doc(db, 'services', s.id), s);
          }
          for (const pr of INITIAL_PRODUCTS) {
            batch.set(doc(db, 'products', pr.id), pr);
          }
          for (const e of INITIAL_EXPENSES) {
            batch.set(doc(db, 'expenses', e.id), e);
          }
          for (const t of INITIAL_TRANSACTIONS) {
            batch.set(doc(db, 'transactions', t.id), t);
          }

          await batch.commit();
          console.log('Firestore successfully seeded with initial S.S.T POS data.');
        }
        localStorage.setItem(STORAGE_KEYS.FIRESTORE_SYNCED, 'true');
      }
    } else {
      connPromise.catch(() => false);
    }

    // Start live real-time Firestore subscriptions across all devices
    startRealtimeListeners();
  } catch (err) {
    reportFirestoreNotice(err, OperationType.GET, 'test/connection');
    startRealtimeListeners();
  }
}

// Trigger startup connection check & live real-time sync
initializeFirestoreSync();

// --- Profiles ---
export async function getAllProfiles(): Promise<Profile[]> {
  const local = getItem<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  syncCollectionInBackground<Profile>('profiles', STORAGE_KEYS.PROFILES, 'profiles-updated');
  return local;
}

export async function fetchProfilesFromCloud(): Promise<Profile[]> {
  const local = getItem<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  try {
    const snapshot = await withTimeout(getDocs(collection(db, 'profiles')), 4000);
    if (snapshot.empty && !localStorage.getItem(STORAGE_KEYS.FIRESTORE_SYNCED)) {
      return local;
    }
    const remoteItems: Profile[] = [];
    snapshot.forEach((d) => remoteItems.push(d.data() as Profile));
    const reconciled = reconcileWithRemote(local, remoteItems);
    if (JSON.stringify(reconciled) !== JSON.stringify(local)) {
      setItem(STORAGE_KEYS.PROFILES, reconciled);
      notifyDataUpdate('profiles-updated');
    }
    return reconciled;
  } catch (err) {
    console.warn('Cloud profile fetch notice:', err);
    return local;
  }
}

export async function createProfile(newProfile: Profile): Promise<Profile> {
  markPendingWrite(newProfile.id);
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const exists = profiles.some((p) => p.id === newProfile.id);
  const updated = exists ? profiles : [...profiles, newProfile];
  setItem(STORAGE_KEYS.PROFILES, updated);
  notifyDataUpdate('profiles-updated');

  setDoc(doc(db, 'profiles', newProfile.id), newProfile)
    .then(() => clearPendingWrite(newProfile.id))
    .catch((err) => console.warn('Firestore profile creation notice:', err));

  return newProfile;
}

export async function updateProfileRole(userId: string, newRole: 'staff' | 'admin'): Promise<void> {
  markPendingWrite(userId);
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const updated = profiles.map((p) => (p.id === userId ? { ...p, role: newRole } : p));
  setItem(STORAGE_KEYS.PROFILES, updated);
  notifyDataUpdate('profiles-updated');

  setDoc(doc(db, 'profiles', userId), { role: newRole }, { merge: true })
    .then(() => clearPendingWrite(userId))
    .catch((err) => console.warn('Firestore profile update notice:', err));
}

export async function updateProfilePasswordHash(userId: string, passwordHash: string): Promise<void> {
  markPendingWrite(userId);
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const updated = profiles.map((p) => (p.id === userId ? { ...p, password_hash: passwordHash } : p));
  setItem(STORAGE_KEYS.PROFILES, updated);

  setDoc(doc(db, 'profiles', userId), { password_hash: passwordHash }, { merge: true })
    .then(() => clearPendingWrite(userId))
    .catch((err) => console.warn('Firestore profile credential sync notice:', err));
}

export async function deleteProfile(userId: string): Promise<void> {
  markIdDeleted(userId);
  const profiles = getItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const updated = profiles.filter((p) => p.id !== userId);
  setItem(STORAGE_KEYS.PROFILES, updated);

  // Also remove stored credentials for deleted user
  try {
    const rawCreds = localStorage.getItem('netpos_user_credentials');
    if (rawCreds) {
      const creds = JSON.parse(rawCreds);
      if (creds && typeof creds === 'object' && userId in creds) {
        delete creds[userId];
        localStorage.setItem('netpos_user_credentials', JSON.stringify(creds));
      }
    }
  } catch (err) {
    console.warn('Credential cleanup notice:', err);
  }

  notifyDataUpdate('profiles-updated');

  deleteDoc(doc(db, 'profiles', userId))
    .then(() => clearDeletedId(userId))
    .catch((err) => reportFirestoreNotice(err, OperationType.DELETE, `profiles/${userId}`));
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
  syncCollectionInBackground<Product>('products', STORAGE_KEYS.PRODUCTS, 'products-updated');
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

  markPendingWrite(newProduct.id);
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  products.unshift(newProduct);
  setItem(STORAGE_KEYS.PRODUCTS, products);
  notifyDataUpdate('products-updated');

  setDoc(doc(db, 'products', newProduct.id), newProduct)
    .then(() => clearPendingWrite(newProduct.id))
    .catch((err) => console.warn('Firestore product creation notice:', err));

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
  markPendingWrite(id);
  products[index] = updated;
  setItem(STORAGE_KEYS.PRODUCTS, products);
  notifyDataUpdate('products-updated');

  setDoc(doc(db, 'products', id), cleanUpdates, { merge: true })
    .then(() => clearPendingWrite(id))
    .catch((err) => console.warn('Firestore product update notice:', err));

  return updated;
}

export async function deleteProduct(id: string): Promise<void> {
  markIdDeleted(id);
  const products = getItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const filtered = products.filter((p) => p.id !== id);
  setItem(STORAGE_KEYS.PRODUCTS, filtered);
  notifyDataUpdate('products-updated');

  deleteDoc(doc(db, 'products', id))
    .then(() => clearDeletedId(id))
    .catch((err) => reportFirestoreNotice(err, OperationType.DELETE, `products/${id}`));
}

// --- Services ---
export async function getAllServices(): Promise<Service[]> {
  const local = getItem<Service[]>(STORAGE_KEYS.SERVICES, INITIAL_SERVICES);
  syncCollectionInBackground<Service>('services', STORAGE_KEYS.SERVICES, 'services-updated');
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

  markPendingWrite(newService.id);
  const services = getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
  services.unshift(newService);
  setItem(STORAGE_KEYS.SERVICES, services);
  notifyDataUpdate('services-updated');

  setDoc(doc(db, 'services', newService.id), newService)
    .then(() => clearPendingWrite(newService.id))
    .catch((err) => console.warn('Firestore service creation notice:', err));

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
  markPendingWrite(id);
  services[index] = updated;
  setItem(STORAGE_KEYS.SERVICES, services);
  notifyDataUpdate('services-updated');

  setDoc(doc(db, 'services', id), cleanUpdates, { merge: true })
    .then(() => clearPendingWrite(id))
    .catch((err) => console.warn('Firestore service update notice:', err));

  return updated;
}

export async function deleteService(id: string): Promise<void> {
  markIdDeleted(id);
  const services = getItem<Service[]>(STORAGE_KEYS.SERVICES, []);
  const filtered = services.filter((s) => s.id !== id);
  setItem(STORAGE_KEYS.SERVICES, filtered);
  notifyDataUpdate('services-updated');

  deleteDoc(doc(db, 'services', id))
    .then(() => clearDeletedId(id))
    .catch((err) => reportFirestoreNotice(err, OperationType.DELETE, `services/${id}`));
}

// --- Expenses ---
export async function getExpenses(limit = 100): Promise<Expense[]> {
  const local = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  syncCollectionInBackground<Expense>(
    'expenses',
    STORAGE_KEYS.EXPENSES,
    'expenses-updated',
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

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

  markPendingWrite(newExpense.id);
  const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  expenses.unshift(newExpense);
  setItem(STORAGE_KEYS.EXPENSES, expenses);
  notifyDataUpdate('expenses-updated');

  setDoc(doc(db, 'expenses', newExpense.id), newExpense)
    .then(() => clearPendingWrite(newExpense.id))
    .catch((err) => console.warn('Firestore expense creation notice:', err));

  return newExpense;
}

export async function deleteExpense(id: string): Promise<void> {
  markIdDeleted(id);
  const expenses = getItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const filtered = expenses.filter((e) => e.id !== id);
  setItem(STORAGE_KEYS.EXPENSES, filtered);
  notifyDataUpdate('expenses-updated');

  deleteDoc(doc(db, 'expenses', id))
    .then(() => clearDeletedId(id))
    .catch((err) => reportFirestoreNotice(err, OperationType.DELETE, `expenses/${id}`));
}

// --- Transactions ---
export async function getTransactions(limit = 100): Promise<TransactionWithItems[]> {
  const local = getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
  local.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  syncCollectionInBackground<TransactionWithItems>(
    'transactions',
    STORAGE_KEYS.TRANSACTIONS,
    'transactions-updated',
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return local.slice(0, limit);
}

export async function deleteTransaction(id: string): Promise<void> {
  markIdDeleted(id);
  const transactions = getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, []);
  const filtered = transactions.filter((t) => t.id !== id);
  setItem(STORAGE_KEYS.TRANSACTIONS, filtered);
  notifyDataUpdate('transactions-updated');

  deleteDoc(doc(db, 'transactions', id))
    .then(() => clearDeletedId(id))
    .catch((err) => reportFirestoreNotice(err, OperationType.DELETE, `transactions/${id}`));
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
  notes?: string,
  customerName?: string,
  customerPhone?: string
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
        markPendingWrite(item.item_id);
        setDoc(doc(db, 'products', item.item_id), { stock_quantity: newStock }, { merge: true })
          .then(() => clearPendingWrite(item.item_id))
          .catch(console.warn);
      }
    }
  }
  setItem(STORAGE_KEYS.PRODUCTS, updatedProducts);

  const txNum = `TRX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // CRITICAL: Firestore rejects undefined. All optional values must be null or omitted!
  const cleanNotes = notes?.trim() || null;
  const cleanCustomerName = customerName?.trim() || null;
  const cleanCustomerPhone = customerPhone?.trim() || null;

  const newTxn: TransactionWithItems = {
    id: `txn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    transaction_number: txNum,
    user_id: userId,
    staff: {
      username: staff?.username || 'staff',
    },
    customer_name: cleanCustomerName,
    customer_phone: cleanCustomerPhone,
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

  markPendingWrite(newTxn.id);
  const transactions = getItem<TransactionWithItems[]>(STORAGE_KEYS.TRANSACTIONS, []);
  transactions.unshift(newTxn);
  setItem(STORAGE_KEYS.TRANSACTIONS, transactions);

  // Trigger reactive UI updates across all components
  notifyDataUpdate('transactions-updated');
  notifyDataUpdate('products-updated');

  // Sync to Firestore non-blockingly so POS checkout is instant and never crashes
  setDoc(doc(db, 'transactions', newTxn.id), newTxn)
    .then(() => clearPendingWrite(newTxn.id))
    .catch((err) => {
      console.warn('Firestore transaction cloud sync notice:', err);
    });

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

async function syncCollectionsToCloud(collections: {
  profiles?: Profile[];
  products?: Product[];
  services?: Service[];
  expenses?: Expense[];
  transactions?: TransactionWithItems[];
}): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const p of collections.profiles || []) {
      if (p?.id) batch.set(doc(db, 'profiles', p.id), p);
    }
    for (const pr of collections.products || []) {
      if (pr?.id) batch.set(doc(db, 'products', pr.id), pr);
    }
    for (const s of collections.services || []) {
      if (s?.id) batch.set(doc(db, 'services', s.id), s);
    }
    for (const e of collections.expenses || []) {
      if (e?.id) batch.set(doc(db, 'expenses', e.id), e);
    }
    for (const t of collections.transactions || []) {
      if (t?.id) batch.set(doc(db, 'transactions', t.id), t);
    }
    await batch.commit();
  } catch (err) {
    reportFirestoreNotice(err, OperationType.WRITE, 'collections/batch');
  }
}

export function importDatabaseBackup(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.collections) {
      return { success: false, message: 'Invalid backup file structure: missing collections' };
    }
    const { profiles, products, services, expenses, transactions } = parsed.collections;

    setItem(STORAGE_KEYS.DELETED_IDS, []);
    setItem(STORAGE_KEYS.PENDING_WRITES, []);

    if (Array.isArray(profiles)) {
      setItem(STORAGE_KEYS.PROFILES, profiles);
      notifyDataUpdate('profiles-updated');
    }
    if (Array.isArray(products)) {
      setItem(STORAGE_KEYS.PRODUCTS, products);
      notifyDataUpdate('products-updated');
    }
    if (Array.isArray(services)) {
      setItem(STORAGE_KEYS.SERVICES, services);
      notifyDataUpdate('services-updated');
    }
    if (Array.isArray(expenses)) {
      setItem(STORAGE_KEYS.EXPENSES, expenses);
      notifyDataUpdate('expenses-updated');
    }
    if (Array.isArray(transactions)) {
      setItem(STORAGE_KEYS.TRANSACTIONS, transactions);
      notifyDataUpdate('transactions-updated');
    }

    syncCollectionsToCloud({ profiles, products, services, expenses, transactions });

    return { success: true, message: 'Database restored and synced to cloud' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to parse JSON backup file' };
  }
}

export function resetDatabase(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(key);
  }
  initializeLocalStorage();
  notifyDataUpdate('profiles-updated');
  notifyDataUpdate('products-updated');
  notifyDataUpdate('services-updated');
  notifyDataUpdate('expenses-updated');
  notifyDataUpdate('transactions-updated');
  initializeFirestoreSync();
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
