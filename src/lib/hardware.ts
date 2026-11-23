import { format } from 'date-fns';
import type { CartItem, Product, TransactionWithItems } from '@/types';

export type ReceiptPrinterMode = 'browser-80mm' | 'browser-58mm' | 'escpos-serial' | 'escpos-usb';
export type CardTerminalMode = 'usb-msr' | 'network-terminal' | 'standalone';

export interface HardwareConfig {
  terminalId: string;
  terminalName: string;
  terminalShortcutsEnabled: boolean;
  barcodeScannerEnabled: boolean;
  barcodeMaxDelayMs: number;
  barcodeBeep: boolean;
  receiptPrinterMode: ReceiptPrinterMode;
  receiptPaperWidth: '80mm' | '58mm';
  autoPrintReceipt: boolean;
  receiptHeaderNote: string;
  cashDrawerEnabled: boolean;
  cashDrawerPin: 0 | 1;
  autoOpenDrawerOnCash: boolean;
  cardReaderEnabled: boolean;
  cardTerminalMode: CardTerminalMode;
  cardTerminalEndpoint: string;
}

export interface HardwareLogEntry {
  id: string;
  timestamp: string;
  device: 'terminal' | 'scanner' | 'printer' | 'drawer' | 'card';
  action: string;
  detail: string;
}

export interface ParsedCardSwipe {
  last4: string;
  brand: string;
  holderName?: string;
}

export interface HardwareRuntimeState {
  serialPrinterConnected: boolean;
  serialPrinterLabel: string | null;
  usbPrinterConnected: boolean;
  usbPrinterLabel: string | null;
  serialScannerConnected: boolean;
  serialScannerLabel: string | null;
  serialSupported: boolean;
  usbSupported: boolean;
  cameraBarcodeSupported: boolean;
}

const HARDWARE_CONFIG_KEY = 'sst_hardware_config';
const HARDWARE_LOG_KEY = 'sst_hardware_log';

export const DEFAULT_HARDWARE_CONFIG: HardwareConfig = {
  terminalId: 'POS-TERM-01',
  terminalName: 'Front Counter Register',
  terminalShortcutsEnabled: true,
  barcodeScannerEnabled: true,
  barcodeMaxDelayMs: 65,
  barcodeBeep: true,
  receiptPrinterMode: 'browser-80mm',
  receiptPaperWidth: '80mm',
  autoPrintReceipt: false,
  receiptHeaderNote: 'Sanyali School of Technology · Computer Lab & Cafe',
  cashDrawerEnabled: true,
  cashDrawerPin: 0,
  autoOpenDrawerOnCash: true,
  cardReaderEnabled: true,
  cardTerminalMode: 'usb-msr',
  cardTerminalEndpoint: '',
};

// Minimal ambient types for Web Serial & WebUSB
interface WebSerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
  getInfo?: () => { usbVendorId?: number; usbProductId?: number };
}

interface WebUSBDevice {
  opened: boolean;
  productName?: string;
  manufacturerName?: string;
  configuration: {
    configurationValue: number;
    interfaces: Array<{
      interfaceNumber: number;
      alternates: Array<{
        alternateSetting: number;
        endpoints: Array<{
          endpointNumber: number;
          direction: 'in' | 'out';
          type: 'bulk' | 'interrupt' | 'isochronous';
        }>;
      }>;
    }>;
  } | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<{ status: string }>;
}

function getSerialApi(): { requestPort: () => Promise<WebSerialPort> } | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { serial?: { requestPort: () => Promise<WebSerialPort> } }).serial;
}

function getUsbApi(): { requestDevice: (opts: { filters: Array<Record<string, unknown>> }) => Promise<WebUSBDevice> } | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return (navigator as unknown as { usb?: { requestDevice: (opts: { filters: Array<Record<string, unknown>> }) => Promise<WebUSBDevice> } }).usb;
}

let activeSerialPrinter: WebSerialPort | null = null;
let serialPrinterLabel: string | null = null;

