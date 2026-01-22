import React from 'react';

type LoadingIndicatorProps = {
  label?: string;
};

export function LoadingIndicator({ label = 'Loading…' }: LoadingIndicatorProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        padding: '2rem',
        color: 'var(--muted-foreground)',
        fontSize: '0.95rem'
      }}
    >
      {label}
    </div>
  );
}
