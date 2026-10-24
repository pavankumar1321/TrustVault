import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  LayoutDashboard,
  Files,
  Share2,
  Users,
  GitPullRequest,
  Activity,
  UserCheck,
  LogOut,
  Lock,
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.role || 'viewer';

  const rolePill = {
    admin: { label: 'SECURITY ADMIN', color: '#C4B5FD', bg: 'rgba(139, 92, 246, 0.25)' },
    owner: { label: 'VAULT OWNER', color: '#93C5FD', bg: 'rgba(37, 99, 235, 0.25)' },
    viewer: { label: 'VERIFIED VIEWER', color: '#99F6E4', bg: 'rgba(13, 148, 136, 0.25)' },
  }[role];

  const getNavLinks = () => {
    if (role === 'admin') {
      return [
        { to: '/admin/dashboard', label: 'Admin Command', icon: LayoutDashboard },
        { to: '/admin/users', label: 'User Governance', icon: Users },
        { to: '/admin/role-requests', label: 'Role Requests', icon: GitPullRequest },
        { to: '/admin/audit-logs', label: 'Audit Trail & Logs', icon: Activity },
      ];
    }
    if (role === 'owner') {
      return [
        { to: '/owner/dashboard', label: 'Vault Dashboard', icon: LayoutDashboard },
        { to: '/owner/documents', label: 'My Documents', icon: Files },
        { to: '/owner/shared', label: 'Shared Outward', icon: Share2 },
        { to: '/profile', label: 'Account Profile', icon: UserCheck },
      ];
    }
    // Viewer
    return [
      { to: '/viewer/dashboard', label: 'Viewer Overview', icon: LayoutDashboard },
      { to: '/viewer/shared', label: 'Shared With Me', icon: Share2 },
      { to: '/profile', label: 'Clearance & Profile', icon: UserCheck },
    ];
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="auth-brand-icon">
          <ShieldCheck size={24} color="#FFFFFF" />
        </div>
        <div>
          <div className="sidebar-brand-name">TrustVault</div>
          <div style={{ marginTop: '3px' }}>
            <span
              style={{
                fontSize: '0.65rem',
                fontWeight: 800,
                color: rolePill.color,
                background: rolePill.bg,
                padding: '2px 6px',
                borderRadius: '4px',
                letterSpacing: '0.05em',
              }}
            >
              {rolePill.label}
            </span>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {getNavLinks().map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            width: '100%',
            background: 'none',
            border: 'none',
            color: '#94A3B8',
            fontSize: '0.88rem',
            padding: '0.65rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            textAlign: 'left',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FFFFFF';
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#94A3B8';
            e.currentTarget.style.background = 'none';
          }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
