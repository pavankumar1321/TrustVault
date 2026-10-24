import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/common/Button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'var(--bg-subtle)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <FileQuestion size={40} />
      </div>

      <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>404 — Page Not Found</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '420px', marginBottom: '2rem', fontSize: '1rem' }}>
        The page or document resource you requested does not exist or has been removed.
      </p>

      <Button variant="primary" onClick={() => navigate('/')} icon={ArrowLeft}>
        Return Home
      </Button>
    </div>
  );
}
