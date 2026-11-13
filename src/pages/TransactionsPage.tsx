import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getTransactions, deleteTransaction } from '@/db/api';
import type { TransactionWithItems } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Eye, Receipt, Trash2, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import InvoiceModal from '@/components/InvoiceModal';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithItems | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [invoiceTransaction, setInvoiceTransaction] = useState<TransactionWithItems | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [txnToDelete, setTxnToDelete] = useState<TransactionWithItems | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadTransactions();

    const handleUpdate = () => {
      loadTransactions();
    };

    window.addEventListener('transactions-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('transactions-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await getTransactions(100);
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = (transaction: TransactionWithItems) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
  };

  const openInvoice = (transaction: TransactionWithItems) => {
    setInvoiceTransaction(transaction);
    setInvoiceOpen(true);
  };

  const confirmDelete = (transaction: TransactionWithItems) => {
    setTxnToDelete(transaction);
    setDeleteConfirmOpen(true);
  };

  const handleExecuteDeleteTxn = async () => {
    if (!txnToDelete) return;
    const targetId = txnToDelete.id;
    const targetNum = txnToDelete.transaction_number;

    try {
      const remaining = transactions.filter((t) => t.id !== targetId);
      setTransactions(remaining);
      setDeleteConfirmOpen(false);
      setDetailsOpen(false);
      setTxnToDelete(null);

      await deleteTransaction(targetId);
      toast.success(`Transaction "${targetNum}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
      loadTransactions();
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
      cash: 'default',
      card: 'secondary',
      mobile: 'outline',
    };
    return <Badge variant={variants[method] || 'default'}>{method.toUpperCase()}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    return status === 'completed' ? (
      <Badge variant="default" className="bg-success text-success-foreground">
        Completed
      </Badge>
    ) : (
      <Badge variant="destructive">Refunded</Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">View transaction history</p>
        </div>
        <Card className="border-2 border-sky-500/35">
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">Audit sales and payment records</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-2 border-sky-500/40 text-foreground font-mono">
            {transactions.length} Total Records
          </Badge>
          {isAdmin && (
            <Badge className="bg-primary/10 text-primary border-2 border-primary/30">
              Admin Controls Enabled
            </Badge>
          )}
        </div>
      </div>

      <Card className="border-2 border-sky-500/35 dark:border-sky-400/35 rounded-xl shadow-xs overflow-hidden">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No transactions found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {transaction.transaction_number}
                      </TableCell>
                      <TableCell>
                        {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {transaction.customer_name || transaction.customer_phone ? (
                          <div>
                            <p className="font-medium text-sm leading-tight">
                              {transaction.customer_name || 'Walk-in Customer'}
                            </p>
                            {transaction.customer_phone && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {transaction.customer_phone}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Walk-in</span>
                        )}
                      </TableCell>
                      <TableCell>{transaction.staff?.username || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {transaction.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPaymentMethodBadge(transaction.payment_method)}</TableCell>
                      <TableCell className="font-semibold tabular-nums text-foreground">
                        GH₵{transaction.total_amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openInvoice(transaction)}
                            title="View and print invoice"
                            className="h-8 px-2.5 text-xs font-medium border-2 border-border hover:border-emerald-500/60 rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Printer className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            Invoice
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => viewDetails(transaction)}
                            title="View receipt details"
                            className="h-8 px-2.5 text-xs font-medium border-2 border-border hover:border-sky-500/60 rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Eye className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => confirmDelete(transaction)}
                            title={`Delete transaction ${transaction.transaction_number}`}
                            className="h-8 px-2.5 text-xs font-semibold border-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive rounded-lg cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-sky-500/35 dark:border-sky-400/35 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>
              {selectedTransaction?.transaction_number}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Customer Name</p>
                  <p className="font-medium">{selectedTransaction.customer_name || 'Walk-in Customer'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-medium font-mono text-sm">{selectedTransaction.customer_phone || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">
                    {format(new Date(selectedTransaction.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Staff</p>
                  <p className="font-medium">{selectedTransaction.staff?.username || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <div className="mt-1">{getPaymentMethodBadge(selectedTransaction.payment_method)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedTransaction.status)}</div>
                </div>
              </div>

              {selectedTransaction.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm bg-muted/50 p-2.5 rounded-md">{selectedTransaction.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold mb-2">Purchased Items</p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedTransaction.items?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{item.item_type}</Badge>
                        </TableCell>
                        <TableCell className="tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="tabular-nums">GH₵{item.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="tabular-nums font-semibold">GH₵{item.subtotal.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-border">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    onClick={() => {
                      setDetailsOpen(false);
                      openInvoice(selectedTransaction);
                    }}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-medium cursor-pointer"
                  >
                    <Printer className="h-4 w-4 mr-1.5" />
                    Print Invoice
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      confirmDelete(selectedTransaction);
                    }}
                    className="border-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive font-medium cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-1.5" />
                    Delete Record
                  </Button>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 ml-auto">
                  <span className="text-lg font-semibold">Total Paid</span>
                  <span className="text-2xl font-bold tabular-nums text-foreground">
                    GH₵{selectedTransaction.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <InvoiceModal
        transaction={invoiceTransaction}
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
      />

      {/* Delete Transaction Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="border-2 border-destructive/40 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Transaction Record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete transaction{' '}
              <span className="font-bold text-foreground font-mono">
                "{txnToDelete?.transaction_number}"
              </span>{' '}
              worth{' '}
              <span className="font-semibold text-foreground">
                GH₵{txnToDelete?.total_amount.toFixed(2)}
              </span>
              ? This action cannot be undone and will permanently remove this transaction from the records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTxnToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExecuteDeleteTxn}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold cursor-pointer"
            >
              Delete Transaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
