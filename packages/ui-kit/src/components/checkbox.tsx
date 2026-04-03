'use client';

import React from 'react';
import { cn } from '../lib/cn';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const inputId = id || `checkbox-${Math.random().toString(36).slice(2)}`;
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={inputId}
          className={cn(
            'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500',
            className,
          )}
          ref={ref}
          {...props}
        />
        {label && (
          <label htmlFor={inputId} className="text-sm text-gray-700">
            {label}
          </label>
        )}
      </div>
    );
  },
);
Checkbox.displayName = 'Checkbox';
