import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import { adminApi } from '../../api/admin';
import { ClipboardList, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_OPTIONS = ['pending', 'approved', 'denied', 'all'];

const statusVariant = (s) => {
  if (s === 'approved') return 'success';
  if (s === 'denied') return 'error';
  return 'warning';
};

export default function RoleRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const limit = 15;

  // Action modal
  const [actionTarget, setActionTarget] = useState(null); // { req, action: 'approved'|'denied' }
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getRoleRequests({
        status: statusFilter === 'all' ? '' : statusFilter,
        page,
        limit,
      });
      setRequests(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load role requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const openAction = (req, action) => {
    setActionTarget({ req, action });
    setAdminNotes('');
  };

  const submitAction = async () => {
    if (!actionTarget) return;
    try {
      setActionLoading(true);
      await adminApi.handleRoleRequest(actionTarget.req.id, actionTarget.action, adminNotes);
      setSuccess(`Request ${actionTarget.action}: ${actionTarget.req.user_email}`);
      setActionTarget(null);
      fetchRequests();
    } catch (err) {
      setError(err.message || 'Failed to process request.');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Role Requests</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Users may request an elevated role (e.g., Owner). Admins must explicitly approve before any role is granted.
            This prevents privilege escalation — no user can promote themselves.
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} style={{ marginBottom: '1rem' }} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} style={{ marginBottom: '1rem' }} />}

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => { setStatusFilter(s); setPage(1); }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        <Card>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>
              {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)} Requests ({total})
            </h2>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading requests…" />
          ) : requests.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No requests found"
              message={statusFilter === 'pending' ? 'No pending role requests at this time.' : 'No requests match the selected filter.'}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)' }}>
                    {['User', 'Current Role', 'Requested Role', 'Reason', 'Status', 'Requested At', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr key={req.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: 500 }}>{req.user_name || req.user_email}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{req.user_email}</div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant="info">{req.current_role}</Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant="accent">{req.requested_role}</Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', maxWidth: 200 }}>
                        <span title={req.reason} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {req.reason || '—'}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant={statusVariant(req.status)}>{req.status}</Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(req.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {req.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <Button
                              size="sm"
                              variant="success"
                              icon={<CheckCircle size={13} />}
                              onClick={() => openAction(req, 'approved')}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              icon={<XCircle size={13} />}
                              onClick={() => openAction(req, 'denied')}
                            >
                              Deny
                            </Button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                            {req.admin_notes ? `Note: ${req.admin_notes}` : 'No notes'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--color-border)' }}>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </Card>
      </div>

      {/* Action modal */}
      <Modal
        isOpen={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={actionTarget?.action === 'approved' ? 'Approve Role Request' : 'Deny Role Request'}
      >
        {actionTarget && (
          <div>
            <p style={{ marginBottom: '1rem', color: 'var(--color-text-secondary)' }}>
              {actionTarget.action === 'approved'
                ? `You are about to grant "${actionTarget.req.requested_role}" role to ${actionTarget.req.user_email}. This will immediately change their permissions.`
                : `You are about to deny the role request from ${actionTarget.req.user_email}. Their current role will not change.`}
            </p>
            <Input
              label="Admin Notes (optional)"
              placeholder="Add a reason or notes for this decision…"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              style={{ marginBottom: '1.25rem' }}
            />
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setActionTarget(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant={actionTarget.action === 'approved' ? 'success' : 'danger'}
                onClick={submitAction}
                loading={actionLoading}
              >
                {actionTarget.action === 'approved' ? 'Approve' : 'Deny'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
