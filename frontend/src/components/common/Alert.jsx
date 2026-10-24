import React from 'react';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

export default function Alert({ type = 'error', message, children, className = '' }) {
  const config = {
    error: { class: 'alert-error', icon: AlertCircle },
    success: { class: 'alert-success', icon: CheckCircle2 },
    warning: { class: 'alert-warning', icon: AlertTriangle },
    info: { class: 'alert-info', icon: Info },
  }[type] || { class: 'alert-error', icon: AlertCircle };

  const Icon = config.icon;

  if (!message && !children) return null;

  return (
    <div className={`alert ${config.class} ${className}`} role="alert">
      <Icon size={18} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>{message || children}</div>
    </div>
  );
}
