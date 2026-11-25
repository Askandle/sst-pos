import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ScanBarcode,
  Camera,
  CornerDownLeft,
  RefreshCw,
  Flashlight,
  SwitchCamera,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { playHardwareBeep } from '@/lib/hardware';

interface BarcodeScanControlProps {
  onScan: (code: string) => void;
  placeholder?: string;
  buttonLabel?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
}

export default function BarcodeScanControl({
  onScan,
  placeholder = 'Scan barcode or type SKU / ID and press Enter...',
  buttonLabel = 'Scan / Add',
  inputRef: externalRef,
  className = '',
}: BarcodeScanControlProps) {
  const [value, setValue] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [continuousMode, setContinuousMode] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
  const [retryToken, setRetryToken] = useState(0);

  const internalRef = useRef<HTMLInputElement>(null);
  const resolvedRef = externalRef || internalRef;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const continuousRef = useRef(continuousMode);
  continuousRef.current = continuousMode;

  const lastScannedRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = value.trim();
    if (!code) {
      resolvedRef.current?.focus();
      return;
    }
    onScan(code);
    setValue('');
    resolvedRef.current?.focus();
  };

  const stopStream = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({
        advanced: [{ torch: next } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(next);
    } catch {
      toast.info('Flashlight control is not supported by this camera.');
    }
  };

  const switchCamera = () => {
    if (videoDevices.length < 2) return;
    const currentIdx = videoDevices.findIndex((d) => d.deviceId === selectedDeviceId);
    const nextIdx = (currentIdx + 1) % videoDevices.length;
    setSelectedDeviceId(videoDevices[nextIdx].deviceId);
  };

  useEffect(() => {
    if (!cameraOpen) {
      setCameraReady(false);
      setDetectedCode(null);
      setTorchOn(false);
      setTorchSupported(false);
      return;
    }

    let cancelled = false;
    let lockTimeout: number | null = null;
    setCameraError(null);
    setCameraReady(false);
    setDetectedCode(null);
    setTorchOn(false);

    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.CODE_93,
      BarcodeFormat.ITF,
      BarcodeFormat.CODABAR,
      BarcodeFormat.QR_CODE,
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);

    const zxingReader = new BrowserMultiFormatReader(hints);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const BarcodeDetectorCtor = (
      window as unknown as {
        BarcodeDetector?: new (opts?: { formats?: string[] }) => {
          detect: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<Array<{ rawValue?: string }>>;
        };
      }
    ).BarcodeDetector;

    let nativeDetector: {
      detect: (source: HTMLVideoElement | HTMLCanvasElement) => Promise<Array<{ rawValue?: string }>>;
    } | null = null;

    if (BarcodeDetectorCtor) {
      try {
        nativeDetector = new BarcodeDetectorCtor({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });
      } catch {
        nativeDetector = null;
      }
    }

    const startCamera = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not available in this browser or context (requires HTTPS).');
        return;
      }

      try {
        let stream: MediaStream;
        const primaryConstraints: MediaStreamConstraints = {
          audio: false,
          video: selectedDeviceId
            ? {
                deviceId: { exact: selectedDeviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }
            : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
        };

        try {
          stream = await navigator.mediaDevices.getUserMedia(primaryConstraints);
        } catch {
          // Fallback to any available camera without resolution/facingMode constraints
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Inspect camera capabilities (autofocus + torch)
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          try {
            const caps = videoTrack.getCapabilities?.() as
              | (MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] })
              | undefined;
            if (caps?.torch) {
              setTorchSupported(true);
            }
            if (caps?.focusMode?.includes('continuous')) {
              await videoTrack.applyConstraints({
                advanced: [{ focusMode: 'continuous' } as unknown as MediaTrackConstraintSet],
              });
            }
          } catch {
            // Optional constraint tuning; ignore safely
          }
        }

        // Enumerate cameras for optional switch button
        try {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const cams = allDevices.filter((d) => d.kind === 'videoinput');
          if (!cancelled) {
            setVideoDevices(cams);
          }
        } catch {}

        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play();
          if (!cancelled) {
            setCameraReady(true);
          }
        }

        let lastAttemptTime = 0;
        let busy = false;

        const handleDetected = (rawCode: string) => {
          const code = rawCode.trim();
          if (!code) return false;

          const now = Date.now();
          if (
            lastScannedRef.current.code === code &&
            now - lastScannedRef.current.at < 1400
          ) {
            return false;
          }
          lastScannedRef.current = { code, at: now };

          setDetectedCode(code);
          playHardwareBeep('success');
          onScanRef.current(code);

          if (continuousRef.current) {
            if (lockTimeout) window.clearTimeout(lockTimeout);
            lockTimeout = window.setTimeout(() => {
              if (!cancelled) setDetectedCode(null);
            }, 900);
            return false;
          } else {
            lockTimeout = window.setTimeout(() => {
              if (!cancelled) setCameraOpen(false);
            }, 280);
            return true;
          }
        };

        const scanLoop = async (timestamp: number) => {
          if (cancelled) return;

          const v = videoRef.current;
          if (
            !busy &&
            v &&
            v.readyState >= 2 &&
            v.videoWidth > 0 &&
            v.videoHeight > 0 &&
            timestamp - lastAttemptTime >= 85
          ) {
            busy = true;
            lastAttemptTime = timestamp;

            try {
              let foundCode: string | undefined;

              // 1. Native hardware-accelerated BarcodeDetector when available
              if (nativeDetector) {
                try {
                  const results = await nativeDetector.detect(v);
                  foundCode = results.find((r) => r.rawValue)?.rawValue;
                } catch {
                  nativeDetector = null;
                }
              }

              // 2. Universal pure-JS ZXing Canvas decoder fallback (works in all browsers)
              if (!foundCode && ctx) {
                const maxWidth = 800;
                const scale = v.videoWidth > maxWidth ? maxWidth / v.videoWidth : 1;
                const targetW = Math.max(1, Math.round(v.videoWidth * scale));
                const targetH = Math.max(1, Math.round(v.videoHeight * scale));
                if (canvas.width !== targetW || canvas.height !== targetH) {
                  canvas.width = targetW;
                  canvas.height = targetH;
                }
                ctx.drawImage(v, 0, 0, targetW, targetH);

                try {
                  const res = zxingReader.decodeFromCanvas(canvas);
                  foundCode = res?.getText?.();
                } catch {
                  // Normal NotFoundException when frame has no barcode
                }
              }

              if (foundCode) {
                const shouldStop = handleDetected(foundCode);
                if (shouldStop) {
                  busy = false;
                  return;
                }
              }
            } finally {
              busy = false;
            }
          }

          if (!cancelled) {
            rafRef.current = requestAnimationFrame(scanLoop);
          }
        };

        rafRef.current = requestAnimationFrame(scanLoop);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was denied. Allow camera access in your browser address bar, then click Retry.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError('No camera was found on this device. Connect a webcam or use a USB barcode scanner.');
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setCameraError('Camera is currently in use by another app or tab. Close the other app and click Retry.');
        } else {
          setCameraError(
            err instanceof Error ? err.message : 'Unable to start camera for barcode scanning.'
          );
        }
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (lockTimeout) window.clearTimeout(lockTimeout);
      stopStream();
    };
  }, [cameraOpen, selectedDeviceId, retryToken]);

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}
      >
        <div className="relative flex-1">
          <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-600 dark:text-sky-400 pointer-events-none" />
          <Input
            ref={resolvedRef}
            type="text"
            value={value}
            data-barcode-ignore="true"
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="pl-9 pr-16 h-10 rounded-xl border-2 border-sky-500/35 focus-visible:ring-sky-500 font-mono text-sm"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono rounded bg-muted text-muted-foreground border border-border/60 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            F2
          </kbd>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="submit"
            variant="default"
            className="h-10 px-4 rounded-xl cursor-pointer whitespace-nowrap shrink-0"
          >
            <CornerDownLeft className="h-4 w-4 mr-1.5" />
            {buttonLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (!navigator.mediaDevices?.getUserMedia) {
                toast.info('Use a USB or Bluetooth barcode scanner, or enter the barcode manually.');
                resolvedRef.current?.focus();
                return;
              }
              setCameraOpen(true);
            }}
            title="Scan barcode using device camera"
            className="h-10 px-3 rounded-xl border-2 border-border hover:border-emerald-500/60 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Camera className="h-4 w-4 mr-1.5" />
            Camera
          </Button>
        </div>
      </form>

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="sm:max-w-lg glass-surface border-2 border-emerald-500/35 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-emerald-500" />
              Camera Barcode Scanner
            </DialogTitle>
            <DialogDescription>
              Align the barcode inside the green scanner lens for automatic detection.
            </DialogDescription>
          </DialogHeader>

          {cameraError ? (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-foreground space-y-3">
              <p>{cameraError}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRetryToken((t) => t + 1)}
                className="cursor-pointer rounded-lg"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Retry Camera
              </Button>
            </div>
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-slate-950 border border-emerald-500/40 shadow-inner">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Green Lens Scanning Viewfinder Overlay */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                {/* Centered Reticle with subtle outer vignette */}
                <div
                  className={`relative w-[78%] h-[62%] rounded-xl transition-all duration-200 ${
                    detectedCode
                      ? 'bg-emerald-500/20 ring-2 ring-emerald-400 shadow-[0_0_28px_rgba(34,197,94,0.6),0_0_0_9999px_rgba(2,6,23,0.46)]'
                      : 'bg-emerald-500/[0.06] shadow-[0_0_0_9999px_rgba(2,6,23,0.46)]'
                  }`}
                >
                  {/* Green Glowing Corner Brackets */}
                  <span className="absolute -top-0.5 -left-0.5 h-6 w-6 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  <span className="absolute -top-0.5 -right-0.5 h-6 w-6 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  <span className="absolute -bottom-0.5 -left-0.5 h-6 w-6 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-6 w-6 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-lg drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]" />

                  {/* Sweeping Green Lens Laser Light */}
                  {cameraReady && !detectedCode && <div className="barcode-laser-line" />}
                </div>
              </div>

              {/* Top Green Lens Status Indicator */}
              <div className="pointer-events-none absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                <div
                  className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 text-[11px] font-semibold tracking-wide backdrop-blur-md border ${
                    detectedCode
                      ? 'bg-emerald-500/90 text-white border-emerald-300 shadow-[0_0_16px_rgba(34,197,94,0.75)]'
                      : 'bg-slate-950/70 text-emerald-300 border-emerald-500/40'
                  }`}
                >
                  {detectedCode ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="font-mono">LOCKED: {detectedCode}</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#4ade80]" />
                      <span>{cameraReady ? 'GREEN LENS SCANNING' : 'STARTING CAMERA...'}</span>
                    </>
                  )}
                </div>

                {/* Torch & Camera Switch Controls */}
                <div className="pointer-events-auto flex items-center gap-1.5">
                  {torchSupported && (
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={toggleTorch}
                      title={torchOn ? 'Turn off light' : 'Turn on camera light'}
                      className={`h-7 w-7 rounded-lg backdrop-blur-md cursor-pointer ${
                        torchOn
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-slate-950/70 text-white hover:bg-slate-900 border border-white/15'
                      }`}
                    >
                      <Flashlight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {videoDevices.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      onClick={switchCamera}
                      title="Switch camera"
                      className="h-7 w-7 rounded-lg bg-slate-950/70 text-white hover:bg-slate-900 border border-white/15 backdrop-blur-md cursor-pointer"
                    >
                      <SwitchCamera className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
              <Switch
                checked={continuousMode}
                onCheckedChange={setContinuousMode}
              />
              <span>Continuous multi-item scan</span>
            </label>

            <Button variant="outline" onClick={() => setCameraOpen(false)} className="cursor-pointer">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

