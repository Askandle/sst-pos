import React from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import type { TransactionWithItems } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Monitor, Printer, User, Phone, Receipt, Download } from 'lucide-react';
import { toast } from 'sonner';

interface InvoiceModalProps {
  transaction: TransactionWithItems | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  footerActions?: React.ReactNode;
}

function formatPaymentLabel(method: string): string {
  switch (method) {
    case 'cash':
      return 'Cash';
    case 'card':
      return 'Card';
    case 'mobile':
      return 'Mobile Money / Payment';
    default:
      return method;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintableInvoiceHtml(transaction: TransactionWithItems): string {
  const d = new Date(transaction.created_at);
  const createdStr = format(isNaN(d.getTime()) ? new Date() : d, 'MMM dd, yyyy • HH:mm');
  const rows = (transaction.items || [])
    .map(
      (item, idx) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;color:#64748b;">${idx + 1}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;">
          <div style="font-weight:600;color:#0f172a;">${escapeHtml(item.item_name)}</div>
          <div style="font-size:11px;text-transform:uppercase;color:#64748b;">${escapeHtml(item.item_type)}</div>
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;">GH₵${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600;">GH₵${Number(item.subtotal).toFixed(2)}</td>
      </tr>`
    )
    .join('');

  const notesHtml = transaction.notes
    ? `<div style="margin-top:18px;padding:12px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px;color:#334155;">
        <strong>Notes:</strong> ${escapeHtml(transaction.notes)}
       </div>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${escapeHtml(transaction.transaction_number)} - S.S.T POS</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background:#fff; color:#0f172a; margin:0; padding:24px; }
    .sheet { max-width:740px; margin:0 auto; border:1px solid #cbd5e1; border-radius:12px; padding:32px; }
    @media print {
      body { padding:0; }
      .sheet { border:none; padding:0; }
      .no-print { display:none !important; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:20px;gap:16px;flex-wrap:wrap;">
      <div>
        <h1 style="margin:0;font-size:22px;font-weight:800;">S.S.T POS</h1>
        <div style="font-size:14px;font-weight:600;color:#334155;">Sanyali School of Technology</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Official Point of Sale &amp; Service Invoice</div>
      </div>
      <div style="text-align:right;">
        <span style="display:inline-block;background:#0f172a;color:#fff;font-size:11px;font-weight:700;padding:3px 8px;border-radius:4px;letter-spacing:0.06em;">INVOICE</span>
        <div style="font-family:monospace;font-size:14px;font-weight:700;margin-top:6px;">${escapeHtml(transaction.transaction_number)}</div>
        <div style="font-size:12px;color:#475569;margin-top:2px;">Date: ${escapeHtml(createdStr)}</div>
        <div style="font-size:12px;font-weight:700;color:#047857;margin-top:2px;">STATUS: ${transaction.status === 'completed' ? 'PAID' : 'REFUNDED'}</div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:18px 0;border-bottom:1px solid #e2e8f0;font-size:14px;">
      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;">Billed To (Customer)</div>
        <div style="font-weight:600;margin-top:4px;">${escapeHtml(transaction.customer_name || 'Walk-in Customer')}</div>
        <div style="font-family:monospace;font-size:12px;color:#334155;margin-top:2px;">${escapeHtml(transaction.customer_phone || 'Not provided')}</div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:#64748b;">Transaction Info</div>
        <div style="margin-top:4px;">Served By: <strong>${escapeHtml(transaction.staff?.username || 'Staff')}</strong></div>
        <div style="margin-top:2px;">Payment Method: <strong>${escapeHtml(formatPaymentLabel(transaction.payment_method))}</strong></div>
      </div>
    </div>

    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px;">
      <thead>
        <tr style="border-bottom:2px solid #cbd5e1;text-align:left;font-size:11px;text-transform:uppercase;color:#475569;">
          <th style="padding:8px;">#</th>
          <th style="padding:8px;">Item / Service</th>
          <th style="padding:8px;text-align:center;">Qty</th>
          <th style="padding:8px;text-align:right;">Unit Price</th>
          <th style="padding:8px;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div style="margin-top:20px;border-top:2px solid #e2e8f0;padding-top:14px;display:flex;flex-direction:column;align-items:flex-end;gap:6px;font-size:14px;">
      <div style="display:flex;justify-content:space-between;width:240px;color:#475569;">
        <span>Subtotal</span>
        <span>GH₵${Number(transaction.total_amount).toFixed(2)}</span>
      </div>
      <div style="display:flex;justify-content:space-between;width:240px;padding-top:8px;border-top:1px solid #cbd5e1;font-size:18px;font-weight:700;">
        <span>Total Paid</span>
        <span>GH₵${Number(transaction.total_amount).toFixed(2)}</span>
      </div>
    </div>

    ${notesHtml}

    <div style="margin-top:28px;padding-top:14px;border-top:1px dashed #cbd5e1;text-align:center;font-size:12px;color:#475569;">
      <div style="font-weight:600;color:#1e293b;">Thank you for your business with Sanyali School of Technology (S.S.T POS)!</div>
      <div style="font-size:11px;margin-top:4px;">Please retain this invoice as proof of payment.</div>
    </div>

    <div class="no-print" style="margin-top:20px;text-align:center;">
      <button onclick="window.print()" style="background:#0284c7;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;">Print Invoice</button>
    </div>
  </div>
  <script>window.addEventListener('load', function(){ setTimeout(function(){ window.print(); }, 200); });</script>
</body>
</html>`;
}

function downloadInvoiceHtml(transaction: TransactionWithItems): void {
  const html = buildPrintableInvoiceHtml(transaction);
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `invoice-${transaction.transaction_number}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function InvoiceSheet({ transaction }: { transaction: TransactionWithItems }) {
  const createdDate = (() => {
    const d = new Date(transaction.created_at);
    return isNaN(d.getTime()) ? new Date() : d;
  })();

  return (
    <div className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-200 print:border-0 print:p-0 print:rounded-none shadow-xs print:shadow-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-slate-900">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 print:bg-slate-900">
            <Monitor className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">S.S.T POS</h2>
            <p className="text-sm font-semibold text-slate-700">Sanyali School of Technology</p>
            <p className="text-xs text-slate-500 mt-0.5">Official Point of Sale &amp; Service Invoice</p>
          </div>
        </div>

        <div className="sm:text-right">
          <div className="inline-block px-2.5 py-0.5 rounded bg-slate-900 text-white text-xs font-bold tracking-wider uppercase mb-1.5">
            INVOICE
          </div>
          <p className="font-mono text-sm font-bold text-slate-900">
            {transaction.transaction_number}
          </p>
          <p className="text-xs text-slate-600 mt-0.5">
            Date: {format(createdDate, 'MMM dd, yyyy • HH:mm')}
          </p>
          <p className="text-xs font-semibold uppercase mt-0.5 text-emerald-700">
            Status: {transaction.status === 'completed' ? 'PAID' : 'REFUNDED'}
          </p>
        </div>
      </div>

      {/* Customer & Cashier Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-b border-slate-200 text-sm">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Billed To (Customer)
          </p>
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>{transaction.customer_name || 'Walk-in Customer'}</span>
          </p>
          <p className="text-slate-700 flex items-center gap-1.5 font-mono text-xs">
            <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <span>{transaction.customer_phone || 'Not provided'}</span>
          </p>
        </div>

        <div className="space-y-1 sm:text-right">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Transaction Info
          </p>
          <p className="text-slate-700">
            Served By:{' '}
            <span className="font-semibold text-slate-900">
              {transaction.staff?.username || 'Staff'}
            </span>
          </p>
          <p className="text-slate-700">
            Payment Method:{' '}
            <span className="font-semibold text-slate-900">
              {formatPaymentLabel(transaction.payment_method)}
            </span>
          </p>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="py-5">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-300 text-left text-xs uppercase tracking-wider text-slate-600">
              <th className="py-2 pr-2 font-semibold">#</th>
              <th className="py-2 px-2 font-semibold">Item / Service</th>
              <th className="py-2 px-2 font-semibold text-center">Qty</th>
              <th className="py-2 px-2 font-semibold text-right">Unit Price</th>
              <th className="py-2 pl-2 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {transaction.items?.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="py-2.5 pr-2 text-slate-500 tabular-nums">{idx + 1}</td>
                <td className="py-2.5 px-2">
                  <p className="font-medium text-slate-900">{item.item_name}</p>
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">
                    {item.item_type}
                  </p>
                </td>
                <td className="py-2.5 px-2 text-center tabular-nums text-slate-800">
                  {item.quantity}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-slate-800">
                  GH₵{Number(item.unit_price).toFixed(2)}
                </td>
                <td className="py-2.5 pl-2 text-right font-semibold tabular-nums text-slate-900">
                  GH₵{Number(item.subtotal).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex flex-col items-end pt-4 border-t-2 border-slate-200 space-y-1.5">
        <div className="flex justify-between w-full sm:w-64 text-sm text-slate-600">
          <span>Subtotal</span>
          <span className="tabular-nums font-medium">
            GH₵{Number(transaction.total_amount).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between w-full sm:w-64 text-sm text-slate-600">
          <span>Items Count</span>
          <span className="tabular-nums font-medium">{transaction.items?.length || 0}</span>
        </div>
        <div className="flex justify-between w-full sm:w-64 pt-2 border-t border-slate-300 text-lg font-bold text-slate-900">
          <span>Total Paid</span>
          <span className="tabular-nums">GH₵{Number(transaction.total_amount).toFixed(2)}</span>
        </div>
      </div>

      {/* Notes */}
      {transaction.notes && (
        <div className="mt-5 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700">
          <span className="font-semibold text-slate-900">Notes: </span>
          {transaction.notes}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-dashed border-slate-300 text-center space-y-1">
        <p className="text-xs font-semibold text-slate-800">
          Thank you for your business with Sanyali School of Technology (S.S.T POS)!
        </p>
        <p className="text-[11px] text-slate-500">
          Please retain this invoice as proof of payment.
        </p>
      </div>
    </div>
  );
}

export default function InvoiceModal({
  transaction,
  open,
  onOpenChange,
  footerActions,
}: InvoiceModalProps) {
  if (!transaction) return null;

  const handlePrint = () => {
    let beforePrintFired = false;
    const onBeforePrint = () => {
      beforePrintFired = true;
    };
    window.addEventListener('beforeprint', onBeforePrint);

    const startTime = Date.now();
    try {
      window.print();
    } catch {
      beforePrintFired = false;
    }

    const elapsed = Date.now() - startTime;
    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();

    setTimeout(() => {
      window.removeEventListener('beforeprint', onBeforePrint);
      if (!beforePrintFired && inIframe && elapsed < 250) {
        downloadInvoiceHtml(transaction);
        toast.info(
          'Browser preview blocked the print popup, so a printable invoice file was downloaded instead.'
        );
      }
    }, 350);
  };

  const handleDownload = () => {
    downloadInvoiceHtml(transaction);
    toast.success(`Invoice ${transaction.transaction_number} downloaded`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto border-2 border-sky-500/35 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              Customer Invoice
            </DialogTitle>
            <DialogDescription>
              Preview, download, or print invoice {transaction.transaction_number}
            </DialogDescription>
          </DialogHeader>

          <InvoiceSheet transaction={transaction} />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-2">
            {footerActions}
            <Button
              type="button"
              variant="outline"
              onClick={handleDownload}
              className="cursor-pointer"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Invoice
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold cursor-pointer"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Invoice
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div id="print-invoice-root" className="hidden print:block">
            <InvoiceSheet transaction={transaction} />
          </div>,
          document.body
        )}
    </>
  );
}
