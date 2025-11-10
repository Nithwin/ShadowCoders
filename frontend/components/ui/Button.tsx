import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={`
          inline-flex items-center justify-center rounded-md text-sm font-medium
          transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
          disabled:opacity-50 disabled:cursor-not-allowed
          px-4 py-2
          bg-primary text-secondary shadow-sm hover:bg-primary/80
          ${className}
        `}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
export { Button };