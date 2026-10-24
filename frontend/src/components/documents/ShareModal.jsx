import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Alert from '../common/Alert';
import { UserPlus, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';
import { permissionsApi } from '../../api/permissions';

export default function ShareModal({ isOpen, onClose, document: doc }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantLevel, setGrantLevel] = useState('read');
  const [grantLoading, setGrantLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPermissions = async () => {
    if (!doc?.id) return;
    try {
      setLoading(true);
      setError('');
      const res = await permissionsApi.getPermissions(doc.id);
      setPermissions(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch document permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && doc?.id) {
      fetchPermissions();
      setGrantEmail('');
      setError('');
      setSuccess('');
    }
  }, [isOpen, doc]);

  const handleGrant = async (e) => {
    e.preventDefault();
    if (!grantEmail.trim()) {
      setError('Please enter a recipient email.');
      return;
    }
    try {
      setGrantLoading(true);
      setError('');
      setSuccess('');
      await permissionsApi.grantPermission(doc.id, grantEmail.trim(), grantLevel);
      setSuccess(`Access granted to ${grantEmail}.`);
      setGrantEmail('');
      await fetchPermissions();
    } catch (err) {
      setError(err.message || 'Failed to grant permission.');
    } finally {
      setGrantLoading(false);
    }
  };

  const handleUpdateLevel = async (permId, newLevel) => {
    try {
      setError('');
      await permissionsApi.updatePermission(doc.id, permId, newLevel);
      setSuccess('Permission level updated.');
      await fetchPermissions();
    } catch (err) {
      setError(err.message || 'Failed to update permission level.');
    }
  };

  const handleRevoke = async (permId, userEmail) => {
    try {
      setError('');
      await permissionsApi.revokePermission(doc.id, permId);
      setSuccess(`Access revoked immediately for ${userEmail}. Next request will be denied.`);
      await fetchPermissions();
    } catch (err) {
      setError(err.message || 'Failed to revoke permission.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Share "${doc?.title || 'Document'}"`}
      maxWidth="620px"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div>
        {error && <Alert type="error" message={error} />}
        {success && <Alert type="success" message={success} />}

        {/* Grant New Permission Form */}
        <form
          onSubmit={handleGrant}
          style={{
            background: 'var(--bg-subtle)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-color)',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
            <UserPlus size={18} color="var(--accent)" />
            <h4 style={{ fontSize: '0.98rem' }}>Grant Document Access</h4>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr auto', gap: '0.75rem', alignItems: 'flex-start' }}>
            <Input
              placeholder="Recipient email address..."
              value={grantEmail}
              onChange={(e) => setGrantEmail(e.target.value)}
              type="email"
              required
              className="m-0"
            />

            <select
              className="form-select"
              value={grantLevel}
              onChange={(e) => setGrantLevel(e.target.value)}
              style={{ height: '42px' }}
            >
              <option value="read">Read & Download</option>
              <option value="edit">Edit Metadata & Read</option>
            </select>

            <Button
              type="submit"
              variant="primary"
              loading={grantLoading}
              style={{ height: '42px' }}
            >
              Grant
            </Button>
          </div>
        </form>

        {/* Immediate Revocation Security Notice */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.65rem',
            background: 'var(--warning-bg)',
            border: '1px solid #FEDF89',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            color: '#B54708',
            marginBottom: '1.25rem',
          }}
        >
          <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong>Immediate Revocation Guarantee:</strong> Revoking access destroys the server grant record instantly.
            Any subsequent read or download request by the user is blocked live at the API level with 403 Forbidden.
          </div>
        </div>

        {/* Authorized Users List */}
        <div>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Currently Authorized Users</h4>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>Loading permissions...</p>
          ) : permissions.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontStyle: 'italic', padding: '1rem 0' }}>
              No other users have been granted access yet. This document is strictly private to you.
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Permission</th>
                    <th>Granted Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.user_name || p.user_email}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{p.user_email}</div>
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={p.permission_level}
                          onChange={(e) => handleUpdateLevel(p.id, e.target.value)}
                          style={{ padding: '0.35rem 0.65rem', fontSize: '0.82rem', width: 'auto' }}
                        >
                          <option value="read">read</option>
                          <option value="edit">edit</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          onClick={() => handleRevoke(p.id, p.user_email)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-color)',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            color: 'var(--error)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.8rem',
                          }}
                          title="Revoke Permission Immediately"
                        >
                          <Trash2 size={14} /> Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
