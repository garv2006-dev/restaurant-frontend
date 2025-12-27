import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { uploadAPI } from '../../services/uploadAPI';

interface ImageUploadModalProps {
  show: boolean;
  onHide: () => void;
  type: 'room' | 'avatar';
  itemId: string;
  itemName: string;
  onUploadSuccess: () => void;
  maxFiles?: number;
}

const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  show,
  onHide,
  type,
  itemId,
  itemName,
  onUploadSuccess,
  maxFiles = type === 'room' ? 5 : 1,
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > maxFiles) {
      setError(`Maximum ${maxFiles} file(s) allowed`);
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return false;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        setError('File size must be less than 5MB');
        return false;
      }
      return true;
    });

    setSelectedFiles([...selectedFiles, ...validFiles]);
    setPreview([...preview, ...validFiles.map((f) => URL.createObjectURL(f))]);
    setError('');
  };

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
    setPreview(preview.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      if (type === 'room') {
        await uploadAPI.uploadRoomImages(itemId, selectedFiles);
      } else if (type === 'avatar') {
        await uploadAPI.uploadAvatar(selectedFiles[0]);
      }

      setSuccess(`Image(s) uploaded successfully for ${itemName}`);
      setSelectedFiles([]);
      setPreview([]);
      setTimeout(() => {
        onUploadSuccess();
        onHide();
      }, 1500);
    } catch (err: any) {
      console.error('Upload error:', err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        'Failed to upload image(s)';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Upload Image - {itemName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <div className="mb-3">
          <Form.Group>
            <Form.Label>Select Image(s)</Form.Label>
            <Form.Control
              type="file"
              accept="image/*"
              multiple={type === 'room'}
              disabled={loading || selectedFiles.length >= maxFiles}
              onChange={handleFileSelect}
              className="py-2"
            />
            <Form.Text className="text-muted d-block mt-2">
              {type === 'room'
                ? `Select up to ${maxFiles} images. Max 5MB each.`
                : `Select 1 image. Max 5MB.`}
            </Form.Text>
          </Form.Group>
        </div>

        {preview.length > 0 && (
          <div className="mb-3">
            <h6>Preview ({preview.length})</h6>
            <Row xs={2} sm={3} className="g-2">
              {preview.map((src, idx) => (
                <Col key={idx}>
                  <div className="position-relative">
                    <img
                      src={src}
                      alt={`Preview ${idx + 1}`}
                      className="img-fluid rounded"
                      style={{ maxHeight: '100px', objectFit: 'cover' }}
                    />
                    <button
                      className="btn btn-sm btn-danger position-absolute top-0 end-0"
                      style={{ transform: 'translate(50%, -50%)' }}
                      onClick={() => removeFile(idx)}
                      disabled={loading}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </Col>
              ))}
            </Row>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleUpload}
          disabled={loading || selectedFiles.length === 0}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Uploading...
            </>
          ) : (
            <>
              <Upload size={16} className="me-2" />
              Upload
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ImageUploadModal;
