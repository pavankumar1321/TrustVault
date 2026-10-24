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
import ShareModal from '../../components/documents/ShareModal';
import DocumentDetailsModal from '../../components/documents/DocumentDetailsModal';
import { documentsApi } from '../../api/documents';
import { Share2, Search, Eye, Download, FileText, Users } from 'lucide-react';

export default function OwnerSharedDocsPage() {
  const [documents, setDocuments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const limit = 10;

  // Modals
  const [shareDoc, setShareDoc] = useState(null);
  const [detailsDoc, setDetailsDoc] = useState(null);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // view_mode=shared returns documents the owner has shared with others
      const res = await documentsApi.getDocuments({ view_mode: 'shared', search, category, page, limit });
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

  const totalPages = Math.ceil(total / limit);

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Documents I've Shared</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>
            Documents you have shared with other users. Click "Manage" to update or revoke their access.
          </p>
        </div>

        {error && <Alert type="error" message={error} onClose={() => setError('')} style={{ marginBottom: '1rem' }} />}

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
            <h2 style={{ fontSize: '1rem', fontWeight: 600 }}>Shared Documents ({total})</h2>
          </div>

          {loading ? (
            <LoadingSpinner message="Loading shared documents…" />
          ) : documents.length === 0 ? (
            <EmptyState
              icon={Share2}
              title="No shared documents"
              message={search || category ? 'No documents match your search.' : "You haven't shared any documents yet. Go to My Documents and click the Share button."}
            />
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg)' }}>
                    {['Document', 'Category', 'Size', 'Uploaded', 'Actions'].map((h) => (
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
                          <FileText size={18} color="var(--color-accent)" style={{ flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 500 }}>{doc.title}</div>
                            {doc.description && (
                              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)' }}>{doc.description.slice(0, 60)}{doc.description.length > 60 ? '…' : ''}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {doc.category ? <Badge variant="info">{doc.category}</Badge> : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>
                        {doc.file_size ? (doc.file_size / 1024).toFixed(1) + ' KB' : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <Button size="sm" variant="ghost" icon={<Eye size={13} />} onClick={() => setDetailsDoc(doc)}>
                            View
                          </Button>
                          <Button size="sm" variant="secondary" icon={<Users size={13} />} onClick={() => setShareDoc(doc)}>
                            Manage
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

      {shareDoc && (
        <ShareModal
          isOpen={!!shareDoc}
          document={shareDoc}
          onClose={() => setShareDoc(null)}
          onSuccess={() => { setShareDoc(null); fetchDocs(); }}
        />
      )}
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
