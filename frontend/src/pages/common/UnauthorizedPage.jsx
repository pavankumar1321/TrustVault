import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleReturnDashboard = () => {
    if (user?.role === 'admin') navigate('/admin/dashboard');
    else if (user?.role === 'owner') navigate('/owner/dashboard');
    else navigate('/viewer/dashboard');
  };

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
          background: 'var(--error-bg)',
          color: 'var(--error)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <ShieldAlert size={40} />
      </div>

      <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>403 — Access Denied</h2>
      <p style={{ color: 'var(--text-muted)', maxWidth: '460px', marginBottom: '2rem', fontSize: '1rem', lineHeight: 1.6 }}>
        You do not possess the required security privileges to access this resource.
        This unauthorized access attempt has been logged in the TrustVault audit trail.
      </p>

      <div style={{ display: 'flex', gap: '1rem' }}>
        <Button variant="secondary" onClick={() => navigate(-1)} icon={ArrowLeft}>
          Go Back
        </Button>
        <Button variant="primary" onClick={handleReturnDashboard} icon={Home}>
          Return to My Dashboard
        </Button>
      </div>
    </div>
  );
}
