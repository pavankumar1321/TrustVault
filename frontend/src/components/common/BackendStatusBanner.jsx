import React, { useEffect, useState } from 'react';

/**
 * BackendStatusBanner
 * Shows a persistent banner on auth pages when the backend is unreachable.
 * Polls /api/health every 5 seconds to auto-dismiss when backend comes back.
 */
export default function BackendStatusBanner() {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const checkBackend = async () => {
    try {
      const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        setOffline(false);
      } else {
        setOffline(true);
      }
    } catch {
      setOffline(true);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 6000);
    return () => clearInterval(interval);
  }, []);

  if (checking || !offline || dismissed) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: 'linear-gradient(90deg, #7F1D1D, #991B1B)',
      color: '#FEE2E2',
      padding: '12px 20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1rem',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      fontSize: '0.88rem',
      fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1.1rem' }}>🔴</span>
        <div>
          <strong>Backend server is offline</strong>
          {' — '}
          <span>
            Open a terminal in the project folder and run:{' '}
            <code style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#FCA5A5',
            }}>
              python run_backend.py
            </code>
            {' '}or double-click{' '}
            <code style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '2px 8px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontWeight: 700,
              color: '#FCA5A5',
            }}>
              run_trustvault.bat
            </code>
          </span>
        </div>
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        fontSize: '0.78rem',
        opacity: 0.9,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        <span>Auto-retrying…</span>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff',
            borderRadius: '4px',
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: '0.75rem',
          }}
        >
          ✕ Dismiss
        </button>
      </div>
    </div>
  );
}
