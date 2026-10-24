import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import { Download, ShieldCheck, Copy, Check, FileText } from 'lucide-react';
import { documentsApi } from '../../api/documents';

export default function DocumentDetailsModal({ isOpen, onClose, document: doc }) {
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!doc) return null;

  const handleDownload = async () => {
    try {
      setDownloading(true);
      await documentsApi.downloadDocument(doc.id, doc.original_filename);
    } catch (err) {
      alert(err.message || 'Download was denied by server.');
    } finally {
      setDownloading(false);
    }
  };

  const copyChecksum = () => {
    if (doc.checksum) {
      navigator.clipboard.writeText(doc.checksum);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Document Security Details"
      maxWidth="580px"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            onClick={handleDownload}
            loading={downloading}
            icon={Download}
          >
            Download Document
          </Button>
        </>
      }
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{doc.title}</h4>
          <Badge variant="owner">{doc.category}</Badge>
        </div>

        {doc.description && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            {doc.description}
          </p>
        )}

        <div
          style={{
            background: 'var(--bg-subtle)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.88rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                Original File
              </span>
              <span style={{ fontWeight: 600, wordBreak: 'break-all' }}>{doc.original_filename}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                File Size
              </span>
              <span style={{ fontWeight: 600 }}>{(doc.file_size / 1024).toFixed(1)} KB</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                MIME Type
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{doc.mime_type}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                Uploaded Date
              </span>
              <span>{new Date(doc.created_at).toLocaleString()}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                Owner
              </span>
              <span style={{ fontWeight: 600 }}>{doc.owner?.full_name || `User ID ${doc.owner_id}`}</span>
            </div>

            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                Your Permission
              </span>
              <Badge variant={doc.user_permission === 'owner' ? 'owner' : 'success'}>
                {doc.user_permission?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        {/* Cryptographic Hash Verification */}
        <div>
          <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '0.35rem' }}>
            SHA-256 Cryptographic Checksum (Integrity Proof)
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.65rem 0.85rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              color: '#344054',
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {doc.checksum}
            </span>
            <button
              onClick={copyChecksum}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: copied ? 'var(--success)' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginLeft: '8px',
              }}
              title="Copy Checksum"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
