import { useEffect, useState } from 'react';
import { getAllProducts } from '@/db/api';
import type { Product } from '@/types';
import {
  saveHardwareConfig,
  connectSerialPrinter,
  disconnectSerialPrinter,
  connectUsbPrinter,
  disconnectUsbPrinter,
  connectSerialScanner,
  disconnectSerialScanner,
  openCashDrawer,
  printThermalReceipt,
  createSampleReceiptTransaction,
  parseCardTrackData,
  findProductByBarcode,
  clearHardwareLogs,
  appendHardwareLog,
  playHardwareBeep,
  type ReceiptPrinterMode,
  type CardTerminalMode,
} from '@/lib/hardware';
import { useHardwareState } from '@/hooks/useBarcodeScanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Monitor,
  Printer,
  ScanBarcode,
  CreditCard,
  Inbox,
  Usb,
  Cable,
  Maximize2,
  Minimize2,
  Trash2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function HardwarePage() {
  const { config, runtime, logs } = useHardwareState();
  const [products, setProducts] = useState<Product[]>([]);
  const [testBarcode, setTestBarcode] = useState('');
  const [testScanResult, setTestScanResult] = useState<string | null>(null);
  const [testSwipeInput, setTestSwipeInput] = useState('');
  const [testSwipeResult, setTestSwipeResult] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    getAllProducts().then(setProducts).catch(console.warn);
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        appendHardwareLog('terminal', 'Fullscreen Terminal Enabled', config.terminalId);
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      toast.error('Fullscreen mode was blocked by the browser.');
      console.warn(err);
    }
  };

  const handlePairUsbPrinter = async () => {
    const res = await connectUsbPrinter();
    if (res.ok) {
      toast.success(`Paired USB printer: ${res.label}`);
    } else {
      toast.error(res.error || 'Could not pair USB printer');
    }
  };

  const handlePairSerialPrinter = async () => {
    const res = await connectSerialPrinter(9600);
    if (res.ok) {
      toast.success(`Paired Serial printer: ${res.label}`);
    } else {
      toast.error(res.error || 'Could not pair Serial printer');
    }
  };

  const handlePairSerialScanner = async () => {
    const res = await connectSerialScanner((code) => {
      const matched = findProductByBarcode(products, code);
      playHardwareBeep(matched ? 'success' : 'error');
      setTestScanResult(
        matched
          ? `Matched "${matched.name}" (GH₵${matched.price.toFixed(2)})`
          : `Read code "${code}" (no matching product SKU)`
      );
      toast.info(`Serial scan: ${code}`);
    });
    if (res.ok) {
      toast.success(`Paired Serial scanner: ${res.label}`);
    } else {
      toast.error(res.error || 'Could not pair Serial scanner');
    }
  };

  const handleTestPrint = async () => {
    const sample = createSampleReceiptTransaction(config);
    const res = await printThermalReceipt(sample);
    toast.success(res.message);
  };

  const handleTestDrawer = async () => {
    const res = await openCashDrawer('Hardware console test');
    if (res.sentToHardware) {
      toast.success(res.message);
    } else {
      toast.info(res.message);
    }
  };

  const handleTestBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = testBarcode.trim();
    if (!code) return;
    const matched = findProductByBarcode(products, code);
    if (matched) {
      playHardwareBeep('success');
      setTestScanResult(
        `Matched: ${matched.name} · GH₵${matched.price.toFixed(2)} · Stock: ${matched.stock_quantity}`
      );
      appendHardwareLog('scanner', 'Scanner Test Matched', `${code} -> ${matched.name}`);
    } else {
      playHardwareBeep('error');
      setTestScanResult(`No product found for barcode "${code}". Assign it on the Products page.`);
      appendHardwareLog('scanner', 'Scanner Test Unmatched', code);
    }
    setTestBarcode('');
  };

  const handleTestCardSwipe = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCardTrackData(testSwipeInput);
    if (parsed) {
      playHardwareBeep('success');
      const summary = `${parsed.brand} ending in ${parsed.last4}${parsed.holderName ? ` · ${parsed.holderName}` : ''}`;
      setTestSwipeResult(summary);
      appendHardwareLog('card', 'Card Reader Test Read', summary);
    } else {
      playHardwareBeep('error');
      setTestSwipeResult('Unrecognized card track format. Swipe card via USB reader or enter Track 1/2.');
    }
    setTestSwipeInput('');
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="glass-surface glass-header-bar glass-section flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">POS Hardware &amp; Terminals</h1>
          <p className="text-muted-foreground">
            Configure terminals, barcode scanners, thermal receipt printers, cash drawers, and card readers
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={toggleFullscreen}
            className="rounded-xl cursor-pointer whitespace-nowrap shrink-0"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4 mr-2" />
            ) : (
              <Maximize2 className="h-4 w-4 mr-2" />
            )}
            {isFullscreen ? 'Exit Fullscreen' : 'Terminal Fullscreen'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={handleTestDrawer}
            className="rounded-xl border-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Inbox className="h-4 w-4 mr-2" />
            Open Cash Drawer
          </Button>

          <Button
            type="button"
            onClick={handleTestPrint}
            className="rounded-xl cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="h-4 w-4 mr-2" />
            Test Print Receipt
          </Button>
        </div>
      </div>

      {/* Hardware Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* 1. Terminal Station & Shortcuts */}
        <Card className="border-2 border-sky-500/30 dark:border-sky-400/25 rounded-xl shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              POS Terminal Station
            </CardTitle>
            <CardDescription>
              Identify this register on receipts and enable countertop keyboard shortcuts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="terminal-id">Terminal ID</Label>
                <Input
                  id="terminal-id"
                  value={config.terminalId}
                  onChange={(e) => saveHardwareConfig({ terminalId: e.target.value })}
                  placeholder="POS-TERM-01"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="terminal-name">Station Name</Label>
                <Input
                  id="terminal-name"
                  value={config.terminalName}
                  onChange={(e) => saveHardwareConfig({ terminalName: e.target.value })}
                  placeholder="Front Counter Register"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 py-2 border-t border-border/60">
              <div>
                <p className="text-sm font-medium text-foreground">Terminal Keyboard Shortcuts</p>
                <p className="text-xs text-muted-foreground">
                  F2 Focus Scanner · F4 Checkout · F8 Open Drawer · F9 Complete Sale
                </p>
              </div>
              <Switch
                checked={config.terminalShortcutsEnabled}
                onCheckedChange={(checked) =>
                  saveHardwareConfig({ terminalShortcutsEnabled: checked })
                }
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
                <span className="font-mono font-bold text-foreground">F2</span>
                <p className="text-muted-foreground mt-0.5">Focus Scan</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
                <span className="font-mono font-bold text-foreground">F4</span>
                <p className="text-muted-foreground mt-0.5">Checkout</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
                <span className="font-mono font-bold text-foreground">F8</span>
                <p className="text-muted-foreground mt-0.5">Kick Drawer</p>
              </div>
              <div className="rounded-lg border border-border/70 bg-muted/40 px-2.5 py-2">
                <span className="font-mono font-bold text-foreground">F9</span>
                <p className="text-muted-foreground mt-0.5">Pay &amp; Finish</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Thermal Receipt Printer */}
        <Card className="border-2 border-indigo-500/30 dark:border-indigo-400/25 rounded-xl shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              Receipt Printer (Thermal &amp; ESC/POS)
            </CardTitle>
            <CardDescription>
              Print 58mm or 80mm thermal receipts via OS print driver, WebUSB, or Web Serial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="printer-mode">Printer Output Mode</Label>
                <Select
                  value={config.receiptPrinterMode}
                  onValueChange={(value) =>
                    saveHardwareConfig({ receiptPrinterMode: value as ReceiptPrinterMode })
                  }
                >
                  <SelectTrigger id="printer-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="browser-80mm">System Driver · 80mm Thermal</SelectItem>
                    <SelectItem value="browser-58mm">System Driver · 58mm Thermal</SelectItem>
                    <SelectItem value="escpos-usb">Direct ESC/POS · WebUSB</SelectItem>
                    <SelectItem value="escpos-serial">Direct ESC/POS · Web Serial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paper-width">Paper Width</Label>
                <Select
                  value={config.receiptPaperWidth}
                  onValueChange={(value) =>
                    saveHardwareConfig({ receiptPaperWidth: value as '80mm' | '58mm' })
                  }
                >
                  <SelectTrigger id="paper-width">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">80mm (48 columns)</SelectItem>
                    <SelectItem value="58mm">58mm (32 columns)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receipt-header">Receipt Header Subtitle</Label>
              <Input
                id="receipt-header"
                value={config.receiptHeaderNote}
                onChange={(e) => saveHardwareConfig({ receiptHeaderNote: e.target.value })}
                placeholder="Sanyali School of Technology · Computer Lab & Cafe"
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-2 border-t border-border/60">
              <div>
                <p className="text-sm font-medium text-foreground">Auto-Print Receipt After Sale</p>
                <p className="text-xs text-muted-foreground">
                  Automatically sends receipt when checkout completes
                </p>
              </div>
              <Switch
                checked={config.autoPrintReceipt}
                onCheckedChange={(checked) => saveHardwareConfig({ autoPrintReceipt: checked })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              {runtime.usbPrinterConnected ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectUsbPrinter()}
                  className="rounded-lg border-emerald-500/40 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Disconnect USB ({runtime.usbPrinterLabel})
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!runtime.usbSupported}
                  onClick={handlePairUsbPrinter}
                  className="rounded-lg cursor-pointer"
                >
                  <Usb className="h-3.5 w-3.5 mr-1.5" />
                  Pair USB Printer
                </Button>
              )}

              {runtime.serialPrinterConnected ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectSerialPrinter()}
                  className="rounded-lg border-emerald-500/40 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Disconnect Serial ({runtime.serialPrinterLabel})
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!runtime.serialSupported}
                  onClick={handlePairSerialPrinter}
                  className="rounded-lg cursor-pointer"
                >
                  <Cable className="h-3.5 w-3.5 mr-1.5" />
                  Pair Serial Printer
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                onClick={handleTestPrint}
                className="rounded-lg ml-auto cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5 mr-1.5" />
                Test Print
              </Button>
            </div>

            {!runtime.usbSupported && !runtime.serialSupported && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                Use Chrome or Edge on desktop for direct WebUSB/Serial; OS System Driver print works on all browsers.
              </p>
            )}
          </CardContent>
        </Card>

        {/* 3. Barcode Scanner */}
        <Card className="border-2 border-emerald-500/30 dark:border-emerald-400/25 rounded-xl shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanBarcode className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              Barcode Scanner (USB / Bluetooth / Serial)
            </CardTitle>
            <CardDescription>
              Plug-and-play HID keyboard-wedge detection plus optional RS-232 Serial &amp; Camera scanning
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Global HID Scanner Auto-Detect</p>
                <p className="text-xs text-muted-foreground">
                  Scan anywhere on Products or Checkout to add items to cart
                </p>
              </div>
              <Switch
                checked={config.barcodeScannerEnabled}
                onCheckedChange={(checked) =>
                  saveHardwareConfig({ barcodeScannerEnabled: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 py-2 border-t border-border/60">
              <div>
                <p className="text-sm font-medium text-foreground">Scanner Audio Confirmation Beep</p>
                <p className="text-xs text-muted-foreground">
                  Distinct chime on valid scan vs low tone on unknown barcode
                </p>
              </div>
              <Switch
                checked={config.barcodeBeep}
                onCheckedChange={(checked) => saveHardwareConfig({ barcodeBeep: checked })}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {runtime.serialScannerConnected ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectSerialScanner()}
                  className="rounded-lg border-emerald-500/40 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Disconnect Serial Scanner ({runtime.serialScannerLabel})
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!runtime.serialSupported}
                  onClick={handlePairSerialScanner}
                  className="rounded-lg cursor-pointer"
                >
                  <Cable className="h-3.5 w-3.5 mr-1.5" />
                  Pair RS-232 Serial Scanner
                </Button>
              )}
            </div>

            <form onSubmit={handleTestBarcodeSubmit} className="space-y-2 pt-2 border-t border-border/60">
              <Label htmlFor="test-barcode">Test Barcode Reader (Try 6030001000012)</Label>
              <div className="flex gap-2">
                <Input
                  id="test-barcode"
                  data-barcode-ignore="true"
                  value={testBarcode}
                  onChange={(e) => setTestBarcode(e.target.value)}
                  placeholder="Scan barcode here..."
                  className="font-mono"
                />
                <Button type="submit" variant="secondary" className="cursor-pointer shrink-0">
                  Verify
                </Button>
              </div>
              {testScanResult && (
                <p className="text-xs font-medium text-foreground bg-muted/60 border border-border/70 rounded-lg px-3 py-2">
                  {testScanResult}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* 4. Cash Drawer & Card Reader / Payment Terminal */}
        <Card className="border-2 border-amber-500/30 dark:border-amber-400/25 rounded-xl shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Cash Drawer &amp; Card Reader
            </CardTitle>
            <CardDescription>
              RJ11 cash drawer pulse control and USB/Network card reader integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">Enable Cash Drawer Integration</p>
                <p className="text-xs text-muted-foreground">
                  Sends ESC/POS drawer kick pulse via paired printer
                </p>
              </div>
              <Switch
                checked={config.cashDrawerEnabled}
                onCheckedChange={(checked) => saveHardwareConfig({ cashDrawerEnabled: checked })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="drawer-pin">RJ11 Kick Pin</Label>
                <Select
                  value={String(config.cashDrawerPin)}
                  onValueChange={(v) =>
                    saveHardwareConfig({ cashDrawerPin: Number(v) === 1 ? 1 : 0 })
                  }
                >
                  <SelectTrigger id="drawer-pin">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Pin 2 (Standard Epson/Star)</SelectItem>
                    <SelectItem value="1">Pin 5 (Secondary Drawer)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                <span className="text-xs font-medium">Auto-Open on Cash Sale</span>
                <Switch
                  checked={config.autoOpenDrawerOnCash}
                  onCheckedChange={(checked) =>
                    saveHardwareConfig({ autoOpenDrawerOnCash: checked })
                  }
                />
              </div>
            </div>

            <div className="pt-2 border-t border-border/60 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="card-terminal-mode">Card Reader / Terminal Mode</Label>
                <Select
                  value={config.cardTerminalMode}
                  onValueChange={(v) =>
                    saveHardwareConfig({ cardTerminalMode: v as CardTerminalMode })
                  }
                >
                  <SelectTrigger id="card-terminal-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="usb-msr">USB Swipe / Tap Reader (HID Track Parser)</SelectItem>
                    <SelectItem value="network-terminal">Local Network EFTPOS Terminal (HTTP)</SelectItem>
                    <SelectItem value="standalone">Standalone Card Machine + Auth Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.cardTerminalMode === 'network-terminal' && (
                <div className="space-y-2">
                  <Label htmlFor="card-endpoint">EFTPOS Terminal Endpoint URL</Label>
                  <Input
                    id="card-endpoint"
                    value={config.cardTerminalEndpoint}
                    onChange={(e) => saveHardwareConfig({ cardTerminalEndpoint: e.target.value })}
                    placeholder="http://localhost:8088/api/charge"
                    className="font-mono text-xs"
                  />
                </div>
              )}

              <form onSubmit={handleTestCardSwipe} className="space-y-2">
                <Label htmlFor="test-card-swipe">Test Card Reader Input (Masked to Last 4)</Label>
                <div className="flex gap-2">
                  <Input
                    id="test-card-swipe"
                    type="password"
                    data-barcode-ignore="true"
                    value={testSwipeInput}
                    onChange={(e) => setTestSwipeInput(e.target.value)}
                    placeholder="Focus here and swipe/tap card..."
                    className="font-mono"
                  />
                  <Button type="submit" variant="secondary" className="cursor-pointer shrink-0">
                    Parse
                  </Button>
                </div>
                {testSwipeResult && (
                  <p className="text-xs font-medium text-foreground bg-muted/60 border border-border/70 rounded-lg px-3 py-2">
                    {testSwipeResult}
                  </p>
                )}
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hardware Activity Log */}
      <Card className="border-2 border-slate-300 dark:border-slate-700 rounded-xl shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Hardware Activity Log</CardTitle>
            <CardDescription>
              Real-time record of barcode scans, thermal receipt prints, card terminal reads, and drawer kicks
            </CardDescription>
          </div>
          {logs.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                clearHardwareLogs();
                toast.success('Hardware log cleared');
              }}
              className="rounded-lg cursor-pointer shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear Log
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No hardware events recorded on this terminal yet.
            </p>
          ) : (
            <div className="divide-y divide-border/70 max-h-64 overflow-y-auto">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs uppercase text-muted-foreground w-16 shrink-0">
                      {entry.device}
                    </span>
                    <span className="font-medium text-foreground truncate">{entry.action}</span>
                    <span className="text-xs text-muted-foreground truncate">· {entry.detail}</span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0">
                    {format(new Date(entry.timestamp), 'HH:mm:ss')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
