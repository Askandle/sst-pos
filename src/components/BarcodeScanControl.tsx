import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScanBarcode, Camera, CornerDownLeft } from 'lucide-react';
import { toast } from 'sonner';

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
  const [cameraError, setCameraError] = useState<string | null>(null);
  const internalRef = useRef<HTMLInputElement>(null);
  const resolvedRef = externalRef || internalRef;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

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

  useEffect(() => {
    if (!cameraOpen) return;

    let cancelled = false;
    setCameraError(null);

    const startCamera = async () => {
      const BarcodeDetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts?: { formats?: string[] }) => {
            detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
          };
        }
      ).BarcodeDetector;

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is not available in this browser.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        if (!BarcodeDetectorCtor) {
          setCameraError(
            'Live camera barcode decoding is not supported in this browser. Connect a USB or Bluetooth handheld barcode scanner instead.'
          );
          return;
        }

        const detector = new BarcodeDetectorCtor({
          formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
        });

        const scanFrame = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const detected = await detector.detect(videoRef.current);
              const first = detected.find((d) => d.rawValue);
              if (first?.rawValue) {
                const code = first.rawValue.trim();
                setCameraOpen(false);
                onScan(code);
                return;
              }
            }
          } catch {
            // Ignore frame read transient errors
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        };

        rafRef.current = requestAnimationFrame(scanFrame);
      } catch (err) {
        setCameraError(
          err instanceof Error ? err.message : 'Unable to start camera for barcode scanning.'
        );
      }
    };

    void startCamera();

    return () => {
      cancelled = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [cameraOpen, onScan]);

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
            className="h-10 px-3 rounded-xl border-2 border-border hover:border-sky-500 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Camera className="h-4 w-4 mr-1.5" />
            Camera
          </Button>
        </div>
      </form>

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="sm:max-w-md glass-surface border-2 border-sky-500/35 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-sky-600 dark:text-sky-400" />
              Camera Barcode Scanner
            </DialogTitle>
            <DialogDescription>
              Point the camera at a product barcode to scan it automatically.
            </DialogDescription>
          </DialogHeader>

          {cameraError ? (
            <div className="p-4 rounded-xl bg-muted/60 border border-border text-sm text-muted-foreground">
              {cameraError}
            </div>
          ) : (
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-border">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setCameraOpen(false)} className="cursor-pointer">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
