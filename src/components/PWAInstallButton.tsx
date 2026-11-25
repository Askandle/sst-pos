import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  Share,
  PlusSquare,
  Copy,
  Check,
  QrCode,
  WifiOff,
  ScanBarcode,
  MoreVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePWAInstall } from '@/hooks/usePWAInstall';

interface PWAInstallButtonProps {
  compact?: boolean;
  variant?: 'sidebar' | 'hero';
}

export function PWAInstallButton({
  compact = false,
  variant = 'sidebar',
}: PWAInstallButtonProps) {
  const { canInstall, isIOS, isInstalled, install } = usePWAInstall();
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const appUrl =
    typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (!showMobileModal || !appUrl) return;
    let active = true;
    QRCode.toDataURL(appUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#064e3b',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [showMobileModal, appUrl]);

  // Hide install button when already launched in standalone Mobile App mode
  if (isInstalled) return null;

  const handleTrigger = () => {
    if (canInstall && variant === 'sidebar') {
      void install();
      return;
    }
    setShowMobileModal(true);
  };

  const handleDirectInstall = async () => {
    const accepted = await install();
    if (accepted) {
      setShowMobileModal(false);
      toast.success('S.S.T POS Mobile App installed!');
    }
  };

  const handleCopyUrl = async () => {
    if (!appUrl) return;
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
      toast.success('Mobile app link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy link automatically');
    }
  };

  const handleShareUrl = async () => {
    if (!appUrl || typeof navigator === 'undefined' || !navigator.share) return;
    try {
      await navigator.share({
        title: 'S.S.T POS Mobile App',
        text: 'Open and install the Sanyali School of Technology POS Mobile App.',
        url: appUrl,
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  return (
    <>
      {variant === 'hero' ? (
        <button
          type="button"
          onClick={handleTrigger}
          className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/35 bg-emerald-950/65 hover:bg-emerald-900/80 text-white px-4 py-2.5 text-sm font-semibold backdrop-blur-md shadow-lg shadow-emerald-950/30 transition-colors cursor-pointer"
        >
          <Smartphone className="h-4 w-4 text-emerald-300" />
          <span>Mobile App</span>
          <Download className="h-3.5 w-3.5 text-emerald-200" />
        </button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size={compact ? 'icon' : 'sm'}
          onClick={handleTrigger}
          title={canInstall ? 'Install Mobile App' : 'Get Mobile App'}
          className={`${
            compact ? 'w-full h-9' : 'w-full justify-start gap-2'
          } rounded-xl border-emerald-500/35 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 cursor-pointer`}
        >
          <Smartphone className="h-4 w-4 shrink-0" />
          {!compact && (
            <span className="text-xs font-semibold truncate">
              {canInstall ? 'Install Mobile App' : 'Mobile App'}
            </span>
          )}
        </Button>
      )}

      <Dialog open={showMobileModal} onOpenChange={setShowMobileModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto glass-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Smartphone className="h-4 w-4" />
              </div>
              <span>S.S.T POS Mobile App</span>
            </DialogTitle>
            <DialogDescription>
              Run S.S.T POS on Android or iPhone as a full-screen mobile app with offline sales and phone camera barcode scanning.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {canInstall && (
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                    Ready for One-Tap Install
                  </p>
                  <p className="text-xs text-emerald-700/85 dark:text-emerald-300/85">
                    Add S.S.T POS directly to this device&apos;s home screen.
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleDirectInstall}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 cursor-pointer"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Install Now
                </Button>
              </div>
            )}

            {/* Phone QR Scan + Copy Link */}
            <div className="rounded-xl border border-border/80 bg-muted/40 p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="h-[132px] w-[132px] rounded-xl bg-white p-2 border border-border/60 shadow-2xs flex items-center justify-center shrink-0">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR code to open S.S.T POS Mobile App"
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <QrCode className="h-12 w-12 text-emerald-700 animate-pulse" />
                )}
              </div>

              <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                <p className="text-sm font-semibold text-foreground">
                  Open on Your Phone
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Point your phone camera at this QR code to open the mobile POS instantly, then install it to your home screen.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleCopyUrl}
                    className="h-8 text-xs cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy App Link
                      </>
                    )}
                  </Button>
                  {canNativeShare && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleShareUrl}
                      className="h-8 text-xs cursor-pointer"
                    >
                      <Share className="h-3.5 w-3.5 mr-1" />
                      Share
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Platform Install Steps */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`rounded-xl border p-3.5 space-y-2 ${!isIOS ? 'border-emerald-500/35 bg-emerald-500/5' : 'border-border/70 bg-card/60'}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Android (Chrome)
                </p>
                <ol className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-foreground">1.</span>
                    <span>Open the link in Chrome on Android.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-foreground">2.</span>
                    <span className="inline-flex items-center gap-0.5 flex-wrap">
                      Tap <MoreVertical className="h-3.5 w-3.5 inline text-foreground" /> menu at top right.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-foreground">3.</span>
                    <span>
                      Tap <strong className="text-foreground">Install app</strong> or <strong className="text-foreground">Add to Home screen</strong>.
                    </span>
                  </li>
                </ol>
              </div>

              <div className={`rounded-xl border p-3.5 space-y-2 ${isIOS ? 'border-sky-500/35 bg-sky-500/5' : 'border-border/70 bg-card/60'}`}>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  iPhone / iPad (Safari)
                </p>
                <ol className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-foreground">1.</span>
                    <span>Open the link in Safari.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-foreground">2.</span>
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      Tap <Share className="h-3.5 w-3.5 inline text-primary" /> <strong className="text-foreground">Share</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="font-bold text-foreground">3.</span>
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      Choose <PlusSquare className="h-3.5 w-3.5 inline text-primary" /> <strong className="text-foreground">Add to Home Screen</strong>.
                    </span>
                  </li>
                </ol>
              </div>
            </div>

            {/* Mobile Capabilities */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="rounded-lg border border-border/70 px-3 py-2 flex items-center gap-2 text-xs">
                <ScanBarcode className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-foreground font-medium">Phone Camera Scanner</span>
              </div>
              <div className="rounded-lg border border-border/70 px-3 py-2 flex items-center gap-2 text-xs">
                <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-foreground font-medium">Works Offline + Auto Sync</span>
              </div>
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowMobileModal(false)}
            className="w-full cursor-pointer"
          >
            Done
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
