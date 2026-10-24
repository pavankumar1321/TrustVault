import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import Pagination from '../../components/common/Pagination';
import { adminApi } from '../../api/admin';
import { ShieldAlert, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const ACTIONS = ['', 'login', 'logout', 'upload', 'download', 'delete', 'permission_grant', 'permission_revoke', 'role_change'];
const OUTCOMES = ['', 'success', 'denied', 'error'];
const RESOURCE_TYPES = ['', 'user', 'document', 'permission', 'role_request', 'session'];

const outcomeVariant = (o) => {
  if (o === 'success') return 'success';
  if (o === 'denied') return 'error';
  return 'warning';
};

const outcomeIcon = (o) => {
  if (o === 'success') return <CheckCircle size={13} color="var(--color-success)" />;
  if (o === 'denied') return <XCircle size={13} color="var(--color-error)" />;
  return <AlertTriangle size={13} color="var(--color-warning)" />;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 25;

  // Filters
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [actorEmail, setActorEmail] = useState('');
  const [resourceType, setResourceType] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getAuditLogs({ action, outcome, actorEmail, resourceType, page, limit });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [action, outcome, actorEmail, resourceType, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setAction('');
    setOutcome('');
    setActorEmail('');
    setResourceType('');
    setPage(1);
  };

  const hasFilters = action || outcome || actorEmail || resourceType;
  const totalPages = Math.ceil(total / limit);

  const selectStyle = {
    padding: '0.6rem 0.75rem',
    borderRadius: 8,
    border: '1px solid var(--color-border)',
    background: 'white',
    fontSize: '0.875rem',
    color: 'var(--color-text-primary)',
    width: '100%',
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Audit Logs</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Immutable, append-only record of every security-relevant event. Use filters to investigate specific actors or events.
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} style={{ marginBottom: '1rem' }} />}

        {/* Filter bar */}
        <Card style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearch}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.3rem' }}>Actor Email</label>
                <Input
                  placeholder="user@example.com"
                  value={actorEmail}
                  onChange={(e) => setActorEmail(e.target.value)}
                  icon={<Search size={14} />}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.3rem' }}>Action</label>
                <select value={action} onChange={(e) => setAction(e.target.value)} style={selectStyle}>
                  <option value="">All actions</option>
                  {ACTIONS.filter(Boolean).map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.3rem' }}>Outcome</label>
                <select value={outcome} onChange={(e) => setOutcome(e.target.value)} style={selectStyle}>
                  <option value="">All outcomes</option>
                  {OUTCOMES.filter(Boolean).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.3rem' }}>Resource Type</label>
                <select value={resourceType} onChange={(e) => setResourceType(e.target.value)} style={selectStyle}>
                  <option value="">All types</option>
                  {RESOURCE_TYPES.filter(Boolean).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button type="submit" variant="primary" size="sm" icon={<Search size={14} />}>Apply Filters</Button>
              {hasFilters && (
                <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>Clear Filters</Button>
              )}
            </div>
          </form>
        </Card>

        {/* Log table */}
        <Card>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Events ({total.toLocaleString()})</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>Showing {logs.length} of {total}</span>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading audit logs…" />
          ) : logs.length === 0 ? (
            <EmptyState
              icon={ShieldAlert}
              title="No events found"
              message={hasFilters ? 'Try adjusting or clearing your filters.' : 'Audit events will appear here as the system is used.'}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)' }}>
                    {['#', 'Timestamp', 'Actor', 'Action', 'Resource', 'Outcome', 'IP Address', 'Details'].map((h) => (
                      <th key={h} style={{ padding: '0.55rem 0.875rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.55rem 0.875rem', color: 'var(--color-text-secondary)' }}>{log.id}</td>
                      <td style={{ padding: '0.55rem 0.875rem', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
                        {new Date(log.timestamp || log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.55rem 0.875rem' }}>
                        <div style={{ fontWeight: 500 }}>{log.actor_email || 'System'}</div>
                        {log.actor_role && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)' }}>{log.actor_role}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.55rem 0.875rem' }}>
                        <code style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '2px 5px', borderRadius: 4 }}>
                          {log.action}
                        </code>
                      </td>
                      <td style={{ padding: '0.55rem 0.875rem', color: 'var(--color-text-secondary)' }}>
                        {log.resource_type}
                        {log.resource_id ? <span style={{ color: 'var(--color-text-primary)', marginLeft: '0.25rem' }}>#{log.resource_id}</span> : null}
                      </td>
                      <td style={{ padding: '0.55rem 0.875rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {outcomeIcon(log.outcome)}
                          <Badge variant={outcomeVariant(log.outcome)} style={{ fontSize: '0.72rem' }}>{log.outcome}</Badge>
                        </div>
                      </td>
                      <td style={{ padding: '0.55rem 0.875rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {log.ip_address || '—'}
                      </td>
                      <td style={{ padding: '0.55rem 0.875rem', color: 'var(--color-text-secondary)', maxWidth: 180 }}>
                        {(log.details || log.reason) ? (
                          <span title={typeof (log.details || log.reason) === 'object' ? JSON.stringify(log.details || log.reason) : (log.details || log.reason)}
                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {typeof (log.details || log.reason) === 'object' ? JSON.stringify(log.details || log.reason) : (log.details || log.reason)}
                          </span>
                        ) : '—'}
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
    </DashboardLayout>
  );
}
