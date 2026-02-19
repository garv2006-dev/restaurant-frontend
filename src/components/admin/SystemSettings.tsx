import React, { useState, useEffect } from 'react';
import { Spinner } from 'react-bootstrap';
import { Save, Settings, CheckCircle, XCircle } from 'lucide-react';
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
        <div className="container-fluid px-4">
            <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
                <div>
                    <h2 className="admin-page-title mb-1">System Settings</h2>
                    <p className="text-muted mb-0">Configure global application settings</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger d-flex align-items-center mb-4" role="alert">
                    <XCircle size={18} className="me-2" />
                    {error}
                </div>
            )}
            {success && (
                <div className="alert alert-success d-flex align-items-center mb-4" role="alert">
                    <CheckCircle size={18} className="me-2" />
                    {success}
                </div>
            )}

            <div className="row">
                <div className="col-lg-6">
                    <div className="admin-card h-100">
                        <div className="admin-card-header">
                            <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 p-2 rounded-circle me-3">
                                    <Settings size={20} className="text-primary" />
                                </div>
                                <h5 className="admin-card-title mb-0">Tax Configuration</h5>
                            </div>
                        </div>
                        <div className="admin-card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="form-label small fw-semibold text-muted">GST Percentage (%)</label>
                                    <div className="input-group">
                                        <input
                                            type="number"
                                            className="admin-form-control"
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            value={settings.gstPercentage}
                                            onChange={(e) => setSettings({ ...settings, gstPercentage: parseFloat(e.target.value) })}
                                            onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                            required
                                        />
                                        <span className="input-group-text bg-light border-start-0 text-muted">%</span>
                                    </div>
                                    <div className="form-text text-muted mt-2">
                                        <small>This percentage will be applied to all room bookings automatically.</small>
                                    </div>
                                </div>

                                <div className="d-flex justify-content-end pt-3 border-top">
                                    <button
                                        type="submit"
                                        className="admin-btn admin-btn-primary"
                                        disabled={saving}
                                    >
                                        {saving ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={18} className="me-2" />
                                                Save Settings
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
