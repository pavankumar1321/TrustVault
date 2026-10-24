import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { ShieldCheck, Lock, Key, ArrowRight, ShieldAlert, Sparkles, FileCheck, Eye } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const user = await login(email, password, rememberMe);
      
      // Role-based routing as per Section 6
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'owner') {
        navigate('/owner/dashboard');
      } else {
        navigate('/viewer/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError('');
  };

  return (
    <div className="auth-container">
      {/* Left Branding / Security Art Hero Panel */}
      <div className="auth-hero-panel">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <ShieldCheck size={26} color="#FFFFFF" />
          </div>
          <span>TrustVault</span>
        </div>

        <div className="auth-hero-content">
          <div style={{ marginBottom: '1.5rem' }}>
            <span className="auth-feature-pill">
              <Sparkles size={14} color="#14B8A6" /> Zero-Trust Architecture
            </span>
          </div>
          <h2>Your documents.<br />Your control.</h2>
          <p>
            Cryptographically verified document sharing with real-time audit trails,
            instant revocation enforcement, and granular role-based permissions.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#E0E7FF', fontSize: '0.92rem' }}>
              <div style={{ background: 'rgba(91,95,239,0.3)', padding: '6px', borderRadius: '8px' }}>
                <Lock size={16} color="#14B8A6" />
              </div>
              <span>Immediate server-side access revocation on every request</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#E0E7FF', fontSize: '0.92rem' }}>
              <div style={{ background: 'rgba(91,95,239,0.3)', padding: '6px', borderRadius: '8px' }}>
                <FileCheck size={16} color="#14B8A6" />
              </div>
              <span>Immutable, tamper-evident audit logging for forensic transparency</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#E0E7FF', fontSize: '0.92rem' }}>
              <div style={{ background: 'rgba(91,95,239,0.3)', padding: '6px', borderRadius: '8px' }}>
                <ShieldAlert size={16} color="#14B8A6" />
              </div>
              <span>Zero public admin registration — hardened role boundaries</span>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: '#667085', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
          Protected by Argon2id / bcrypt salted hashing and secure HTTP-only sessions.
        </div>
      </div>

      {/* Right Login Card Panel */}
      <div className="auth-form-panel">
        <div className="auth-card">
          <div className="auth-card-header">
            <h3>Sign in to TrustVault</h3>
            <p>Enter your credentials to access your secure documents</p>
          </div>

          {error && <Alert type="error" message={error} />}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. alice.owner@trustvault.com"
              required
              autoFocus
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              required
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', fontSize: '0.88rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Remember this device
              </label>

              <span
                style={{ color: 'var(--text-muted)', fontSize: '0.82rem', cursor: 'help' }}
                title="Self-service password reset is disabled in high-security mode. Contact system administrator."
              >
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', padding: '0.8rem' }}
            >
              Sign In <ArrowRight size={18} />
            </Button>
          </form>

          {/* Quick Demo Credentials Autofill for Hackathon Evaluators */}
          <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              Hackathon Quick Demo Fill:
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleDemoFill('admin@trustvault.com', 'AdminPass123!')}
                style={{ fontSize: '0.74rem', padding: '5px 12px', borderRadius: '6px', border: '1px solid #8B5CF6', background: '#F5F3FF', color: '#6D28D9', fontWeight: 600, cursor: 'pointer' }}
              >
                🛡️ Admin
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('alice.owner@trustvault.com', 'AlicePass123!')}
                style={{ fontSize: '0.74rem', padding: '5px 12px', borderRadius: '6px', border: '1px solid #2563EB', background: '#EFF6FF', color: '#1D4ED8', fontWeight: 600, cursor: 'pointer' }}
              >
                🔑 Owner
              </button>
              <button
                type="button"
                onClick={() => handleDemoFill('bob.viewer@trustvault.com', 'BobPass123!')}
                style={{ fontSize: '0.74rem', padding: '5px 12px', borderRadius: '6px', border: '1px solid #0D9488', background: '#F0FDFA', color: '#115E59', fontWeight: 600, cursor: 'pointer' }}
              >
                👁️ Viewer
              </button>
            </div>
          </div>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              Create an account
            </Link>
          </div>

          <div
            style={{
              marginTop: '1.5rem',
              background: 'var(--bg-subtle)',
              padding: '0.75rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.76rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}
          >
            🔒 Security Notice: Access is governed by strict authorization checks on every request.
          </div>
        </div>
      </div>
    </div>
  );
}
