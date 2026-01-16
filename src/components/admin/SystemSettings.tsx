import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Row, Col, Spinner } from 'react-bootstrap';
import { Save, Settings } from 'lucide-react';
import { adminAPI } from '../../services/api';

const SystemSettings: React.FC = () => {
    const [settings, setSettings] = useState({
        gstPercentage: 18
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getSettings();
            if (response.success && response.data) {
                setSettings({
                    gstPercentage: response.data.gstPercentage
                });
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await adminAPI.updateSettings(settings);
            if (response.success) {
                setSuccess('Settings updated successfully');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center p-5">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div className="system-settings">
            <h2 className="mb-4">System Settings</h2>

            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <Row>
                <Col md={6}>
                    <Card>
                        <Card.Header className="bg-primary text-white d-flex align-items-center">
                            <Settings size={20} className="me-2" />
                            <h5 className="mb-0">Tax Configuration</h5>
                        </Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleSubmit}>
                                <Form.Group className="mb-3">
                                    <Form.Label>GST Percentage (%)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={settings.gstPercentage}
                                        onChange={(e) => setSettings({ ...settings, gstPercentage: parseFloat(e.target.value) })}
                                        required
                                    />
                                    <Form.Text className="text-muted">
                                        This percentage will be applied to all room bookings.
                                    </Form.Text>
                                </Form.Group>

                                <div className="d-flex justify-content-end">
                                    <Button type="submit" variant="primary" disabled={saving}>
                                        {saving ? (
                                            <>
                                                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} className="me-2" />
                                                Save Settings
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </Form>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default SystemSettings;
