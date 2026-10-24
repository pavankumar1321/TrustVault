import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import DocumentDetailsModal from '../../components/documents/DocumentDetailsModal';
import EditMetadataModal from '../../components/documents/EditMetadataModal';
import { documentsApi } from '../../api/documents';
import {
  Share2,
  Download,
  Eye,
  Edit,
  Shield,
  FileCheck,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ViewerDashboard() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const fetchSharedDocs = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await documentsApi.getDocuments({ limit: 10 });
      setDocuments(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load shared documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSharedDocs();
  }, []);

  const handleDownload = async (doc) => {
    try {
      await documentsApi.downloadDocument(doc.id, doc.original_filename);
    } catch (err) {
      alert(`Access Denied: ${err.message}. If your permission was recently revoked, the server immediately denies access.`);
      fetchSharedDocs();
    }
  };

  const readCount = documents.filter((d) => d.user_permission === 'read').length;
  const editCount = documents.filter((d) => d.user_permission === 'edit').length;

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Viewer Workspace</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Welcome, {user?.full_name}. You have access to view and collaborate on documents explicitly shared with you.
        </p>
      </div>

      {error && <Alert type="error" message={error} />}

      {/* Role Upgrade Notice Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #101828 0%, #1A2238 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem 2rem',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <Shield size={20} color="var(--secondary-accent)" />
            <h4 style={{ color: '#FFFFFF', fontSize: '1.1rem' }}>Need to Upload Your Own Documents?</h4>
          </div>
          <p style={{ color: '#98A2B3', fontSize: '0.88rem', maxWidth: '620px' }}>
            As a Viewer, you can only access documents shared with you. If your work requires uploading and managing files, submit an Owner Role request for administrator approval.
          </p>
        </div>
        <Link to="/profile">
          <Button variant="primary" style={{ whiteSpace: 'nowrap' }}>
            Request Owner Role <ArrowRight size={16} />
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div>
            <div className="stat-label">Accessible Documents</div>
            <div className="stat-val">{documents.length}</div>
          </div>
          <div className="stat-icon-box" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
            <Share2 size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Read Permission</div>
            <div className="stat-val">{readCount}</div>
          </div>
          <div className="stat-icon-box" style={{ background: '#ECFDF3', color: '#027A48' }}>
            <Eye size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div>
            <div className="stat-label">Edit Metadata Allowed</div>
            <div className="stat-val">{editCount}</div>
          </div>
          <div className="stat-icon-box" style={{ background: '#FFFAEB', color: '#B54708' }}>
            <Edit size={24} />
          </div>
        </div>
      </div>

      {/* Shared Documents Table Card */}
      <Card
        title="Documents Shared With You"
        subtitle="Access is validated on every request. Tamper attempts and revoked sessions are recorded."
        action={
          <Button variant="secondary" size="sm" onClick={fetchSharedDocs}>
            Refresh
          </Button>
        }
      >
        {loading ? (
          <LoadingSpinner text="Checking authorized documents..." />
        ) : documents.length === 0 ? (
          <EmptyState
            title="No documents shared with you yet"
            description="When a document owner grants you access, the document will appear in this workspace."
          />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Document Title</th>
                  <th>Owner</th>
                  <th>Permission Level</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{doc.title}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{doc.original_filename}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>
                        {doc.owner?.full_name || 'Document Owner'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{doc.owner?.email}</div>
                    </td>
                    <td>
                      <Badge variant={doc.user_permission === 'edit' ? 'warning' : 'success'}>
                        {doc.user_permission?.toUpperCase()}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant="viewer">{doc.category}</Badge>
                    </td>
                    <td style={{ fontSize: '0.86rem' }}>{(doc.file_size / 1024).toFixed(1)} KB</td>
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
                          title="View Details & Checksum"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={Download}
                          onClick={() => handleDownload(doc)}
                          title="Secure Download"
                        >
                          Download
                        </Button>
                        {doc.user_permission === 'edit' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Edit}
                            onClick={() => {
                              setSelectedDoc(doc);
                              setIsEditOpen(true);
                            }}
                            title="Edit Metadata (Authorized)"
                          >
                            Edit
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <DocumentDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        document={selectedDoc}
      />

        <EditMetadataModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          document={selectedDoc}
          onUpdateSuccess={() => fetchSharedDocs()}
        />
      </div>
    </DashboardLayout>
  );
}
