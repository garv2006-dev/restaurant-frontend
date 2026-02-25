import React, { useState, useEffect, useCallback } from 'react';
import { Spinner } from 'react-bootstrap';
import { Save, Settings, CheckCircle, XCircle } from 'lucide-react';
import { adminAPI } from '../../services/api';

const standardGstRates = [0, 5, 12, 18, 28];

const SystemSettings: React.FC = () => {
    const [settings, setSettings] = useState({
        gstPercentage: 18
    });
    const [isCustomGst, setIsCustomGst] = useState(false);
    const [customValue, setCustomValue] = useState('18');


    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const response = await adminAPI.getSettings();
            if (response.success && response.data) {
                const percentage = response.data.gstPercentage;
                setSettings({
                    gstPercentage: percentage
                });

                if (standardGstRates.includes(percentage)) {
                    setIsCustomGst(false);
                } else {
                    setIsCustomGst(true);
                    setCustomValue(percentage.toString());
                }
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch settings');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

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
                                    <label className="form-label small fw-semibold text-muted">Select GST Rate (%)</label>
                                    <select
                                        className="admin-form-select w-100 mb-3"
                                        value={isCustomGst ? 'custom' : settings.gstPercentage}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (val === 'custom') {
                                                setIsCustomGst(true);
                                                setSettings({ ...settings, gstPercentage: parseFloat(customValue) || 0 });
                                            } else {
                                                setIsCustomGst(false);
                                                setSettings({ ...settings, gstPercentage: parseFloat(val) });
                                            }
                                        }}
                                    >
                                        {standardGstRates.map(rate => (
                                            <option key={rate} value={rate}>{rate}% GST</option>
                                        ))}
                                        <option value="custom">Custom Rate...</option>
                                    </select>

                                    {isCustomGst && (
                                        <div className="animate-fade-in mt-2 p-3 bg-light rounded-3 border">
                                            <label className="form-label small fw-semibold text-dark mb-2">Custom GST Percentage</label>
                                            <div className="input-group">
                                                <input
                                                    type="number"
                                                    className="admin-form-control"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    value={customValue}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setCustomValue(val);
                                                        setSettings({ ...settings, gstPercentage: parseFloat(val) || 0 });
                                                    }}
                                                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                                    required={isCustomGst}
                                                />
                                                <span className="input-group-text bg-white border-start-0 text-muted">%</span>
                                            </div>
                                        </div>
                                    )}

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
                <div className="col-lg-6">
                    <div className="admin-card h-100">
                        <div className="admin-card-header">
                            <h5 className="admin-card-title mb-0">Current GST Configuration</h5>
                        </div>
                        <div className="admin-card-body p-0">
                            <div className="table-responsive">
                                <table className="admin-table mb-0">
                                    <thead>
                                        <tr>
                                            <th>Property</th>
                                            <th>Value</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Active Tax Type</td>
                                            <td><span className="fw-medium text-dark">GST (Goods & Services Tax)</span></td>
                                            <td><span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-10">Active</span></td>
                                        </tr>
                                        <tr>
                                            <td>Tax Percentage</td>
                                            <td><span className="fw-bold text-primary">{settings.gstPercentage}%</span></td>
                                            <td><span className="text-muted small">Live</span></td>
                                        </tr>
                                        <tr>
                                            <td>Service Category</td>
                                            <td>Accommodation / Hotel</td>
                                            <td>-</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-3 bg-light bg-opacity-50">
                                <div className="small text-muted d-flex align-items-center">
                                    <CheckCircle size={14} className="text-success me-2" />
                                    Changes take effect immediately for all new bookings.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row mt-4">
                <div className="col-12">
                    <div className="admin-card border-0 bg-info bg-opacity-10">
                        <div className="admin-card-body d-flex align-items-start gap-3">
                            <div className="bg-info text-white p-2 rounded-3">
                                <Settings size={20} />
                            </div>
                            <div>
                                <h6 className="fw-bold text-dark mb-1">Real-time Tax Calculation</h6>
                                <p className="text-muted small mb-0">The system calculates taxes dynamically based on these settings. Any change here will be reflected in the "Amount" column of your dashboard and booking reports instantly.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemSettings;
