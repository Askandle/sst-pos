import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { toast } from 'sonner';

export default function OfflineStatusBanner() {
  const {
    isNetworkOnline,
    isManualOffline,
    isOfflineMode,
    pendingSyncCount,
    isSyncing,
    setManualOffline,
    syncNow,
  } = useOfflineMode();

  // Hidden completely when online and all local mutations are synced
  if (!isOfflineMode && pendingSyncCount === 0) {
    return null;
  }

  const handleGoOnline = async () => {
    await setManualOffline(false);
    toast.success('Switched back to Online Mode.');
  };

  const handleSyncNow = async () => {
    const result = await syncNow();
    if (result.synced > 0 && result.failed === 0) {
      toast.success(`Synced ${result.synced} offline ${result.synced === 1 ? 'change' : 'changes'} to cloud.`);
    } else if (result.synced > 0) {
      toast.warning(`Synced ${result.synced}, ${result.failed} still waiting for connection.`);
    } else if (result.failed > 0) {
      toast.error('Still unable to reach cloud. Changes remain saved locally.');
    }
  };

  return (
    <div className="mb-5 rounded-2xl border border-amber-500/35 dark:border-amber-400/30 bg-amber-50/90 dark:bg-amber-950/45 backdrop-blur-md px-4 py-3 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            {isOfflineMode ? (
              <WifiOff className="h-4 w-4" />
            ) : (
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-950 dark:text-amber-100 leading-tight">
              {!isNetworkOnline
                ? 'No Internet Connection — Running in Offline Mode'
                : isManualOffline
                  ? 'Offline Mode Enabled — Saving Locally'
                  : 'Pending Offline Changes Ready to Sync'}
            </p>
            <p className="text-xs text-amber-800/85 dark:text-amber-200/80 mt-0.5">
              {isOfflineMode
                ? 'Sales, products, services, and expenses continue working locally.'
                : 'Your device is back online.'}
              {pendingSyncCount > 0 && (
                <span className="font-semibold tabular-nums">
                  {' '}
                  {pendingSyncCount} {pendingSyncCount === 1 ? 'change' : 'changes'} queued for cloud sync.
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isManualOffline && isNetworkOnline && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isSyncing}
              onClick={handleGoOnline}
              className="rounded-xl border-amber-500/40 bg-white/80 dark:bg-black/25 hover:bg-white text-amber-900 dark:text-amber-100 cursor-pointer gap-1.5"
            >
              <Wifi className="h-3.5 w-3.5" />
              Go Online
            </Button>
          )}
          {!isOfflineMode && pendingSyncCount > 0 && (
            <Button
              type="button"
              size="sm"
              disabled={isSyncing}
              onClick={handleSyncNow}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white cursor-pointer gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
