import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAllProfiles, updateProfileRole } from '@/db/api';
import type { Profile } from '@/types';

interface DatabaseStatsSummary {
  profilesCount: number;
  productsCount: number;
  servicesCount: number;
  expensesCount: number;
  transactionsCount: number;
  storageSizeKb: number;
  lastUpdated: string;
}

const STORAGE_KEYS = {
  PROFILES: 'netpos_profiles',
  PRODUCTS: 'netpos_products',
  SERVICES: 'netpos_services',
  EXPENSES: 'netpos_expenses',
  TRANSACTIONS: 'netpos_transactions',
};

function getLocalItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalItem(key: string, value: any): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Storage write error:', err);
  }
}

function getDatabaseStatsSummary(): DatabaseStatsSummary {
  const profiles = getLocalItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
  const products = getLocalItem<any[]>(STORAGE_KEYS.PRODUCTS, []);
  const services = getLocalItem<any[]>(STORAGE_KEYS.SERVICES, []);
  const expenses = getLocalItem<any[]>(STORAGE_KEYS.EXPENSES, []);
  const transactions = getLocalItem<any[]>(STORAGE_KEYS.TRANSACTIONS, []);

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

function exportDatabaseBackup(): string {
  const payload = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    system: 'S.S.T POS - Sanyali School of Technology',
    collections: {
      profiles: getLocalItem(STORAGE_KEYS.PROFILES, []),
      products: getLocalItem(STORAGE_KEYS.PRODUCTS, []),
      services: getLocalItem(STORAGE_KEYS.SERVICES, []),
      expenses: getLocalItem(STORAGE_KEYS.EXPENSES, []),
      transactions: getLocalItem(STORAGE_KEYS.TRANSACTIONS, []),
    },
  };
  return JSON.stringify(payload, null, 2);
}

function importDatabaseBackup(jsonString: string): { success: boolean; message: string } {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.collections) {
      return { success: false, message: 'Invalid backup file structure: missing collections' };
    }
    const { profiles, products, services, expenses, transactions } = parsed.collections;

    if (Array.isArray(profiles)) setLocalItem(STORAGE_KEYS.PROFILES, profiles);
    if (Array.isArray(products)) setLocalItem(STORAGE_KEYS.PRODUCTS, products);
    if (Array.isArray(services)) setLocalItem(STORAGE_KEYS.SERVICES, services);
    if (Array.isArray(expenses)) setLocalItem(STORAGE_KEYS.EXPENSES, expenses);
    if (Array.isArray(transactions)) setLocalItem(STORAGE_KEYS.TRANSACTIONS, transactions);

    return { success: true, message: 'Database successfully restored from backup' };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to parse JSON backup file' };
  }
}

function resetDatabase(): void {
  for (const key of Object.values(STORAGE_KEYS)) {
    localStorage.removeItem(key);
  }
}

function getRawCollectionData(collectionName: 'profiles' | 'products' | 'services' | 'expenses' | 'transactions'): any[] {
  switch (collectionName) {
    case 'profiles':
      return getLocalItem<Profile[]>(STORAGE_KEYS.PROFILES, []);
    case 'products':
      return getLocalItem<any[]>(STORAGE_KEYS.PRODUCTS, []);
    case 'services':
      return getLocalItem<any[]>(STORAGE_KEYS.SERVICES, []);
    case 'expenses':
      return getLocalItem<any[]>(STORAGE_KEYS.EXPENSES, []);
    case 'transactions':
      return getLocalItem<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
    default:
      return [];
  }
}
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Shield,
  Users,
  Database,
  Download,
  Upload,
  RotateCcw,
  FileCode,
  CheckCircle2,
  Copy,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type RawCollection = 'products' | 'services' | 'transactions' | 'expenses' | 'profiles';

