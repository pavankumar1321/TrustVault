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
import DocumentDetailsModal from '../../components/documents/DocumentDetailsModal';
import { documentsApi } from '../../api/documents';
import { Share2, Search, Eye, Download, FileText, Lock, Edit } from 'lucide-react';

export default function ViewerSharedDocsPage() {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const limit = 10;

  const [detailsDoc, setDetailsDoc] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await documentsApi.getDocuments({ search, category, page, limit });
      setDocuments(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to load shared documents.');
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchDocs();
  };

  const handleDownload = async (doc) => {
    setDownloadError('');
    try {
      await documentsApi.downloadDocument(doc.id, doc.original_filename);
    } catch (err) {
      setDownloadError(
        `Download denied for "${doc.title}": ${err.message}. ` +
        'If your permission was recently revoked, the server enforces this immediately — no cached access.'
      );
      // Refresh document list — permission may have changed
      fetchDocs();
    }
  };

  const totalPages = Math.ceil(total / limit);

  const permIcon = (perm) => {
    if (perm === 'edit') return <Edit size={12} />;
    return <Eye size={12} />;
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Documents Shared With Me</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            These documents have been explicitly shared with your account. You can only see documents you have permission to access.
          </p>
        </div>

        {/* Security callout */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10,
          padding: '0.875rem 1.125rem', marginBottom: '1.5rem',
        }}>
          <Lock size={18} color="#2563eb" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
            <strong>Access is enforced server-side.</strong> Every download is verified against live permissions in real time.
            If a document owner revokes your access, you will be denied immediately — even if you still see the document in this list.
          </div>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} style={{ marginBottom: '1rem' }} />}
        {downloadError && <Alert type="error" message={downloadError} onClose={() => setDownloadError('')} style={{ marginBottom: '1rem' }} />}

        {/* Search */}
        <Card style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 220px' }}>
              <Input
                label="Search"
                placeholder="Document title…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
            <div style={{ flex: '0 0 160px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.35rem' }}>Category</label>
              <select
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                style={{ width: '100%', padding: '0.6rem 0.75rem', borderRadius: 8, border: '1px solid var(--color-border)', background: 'white', fontSize: '0.875rem' }}
              >
                <option value="">All categories</option>
                {['report', 'contract', 'invoice', 'specification', 'presentation', 'other'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="primary" icon={<Search size={15} />}>Search</Button>
            {(search || category) && (
              <Button type="button" variant="ghost" onClick={() => { setSearch(''); setCategory(''); setPage(1); }}>Clear</Button>
            )}
          </form>
        </Card>

        <Card>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Accessible Documents ({total})</h2>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading documents…" />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={Share2}
              title="No documents shared with you"
              message={search || category ? 'No documents match your search.' : 'When a document owner shares a file with you, it will appear here.'}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)' }}>
                    {['Document', 'Owner', 'Category', 'Your Access', 'Shared', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '0.625rem 1rem', textAlign: 'left', fontWeight: 600, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <tr key={doc.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                          <FileText size={18} color="var(--color-teal)" style={{ flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{doc.title}</div>
                            {doc.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>
                                {doc.description.slice(0, 55)}{doc.description.length > 55 ? '…' : ''}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>
                        {doc.owner_name || doc.owner_email || '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {doc.category ? <Badge variant="info">{doc.category}</Badge> : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <Badge variant={doc.user_permission === 'edit' ? 'accent' : 'success'}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            {permIcon(doc.user_permission)}
                            {doc.user_permission || 'read'}
                          </span>
                        </Badge>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => setDetailsDoc(doc)}>
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={<Download size={13} />}
                            onClick={() => handleDownload(doc)}
                            title="Download is verified server-side in real time"
                          >
                            Download
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

      {detailsDoc && (
        <DocumentDetailsModal
          isOpen={!!detailsDoc}
          document={detailsDoc}
          onClose={() => setDetailsDoc(null)}
        />
      )}
    </DashboardLayout>
  );
}
