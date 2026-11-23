import { useState } from 'react';
import { Download, Share, PlusSquare } from 'lucide-react';
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
}

export function PWAInstallButton({ compact = false }: PWAInstallButtonProps) {
  const { canInstall, isIOS, isInstalled, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled || (!canInstall && !isIOS)) return null;

  const handleClick = () => {
    if (canInstall) {
      void install();
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon' : 'sm'}
        onClick={handleClick}
        title="Install Offline App"
        className={`${
          compact ? 'w-full h-9' : 'w-full justify-start gap-2'
        } rounded-xl border-sky-500/35 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-300 cursor-pointer`}
      >
        <Download className="h-4 w-4 shrink-0" />
        {!compact && <span className="text-xs font-semibold">Install Offline App</span>}
      </Button>

      <Dialog open={showIOSModal} onOpenChange={setShowIOSModal}>
        <DialogContent className="sm:max-w-md glass-modal">
          <DialogHeader>
            <DialogTitle>Install S.S.T POS</DialogTitle>
            <DialogDescription>
              Install this app on your device so it launches reliably even without internet.
            </DialogDescription>
          </DialogHeader>

          <ol className="space-y-3 text-sm text-foreground/85 py-2">
            <li className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </span>
              <span className="flex items-center gap-1.5 flex-wrap">
                Tap the <Share className="h-4 w-4 text-primary inline" /> <strong>Share</strong>{' '}
                button in Safari&apos;s toolbar.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </span>
              <span className="flex items-center gap-1.5 flex-wrap">
                Choose <PlusSquare className="h-4 w-4 text-primary inline" />{' '}
                <strong>Add to Home Screen</strong>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="h-5 w-5 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </span>
              <span>
                Tap <strong>Add</strong> in the top-right corner to install.
              </span>
            </li>
          </ol>

          <Button onClick={() => setShowIOSModal(false)} className="w-full">
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
