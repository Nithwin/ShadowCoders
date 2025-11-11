import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // This interface extends React.InputHTMLAttributes<HTMLInputElement>
  // It's kept as a separate interface to allow for future extensions
  _futureExtension?: never; // Placeholder to prevent TypeScript error about empty interface
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={`
          flex h-10 w-full rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary
          file:border-0 file:bg-transparent file:text-sm file:font-medium 
          placeholder:text-primary/50
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
          disabled:cursor-not-allowed disabled:opacity-50
          ${className}
        `}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
export { Input };