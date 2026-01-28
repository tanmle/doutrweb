'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

type ToastVariant = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  success: (message: string, options?: { duration?: number }) => void;
  error: (message: string, options?: { duration?: number }) => void;
  info: (message: string, options?: { duration?: number }) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DURATION_MS = 4000;

const VARIANT_STYLES: Record<ToastVariant, React.CSSProperties> = {
  success: {
    borderColor: 'rgba(34, 197, 94, 0.6)',
    background: 'rgba(34, 197, 94, 0.15)',
    color: '#86efac'
  },
  error: {
    borderColor: 'rgba(239, 68, 68, 0.7)',
    background: 'rgba(239, 68, 68, 0.12)',
    color: '#fca5a5'
  },
  info: {
    borderColor: 'var(--border)',
    background: 'rgba(255, 255, 255, 0.06)',
    color: 'var(--foreground)'
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(item => item.id !== id));
  }, []);

  const addToast = useCallback((message: string, variant: ToastVariant, duration?: number) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts(prev => [...prev, { id, message, variant }]);
    window.setTimeout(() => removeToast(id), duration || TOAST_DURATION_MS);
  }, [removeToast]);

  const value = useMemo<ToastContextValue>(() => ({
    success: (message: string, options) => addToast(message, 'success', options?.duration),
    error: (message: string, options) => addToast(message, 'error', options?.duration),
    info: (message: string, options) => addToast(message, 'info', options?.duration)
  }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        style={{
          position: 'fixed',
          right: '1.5rem',
          bottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          zIndex: 1000,
          maxWidth: '360px'
        }}
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              background: 'var(--card-background, #111)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              fontSize: '0.875rem',
              lineHeight: 1.4,
              ...VARIANT_STYLES[toast.variant]
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
