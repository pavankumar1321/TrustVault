import React, { useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { documentsApi } from '../../api/documents';

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      if (!title) {
        // Auto-fill title from filename
        const baseName = selected.name.replace(/\.[^/.]+$/, '');
        setTitle(baseName.replace(/[_-]/g, ' '));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Document title is required.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());
      if (description) formData.append('description', description.trim());
      formData.append('category', category);

      const res = await documentsApi.uploadDocument(formData);
      onUploadSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to upload document.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Secure Document"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading} icon={Upload}>
            Upload Document
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <Alert type="error" message={error} />}

        <div className="form-group">
          <label className="form-label">Document File</label>
          <div
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: 'var(--bg-subtle)',
              cursor: 'pointer',
            }}
            onClick={() => document.getElementById('doc-file-input').click()}
          >
            <input
              id="doc-file-input"
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileChange}
              accept=".pdf,.png,.jpg,.jpeg,.txt,.md,.docx,.xlsx"
            />
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
                <CheckCircle size={22} color="var(--success)" />
                <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>{file.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <div>
                <Upload size={28} color="var(--accent)" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ fontWeight: 600, fontSize: '0.92rem' }}>Click to select a document file</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                  Supported: PDF, DOCX, XLSX, PNG, JPG, TXT, MD (Max 15MB)
                </p>
              </div>
            )}
          </div>
        </div>

        <Input
          label="Document Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Confidential Financial Audit Q3"
          required
        />

        <div className="form-group">
          <label className="form-label">Category</label>
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="General">General</option>
            <option value="Compliance">Compliance & Legal</option>
            <option value="Financial">Financial Reports</option>
            <option value="Engineering">Engineering & Architecture</option>
            <option value="Operations">Operations</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Description (Optional)</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a brief description about this document and its sensitivity..."
          />
        </div>

        <div
          style={{
            background: 'var(--accent-light)',
            padding: '0.85rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.82rem',
            color: '#3538CD',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
          }}
        >
          <FileText size={18} style={{ flexShrink: 0 }} />
          <span>
            Uploaded files are stored outside the public web root. Magic bytes are validated to prevent malicious file execution.
          </span>
        </div>
      </form>
    </Modal>
  );
}
