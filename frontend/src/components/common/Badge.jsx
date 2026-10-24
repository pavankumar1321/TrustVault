import React from 'react';

export default function Badge({ children, variant = 'default', icon: Icon, className = '' }) {
  const variantClass = {
    admin: 'badge-admin',
    owner: 'badge-owner',
    viewer: 'badge-viewer',
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    default: 'badge-viewer',
  }[variant] || 'badge-viewer';

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}
