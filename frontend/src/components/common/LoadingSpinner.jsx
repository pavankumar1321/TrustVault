import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ text = 'Loading...', fullScreen = false }) {
  if (fullScreen) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          background: 'var(--bg-app)',
        }}
      >
        <Loader2 className="animate-spin" size={36} color="var(--accent)" />
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', fontWeight: 500 }}>{text}</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '3rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem',
      }}
    >
      <Loader2 className="animate-spin" size={28} color="var(--accent)" />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>{text}</p>
    </div>
  );
}
