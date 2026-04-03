'use client';

import React from 'react';
import { cn } from '../lib/cn';

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  placeholder?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, children, ...props }, ref) => {
    return (
      <select
        className={cn(
          'flex h-9 w-full rounded-md border bg-white px-3 py-1 text-sm text-gray-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-red-500' : 'border-gray-300',
          className,
        )}
        ref={ref}
        {...props}
      >
        {placeholder && (
          <option value="" disabled style={{ color: '#1a1614', backgroundColor: '#fff' }}>
            {placeholder}
          </option>
        )}
        {options
          ? options.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ color: '#1a1614', backgroundColor: '#fff' }}>
                {opt.label}
              </option>
            ))
          : children}
      </select>
    );
  },
);
Select.displayName = 'Select';
