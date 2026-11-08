import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', asChild = false, children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer';

    const variants: Record<string, string> = {
      default: 'bg-primary text-primary-foreground hover:opacity-90 shadow-sm',
      destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm',
      outline: 'border border-border bg-card text-foreground hover:bg-muted hover:text-foreground shadow-xs',
      secondary: 'bg-secondary text-secondary-foreground hover:opacity-80 shadow-xs',
      ghost: 'text-foreground hover:bg-muted hover:text-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
    };

    const sizes: Record<string, string> = {
      default: 'h-9 px-4 py-2 text-sm',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-10 rounded-lg px-6 text-base',
      icon: 'h-9 w-9 p-0',
    };

    const computedClass = `${base} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`;

    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<any>, {
        ref,
        className: `${computedClass} ${(children.props as any).className || ''}`,
        ...props,
      });
    }

    return (
      <button ref={ref} className={computedClass} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
