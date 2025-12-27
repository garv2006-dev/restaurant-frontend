import React, { useState } from 'react';
import { Row, Col, Card, Button, Badge, Spinner, Modal } from 'react-bootstrap';
import { Trash2, Star, Eye, EyeOff, Upload } from 'lucide-react';
import { uploadAPI } from '../../services/uploadAPI';

interface ImageGalleryProps {
  images: Array<{
    _id?: string;
    url: string;
    publicId?: string;
    altText?: string;
    isPrimary?: boolean;
  }>;
  itemId: string;
  type: 'room';
  loading?: boolean;
  onImageDeleted: () => void;
  onImageUpdate: () => void;
  onUploadClick?: () => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  itemId,
  loading = false,
  onImageDeleted,
  onImageUpdate,
  onUploadClick,
}) => {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleDeleteImage = async (imageId: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      setDeletingId(imageId);
      await uploadAPI.deleteRoomImage(itemId, imageId);
      onImageDeleted();
    } catch (err: any) {
      console.error('Error deleting image:', err);
      alert('Failed to delete image: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeletingId(null);
    }
  };

  const handleSetPrimary = async (imageId: string) => {

    try {
      setSettingPrimaryId(imageId);
      await uploadAPI.setPrimaryRoomImage(itemId, imageId);
      onImageUpdate();
    } catch (err: any) {
      console.error('Error setting primary image:', err);
      alert('Failed to set primary image: ' + (err.response?.data?.message || err.message));
    } finally {
      setSettingPrimaryId(null);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <Spinner animation="border" />
      </div>
    );
  }

  if (!images || images.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-muted mb-3">No images uploaded yet</p>
        {onUploadClick && (
          <Button variant="primary" size="sm" onClick={onUploadClick}>
            <Upload size={14} className="me-2" />
            Upload Images
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="mb-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Images ({images.length})</h6>
          {onUploadClick && (
            <Button variant="outline-primary" size="sm" onClick={onUploadClick}>
              <Upload size={14} className="me-1" />
              Add More
            </Button>
          )}
        </div>
        <Row xs={1} sm={2} md={3} className="g-2">
          {images.map((image, idx) => (
            <Col key={image._id || idx}>
              <Card className="h-100 position-relative overflow-hidden">
                <div
                  style={{
                    height: '200px',
                    position: 'relative',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                  onClick={() => setSelectedImage(image.url)}
                >
                  <img
                    src={image.url}
                    alt={image.altText || `Image ${idx + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transition: 'transform 0.2s',
                    }}
                    className="img-hover"
                    onMouseEnter={(e) => {
                      (e.target as HTMLImageElement).style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLImageElement).style.transform = 'scale(1)';
                    }}
                  />

                  {image.isPrimary && (
                    <Badge
                      bg="warning"
                      className="position-absolute"
                      style={{ top: '8px', left: '8px' }}
                    >
                      <Star size={12} className="me-1" />
                      Primary
                    </Badge>
                  )}
                </div>

                <Card.Body className="p-2">
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="flex-grow-1"
                      onClick={() => setSelectedImage(image.url)}
                    >
                      <Eye size={14} />
                    </Button>

                    {!image.isPrimary && (
                      <Button
                        variant="outline-warning"
                        size="sm"
                        className="flex-grow-1"
                        disabled={settingPrimaryId === image._id || loading}
                        onClick={() => handleSetPrimary(image._id || '')}
                      >
                        {settingPrimaryId === image._id ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <Star size={14} />
                        )}
                      </Button>
                    )}

                    {image._id && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        className="flex-grow-1"
                        disabled={deletingId === image._id || loading}
                        onClick={() => handleDeleteImage(image._id!)}
                      >
                        {deletingId === image._id ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* Image Modal */}
      <Modal show={!!selectedImage} onHide={() => setSelectedImage(null)} centered size="lg">
        <Modal.Body className="p-0">
          <img src={selectedImage || ''} alt="Full view" style={{ width: '100%' }} />
        </Modal.Body>
      </Modal>
    </>
  );
};

export default ImageGallery;
