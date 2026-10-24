import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import UploadModal from '../../components/documents/UploadModal';
import ShareModal from '../../components/documents/ShareModal';
import DocumentDetailsModal from '../../components/documents/DocumentDetailsModal';
import EditMetadataModal from '../../components/documents/EditMetadataModal';
import { documentsApi } from '../../api/documents';
import {
  Files,
  Share2,
  Upload,
  Download,
  Eye,
  Edit,
  Trash2,
  ShieldCheck,
  Clock,
} from 'lucide-react';

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteDocTarget, setDeleteDocTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await documentsApi.getDocuments({ limit: 8 });
      setDocuments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDeleteConfirm = async () => {
    if (!deleteDocTarget) return;
    try {
      setDeleteLoading(true);
      await documentsApi.deleteDocument(deleteDocTarget.id);
      setDeleteDocTarget(null);
      await fetchDocs();
    } catch (err) {
      alert(err.message || 'Failed to delete document.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      await documentsApi.downloadDocument(doc.id, doc.original_filename);
    } catch (err) {
      alert(err.message || 'Download was denied.');
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Welcome Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Owner Dashboard</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Welcome back, {user?.full_name}. Manage your confidential files and control access permissions.
          </p>
        </div>
        <Button variant="primary" icon={Upload} onClick={() => setIsUploadOpen(true)}>
          Upload Document
        </Button>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Metric Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">My Documents</div>
            <div className="stat-val">{documents.length}</div>
          </div>
          <div className="stat-icon-box" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Files size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Ownership Role</div>
            <div className="stat-val" style={{ fontSize: '1.25rem', marginTop: '0.6rem' }}>
              <Badge variant="owner">ACTIVE OWNER</Badge>
            </div>
          </div>
          <div className="stat-icon-box" style={{ background: '#ECFDF3', color: '#027A48' }}>
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Security Policy</div>
            <div className="stat-val" style={{ fontSize: '1.1rem', marginTop: '0.6rem', color: 'var(--secondary-accent)' }}>
              Zero-Trust
            </div>
          </div>
          <div className="stat-icon-box" style={{ background: '#F0FDFA', color: '#0D9488' }}>
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Recent Documents Table Card */}
      <Card
        title="My Uploaded Documents"
        subtitle="Confidential documents stored in private storage. Grant or revoke access immediately."
        action={
          <Button variant="secondary" size="sm" onClick={fetchDocs}>
            Refresh
          </Button>
        }
      >
        {loading ? (
          <LoadingSpinner text="Fetching secure documents..." />
        ) : documents.length === 0 ? (
          <EmptyState
            title="No documents uploaded yet"
            description="Upload your first confidential document to start sharing with designated users."
            actionText="Upload Document"
            onAction={() => setIsUploadOpen(true)}
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Upload Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{doc.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{doc.original_filename}</div>
                    </td>
                    <td>
                      <Badge variant="viewer">{doc.category}</Badge>
                    </td>
                    <td style={{ fontSize: '0.86rem' }}>{(doc.file_size / 1024).toFixed(1)} KB</td>
                    <td style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Eye}
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsDetailsOpen(true);
                          }}
                          title="View Details"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Share2}
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsShareOpen(true);
                          }}
                          title="Share & Permissions"
                        >
                          Share
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Edit}
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsEditOpen(true);
                          }}
                          title="Edit Metadata"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Download}
                          onClick={() => handleDownload(doc)}
                          title="Download"
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          icon={Trash2}
                          onClick={() => setDeleteDocTarget(doc)}
                          title="Delete Document"
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => fetchDocs()}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        document={selectedDoc}
      />

      <DocumentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        document={selectedDoc}
      />

      <EditMetadataModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        document={selectedDoc}
        onUpdateSuccess={() => fetchDocs()}
      />

        <ConfirmDialog
          isOpen={!!deleteDocTarget}
          onClose={() => setDeleteDocTarget(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete "${deleteDocTarget?.title}"?`}
          message="This action will permanently delete the file from private storage and revoke all user permissions immediately. This action cannot be undone."
          confirmText="Delete Document"
          confirmVariant="danger"
          loading={deleteLoading}
        />
      </div>
    </DashboardLayout>
  );
}
