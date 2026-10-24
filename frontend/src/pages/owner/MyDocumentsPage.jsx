import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import UploadModal from '../../components/documents/UploadModal';
import ShareModal from '../../components/documents/ShareModal';
import DocumentDetailsModal from '../../components/documents/DocumentDetailsModal';
import EditMetadataModal from '../../components/documents/EditMetadataModal';
import { documentsApi } from '../../api/documents';
import { Search, Upload, Share2, Eye, Edit, Trash2, Download, Filter } from 'lucide-react';

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total_pages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteDocTarget, setDeleteDocTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchDocs = async (currentPage = page) => {
    try {
      setLoading(true);
      const res = await documentsApi.getDocuments({
        search,
        category,
        page: currentPage,
        limit: 10,
      });
      setDocuments(res.data || []);
      if (res.meta) setMeta(res.meta);
    } catch (err) {
      alert(err.message || 'Failed to fetch documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs(1);
    setPage(1);
  }, [category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDocs(1);
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDocTarget) return;
    try {
      setDeleteLoading(true);
      await documentsApi.deleteDocument(deleteDocTarget.id);
      setDeleteDocTarget(null);
      await fetchDocs(page);
    } catch (err) {
      alert(err.message || 'Failed to delete document.');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Document Repository</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Search, filter, edit, and manage security permissions for your documents
          </p>
        </div>
        <Button variant="primary" icon={Upload} onClick={() => setIsUploadOpen(true)}>
          Upload New Document
        </Button>
      </div>

      {/* Filters Bar */}
      <Card style={{ marginBottom: '1.5rem', padding: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <Input
              placeholder="Search documents by title or filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="m-0"
            />
          </div>

          <div style={{ width: '200px' }}>
            <select
              className="form-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              <option value="Compliance">Compliance & Legal</option>
              <option value="Financial">Financial Reports</option>
              <option value="Engineering">Engineering</option>
              <option value="Operations">Operations</option>
              <option value="General">General</option>
            </select>
          </div>

          <Button type="submit" variant="secondary" icon={Search}>
            Search
          </Button>
          {(search || category) && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('');
                setCategory('');
                fetchDocs(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </form>
      </Card>

      {/* Document Table */}
      <Card>
        {loading ? (
          <LoadingSpinner text="Searching documents..." />
        ) : documents.length === 0 ? (
          <EmptyState
            title="No documents found"
            description="No documents match your filter criteria."
            actionText="Clear Filters"
            onAction={() => {
              setSearch('');
              setCategory('');
              fetchDocs(1);
            }}
          />
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title & File</th>
                    <th>Category</th>
                    <th>Size</th>
                    <th>Checksum (SHA-256)</th>
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
                        <Badge variant="viewer">{doc.category}</Badge>
                      </td>
                      <td style={{ fontSize: '0.86rem' }}>{(doc.file_size / 1024).toFixed(1)} KB</td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {doc.checksum.substring(0, 12)}...
                        </span>
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
                            title="Inspect Details"
                          />
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Share2}
                            onClick={() => {
                              setSelectedDoc(doc);
                              setIsShareOpen(true);
                            }}
                            title="Manage Permissions"
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
                            onClick={() => documentsApi.downloadDocument(doc.id, doc.original_filename)}
                            title="Download"
                          />
                          <Button
                            variant="danger"
                            size="sm"
                            icon={Trash2}
                            onClick={() => setDeleteDocTarget(doc)}
                            title="Delete"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={meta.page}
              totalPages={meta.total_pages}
              onPageChange={(newPage) => {
                setPage(newPage);
                fetchDocs(newPage);
              }}
            />
          </>
        )}
      </Card>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => fetchDocs(1)}
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
        onUpdateSuccess={() => fetchDocs(page)}
      />

        <ConfirmDialog
          isOpen={!!deleteDocTarget}
          onClose={() => setDeleteDocTarget(null)}
          onConfirm={handleDeleteConfirm}
          title={`Delete "${deleteDocTarget?.title}"?`}
          message="This action will permanently delete the file from private storage. Any shared users will lose access on their next request."
          confirmText="Delete Document"
          confirmVariant="danger"
          loading={deleteLoading}
        />
      </div>
    </DashboardLayout>
  );
}
