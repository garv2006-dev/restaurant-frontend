import React, { useState, useEffect } from 'react';
import {
  Container,
  Tab,
  Tabs,
  Badge,
  Alert,
  Spinner
} from 'react-bootstrap';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

interface ReportData {
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    checkedIn: number;
    cancelled: number;
    noShow: number;
    completed: number;
    revenue: number;
    averageBookingValue: number;
    occupancyRate: number;
  };
  rooms: {
    totalRooms: number;
    availableRooms: number;
    occupiedRooms: number;
    maintenanceRooms: number;
    roomTypeDistribution: Array<{ type: string; count: number; revenue: number }>;
  };
  customers: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    loyaltyMembers: number;
    averageLoyaltyPoints: number;
  };
  revenue: {
    totalRevenue: number;
    roomRevenue: number;
    extraServicesRevenue: number;
    monthlyRevenue: Array<{ month: string; revenue: number; bookings: number }>;
  };
  performance: {
    topRooms: Array<{ roomName: string; bookings: number; revenue: number }>;
    customerSatisfaction: number;
    averageRating: number;
  };
}

interface DateRange {
  startDate: string;
  endDate: string;
}

const ReportsAnalytics: React.FC = () => {
  const { theme } = useTheme();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  const fetchReportData = React.useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/reports', {
        params: { startDate: dateRange.startDate, endDate: dateRange.endDate },
      });
      setReportData(data.data);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDateRangeChange = (field: keyof DateRange, value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  // const exportReport = async (format: 'pdf' | 'excel') => {
  //   try {
  //     const response = await api.get('/admin/reports/export', {
  //       params: { format, startDate: dateRange.startDate, endDate: dateRange.endDate },
  //       responseType: 'blob',
  //     });
  //
  //     const blob = new Blob([response.data]);
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement('a');
  //     a.href = url;
  //     a.download = `report_${dateRange.startDate}_to_${dateRange.endDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
  //     document.body.appendChild(a);
  //     a.click();
  //     window.URL.revokeObjectURL(url);
  //     document.body.removeChild(a);
  //     toast.success(`Report exported as ${format.toUpperCase()}`);
  //   } catch (error) {
  //     console.error('Error exporting report:', error);
  //     toast.error('Failed to export report');
  //   }
  // };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Chart Styles based on Theme
  const chartTextColor = theme === 'dark' ? '#cbd5e1' : '#64748B';
  const chartGridColor = theme === 'dark' ? '#334155' : '#E2E8F0';
  const tooltipStyle = {
    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
    color: theme === 'dark' ? '#f1f5f9' : '#000000',
    border: theme === 'dark' ? '1px solid #334155' : 'none',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading reports and analytics...</p>
      </Container>
    );
  }

  if (!reportData) {
    return (
      <Container className="py-5">
        <Alert variant="warning">No report data available</Alert>
      </Container>
    );
  }

  return (
    <div className="container-fluid px-4">
      <div className="d-flex justify-content-between align-items-center mb-4 mt-4">
        <div>
          <h2 className="admin-page-title mb-1">Reports & Analytics</h2>
          <p className="text-muted mb-0">Monitor your business performance and insights</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="admin-card mb-4">
        <div className="admin-card-header">
          <h5 className="admin-card-title mb-0">Date Range Filter</h5>
        </div>
        <div className="admin-card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <div>
                <label className="form-label small fw-semibold text-muted">Start Date</label>
                <input
                  type="date"
                  className="admin-form-control"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div>
                <label className="form-label small fw-semibold text-muted">End Date</label>
                <input
                  type="date"
                  className="admin-form-control"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <button className="admin-btn admin-btn-primary w-100" onClick={fetchReportData}>
                Update Report
              </button>
            </div>
          </div>
        </div>
      </div>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')} className="admin-tabs mb-4">
        <Tab eventKey="overview" title="Overview">
          {/* KPI Cards */}
          <div className="row g-4 mb-4">
            <div className="col-xl-3 col-sm-6">
              <div className="admin-card h-100">
                <div className="admin-card-body text-center p-4">
                  <h6 className="text-muted text-uppercase small fw-bold mb-3">Total Revenue</h6>
                  <h3 className="fs-4 fw-bold text-success mb-2" title={`₹${(reportData.revenue?.totalRevenue || 0).toLocaleString()}`}>
                    ₹{(reportData.revenue?.totalRevenue || 0).toLocaleString()}
                  </h3>
                  <small className="text-muted">Selected Period</small>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6">
              <div className="admin-card h-100">
                <div className="admin-card-body text-center p-4">
                  <h6 className="text-muted text-uppercase small fw-bold mb-3">Total Bookings</h6>
                  <h3 className="fs-4 fw-bold text-primary mb-2" title={(reportData.bookings?.total || 0).toString()}>
                    {reportData.bookings?.total || 0}
                  </h3>
                  <Badge bg="success" className="bg-opacity-10 text-success border border-success border-opacity-25 fw-normal px-3 py-2 rounded-pill">
                    {reportData.bookings?.confirmed || 0} Confirmed
                  </Badge>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6">
              <div className="admin-card h-100">
                <div className="admin-card-body text-center p-4">
                  <h6 className="text-muted text-uppercase small fw-bold mb-3">Occupancy Rate</h6>
                  <h3 className="fs-4 fw-bold text-warning mb-2" title={`${reportData.bookings?.occupancyRate || 0}%`}>
                    {reportData.bookings?.occupancyRate || 0}%
                  </h3>
                  <small className="text-muted">Current Period</small>
                </div>
              </div>
            </div>
            <div className="col-xl-3 col-sm-6">
              <div className="admin-card h-100">
                <div className="admin-card-body text-center p-4">
                  <h6 className="text-muted text-uppercase small fw-bold mb-3">Avg. Rating</h6>
                  <h3 className="fs-4 fw-bold text-info mb-2" title={(reportData.performance?.averageRating || 0).toFixed(1)}>
                    {(reportData.performance?.averageRating || 0).toFixed(1)}
                  </h3>
                  <small className="text-muted">Customer Satisfaction</small>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="row g-4 mb-4">
            <div className="col-lg-8">
              <div className="admin-card h-100">
                <div className="admin-card-header">
                  <h5 className="admin-card-title mb-0">Revenue Trend</h5>
                </div>
                <div className="admin-card-body">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reportData.revenue?.monthlyRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartTextColor }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTextColor }} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip
                        formatter={(value) => [`₹${value}`, 'Revenue']}
                        contentStyle={tooltipStyle}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="admin-card h-100">
                <div className="admin-card-header">
                  <h5 className="admin-card-title mb-0">Room Type Distribution</h5>
                </div>
                <div className="admin-card-body d-flex align-items-center justify-content-center">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.rooms?.roomTypeDistribution || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                      >
                        {(reportData.rooms?.roomTypeDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [value, name]}
                        contentStyle={tooltipStyle}
                      />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </Tab>

        <Tab eventKey="bookings" title="Bookings">
          <div className="row g-4">
            <div className="col-lg-6">
              <div className="admin-card h-100">
                <div className="admin-card-header">
                  <h5 className="admin-card-title mb-0">Booking Status Breakdown</h5>
                </div>
                <div className="admin-card-body p-0">
                  <div className="table-responsive">
                    <table className="admin-table table-hover mb-0">
                      <tbody>
                        <tr>
                          <td>Total Bookings</td>
                          <td className="text-end fw-bold">{reportData.bookings?.total || 0}</td>
                        </tr>
                        <tr>
                          <td>Pending</td>
                          <td className="text-end"><span className="badge bg-warning text-dark bg-opacity-25 px-3 py-1 rounded-pill">{(reportData.bookings?.pending || 0)}</span></td>
                        </tr>
                        <tr>
                          <td>Confirmed</td>
                          <td className="text-end"><span className="badge bg-success bg-opacity-25 text-success px-3 py-1 rounded-pill">{(reportData.bookings?.confirmed || 0)}</span></td>
                        </tr>
                        <tr>
                          <td>Checked In</td>
                          <td className="text-end"><span className="badge bg-info bg-opacity-25 text-info px-3 py-1 rounded-pill">{(reportData.bookings?.checkedIn || 0)}</span></td>
                        </tr>
                        <tr>
                          <td>Completed</td>
                          <td className="text-end"><span className="badge bg-success bg-opacity-25 text-success px-3 py-1 rounded-pill">{(reportData.bookings?.completed || 0)}</span></td>
                        </tr>
                        <tr>
                          <td>Cancelled</td>
                          <td className="text-end"><span className="badge bg-danger bg-opacity-25 text-danger px-3 py-1 rounded-pill">{(reportData.bookings?.cancelled || 0)}</span></td>
                        </tr>
                        <tr>
                          <td>No Show</td>
                          <td className="text-end"><span className="badge bg-secondary bg-opacity-25 text-dark px-3 py-1 rounded-pill">{(reportData.bookings?.noShow || 0)}</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="admin-card h-100">
                <div className="admin-card-header">
                  <h5 className="admin-card-title mb-0">Top Performing Rooms</h5>
                </div>
                <div className="admin-card-body p-0">
                  <div className="table-responsive">
                    <table className="admin-table table-hover mb-0">
                      <thead>
                        <tr>
                          <th>Room</th>
                          <th className="text-center">Bookings</th>
                          <th className="text-end">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(reportData.performance?.topRooms || []).length > 0 ? (
                          (reportData.performance?.topRooms || []).map((room, index) => (
                            <tr key={index}>
                              <td className="fw-medium text-dark">{room.roomName}</td>
                              <td className="text-center">{room.bookings}</td>
                              <td className="text-end fw-bold text-success">₹{room.revenue.toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center py-4 text-muted">No data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Tab>

        <Tab eventKey="revenue" title="Revenue">
          <div className="row g-4">
            <div className="col-lg-8">
              <div className="admin-card h-100">
                <div className="admin-card-header">
                  <h5 className="admin-card-title mb-0">Monthly Revenue Breakdown</h5>
                </div>
                <div className="admin-card-body">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={reportData.revenue?.monthlyRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartGridColor} />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: chartTextColor }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: chartTextColor }} tickFormatter={(value) => `₹${value}`} />
                      <Tooltip
                        formatter={(value) => [`₹${value}`, 'Revenue']}
                        cursor={{ fill: theme === 'dark' ? '#334155' : '#F1F5F9' }}
                        contentStyle={tooltipStyle}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="col-lg-4">
              <div className="admin-card h-100">
                <div className="admin-card-header">
                  <h5 className="admin-card-title mb-0">Revenue Sources</h5>
                </div>
                <div className="admin-card-body p-0">
                  <table className="admin-table mb-0">
                    <tbody>
                      <tr>
                        <td className="text-muted">Room Bookings</td>
                        <td className="text-end fw-medium">₹{(reportData.revenue?.roomRevenue || 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Extra Services</td>
                        <td className="text-end fw-medium">₹{(reportData.revenue?.extraServicesRevenue || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="bg-light">
                        <td className="fw-bold text-dark ps-4">Total Revenue</td>
                        <td className="text-end fw-bold text-success pe-4">₹{(reportData.revenue?.totalRevenue || 0).toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
};

export default ReportsAnalytics;