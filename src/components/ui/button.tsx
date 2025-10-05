import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 disabled:cursor-not-allowed',
          {
            'bg-blue-600 text-white shadow hover:bg-blue-700 focus:ring-blue-500': variant === 'default',
            'bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-500': variant === 'destructive',
            'border border-gray-300 bg-white text-gray-900 shadow-sm hover:bg-gray-50 focus:ring-blue-500': variant === 'outline',
            'bg-gray-100 text-gray-900 shadow-sm hover:bg-gray-200 focus:ring-gray-500': variant === 'secondary',
            'text-gray-900 hover:bg-gray-100 focus:ring-gray-500': variant === 'ghost',
            'text-blue-600 underline-offset-4 hover:underline focus:ring-blue-500': variant === 'link',
          },
          {
            'h-9 px-4 py-2': size === 'default',
            'h-8 rounded-md px-3 text-xs': size === 'sm',
            'h-10 rounded-md px-8': size === 'lg',
            'h-9 w-9': size === 'icon',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };