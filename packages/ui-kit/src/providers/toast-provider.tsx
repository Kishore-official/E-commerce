'use client';

import React, { createContext, useCallback, useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  isVisible: boolean;
}

export interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const toastStyles = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => {
      const toast = prev.find((t) => t.id === id);
      if (toast) {
        // Trigger fade-out animation
        return prev.map((t) => (t.id === id ? { ...t, isVisible: false } : t));
      }
      return prev;
    });
    // Remove from DOM after animation
    setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `toast-${++toastId}`;
      const newToast: Toast = { id, type, message, duration, isVisible: false };
      
      setToasts((prev) => [...prev, newToast]);
      
      // Trigger slide-in animation
      setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, isVisible: true } : t)));
      }, 10);

      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {/* Toast display */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
          {toasts.map((toast) => {
            const Icon = toastIcons[toast.type];
            const styleClass = toastStyles[toast.type];
            
            return (
            <div
              key={toast.id}
                className={`
                  pointer-events-auto
                  flex items-center gap-3
                  rounded-lg border-2 px-4 py-3
                  min-w-[320px] max-w-[420px]
                  shadow-lg
                  transition-all duration-300 ease-in-out
                  ${styleClass}
                  ${toast.isVisible 
                    ? 'translate-x-0 opacity-100' 
                    : 'translate-x-full opacity-0'
                  }
                `}
              >
                <Icon 
                  size={20} 
                  className={`flex-shrink-0 ${
                    toast.type === 'success' ? 'text-green-600' :
                    toast.type === 'error' ? 'text-red-600' :
                    toast.type === 'warning' ? 'text-yellow-600' :
                    'text-blue-600'
              }`}
                />
                <span className="flex-1 text-sm font-medium leading-relaxed">
                  {toast.message}
                </span>
              <button
                onClick={() => removeToast(toast.id)}
                  className={`
                    flex-shrink-0
                    p-1 rounded
                    transition-colors
                    hover:bg-black/5
                    ${toast.type === 'success' ? 'text-green-600 hover:text-green-700' :
                      toast.type === 'error' ? 'text-red-600 hover:text-red-700' :
                      toast.type === 'warning' ? 'text-yellow-600 hover:text-yellow-700' :
                      'text-blue-600 hover:text-blue-700'
                    }
                  `}
                  aria-label="Close notification"
              >
                  <X size={16} />
              </button>
            </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}
