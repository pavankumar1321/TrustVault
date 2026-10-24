import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';
import { documentsApi } from '../../api/documents';

export default function EditMetadataModal({ isOpen, onClose, document: doc, onUpdateSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (doc) {
      setTitle(doc.title || '');
      setDescription(doc.description || '');
      setCategory(doc.category || 'General');
      setError('');
    }
  }, [doc, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await documentsApi.updateMetadata(doc.id, {
        title: title.trim(),
        description: description.trim(),
        category,
      });
      onUpdateSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update metadata.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Document Metadata"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Save Changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <Alert type="error" message={error} />}

        <Input
          label="Document Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      </form>
    </Modal>
  );
}
