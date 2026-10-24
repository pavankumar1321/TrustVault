import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import { adminApi } from '../../api/admin';
import {
  Users,
  FileText,
  ShieldAlert,
  ClipboardList,
  TrendingUp,
  XCircle,
  CheckCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

function StatCard({ icon: Icon, label, value, color = 'var(--color-primary)' }) {
  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem' }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `${color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={22} color={color} />
      </div>
      <div>
        <p style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', marginBottom: '0.15rem' }}>
          {label}
        </p>
        <p style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1 }}>
          {value ?? '—'}
        </p>
      </div>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [statsRes, logsRes] = await Promise.all([
          adminApi.getStats(),
          adminApi.getAuditLogs({ limit: 8 }),
        ]);
        setStats(statsRes?.data || statsRes);
        setRecentLogs(logsRes?.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const outcomeIcon = (outcome) => {
    if (outcome === 'success') return <CheckCircle size={14} color="var(--color-success)" />;
    if (outcome === 'denied') return <XCircle size={14} color="var(--color-error)" />;
    return <AlertTriangle size={14} color="var(--color-warning)" />;
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Welcome, {user?.full_name}. Here is a real-time view of your TrustVault system.
          </p>
        </div>

        {error && <Alert type="error" message={error} style={{ marginBottom: '1rem' }} />}

        {loading ? (
          <LoadingSpinner message="Loading system stats…" />
        ) : (
          <>
            {/* Stats grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              <StatCard icon={Users} label="Total Users" value={stats?.total_users} color="var(--color-accent)" />
              <StatCard icon={FileText} label="Total Documents" value={stats?.total_documents} color="var(--color-teal)" />
              <StatCard icon={XCircle} label="Failed Logins (24h)" value={stats?.failed_logins_24h} color="var(--color-error)" />
              <StatCard icon={ShieldAlert} label="Denied Accesses (24h)" value={stats?.denied_access_24h} color="var(--color-warning)" />
              <StatCard icon={Clock} label="Pending Role Requests" value={stats?.pending_role_requests} color="#7c3aed" />
              <StatCard icon={TrendingUp} label="Audit Events (24h)" value={stats?.audit_events_24h} color="var(--color-primary)" />
            </div>

            {/* Quick links */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              {[
                { to: '/admin/users', label: 'Manage Users', icon: Users, color: 'var(--color-accent)' },
                { to: '/admin/role-requests', label: 'Role Requests', icon: ClipboardList, color: '#7c3aed' },
                { to: '/admin/audit-logs', label: 'Audit Logs', icon: ShieldAlert, color: 'var(--color-teal)' },
              ].map(({ to, label, icon: Icon, color }) => (
                <Link
                  key={to}
                  to={to}
                  style={{ textDecoration: 'none' }}
                >
                  <Card
                    hoverable
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '1rem 1.25rem',
                      borderLeft: `4px solid ${color}`,
                      transition: 'box-shadow 0.2s',
                    }}
                  >
                    <Icon size={20} color={color} />
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</span>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Recent audit events */}
            <Card>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Recent Security Events</h2>
              </div>
              {recentLogs.length === 0 ? (
                <EmptyState
                  icon={ShieldAlert}
                  title="No recent events"
                  message="Security events will appear here as the system is used."
                />
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-bg)' }}>
                        {['Time', 'Actor', 'Action', 'Resource', 'Outcome', 'IP'].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '0.625rem 1rem',
                              textAlign: 'left',
                              fontWeight: 600,
                              color: 'var(--color-text-secondary)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentLogs.map((log) => (
                        <tr
                          key={log.id}
                          style={{ borderTop: '1px solid var(--color-border)' }}
                        >
                          <td style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                            {new Date(log.timestamp || log.created_at).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.6rem 1rem', whiteSpace: 'nowrap' }}>{log.actor_email || '—'}</td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            <code style={{ fontSize: '0.78rem', background: '#f1f5f9', padding: '2px 6px', borderRadius: 4 }}>
                              {log.action}
                            </code>
                          </td>
                          <td style={{ padding: '0.6rem 1rem', color: 'var(--color-text-secondary)' }}>
                            {log.resource_type}{log.resource_id ? ` #${log.resource_id}` : ''}
                          </td>
                          <td style={{ padding: '0.6rem 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              {outcomeIcon(log.outcome)}
                              <Badge
                                variant={log.outcome === 'success' ? 'success' : log.outcome === 'denied' ? 'error' : 'warning'}
                              >
                                {log.outcome}
                              </Badge>
                            </div>
                          </td>
                          <td style={{ padding: '0.6rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>
                            {log.ip_address || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ padding: '0.75rem 1.5rem', borderTop: '1px solid var(--color-border)', textAlign: 'right' }}>
                <Link to="/admin/audit-logs" style={{ color: 'var(--color-accent)', fontWeight: 600, fontSize: '0.875rem', textDecoration: 'none' }}>
                  View all audit logs →
                </Link>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
