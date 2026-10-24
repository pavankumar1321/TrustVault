import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Alert from '../../components/common/Alert';
import { User, Shield, KeyRound, Clock, Send, CheckCircle2 } from 'lucide-react';
import { authApi } from '../../api/auth';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [requestReason, setRequestReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleRequestOwner = async (e) => {
    e.preventDefault();
    if (!requestReason.trim()) {
      setErrorMsg('Please specify a reason for requesting the Owner role.');
      return;
    }

    try {
      setRequestLoading(true);
      setErrorMsg('');
      setSuccessMsg('');
      await authApi.requestOwnerRole(requestReason.trim());
      setSuccessMsg('Owner role request submitted successfully. An administrator will review your request.');
      setRequestReason('');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit role request.');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Account &amp; Security Profile</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Manage your account identity, security status, and role elevation
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Account Details Card */}
          <Card title="User Identity">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '0.5rem' }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Full Name
                </span>
                <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{user?.full_name}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Email Address
                </span>
                <span style={{ fontSize: '0.95rem' }}>{user?.email}</span>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Assigned Role
                </span>
                <div style={{ marginTop: '0.3rem' }}>
                  <Badge variant={user?.role === 'admin' ? 'admin' : user?.role === 'owner' ? 'owner' : 'viewer'}>
                    {user?.role?.toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block' }}>
                  Account Status
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.3rem', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem' }}>
                  <CheckCircle2 size={16} /> Active &amp; Verified
                </div>
              </div>
            </div>
          </Card>

          {/* Role Elevation Card for Viewers */}
          {user?.role === 'viewer' && (
            <Card title="Request Owner Role" subtitle="Elevate permissions to upload and manage documents">
              {errorMsg && <Alert type="error" message={errorMsg} />}
              {successMsg && <Alert type="success" message={successMsg} />}

              <form onSubmit={handleRequestOwner} style={{ marginTop: '0.5rem' }}>
                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: 1.5 }}>
                  Owners can upload private files, manage access permissions, and revoke shared access immediately.
                  Submit your business reason below for administrative approval.
                </p>

                <div className="form-group">
                  <label className="form-label">Business Justification</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="State the project or regulatory need requiring upload rights..."
                    required
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={requestLoading}
                  icon={Send}
                >
                  Submit Role Request
                </Button>
              </form>
            </Card>
          )}

          {/* Security & Audit Policy Card */}
          <Card title="Session &amp; Audit Governance">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <p>
                🛡️ <strong>HTTP-Only Secure Cookie Session:</strong> Your session token is stored exclusively in an encrypted, HTTP-only cookie inaccessible to malicious client scripts.
              </p>
              <p>
                📜 <strong>Fail-Closed Audit Trail:</strong> All authentication attempts, document reads, and permission grants are logged to a tamper-evident audit table.
              </p>
              <p>
                ⚡ <strong>Instant Permission Revocation:</strong> Revoked permissions terminate download access on the very next HTTP request without relying on stale tokens.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
