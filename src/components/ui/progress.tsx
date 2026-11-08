import * as React from 'react';

export function Progress({
  value = 0,
  className = '',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: number }) {
  const percentage = Math.min(100, Math.max(0, value || 0));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percentage}
      className={`relative h-2 w-full overflow-hidden rounded-full bg-secondary ${className}`}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
