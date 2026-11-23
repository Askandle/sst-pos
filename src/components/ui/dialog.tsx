import * as React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogContextType {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextType | null>(null);

export function Dialog({
  open = false,
  onOpenChange,
  children,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const [internalOpen, setInternalOpen] = React.useState(open);
  const isControlled = onOpenChange !== undefined;
  const currentOpen = isControlled ? open : internalOpen;

  const handleOpenChange = (val: boolean) => {
    if (!isControlled) {
      setInternalOpen(val);
    }
    onOpenChange?.(val);
  };

  return (
    <DialogContext.Provider value={{ open: currentOpen, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
}

export function DialogTrigger({
  asChild = false,
  children,
  onClick,
  ...props
}: {
  asChild?: boolean;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler;
  [key: string]: any;
}) {
  const ctx = React.useContext(DialogContext);

  const handleClick = (e: React.MouseEvent) => {
    if (asChild && React.isValidElement(children)) {
      const childOnClick = (children.props as { onClick?: React.MouseEventHandler })?.onClick;
      childOnClick?.(e);
    }
    onClick?.(e);
    ctx?.onOpenChange(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      ...props,
      onClick: handleClick,
    });
  }

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

export function DialogContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(DialogContext);

  React.useEffect(() => {
    if (!ctx?.open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        ctx.onOpenChange(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [ctx?.open, ctx]);

  if (!ctx?.open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs transition-opacity"
        onClick={() => ctx.onOpenChange(false)}
      />
      {/* Dialog box */}
      <div
        className={`relative z-10 my-auto w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl transition-all duration-200 ${
          className.includes('p-0') ? '' : 'p-6'
        } ${className}`}
        onClick={(e) => e.stopPropagation()}
        {...props}
      >
        <button
          type="button"
          onClick={() => ctx.onOpenChange(false)}
          aria-label="Close dialog"
          className="absolute right-4 top-4 z-20 rounded-lg opacity-75 hover:opacity-100 hover:bg-muted/60 transition-all p-1.5 cursor-pointer"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
        {children}
      </div>
    </div>,
    document.body
  );
}

export function DialogHeader({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col space-y-1.5 text-center sm:text-left mb-4 ${className}`} {...props} />;
}

export function DialogTitle({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-lg font-semibold leading-none tracking-tight text-foreground ${className}`} {...props} />;
}

export function DialogDescription({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-sm text-muted-foreground ${className}`} {...props} />;
}

export function DialogFooter({
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 ${className}`} {...props} />;
}