let activeUsbPrinter: WebUSBDevice | null = null;
let activeUsbOutEndpoint: number | null = null;
let usbPrinterLabel: string | null = null;

let activeSerialScanner: WebSerialPort | null = null;
let serialScannerReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let serialScannerLabel: string | null = null;
let serialScannerAbort = false;

function emitHardwareChange(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('hardware-state-changed'));
  }
}

export function getHardwareConfig(): HardwareConfig {
  try {
    const raw = localStorage.getItem(HARDWARE_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_HARDWARE_CONFIG };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_HARDWARE_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_HARDWARE_CONFIG };
  }
}

export function saveHardwareConfig(partial: Partial<HardwareConfig>): HardwareConfig {
  const next = { ...getHardwareConfig(), ...partial };
  if (partial.receiptPrinterMode === 'browser-58mm') {
    next.receiptPaperWidth = '58mm';
  } else if (partial.receiptPrinterMode === 'browser-80mm') {
    next.receiptPaperWidth = '80mm';
  }
  try {
    localStorage.setItem(HARDWARE_CONFIG_KEY, JSON.stringify(next));
  } catch {}
  emitHardwareChange();
  return next;
}

export function getHardwareLogs(): HardwareLogEntry[] {
  try {
    const raw = localStorage.getItem(HARDWARE_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendHardwareLog(
  device: HardwareLogEntry['device'],
  action: string,
  detail: string
): void {
  const entry: HardwareLogEntry = {
    id: `hw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    device,
    action,
    detail,
  };
  try {
    const existing = getHardwareLogs();
    const updated = [entry, ...existing].slice(0, 60);
    localStorage.setItem(HARDWARE_LOG_KEY, JSON.stringify(updated));
  } catch {}
  emitHardwareChange();
}

export function clearHardwareLogs(): void {
  try {
    localStorage.removeItem(HARDWARE_LOG_KEY);
  } catch {}
  emitHardwareChange();
}

export function getHardwareRuntimeState(): HardwareRuntimeState {
  const cameraBarcodeSupported =
    typeof window !== 'undefined' && 'BarcodeDetector' in window;
  return {
    serialPrinterConnected: Boolean(activeSerialPrinter),
    serialPrinterLabel,
    usbPrinterConnected: Boolean(activeUsbPrinter && activeUsbPrinter.opened),
    usbPrinterLabel,
    serialScannerConnected: Boolean(activeSerialScanner),
    serialScannerLabel,
    serialSupported: Boolean(getSerialApi()),
    usbSupported: Boolean(getUsbApi()),
    cameraBarcodeSupported,
  };
}

// --- Web Audio POS Beep Feedback ---
let audioCtx: AudioContext | null = null;

export function playHardwareBeep(kind: 'success' | 'error' | 'drawer' = 'success'): void {
  const cfg = getHardwareConfig();
  if (!cfg.barcodeBeep && kind !== 'drawer') return;
  if (typeof window === 'undefined') return;

  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (kind === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1760, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.095);
    } else if (kind === 'drawer') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1320, now + 0.06);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.17);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(280, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.23);
    }
  } catch {
    // Ignore audio context block
  }
}

// --- ESC/POS Command Builders ---
function encodeAsciiLines(lines: string[]): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(lines.join('\n') + '\n');
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function padRow(left: string, right: string, cols: number): string {
  const cleanLeft = left.slice(0, Math.max(1, cols - right.length - 1));
  const spaces = Math.max(1, cols - cleanLeft.length - right.length);
  return `${cleanLeft}${' '.repeat(spaces)}${right}`;
}

export function buildCashDrawerKickBytes(pin: 0 | 1 = 0): Uint8Array {
  // ESC p m t1 t2 (Pin 2 = 0x00, Pin 5 = 0x01; 50ms on, 500ms off)
  return new Uint8Array([0x1b, 0x70, pin, 0x19, 0xfa]);
}

export function buildEscPosReceiptBytes(
  transaction: TransactionWithItems,
  config: HardwareConfig = getHardwareConfig()
): Uint8Array {
  const cols = config.receiptPaperWidth === '58mm' ? 32 : 48;
  const divider = '-'.repeat(cols);

  const INIT = new Uint8Array([0x1b, 0x40]);
  const ALIGN_CENTER = new Uint8Array([0x1b, 0x61, 0x01]);
  const ALIGN_LEFT = new Uint8Array([0x1b, 0x61, 0x00]);
  const BOLD_ON = new Uint8Array([0x1b, 0x45, 0x01]);
  const BOLD_OFF = new Uint8Array([0x1b, 0x45, 0x00]);
  const FEED_CUT = new Uint8Array([0x0a, 0x0a, 0x0a, 0x1d, 0x56, 0x42, 0x00]);

  const d = new Date(transaction.created_at);
  const dateStr = format(isNaN(d.getTime()) ? new Date() : d, 'yyyy-MM-dd HH:mm');

  const headerText = encodeAsciiLines([
    'S.S.T POS',
    config.receiptHeaderNote || 'Sanyali School of Technology',
    divider,
  ]);

  const metaLines: string[] = [
    `Receipt: ${transaction.transaction_number}`,
    `Date:    ${dateStr}`,
    `Staff:   ${transaction.staff?.username || 'Staff'}`,
    `Term ID: ${transaction.terminal_id || config.terminalId}`,
    `Cust:    ${transaction.customer_name || 'Walk-in Customer'}`,
    divider,
  ];

  const itemLines: string[] = [];
  for (const it of transaction.items || []) {
    itemLines.push(it.item_name.slice(0, cols));
    itemLines.push(
      padRow(
        `  ${it.quantity} x GHS ${Number(it.unit_price).toFixed(2)}`,
        `GHS ${Number(it.subtotal).toFixed(2)}`,
        cols
      )
    );
  }
  itemLines.push(divider);

  const totalLine = padRow('TOTAL PAID', `GHS ${Number(transaction.total_amount).toFixed(2)}`, cols);

  const paymentLines: string[] = [
    `Payment: ${transaction.payment_method.toUpperCase()}`,
  ];
  if (transaction.card_last4) {
    paymentLines.push(
      `Card: ${transaction.card_brand || 'CARD'} **** ${transaction.card_last4}`
    );
  }
  if (transaction.auth_code) {
    paymentLines.push(`Auth Code: ${transaction.auth_code}`);
  }
  paymentLines.push(divider);

  const footerLines = encodeAsciiLines([
    'Thank you for your business!',
    'Please keep receipt for reference.',
  ]);

  return concatBytes(
    INIT,
    ALIGN_CENTER,
    BOLD_ON,
    headerText,
    BOLD_OFF,
    ALIGN_LEFT,
    encodeAsciiLines([...metaLines, ...itemLines]),
    BOLD_ON,
    encodeAsciiLines([totalLine]),
    BOLD_OFF,
    encodeAsciiLines(paymentLines),
    ALIGN_CENTER,
    footerLines,
    FEED_CUT
  );
}

// --- Web Serial Printer / Drawer Connection ---
export async function connectSerialPrinter(baudRate = 9600): Promise<{ ok: boolean; label?: string; error?: string }> {
  const serial = getSerialApi();
  if (!serial) {
    return { ok: false, error: 'Web Serial API is not supported in this browser. Use Chrome/Edge over HTTPS.' };
  }

  try {
    const port = await serial.requestPort();
    await port.open({ baudRate });
    activeSerialPrinter = port;
    const info = port.getInfo?.();
    serialPrinterLabel = info?.usbVendorId
      ? `Serial Device (${info.usbVendorId.toString(16).toUpperCase()}:${(info.usbProductId || 0).toString(16).toUpperCase()})`
      : `Serial Printer (${baudRate} baud)`;

    saveHardwareConfig({ receiptPrinterMode: 'escpos-serial' });
    appendHardwareLog('printer', 'Serial Printer Paired', serialPrinterLabel);
    emitHardwareChange();
    return { ok: true, label: serialPrinterLabel };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to connect serial printer',
    };
  }
}

export async function disconnectSerialPrinter(): Promise<void> {
  if (activeSerialPrinter) {
    try {
      await activeSerialPrinter.close();
    } catch {}
    activeSerialPrinter = null;
    serialPrinterLabel = null;
    appendHardwareLog('printer', 'Serial Printer Disconnected', 'Port closed');
    emitHardwareChange();
  }
}

export async function sendEscPosSerial(bytes: Uint8Array): Promise<boolean> {
  if (!activeSerialPrinter?.writable) return false;
  const writer = activeSerialPrinter.writable.getWriter();
  try {
    await writer.write(bytes);
    return true;
  } finally {
    writer.releaseLock();
  }
}

// --- WebUSB Printer / Drawer Connection ---
export async function connectUsbPrinter(): Promise<{ ok: boolean; label?: string; error?: string }> {
  const usb = getUsbApi();
  if (!usb) {
    return { ok: false, error: 'WebUSB API is not supported in this browser. Use Chrome/Edge over HTTPS.' };
  }

  try {
    const device = await usb.requestDevice({ filters: [] });
    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    let claimedInterface: number | null = null;
    let outEndpoint: number | null = null;

    for (const iface of device.configuration?.interfaces || []) {
      for (const alt of iface.alternates || []) {
        const bulkOut = alt.endpoints.find((ep) => ep.direction === 'out' && ep.type === 'bulk');
        if (bulkOut) {
          claimedInterface = iface.interfaceNumber;
          outEndpoint = bulkOut.endpointNumber;
          break;
        }
      }
      if (claimedInterface !== null) break;
    }

    if (claimedInterface === null || outEndpoint === null) {
      await device.close();
      return { ok: false, error: 'Selected USB device does not expose an ESC/POS bulk-out print endpoint.' };
    }

    await device.claimInterface(claimedInterface);
    activeUsbPrinter = device;
    activeUsbOutEndpoint = outEndpoint;
    usbPrinterLabel = [device.manufacturerName, device.productName].filter(Boolean).join(' ') || 'USB Thermal Printer';

    saveHardwareConfig({ receiptPrinterMode: 'escpos-usb' });
    appendHardwareLog('printer', 'USB Thermal Printer Paired', usbPrinterLabel);
    emitHardwareChange();
    return { ok: true, label: usbPrinterLabel };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to connect USB printer',
    };
  }
}

export async function disconnectUsbPrinter(): Promise<void> {
  if (activeUsbPrinter) {
    try {
      await activeUsbPrinter.close();
    } catch {}
    activeUsbPrinter = null;
    activeUsbOutEndpoint = null;
    usbPrinterLabel = null;
    appendHardwareLog('printer', 'USB Printer Disconnected', 'Device closed');
    emitHardwareChange();
  }
}

export async function sendEscPosUsb(bytes: Uint8Array): Promise<boolean> {
  if (!activeUsbPrinter || !activeUsbPrinter.opened || activeUsbOutEndpoint === null) {
    return false;
  }
  const copy = new Uint8Array(bytes);
  await activeUsbPrinter.transferOut(activeUsbOutEndpoint, copy.buffer);
  return true;
}

// --- Serial Barcode Scanner Listener ---
export async function connectSerialScanner(
  onScan: (code: string) => void,
  baudRate = 9600
): Promise<{ ok: boolean; label?: string; error?: string }> {
  const serial = getSerialApi();
  if (!serial) {
    return { ok: false, error: 'Web Serial API is not supported in this browser.' };
  }

  try {
    const port = await serial.requestPort();
    await port.open({ baudRate });
    activeSerialScanner = port;
    serialScannerAbort = false;
    const info = port.getInfo?.();
    serialScannerLabel = info?.usbVendorId
      ? `Serial Scanner (${info.usbVendorId.toString(16).toUpperCase()})`
      : `Serial Scanner (${baudRate} baud)`;

    appendHardwareLog('scanner', 'Serial Scanner Paired', serialScannerLabel);
    emitHardwareChange();

    if (port.readable) {
      const reader = port.readable.getReader();
      serialScannerReader = reader;
      const decoder = new TextDecoder();
      let buffer = '';

      void (async () => {
        try {
          while (!serialScannerAbort) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split(/[\r\n]+/);
              buffer = lines.pop() || '';
              for (const line of lines) {
                const code = line.trim();
                if (code.length >= 2) {
                  appendHardwareLog('scanner', 'Serial Barcode Read', code);
                  onScan(code);
                }
              }
            }
          }
        } catch (err) {
          console.warn('Serial scanner stream ended:', err);
        } finally {
          reader.releaseLock();
        }
      })();
    }

    return { ok: true, label: serialScannerLabel };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to connect serial scanner',
    };
  }
}

export async function disconnectSerialScanner(): Promise<void> {
  serialScannerAbort = true;
  if (serialScannerReader) {
    try {
      await serialScannerReader.cancel();
    } catch {}
    serialScannerReader = null;
  }
  if (activeSerialScanner) {
    try {
      await activeSerialScanner.close();
    } catch {}
    activeSerialScanner = null;
    serialScannerLabel = null;
    appendHardwareLog('scanner', 'Serial Scanner Disconnected', 'Port closed');
    emitHardwareChange();
  }
}

// --- Cash Drawer Kick ---
export async function openCashDrawer(reason = 'Manual drawer open'): Promise<{
  sentToHardware: boolean;
  message: string;
}> {
  const cfg = getHardwareConfig();
  if (!cfg.cashDrawerEnabled) {
    return { sentToHardware: false, message: 'Cash drawer integration is disabled in Hardware settings.' };
  }

  const kickBytes = buildCashDrawerKickBytes(cfg.cashDrawerPin);
  let sentToHardware = false;

  try {
    if (activeUsbPrinter?.opened) {
      sentToHardware = await sendEscPosUsb(kickBytes);
    } else if (activeSerialPrinter?.writable) {
      sentToHardware = await sendEscPosSerial(kickBytes);
    }
  } catch (err) {
    console.warn('Cash drawer kick hardware error:', err);
  }

  playHardwareBeep('drawer');
  appendHardwareLog(
    'drawer',
    sentToHardware ? 'Cash Drawer Kicked (ESC/POS)' : 'Cash Drawer Triggered (Software)',
    `${reason} · Pin ${cfg.cashDrawerPin === 0 ? '2' : '5'}`
  );

  return {
    sentToHardware,
    message: sentToHardware
      ? `Cash drawer kick pulse sent (Pin ${cfg.cashDrawerPin === 0 ? '2' : '5'}).`
      : 'Drawer event logged. Connect a USB/Serial ESC/POS receipt printer in Hardware Settings to kick the physical RJ11 drawer.',
  };
}

// --- Thermal Receipt Printing (ESC/POS + 58mm/80mm Print HTML) ---
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildThermalReceiptHtml(
  transaction: TransactionWithItems,
  width: '58mm' | '80mm' = '80mm',
  config: HardwareConfig = getHardwareConfig()
): string {
  const d = new Date(transaction.created_at);
  const createdStr = format(isNaN(d.getTime()) ? new Date() : d, 'yyyy-MM-dd HH:mm');
  const maxWidth = width === '58mm' ? '58mm' : '80mm';

  const itemsHtml = (transaction.items || [])
    .map(
      (item) => `
      <div style="margin:6px 0;">
        <div style="font-weight:700;">${escapeHtml(item.item_name)}</div>
        <div style="display:flex;justify-content:space-between;font-size:11px;">
          <span>${item.quantity} x GH₵${Number(item.unit_price).toFixed(2)}</span>
          <span style="font-weight:700;">GH₵${Number(item.subtotal).toFixed(2)}</span>
        </div>
      </div>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Receipt ${escapeHtml(transaction.transaction_number)}</title>
  <style>
    @page { margin: 2mm; size: ${maxWidth} auto; }
    body {
      font-family: 'Courier New', Courier, monospace;
      width: ${maxWidth};
      max-width: ${maxWidth};
      margin: 0 auto;
      padding: 6px;
      font-size: 12px;
      color: #000;
      background: #fff;
    }
    .center { text-align: center; }
    .dash { border-top: 1px dashed #000; margin: 8px 0; }
    .row { display: flex; justify-content: space-between; gap: 8px; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="center">
    <div style="font-size:16px;font-weight:800;">S.S.T POS</div>
    <div style="font-size:11px;">${escapeHtml(config.receiptHeaderNote || 'Sanyali School of Technology')}</div>
  </div>
  <div class="dash"></div>
  <div style="font-size:11px;line-height:1.45;">
    <div><strong>Receipt:</strong> ${escapeHtml(transaction.transaction_number)}</div>
    <div><strong>Date:</strong> ${escapeHtml(createdStr)}</div>
    <div><strong>Terminal:</strong> ${escapeHtml(transaction.terminal_id || config.terminalId)}</div>
    <div><strong>Staff:</strong> ${escapeHtml(transaction.staff?.username || 'Staff')}</div>
    <div><strong>Customer:</strong> ${escapeHtml(transaction.customer_name || 'Walk-in')}</div>
  </div>
  <div class="dash"></div>
  ${itemsHtml}
  <div class="dash"></div>
  <div class="row" style="font-size:14px;font-weight:800;">
    <span>TOTAL PAID</span>
    <span>GH₵${Number(transaction.total_amount).toFixed(2)}</span>
  </div>
  <div style="font-size:11px;margin-top:4px;">
    <div>Payment: ${escapeHtml(transaction.payment_method.toUpperCase())}</div>
    ${transaction.card_last4 ? `<div>Card: ${escapeHtml(transaction.card_brand || 'CARD')} **** ${escapeHtml(transaction.card_last4)}</div>` : ''}
    ${transaction.auth_code ? `<div>Auth: ${escapeHtml(transaction.auth_code)}</div>` : ''}
  </div>
  <div class="dash"></div>
  <div class="center" style="font-size:11px;margin-top:8px;">
    <div>Thank you for your business!</div>
    <div>Sanyali School of Technology</div>
  </div>
  <div class="no-print center" style="margin-top:12px;">
    <button onclick="window.print()" style="padding:8px 14px;background:#0284c7;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;">Print Thermal Receipt</button>
  </div>
  <script>window.addEventListener('load',function(){setTimeout(function(){window.print();},180);});</script>
</body>
</html>`;
}

export async function printThermalReceipt(transaction: TransactionWithItems): Promise<{
  method: 'escpos-usb' | 'escpos-serial' | 'browser-print' | 'download';
  message: string;
}> {
  const cfg = getHardwareConfig();

  // Direct ESC/POS over WebUSB or Web Serial if paired
  if (cfg.receiptPrinterMode === 'escpos-usb' && activeUsbPrinter?.opened) {
    try {
      const bytes = buildEscPosReceiptBytes(transaction, cfg);
      await sendEscPosUsb(bytes);
      appendHardwareLog('printer', 'ESC/POS USB Receipt Printed', transaction.transaction_number);
      return { method: 'escpos-usb', message: `Receipt ${transaction.transaction_number} printed via USB thermal printer.` };
    } catch (err) {
      console.warn('USB print failed, falling back to browser print:', err);
    }
  }

  if (cfg.receiptPrinterMode === 'escpos-serial' && activeSerialPrinter?.writable) {
    try {
      const bytes = buildEscPosReceiptBytes(transaction, cfg);
      await sendEscPosSerial(bytes);
      appendHardwareLog('printer', 'ESC/POS Serial Receipt Printed', transaction.transaction_number);
      return { method: 'escpos-serial', message: `Receipt ${transaction.transaction_number} printed via Serial thermal printer.` };
    } catch (err) {
      console.warn('Serial print failed, falling back to browser print:', err);
    }
  }

  // Fallback / OS Printer Driver via hidden iframe print (works seamlessly without window.open!)
  const width = cfg.receiptPaperWidth === '58mm' ? '58mm' : '80mm';
  const html = buildThermalReceiptHtml(transaction, width, cfg);

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.setAttribute('aria-hidden', 'true');
    document.body.appendChild(iframe);

    const docRef = iframe.contentWindow?.document;
    if (docRef) {
      docRef.open();
      docRef.write(html);
      docRef.close();
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch {}
        setTimeout(() => {
          iframe.remove();
        }, 1500);
      }, 250);
      appendHardwareLog('printer', `Thermal Receipt Printed (${width})`, transaction.transaction_number);
      return { method: 'browser-print', message: `Sent ${width} thermal receipt for ${transaction.transaction_number} to printer.` };
    }
    iframe.remove();
  } catch (err) {
    console.warn('Iframe print failed, downloading thermal HTML:', err);
  }

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `receipt-${width}-${transaction.transaction_number}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  appendHardwareLog('printer', `Thermal Receipt Downloaded (${width})`, transaction.transaction_number);
  return { method: 'download', message: `Downloaded ${width} thermal receipt file.` };
}

// --- MSR / USB Card Reader Track Parser (never stores raw PAN/CVV) ---
function detectCardBrand(pan: string): string {
  if (/^4/.test(pan)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(pan)) return 'Mastercard';
  if (/^3[47]/.test(pan)) return 'Amex';
  if (/^6(?:011|5)/.test(pan)) return 'Discover';
  if (/^506[01]|^5078|^6500/.test(pan)) return 'Verve';
  return 'Card';
}

export function parseCardTrackData(rawInput: string): ParsedCardSwipe | null {
  const input = rawInput.trim();
  if (!input) return null;

  // ISO 7813 Track 1: %B<PAN>^<NAME>^<YYMM>...
  const track1Match = input.match(/%B(\d{12,19})\^([^\^]*)\^/i);
  if (track1Match) {
    const pan = track1Match[1];
    const rawName = track1Match[2].replace(/\//g, ' ').trim();
    return {
      last4: pan.slice(-4),
      brand: detectCardBrand(pan),
      holderName: rawName || undefined,
    };
  }

  // ISO 7813 Track 2: ;<PAN>=<YYMM>...
  const track2Match = input.match(/;(\d{12,19})=/);
  if (track2Match) {
    const pan = track2Match[1];
    return {
      last4: pan.slice(-4),
      brand: detectCardBrand(pan),
    };
  }

  // Masked / raw digits fallback (only keep last 4 digits)
  const digitsOnly = input.replace(/\D/g, '');
  if (digitsOnly.length >= 12 && digitsOnly.length <= 19) {
    return {
      last4: digitsOnly.slice(-4),
      brand: detectCardBrand(digitsOnly),
    };
  }

  return null;
}

// --- Network EFTPOS Payment Terminal Request ---
export async function sendCardTerminalRequest(
  amount: number,
  reference: string,
  config: HardwareConfig = getHardwareConfig()
): Promise<{
  approved: boolean;
  authCode?: string;
  last4?: string;
  brand?: string;
  error?: string;
}> {
  const endpoint = config.cardTerminalEndpoint.trim();
  if (!endpoint) {
    return {
      approved: false,
      error: 'No Network EFTPOS terminal URL configured in Hardware Settings.',
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        terminalId: config.terminalId,
        amount: Number(amount.toFixed(2)),
        currency: 'GHS',
        reference,
      }),
    });
    if (!res.ok) {
      return { approved: false, error: `Terminal responded with HTTP ${res.status}` };
    }
    const data = await res.json();
    const approved = Boolean(data.approved ?? data.success ?? data.status === 'approved');
    if (approved) {
      appendHardwareLog('card', 'EFTPOS Terminal Approved', `GH₵${amount.toFixed(2)} · Ref ${reference}`);
    }
    return {
      approved,
      authCode: data.authCode || data.auth_code || undefined,
      last4: data.last4 || undefined,
      brand: data.brand || undefined,
      error: approved ? undefined : data.message || 'Transaction declined by terminal',
    };
  } catch (err) {
    return {
      approved: false,
      error: err instanceof Error ? err.message : 'Unable to reach card terminal endpoint',
    };
  }
}

// --- Barcode Product Lookup & Cart Helper ---
export function findProductByBarcode(products: Product[], scannedCode: string): Product | undefined {
  const normalized = scannedCode.trim().toLowerCase();
  if (!normalized) return undefined;

  return (
    products.find((p) => (p.barcode || '').trim().toLowerCase() === normalized) ||
    products.find((p) => p.id.toLowerCase() === normalized)
  );
}

export function addProductByBarcodeToCart(
  products: Product[],
  scannedCode: string
): { ok: boolean; product?: Product; message: string } {
  const product = findProductByBarcode(products, scannedCode);
  if (!product) {
    playHardwareBeep('error');
    appendHardwareLog('scanner', 'Unrecognized Barcode', scannedCode.trim());
    return { ok: false, message: `No product matches barcode "${scannedCode.trim()}".` };
  }

  if (product.stock_quantity <= 0) {
    playHardwareBeep('error');
    return { ok: false, product, message: `${product.name} is out of stock.` };
  }

  try {
    const existingCart: CartItem[] = JSON.parse(sessionStorage.getItem('cart') || '[]');
    const idx = existingCart.findIndex((c) => c.type === 'product' && c.id === product.id);
    if (idx !== -1) {
      const currentQty = existingCart[idx].quantity || 0;
      if (currentQty + 1 > product.stock_quantity) {
        playHardwareBeep('error');
        return {
          ok: false,
          product,
          message: `Only ${product.stock_quantity} unit(s) available for ${product.name}.`,
        };
      }
      existingCart[idx] = { ...existingCart[idx], quantity: currentQty + 1 };
    } else {
      existingCart.push({
        type: 'product',
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        stock: product.stock_quantity,
      });
    }

    sessionStorage.setItem('cart', JSON.stringify(existingCart));
    window.dispatchEvent(new Event('cart-updated'));
    playHardwareBeep('success');
    appendHardwareLog('scanner', 'Scanned to Cart', `${product.name} (${scannedCode.trim()})`);
    return { ok: true, product, message: `Added ${product.name} to cart.` };
  } catch {
    playHardwareBeep('error');
    return { ok: false, message: 'Could not update cart.' };
  }
}

export function createSampleReceiptTransaction(config: HardwareConfig = getHardwareConfig()): TransactionWithItems {
  return {
    id: 'txn_test_print',
    transaction_number: `TEST-${new Date().getFullYear()}-0001`,
    terminal_id: config.terminalId,
    staff: { username: 'terminal_test' },
    customer_name: 'Hardware Test Print',
    customer_phone: null,
    transaction_type: 'product',
    total_amount: 16.0,
    payment_method: 'cash',
    status: 'completed',
    notes: 'Test thermal alignment & drawer check',
    created_at: new Date().toISOString(),
    items: [
      {
        id: 'test_1',
        item_type: 'product',
        item_id: 'prd_2',
        item_name: 'Kingston 64GB USB 3.2 Drive',
        quantity: 1,
        unit_price: 12.5,
        subtotal: 12.5,
      },
      {
        id: 'test_2',
        item_type: 'product',
        item_name: 'Monster Energy Original 500ml',
        item_id: 'prd_5',
        quantity: 1,
        unit_price: 3.5,
        subtotal: 3.5,
      },
    ],
  };
}
