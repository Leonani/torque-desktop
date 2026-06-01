import React, { useState } from 'react';
import { Upload, Typography, Row, Button, Image, Col } from 'antd';
import { DeleteOutlined, CameraOutlined } from '@ant-design/icons';
import { compressImage } from '../utils/helpers';

const { Text } = Typography;

interface PhotoUploadProps {
  photos: {
    front: string;
    back: string;
    left: string;
    right: string;
    motor: string;
    dashboard: string;
  };
  onPhotosChange: (photos: { front: string; back: string; left: string; right: string; motor: string; dashboard: string }) => void;
  readOnly?: boolean;
}

interface PhotoPosition {
  key: keyof PhotoUploadProps['photos'];
  label: string;
}

const positions: PhotoPosition[] = [
  { key: 'front', label: 'Frente' },
  { key: 'back', label: 'Trasera' },
  { key: 'left', label: 'Izquierda' },
  { key: 'right', label: 'Derecha' },
  { key: 'motor', label: 'Motor' },
  { key: 'dashboard', label: 'Tablero' },
];

const PhotoUpload: React.FC<PhotoUploadProps> = ({ photos, onPhotosChange, readOnly = false }) => {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const handleUpload = async (file: File, position: keyof typeof photos) => {
    setLoading((prev) => ({ ...prev, [position]: true }));
    try {
      const base64 = await compressImage(file, 800, 0.7);
      onPhotosChange({
        ...photos,
        [position]: base64,
      });
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
    } finally {
      setLoading((prev) => ({ ...prev, [position]: false }));
    }
    return false; // Prevent default upload
  };

  const handleRemove = (position: keyof typeof photos) => {
    onPhotosChange({
      ...photos,
      [position]: '',
    });
  };

  return (
    <div className="photo-upload-section">
      <Text strong style={{ display: 'block', marginBottom: '16px' }}>
        Fotos del Vehículo
      </Text>
      <Row gutter={[16, 16]}>
        {positions.map(({ key, label }) => (
          <Col xs={24} sm={12} md={8} key={key}>
            <div className="photo-upload-item" style={{ textAlign: 'center' }}>
              <Text style={{ display: 'block', marginBottom: '8px' }}>{label}</Text>
              
              {photos[key] ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <Image
                    src={photos[key]}
                    alt={`Vista ${label}`}
                    style={{ width: '100%', maxWidth: '200px', height: '150px', objectFit: 'cover', borderRadius: '8px' }}
                    preview={!readOnly}
                  />
                  {!readOnly && (
                    <Button
                      type="primary"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      style={{ position: 'absolute', top: '8px', right: '8px' }}
                      onClick={() => handleRemove(key)}
                    />
                  )}
                </div>
              ) : !readOnly ? (
                <Upload
                  accept="image/*"
                  beforeUpload={(file) => handleUpload(file, key)}
                  showUploadList={false}
                >
                  <Button
                    icon={<CameraOutlined />}
                    loading={loading[key]}
                    style={{ width: '100%', height: '150px' }}
                  >
                    {loading[key] ? 'Cargando...' : `Subir foto ${label}`}
                  </Button>
                </Upload>
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '150px',
                    border: '2px dashed #d9d9d9',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Text type="secondary">Sin foto</Text>
                </div>
              )}
            </div>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default PhotoUpload;
