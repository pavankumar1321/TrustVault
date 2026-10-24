import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Badge from '../common/Badge';
import { Shield, User, LogOut, ShieldCheck, Key, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = user?.role || 'viewer';

  const roleConfig = {
    admin: {
      title: 'Security Command & Audit Ops',
      subtext: 'SYSTEM GOVERNANCE',
      icon: Shield,
      color: '#8B5CF6',
      avatarBg: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
      pulseBg: '#8B5CF6',
    },
    owner: {
      title: 'Enterprise Document Vault',
      subtext: 'VAULT OWNER',
      icon: Key,
      color: '#2563EB',
      avatarBg: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
      pulseBg: '#2563EB',
    },
    viewer: {
      title: 'Verified Reader Portal',
      subtext: 'AUDITED CLEARANCE',
      icon: Eye,
      color: '#0D9488',
      avatarBg: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)',
      pulseBg: '#0D9488',
    },
  }[role];

  const Icon = roleConfig.icon;

  return (
    <header className="top-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `${roleConfig.color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={20} color={roleConfig.color} />
        </div>
        <div>
          <div style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{roleConfig.title}</span>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: roleConfig.pulseBg,
                boxShadow: `0 0 8px ${roleConfig.pulseBg}`,
                display: 'inline-block',
              }}
            />
          </div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: roleConfig.color, letterSpacing: '0.06em' }}>
            {roleConfig.subtext}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: roleConfig.avatarBg,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.95rem',
              boxShadow: `0 2px 8px ${roleConfig.color}40`,
            }}
          >
            {user?.full_name?.charAt(0).toUpperCase() || <User size={18} />}
          </div>
          <div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {user?.full_name}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.1rem' }}>
              <Badge variant={role}>
                {role.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.85rem',
            fontSize: '0.82rem',
            fontWeight: 600,
          }}
          title="Sign Out of TrustVault"
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
