import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { createTransaction, getAllProducts } from '@/db/api';
import type { CartItem, PaymentMethod, Product, TransactionWithItems } from '@/types';
import InvoiceModal from '@/components/InvoiceModal';
import BarcodeScanControl from '@/components/BarcodeScanControl';
import { useBarcodeScanner, useHardwareState } from '@/hooks/useBarcodeScanner';
import {
  addProductByBarcodeToCart,
  parseCardTrackData,
  sendCardTerminalRequest,
  playHardwareBeep,
} from '@/lib/hardware';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Trash2,
  ShoppingCart,
  CreditCard,
  Loader2,
  User,
  Phone,
  Printer,
  CheckCircle2,
  Terminal,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cardSwipeBuffer, setCardSwipeBuffer] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [cardAuthCode, setCardAuthCode] = useState('');
  const [isCardTerminalBusy, setIsCardTerminalBusy] = useState(false);
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<TransactionWithItems | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { config: hardwareConfig } = useHardwareState();

  const loadCart = useCallback(() => {
    try {
      const storedCart = JSON.parse(sessionStorage.getItem('cart') || '[]');
      setCart(storedCart);
    } catch {
      setCart([]);
    }
  }, []);

  useEffect(() => {
    loadCart();
    getAllProducts().then(setProducts).catch(console.warn);

    const refreshProducts = () => {
      getAllProducts().then(setProducts).catch(console.warn);
    };

    window.addEventListener('cart-updated', loadCart);
    window.addEventListener('products-updated', refreshProducts);
    return () => {
      window.removeEventListener('cart-updated', loadCart);
      window.removeEventListener('products-updated', refreshProducts);
    };
  }, [loadCart]);

  const handleBarcodeScan = useCallback(
    (code: string) => {
      const res = addProductByBarcodeToCart(products, code);
      if (res.ok) {
        loadCart();
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    },
    [products, loadCart]
  );

  useBarcodeScanner({
    enabled: !invoiceOpen,
    onScan: handleBarcodeScan,
  });

  const removeFromCart = (index: number) => {
    const updatedCart = cart.filter((_, i) => i !== index);
    setCart(updatedCart);
    sessionStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cart-updated'));
    toast.success('Item removed from cart');
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    const item = cart[index];
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    // Check stock for products
    if (item.type === 'product' && item.stock && newQuantity > item.stock) {
      toast.error(`Only ${item.stock} units available`);
      return;
    }

    const updatedCart = [...cart];
    updatedCart[index] = { ...item, quantity: newQuantity };
    setCart(updatedCart);
    sessionStorage.setItem('cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to checkout');
      return;
    }

    const cleanName = customerName.trim() || undefined;
    const cleanPhone = customerPhone.trim() || undefined;

    setIsProcessing(true);

    try {
      const transactionType = cart.every((item) => item.type === 'service')
        ? 'service'
        : cart.every((item) => item.type === 'product')
          ? 'product'
          : 'service';

      const items = cart.map((item) => ({
        item_type: item.type,
        item_id: item.id,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
      }));

      const newTxn = await createTransaction(
        user.id,
        transactionType,
        calculateTotal(),
        paymentMethod,
        items,
        notes?.trim() || undefined,
        cleanName,
        cleanPhone,
        {
          terminal_id: hardwareConfig.terminalId,
          card_last4: paymentMethod === 'card' ? cardLast4 || null : null,
          card_brand: paymentMethod === 'card' ? cardBrand || null : null,
          auth_code: paymentMethod === 'card' ? cardAuthCode || null : null,
        }
      );

      sessionStorage.removeItem('cart');
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCardSwipeBuffer('');
      setCardLast4('');
      setCardBrand('');
      setCardAuthCode('');
      setNotes('');
      window.dispatchEvent(new Event('cart-updated'));
      window.dispatchEvent(new Event('transactions-updated'));
      window.dispatchEvent(new Event('storage'));

      setCompletedTransaction(newTxn);
      setInvoiceOpen(true);
      toast.success('Transaction completed! Invoice is ready to print.');
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to process transaction');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!hardwareConfig.terminalShortcutsEnabled) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        scanInputRef.current?.focus();
      } else if (e.key === 'F9' && cart.length > 0 && !isProcessing) {
        e.preventDefault();
        void handleCheckout();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [hardwareConfig.terminalShortcutsEnabled, cart.length, isProcessing]);

  const handleCardSwipeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const parsed = parseCardTrackData(cardSwipeBuffer);
    if (parsed) {
      setCardLast4(parsed.last4);
      setCardBrand(parsed.brand);
      if (parsed.holderName && !customerName.trim()) {
        setCustomerName(parsed.holderName);
      }
      playHardwareBeep('success');
      toast.success(`Card read: ${parsed.brand} ending in ${parsed.last4}`);
    } else {
      playHardwareBeep('error');
      toast.error('Unrecognized card track data. Enter last 4 digits manually if using standalone terminal.');
    }
    setCardSwipeBuffer('');
  };

  const handleTerminalCharge = async () => {
    setIsCardTerminalBusy(true);
    try {
      const ref = `SST-${Date.now()}`;
      const res = await sendCardTerminalRequest(calculateTotal(), ref, hardwareConfig);
      if (res.approved) {
        if (res.last4) setCardLast4(res.last4);
        if (res.brand) setCardBrand(res.brand);
        if (res.authCode) setCardAuthCode(res.authCode);
        playHardwareBeep('success');
        toast.success('Card payment approved by EFTPOS terminal');
      } else {
        playHardwareBeep('error');
        toast.error(res.error || 'Terminal did not approve charge');
      }
    } finally {
      setIsCardTerminalBusy(false);
    }
  };

  const clearCart = () => {
    setCart([]);
    sessionStorage.removeItem('cart');
    window.dispatchEvent(new Event('cart-updated'));
    toast.success('Cart cleared');
  };

  if (cart.length === 0) {
    return (
      <div className="space-y-6">
        <div className="glass-surface glass-header-bar glass-section flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
            <p className="text-muted-foreground">
              Terminal: <span className="font-mono font-semibold text-foreground">{hardwareConfig.terminalId}</span> · Scan a product barcode or add items to begin
            </p>
          </div>
        </div>

        <div className="glass-surface glass-section rounded-2xl border border-slate-200/80 dark:border-white/15 p-3">
          <BarcodeScanControl
            inputRef={scanInputRef}
            onScan={handleBarcodeScan}
            placeholder="Scan product barcode to start checkout immediately..."
            buttonLabel="Scan Item"
          />
        </div>

        {completedTransaction ? (
          <Card className="border-2 border-emerald-500/40 rounded-xl shadow-xs">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-4">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <h3 className="text-xl font-bold mb-1">
                Transaction Completed ({completedTransaction.transaction_number})
              </h3>
              <p className="text-muted-foreground mb-1">
                Customer:{' '}
                <span className="font-semibold text-foreground">
                  {completedTransaction.customer_name || 'Walk-in Customer'}
                </span>
                {completedTransaction.customer_phone
                  ? ` (${completedTransaction.customer_phone})`
                  : ''}
              </p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-6 tabular-nums">
                Total Paid: GH₵{completedTransaction.total_amount.toFixed(2)}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  onClick={() => setInvoiceOpen(true)}
                  className="bg-sky-600 hover:bg-sky-700 text-white cursor-pointer"
                >
                  <Printer className="mr-2 h-4 w-4" />
                  View / Print Invoice
                </Button>
                <Button variant="outline" onClick={() => navigate('/services')} className="cursor-pointer">
                  New Sale (Services)
                </Button>
                <Button variant="outline" onClick={() => navigate('/transactions')} className="cursor-pointer">
                  View Transactions
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ShoppingCart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Your cart is empty</h3>
              <p className="text-muted-foreground mb-4">Scan a barcode above, or select services or products</p>
              <div className="flex gap-2">
                <Button onClick={() => navigate('/services')}>Browse Services</Button>
                <Button variant="outline" onClick={() => navigate('/products')}>
                  Browse Products
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <InvoiceModal
          transaction={completedTransaction}
          open={invoiceOpen}
          onOpenChange={setInvoiceOpen}
          footerActions={
            <Button
              variant="outline"
              onClick={() => {
                setInvoiceOpen(false);
                navigate('/transactions');
              }}
              className="cursor-pointer"
            >
              All Transactions
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-surface glass-header-bar glass-section flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Checkout</h1>
          <p className="text-muted-foreground">
            Terminal: <span className="font-mono font-semibold text-foreground">{hardwareConfig.terminalId}</span> · Scan barcodes or complete payment
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" onClick={clearCart} className="rounded-xl cursor-pointer">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cart
          </Button>
        </div>
      </div>

      <div className="glass-surface glass-section rounded-2xl border border-slate-200/80 dark:border-white/15 p-3">
        <BarcodeScanControl
          inputRef={scanInputRef}
          onScan={handleBarcodeScan}
          placeholder="Scan barcode to add or increment product in cart (F2)..."
          buttonLabel="Scan Item"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-2 border-sky-500/35 dark:border-sky-400/35 rounded-xl shadow-xs">
            <CardHeader>
              <CardTitle>Cart Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cart.map((item, index) => (
                <div
                  key={index}
                  className="glass-surface glass-animated flex items-center gap-4 p-4 border-2 border-sky-500/25 dark:border-sky-400/25 hover:border-sky-500/50 rounded-xl shadow-2xs"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-foreground">{item.name}</h4>
                      <Badge
                        variant="outline"
                        className="border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/5"
                      >
                        {item.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      GH₵{item.price.toFixed(2)} {item.unit && `/ ${item.unit}`}
                    </p>
                    {item.type === 'product' && item.stock !== undefined && (
                      <p className="text-xs text-muted-foreground mt-0.5">Stock: {item.stock}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="1"
                      max={item.stock}
                      value={item.quantity}
                      onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                      className="w-20 text-center border-2 border-sky-500/35 focus-visible:ring-sky-500 font-semibold rounded-lg tabular-nums"
                    />
                    <span className="text-sm font-semibold w-24 text-right tabular-nums text-foreground">
                      GH₵{(item.price * item.quantity).toFixed(2)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(index)}
                      className="hover:bg-destructive/10 hover:text-destructive rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="glass-stagger-2 border-2 border-emerald-500/40 dark:border-emerald-400/40 rounded-xl shadow-xs">
            <CardHeader>
              <CardTitle>Customer &amp; Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  Customer Name (Optional)
                </Label>
                <Input
                  id="customer-name"
                  type="text"
                  placeholder="Enter customer full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  maxLength={120}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  Phone Number (Optional)
                </Label>
                <Input
                  id="customer-phone"
                  type="tel"
                  placeholder="e.g. 024 123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  maxLength={40}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                >
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card / EFTPOS Terminal</SelectItem>
                    <SelectItem value="mobile">Mobile Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {paymentMethod === 'card' && hardwareConfig.cardReaderEnabled && (
                <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Terminal className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                      Card Reader / Payment Terminal
                    </span>
                    {hardwareConfig.cardTerminalMode === 'network-terminal' && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isCardTerminalBusy}
                        onClick={handleTerminalCharge}
                        className="h-7 px-2.5 text-xs cursor-pointer"
                      >
                        {isCardTerminalBusy ? 'Waiting...' : 'Send to Terminal'}
                      </Button>
                    )}
                  </div>

                  {hardwareConfig.cardTerminalMode === 'usb-msr' && (
                    <div className="space-y-1">
                      <Label htmlFor="card-swipe-input" className="text-xs">
                        USB Swipe / Tap Reader (Focus &amp; Swipe)
                      </Label>
                      <Input
                        id="card-swipe-input"
                        type="password"
                        data-barcode-ignore="true"
                        value={cardSwipeBuffer}
                        onChange={(e) => setCardSwipeBuffer(e.target.value)}
                        onKeyDown={handleCardSwipeKeyDown}
                        placeholder="Swipe card on USB reader..."
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="card-last4" className="text-xs">
                        Card Last 4
                      </Label>
                      <Input
                        id="card-last4"
                        maxLength={4}
                        value={cardLast4}
                        onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="1234"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="card-auth" className="text-xs">
                        Auth / Ref Code
                      </Label>
                      <Input
                        id="card-auth"
                        maxLength={24}
                        value={cardAuthCode}
                        onChange={(e) => setCardAuthCode(e.target.value)}
                        placeholder="AUTH123"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this transaction..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span className="tabular-nums font-medium">{cart.length}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">GH₵{calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full cursor-pointer"
                size="lg"
                onClick={handleCheckout}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Complete Transaction &amp; Invoice
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <InvoiceModal
        transaction={completedTransaction}
        open={invoiceOpen}
        onOpenChange={setInvoiceOpen}
      />
    </div>
  );
}
