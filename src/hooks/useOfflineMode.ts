import { useState, useEffect, useCallback } from 'react';
import {
  isNetworkOnline,
  getManualOfflineMode,
  isOfflineModeActive,
  getPendingSyncCount,
  setManualOfflineMode,
  flushPendingOfflineSync,
} from '@/db/api';

export function useOfflineMode() {
  const [networkOnline, setNetworkOnline] = useState<boolean>(() => isNetworkOnline());
  const [manualOffline, setManualOfflineState] = useState<boolean>(() => getManualOfflineMode());
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingSyncCount());
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshState = useCallback(() => {
    setNetworkOnline(isNetworkOnline());
    setManualOfflineState(getManualOfflineMode());
    setPendingSyncCount(getPendingSyncCount());
  }, []);

  useEffect(() => {
    refreshState();

    window.addEventListener('online', refreshState);
    window.addEventListener('offline', refreshState);
    window.addEventListener('offline-mode-changed', refreshState);
    window.addEventListener('pending-sync-updated', refreshState);
    window.addEventListener('offline-sync-completed', refreshState);

    return () => {
      window.removeEventListener('online', refreshState);
      window.removeEventListener('offline', refreshState);
      window.removeEventListener('offline-mode-changed', refreshState);
      window.removeEventListener('pending-sync-updated', refreshState);
      window.removeEventListener('offline-sync-completed', refreshState);
    };
  }, [refreshState]);

  const setManualOffline = useCallback(async (enabled: boolean) => {
    setIsSyncing(!enabled && isNetworkOnline() && getPendingSyncCount() > 0);
    try {
      await setManualOfflineMode(enabled);
    } finally {
      setIsSyncing(false);
      refreshState();
    }
  }, [refreshState]);

  const toggleManualOffline = useCallback(async () => {
    const next = !getManualOfflineMode();
    await setManualOffline(next);
  }, [setManualOffline]);

  const syncNow = useCallback(async () => {
    if (isOfflineModeActive()) {
      return { synced: 0, failed: getPendingSyncCount() };
    }
    setIsSyncing(true);
    try {
      return await flushPendingOfflineSync();
    } finally {
      setIsSyncing(false);
      refreshState();
    }
  }, [refreshState]);

  return {
    isNetworkOnline: networkOnline,
    isManualOffline: manualOffline,
    isOfflineMode: !networkOnline || manualOffline,
    pendingSyncCount,
    isSyncing,
    setManualOffline,
    toggleManualOffline,
    syncNow,
  };
}
