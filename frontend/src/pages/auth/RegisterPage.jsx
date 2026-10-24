import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import Alert from '../../components/common/Alert';
import { ShieldCheck, ShieldAlert, Check, X, ArrowRight, Info, Eye, Upload } from 'lucide-react';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState('viewer');
  const [roleReason, setRoleReason] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  // Password Strength Calculations
  const hasMinLen = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const isPasswordStrong = hasMinLen && hasUpper && hasLower && hasDigit;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreeTerms) {
      setError('You must agree to the security policy and terms.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!isPasswordStrong) {
      setError('Please ensure your password meets all complexity requirements.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
        requested_role: requestedRole,
        role_reason: requestedRole === 'owner' ? roleReason : undefined,
        agree_terms: agreeTerms,
      });

      setSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      {/* Left Hero Panel */}
      <div className="auth-hero-panel">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <ShieldCheck size={26} color="#FFFFFF" />
          </div>
          <span>TrustVault</span>
        </div>

        <div className="auth-hero-content">
          <h2>Secure Document Sharing with Real Audit Trails</h2>
          <p>
            Join TrustVault to safeguard your sensitive documents. Every action,
            view, download, and permission change is recorded in an immutable,
            durable audit log.
          </p>

          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '1.25rem',
              borderRadius: 'var(--radius-lg)',
              marginTop: '1.5rem',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.5rem', color: '#14B8A6', fontWeight: 700 }}>
              <ShieldAlert size={18} />
              <span>Strict Role Policy</span>
            </div>
            <p style={{ color: '#E0E7FF', fontSize: '0.85rem', lineHeight: 1.5 }}>
              Public registration assigns the <strong>Viewer</strong> role only. Users requesting the <strong>Owner</strong> role require administrator verification before upload permissions are granted. Administrator accounts can never be created via public registration.
            </p>
          </div>
        </div>

        <div style={{ fontSize: '0.82rem', color: '#667085' }}>
          Industry-grade protection for corporate governance, audits, and compliance.
        </div>
      </div>

      {/* Right Registration Form */}
      <div className="auth-form-panel">
        <div className="auth-card" style={{ maxWidth: '480px' }}>
          <div className="auth-card-header">
            <h3>Create your Account</h3>
            <p>Start sharing and auditing private documents securely</p>
          </div>

          {error && <Alert type="error" message={error} />}
          {success && <Alert type="success" message={success} />}

          <form onSubmit={handleSubmit}>
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. John Doe"
              required
            />

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john.doe@trustvault.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
            />

            {/* Password Strength Checklist */}
            <div style={{ background: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.2rem', fontSize: '0.78rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                Password Requirements:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasMinLen ? 'var(--success)' : 'var(--text-muted)' }}>
                  {hasMinLen ? <Check size={14} /> : <X size={14} />} 8+ characters
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasUpper ? 'var(--success)' : 'var(--text-muted)' }}>
                  {hasUpper ? <Check size={14} /> : <X size={14} />} Uppercase letter
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasLower ? 'var(--success)' : 'var(--text-muted)' }}>
                  {hasLower ? <Check size={14} /> : <X size={14} />} Lowercase letter
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasDigit ? 'var(--success)' : 'var(--text-muted)' }}>
                  {hasDigit ? <Check size={14} /> : <X size={14} />} Number (0-9)
                </span>
              </div>
            </div>

            <Input
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter password"
              required
            />

            {/* Interactive Visual Role Cards */}
            <div className="form-group">
              <label className="form-label">Select Your Account Type</label>
              <div className="role-picker-grid">
                <div
                  className={`role-picker-card ${requestedRole === 'viewer' ? 'selected-viewer' : ''}`}
                  onClick={() => setRequestedRole('viewer')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#0F766E' }}>
                      <Eye size={18} />
                      <span>Viewer</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#CCFBF1', color: '#0F766E', borderRadius: '4px', fontWeight: 700 }}>
                      INSTANT
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Access, view, and download confidential documents shared with you.
                  </p>
                </div>

                <div
                  className={`role-picker-card ${requestedRole === 'owner' ? 'selected-owner' : ''}`}
                  onClick={() => setRequestedRole('owner')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#1E40AF' }}>
                      <Upload size={18} />
                      <span>Owner</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: '#DBEAFE', color: '#1E40AF', borderRadius: '4px', fontWeight: 700 }}>
                      APPROVAL
                    </span>
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    Upload confidential documents, grant permissions, and view audit trails.
                  </p>
                </div>
              </div>
            </div>

            {requestedRole === 'owner' && (
              <div className="form-group">
                <label className="form-label">Business Justification for Owner Role</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  value={roleReason}
                  onChange={(e) => setRoleReason(e.target.value)}
                  placeholder="Explain why you require document upload and sharing privileges..."
                  required
                />
              </div>
            )}

            <div style={{ marginBottom: '1.5rem', fontSize: '0.86rem' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-main)' }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  style={{ marginTop: '3px' }}
                  required
                />
                <span>
                  I agree to the TrustVault Security & Audit Policies and acknowledge that all access attempts are logged.
                </span>
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              style={{ width: '100%', padding: '0.8rem' }}
            >
              Create Account <ArrowRight size={18} />
            </Button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
