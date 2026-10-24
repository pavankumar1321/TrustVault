import React from 'react';
import { FolderOpen } from 'lucide-react';
import Button from './Button';

export default function EmptyState({
  icon: Icon = FolderOpen,
  title = 'No items found',
  description = 'There are no records matching your query.',
  actionText,
  onAction,
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon-box">
        <Icon size={32} />
      </div>
      <h4 style={{ fontSize: '1.15rem', marginBottom: '0.4rem' }}>{title}</h4>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '380px', margin: '0 auto 1.25rem' }}>
        {description}
      </p>
      {actionText && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
}