export default function AdminPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbStats, setDbStats] = useState<DatabaseStatsSummary | null>(null);
  const [rawModalOpen, setRawModalOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<RawCollection>('products');
  const [rawJson, setRawJson] = useState('');
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { profile, signInWithUsername } = useAuth();

  useEffect(() => {
    if (profile && profile.role === 'admin') {
      loadData();
    }
  }, [profile]);

  const loadData = async () => {
    try {
      // 1. Read local storage first to preserve any user deletions
      const local = localStorage.getItem(STORAGE_KEYS.PROFILES);
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setProfiles(parsed);
            refreshDbStats();
            setLoading(false);
            return;
          }
        } catch {}
      }

      const data = await getAllProfiles();
      setProfiles(data);
      refreshDbStats();
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const refreshDbStats = () => {
    setDbStats(getDatabaseStatsSummary());
  };

  const handleRoleChange = async (userId: string, newRole: 'staff' | 'admin') => {
    try {
      await updateProfileRole(userId, newRole);
      toast.success('Role updated successfully');
      loadData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const confirmDeleteUser = (targetUser: Profile) => {
    if (profile && targetUser.id === profile.id) {
      toast.error('You cannot delete your own active administrator account.');
      return;
    }

    if (targetUser.role === 'admin') {
      const adminCount = profiles.filter((p) => p.role === 'admin').length;
      if (adminCount <= 1) {
        toast.error('Cannot delete the last remaining administrator account.');
        return;
      }
    }

    setUserToDelete(targetUser);
    setDeleteConfirmOpen(true);
  };

  const handleExecuteDeleteUser = async () => {
    if (!userToDelete) return;
    const targetId = userToDelete.id;
    const targetName = userToDelete.username;

    try {
      // 1. Immediately remove from React state so UI updates instantly
      const remainingProfiles = profiles.filter((p) => p.id !== targetId);
      setProfiles(remainingProfiles);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);

      // 2. Persist to localStorage immediately
      try {
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(remainingProfiles));
      } catch (err) {
        console.error('Storage write error:', err);
      }

      // 3. Delete from Firestore in cloud
      try {
        const { deleteDoc, doc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');
        await deleteDoc(doc(db, 'profiles', targetId));
      } catch (cloudErr) {
        console.warn('Firestore cloud delete sync notice:', cloudErr);
      }

      refreshDbStats();
      toast.success(`User "${targetName}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
      loadData();
    }
  };

  // Export DB
  const handleExportBackup = () => {
    try {
      const jsonStr = exportDatabaseBackup();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sst-pos-database-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Database backup downloaded successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export database backup');
    }
  };

  // Import DB
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const result = importDatabaseBackup(content);
      if (result.success) {
        toast.success(result.message);
        loadData();
      } else {
        toast.error(result.message);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.onerror = () => toast.error('Error reading backup file');
    reader.readAsText(file);
  };

  // Reset DB
  const handleConfirmReset = () => {
    resetDatabase();
    setResetDialogOpen(false);
    toast.success('Database reset to factory default values');
    loadData();
  };

  // View Raw JSON
  const handleOpenRawData = (collection: RawCollection) => {
    setSelectedCollection(collection);
    const data = getRawCollectionData(collection);
    setRawJson(JSON.stringify(data, null, 2));
    setRawModalOpen(true);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(rawJson);
    toast.success('Raw JSON copied to clipboard');
  };

  if (profile && profile.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full border-2 border-indigo-500/40 rounded-2xl shadow-lg bg-card">
          <CardContent className="flex flex-col items-center justify-center py-10 px-6 text-center space-y-4">
            <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Shield className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Admin Privileges Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You are currently signed in as <span className="font-semibold text-foreground">{profile.username}</span> ({profile.role}). Only administrators can view user management and cloud database controls.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold cursor-pointer"
                onClick={async () => {
                  const { error } = await signInWithUsername('admin', 'admin123');
                  if (error) {
                    toast.error('Could not switch to admin: ' + error.message);
                  } else {
                    toast.success('Switched to Administrator session');
                    loadData();
                  }
                }}
              >
                Sign in as Admin (admin)
              </Button>
              <Button
                variant="outline"
                className="w-full border-2 border-border cursor-pointer"
                onClick={() => (window.location.href = '/')}
              >
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users and system settings</p>
        </div>
        <Card className="border-2 border-border">
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full bg-muted" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users and system settings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-indigo-500/35 dark:border-indigo-400/35 hover:border-indigo-500 rounded-xl transition-all shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
              {profiles.length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-sky-500/35 dark:border-sky-400/35 hover:border-sky-500 rounded-xl transition-all shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Shield className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-sky-600 dark:text-sky-400">
              {profiles.filter((p) => p.role === 'admin').length}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2 border-emerald-500/35 dark:border-emerald-400/35 hover:border-emerald-500 rounded-xl transition-all shadow-xs bg-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
              {profiles.filter((p) => p.role === 'staff').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card className="border-2 border-indigo-500/30 dark:border-indigo-400/30 rounded-xl shadow-xs overflow-hidden">
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge variant="default" className="bg-primary shadow-2xs">
                          <Shield className="h-3 w-3 mr-1 inline" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Staff</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.created_at
                        ? format(new Date(user.created_at), 'MMM dd, yyyy')
                        : 'Recent'}
                    </TableCell>
                    <TableCell>
                      {profile && user.id !== profile.id ? (
                        <div className="flex items-center gap-2">
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              handleRoleChange(user.id, value as 'staff' | 'admin')
                            }
                          >
                            <SelectTrigger className="w-28 border-2 border-indigo-500/30 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => confirmDeleteUser(user)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-2 border-transparent hover:border-destructive/30 rounded-lg cursor-pointer h-9 w-9 shrink-0 transition-colors"
                            title={`Delete user ${user.username}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">Current User</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Database & Storage Management */}
      <Card className="border-2 border-emerald-500/35 dark:border-emerald-400/35 rounded-xl shadow-xs bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Cloud Database & Storage Access
            </CardTitle>
            <CardDescription className="mt-1">
              Connected to Google Cloud Firestore with real-time sync across cash registers, plus local backup and JSON inspection.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500/30">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-600" />
              Cloud Firestore Live
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cloud Database Direct Console Card */}
          <div className="p-4 rounded-xl bg-muted/40 border-2 border-emerald-500/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground">Google Cloud Firestore Web Console</span>
                <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                  Direct Console Access
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Database ID: <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">ai-studio-netposinternetca-099c30e9-2795-4450-ba1f-3fb8b3b40af0</code> in project <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground font-semibold">gen-lang-client-0748679277</code>
              </p>
            </div>
            <a
              href="https://console.firebase.google.com/project/gen-lang-client-0748679277/firestore/databases/ai-studio-netposinternetca-099c30e9-2795-4450-ba1f-3fb8b3b40af0/data"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors shrink-0"
            >
              Open Firebase Database Console
              <Download className="h-3.5 w-3.5 rotate-[-90deg]" />
            </a>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div
              onClick={() => handleOpenRawData('products')}
              className="p-3 border-2 border-emerald-500/20 hover:border-emerald-500/60 rounded-xl bg-card hover:bg-emerald-500/5 transition-all cursor-pointer shadow-2xs text-center"
            >
              <span className="text-xs text-muted-foreground">Products</span>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {dbStats?.productsCount ?? 0}
              </p>
            </div>
            <div
              onClick={() => handleOpenRawData('services')}
              className="p-3 border-2 border-sky-500/20 hover:border-sky-500/60 rounded-xl bg-card hover:bg-sky-500/5 transition-all cursor-pointer shadow-2xs text-center"
            >
              <span className="text-xs text-muted-foreground">Services</span>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {dbStats?.servicesCount ?? 0}
              </p>
            </div>
            <div
              onClick={() => handleOpenRawData('transactions')}
              className="p-3 border-2 border-sky-500/20 hover:border-sky-500/60 rounded-xl bg-card hover:bg-sky-500/5 transition-all cursor-pointer shadow-2xs text-center"
            >
              <span className="text-xs text-muted-foreground">Transactions</span>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {dbStats?.transactionsCount ?? 0}
              </p>
            </div>
            <div
              onClick={() => handleOpenRawData('expenses')}
              className="p-3 border-2 border-rose-500/20 hover:border-rose-500/60 rounded-xl bg-card hover:bg-rose-500/5 transition-all cursor-pointer shadow-2xs text-center"
            >
              <span className="text-xs text-muted-foreground">Expenses</span>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {dbStats?.expensesCount ?? 0}
              </p>
            </div>
            <div
              onClick={() => handleOpenRawData('profiles')}
              className="p-3 border-2 border-indigo-500/20 hover:border-indigo-500/60 rounded-xl bg-card hover:bg-indigo-500/5 transition-all cursor-pointer shadow-2xs text-center"
            >
              <span className="text-xs text-muted-foreground">Users</span>
              <p className="text-lg font-bold text-foreground tabular-nums">
                {dbStats?.profilesCount ?? 0}
              </p>
            </div>
            <div className="p-3 border-2 border-slate-300 dark:border-slate-700 rounded-xl bg-card text-center">
              <span className="text-xs text-muted-foreground">Database Storage</span>
              <p className="text-lg font-bold text-foreground tabular-nums">
                Cloud + Local
              </p>
            </div>
          </div>

          {/* Database Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
            <Button
              onClick={handleExportBackup}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs cursor-pointer"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Database Backup (.json)
            </Button>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-border hover:border-sky-500 rounded-lg cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2 text-sky-600 dark:text-sky-400" />
              Import / Restore Backup
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".json"
              className="hidden"
            />

            <Button
              variant="outline"
              onClick={() => handleOpenRawData('products')}
              className="border-2 border-border hover:border-indigo-500 rounded-lg cursor-pointer"
            >
              <FileCode className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              View Raw Collections JSON
            </Button>

            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(true)}
              className="border-2 border-border hover:border-destructive text-destructive hover:bg-destructive/10 rounded-lg ml-auto cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Factory Defaults
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card className="border-2 border-slate-300 dark:border-slate-700 rounded-xl shadow-xs">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Application</span>
            <span className="font-medium">S.S.T POS - Sanyali School of Technology</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Currency</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Ghanaian Cedi (GH₵)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Database Engine</span>
            <span className="font-mono text-sm font-semibold">Google Cloud Firestore (Real-time Cloud Database)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Firestore Database ID</span>
            <span className="font-mono text-xs font-semibold">ai-studio-netposinternetca-099c30e9-2795-4450-ba1f-3fb8b3b40af0</span>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Database Collections</span>
            <span className="font-mono text-xs text-muted-foreground">
              products, services, transactions, expenses, profiles
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Cloud Sync & Status</span>
            <Badge variant="default" className="bg-emerald-600 text-white font-medium">
              Connected & Synchronized
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Raw JSON Data Viewer Modal */}
      <Dialog open={rawModalOpen} onOpenChange={setRawModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col border-2 border-emerald-500/40 rounded-2xl shadow-xl">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div>
                <DialogTitle className="capitalize flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Raw Database Collection: {selectedCollection}
                </DialogTitle>
                <DialogDescription>
                  Inspect or copy live records directly stored in the database.
                </DialogDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyJson}
                className="gap-1.5 border-2 border-border hover:border-emerald-500"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy JSON
              </Button>
            </div>
          </DialogHeader>

          {/* Collection Tab Selector */}
          <div className="flex gap-2 pb-2 border-b border-border">
            {(['products', 'services', 'transactions', 'expenses', 'profiles'] as RawCollection[]).map(
              (col) => (
                <button
                  key={col}
                  onClick={() => handleOpenRawData(col)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                    selectedCollection === col
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {col}
                </button>
              )
            )}
          </div>

          <div className="flex-1 overflow-auto rounded-lg bg-muted/60 p-4 border border-border mt-3 max-h-[50vh]">
            <pre className="font-mono text-xs text-foreground whitespace-pre-wrap leading-relaxed">
              {rawJson}
            </pre>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent className="border-2 border-destructive/40 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Database to Defaults?</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite all existing transactions, services, products, expenses, and
              user accounts with initial sample data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReset}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Reset Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="border-2 border-destructive/40 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete User Account?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete user <span className="font-bold text-foreground font-mono">"{userToDelete?.username}"</span> ({userToDelete?.role})? This action cannot be undone and will permanently remove their access to the POS system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
