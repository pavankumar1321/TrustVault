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
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { adminApi } from '../../api/admin';
import { Users, Search, UserCheck, UserX, Shield, ChevronDown } from 'lucide-react';

const ROLES = ['viewer', 'owner', 'admin'];

const roleVariant = (role) => {
  if (role === 'admin') return 'error';
  if (role === 'owner') return 'accent';
  return 'info';
};

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const limit = 15;

  // Role change modal
  const [roleTarget, setRoleTarget] = useState(null); // { user, newRole }
  const [roleLoading, setRoleLoading] = useState(false);

  // Status toggle confirm
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getUsers({ search, role: roleFilter, page, limit });
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openRoleModal = (user, newRole) => setRoleTarget({ user, newRole });

  const confirmRoleChange = async () => {
    if (!roleTarget) return;
    try {
      setRoleLoading(true);
      await adminApi.updateUserRole(roleTarget.user.id, roleTarget.newRole);
      setSuccess(`Role updated: ${roleTarget.user.email} → ${roleTarget.newRole}`);
      setRoleTarget(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update role.');
    } finally {
      setRoleLoading(false);
    }
  };

  const confirmStatusToggle = async () => {
    if (!statusTarget) return;
    try {
      setStatusLoading(true);
      await adminApi.updateUserStatus(statusTarget.id, !statusTarget.is_active);
      setSuccess(`Account ${statusTarget.is_active ? 'deactivated' : 'reactivated'}: ${statusTarget.email}`);
      setStatusTarget(null);
      fetchUsers();
    } catch (err) {
      setError(err.message || 'Failed to update account status.');
    } finally {
      setStatusLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>User Management</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            View, search, and manage all registered users. Role changes are logged in the audit trail.
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} style={{ marginBottom: '1rem' }} />}
        {success && <Alert type="success" message={success} onClose={() => setSuccess('')} style={{ marginBottom: '1rem' }} />}

        {/* Filters */}
        <Card style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px' }}>
              <Input
                label="Search users"
                placeholder="Name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
            <div style={{ flex: '0 0 160px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem', color: 'var(--color-text-primary)' }}>
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                style={{
                  width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8,
                  border: '1px solid var(--color-border)', background: 'white',
                  fontSize: '0.9rem', color: 'var(--color-text-primary)',
                }}
              >
                <option value="">All roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <Button type="submit" variant="primary" icon={<Search size={15} />}>Search</Button>
            {(search || roleFilter) && (
              <Button type="button" variant="ghost" onClick={() => { setSearch(''); setRoleFilter(''); setPage(1); }}>
                Clear
              </Button>
            )}
          </form>
        </Card>

        {/* Table */}
        <Card>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Users ({total})</h2>
          </div>
          {loading ? (
            <LoadingSpinner message="Loading users…" />
          ) : users.length === 0 ? (
            <EmptyState icon={Users} title="No users found" message="Try adjusting the filters." />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)' }}>
                    {['Name', 'Email', 'Role', 'Status', 'Joined', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{u.full_name}</td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant={u.is_active ? 'success' : 'error'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {/* Role change dropdown */}
                          <select
                            value={u.role}
                            onChange={(e) => openRoleModal(u, e.target.value)}
                            style={{
                              padding: '0.35rem 0.5rem', borderRadius: 6, border: '1px solid var(--color-border)',
                              fontSize: '0.8rem', cursor: 'pointer', background: 'white',
                            }}
                          >
                            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                          {/* Activate/Deactivate */}
                          <Button
                            size="sm"
                            variant={u.is_active ? 'danger' : 'success'}
                            icon={u.is_active ? <UserX size={13} /> : <UserCheck size={13} />}
                            onClick={() => setStatusTarget(u)}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
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

      {/* Role change confirmation */}
      <ConfirmDialog
        isOpen={!!roleTarget}
        title="Change User Role"
        message={roleTarget
          ? `Change ${roleTarget.user.full_name}'s role from "${roleTarget.user.role}" to "${roleTarget.newRole}"? This action is logged in the audit trail.`
          : ''}
        confirmLabel="Change Role"
        confirmVariant="primary"
        onConfirm={confirmRoleChange}
        onCancel={() => setRoleTarget(null)}
        loading={roleLoading}
      />

      {/* Status toggle confirmation */}
      <ConfirmDialog
        isOpen={!!statusTarget}
        title={statusTarget?.is_active ? 'Deactivate Account' : 'Reactivate Account'}
        message={statusTarget
          ? statusTarget.is_active
            ? `Deactivate ${statusTarget.full_name}'s account? They will be unable to log in until reactivated.`
            : `Reactivate ${statusTarget.full_name}'s account?`
          : ''}
        confirmLabel={statusTarget?.is_active ? 'Deactivate' : 'Reactivate'}
        confirmVariant={statusTarget?.is_active ? 'danger' : 'primary'}
        onConfirm={confirmStatusToggle}
        onCancel={() => setStatusTarget(null)}
        loading={statusLoading}
      />
    </DashboardLayout>
  );
}
