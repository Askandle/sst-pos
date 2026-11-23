import { useEffect, useRef, useState } from 'react';
import {
  getHardwareConfig,
  getHardwareLogs,
  getHardwareRuntimeState,
  type HardwareConfig,
  type HardwareLogEntry,
  type HardwareRuntimeState,
} from '@/lib/hardware';

interface UseBarcodeScannerOptions {
  enabled?: boolean;
  onScan: (code: string) => void;
  minLength?: number;
}

/**
 * Global USB/Bluetooth HID Keyboard-Wedge Barcode Scanner listener.
 * Captures rapid inter-keystroke bursts ending in Enter/Tab without interfering with normal typing.
 */
export function useBarcodeScanner({
  enabled = true,
  onScan,
  minLength = 4,
}: UseBarcodeScannerOptions) {
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    if (!enabled) return;

    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const cfg = getHardwareConfig();
      if (!cfg.barcodeScannerEnabled) return;

      // Skip modifier combos
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const activeEl = document.activeElement as HTMLElement | null;
      const isTextInput =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.isContentEditable);

      // Let dedicated barcode inputs or MSR card inputs handle their own value
      if (isTextInput && activeEl?.getAttribute('data-barcode-ignore') === 'true') {
        return;
      }

      const now = Date.now();
      const maxDelay = Math.max(30, cfg.barcodeMaxDelayMs || 65);

      if (e.key === 'Enter' || e.key === 'Tab') {
        if (buffer.length >= minLength && now - lastKeyTime <= maxDelay * 2) {
          // Only intercept global scan when not inside a regular typing field,
          // OR when rapid wedge burst finished cleanly
          if (!isTextInput) {
            e.preventDefault();
            const scanned = buffer.trim();
            buffer = '';
            lastKeyTime = 0;
            onScanRef.current(scanned);
            return;
          }
        }
        buffer = '';
        lastKeyTime = 0;
        return;
      }

      if (e.key.length === 1) {
        if (lastKeyTime > 0 && now - lastKeyTime > maxDelay) {
          buffer = '';
        }
        buffer += e.key;
        lastKeyTime = now;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, minLength]);
}

export function useHardwareState() {
  const [config, setConfig] = useState<HardwareConfig>(() => getHardwareConfig());
  const [runtime, setRuntime] = useState<HardwareRuntimeState>(() => getHardwareRuntimeState());
  const [logs, setLogs] = useState<HardwareLogEntry[]>(() => getHardwareLogs());

  useEffect(() => {
    const refresh = () => {
      setConfig(getHardwareConfig());
      setRuntime(getHardwareRuntimeState());
      setLogs(getHardwareLogs());
    };

    window.addEventListener('hardware-state-changed', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('hardware-state-changed', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return { config, runtime, logs };
}
