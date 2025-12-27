import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Tab,
  Tabs,
  Table,
  Button,
  Form,
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

interface ReportData {
  bookings: {
    total: number;
    confirmed: number;
    cancelled: number;
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
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
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
  };

  const handleDateRangeChange = (field: keyof DateRange, value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  const exportReport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await api.get('/admin/reports/export', {
        params: { format, startDate: dateRange.startDate, endDate: dateRange.endDate },
        responseType: 'blob',
      });

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${dateRange.startDate}_to_${dateRange.endDate}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Failed to export report');
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

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
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h2>Reports & Analytics</h2>
            <div className="d-flex gap-2">
              <Button variant="outline-primary" onClick={() => exportReport('excel')}>
                Export Excel
              </Button>
              <Button variant="outline-secondary" onClick={() => exportReport('pdf')}>
                Export PDF
              </Button>
            </div>
          </div>
          
          {/* Date Range Filter */}
          <Card className="mb-4">
            <Card.Body>
              <Row>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={dateRange.startDate}
                      onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={dateRange.endDate}
                      onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3} className="d-flex align-items-end">
                  <Button variant="primary" onClick={fetchReportData}>
                    Update Report
                  </Button>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k || 'overview')} className="mb-4">
        <Tab eventKey="overview" title="Overview">
          {/* KPI Cards */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center border-0 shadow-sm">
                <Card.Body>
                  <h6 className="text-muted">Total Revenue</h6>
                  <h3 className="text-success">₹{(reportData.revenue?.totalRevenue || 0).toLocaleString()}</h3>
                  <small className="text-muted">Selected Period</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-0 shadow-sm">
                <Card.Body>
                  <h6 className="text-muted">Total Bookings</h6>
                  <h3 className="text-primary">{reportData.bookings?.total || 0}</h3>
                  <small className="text-muted">{reportData.bookings?.confirmed || 0} Confirmed</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-0 shadow-sm">
                <Card.Body>
                  <h6 className="text-muted">Occupancy Rate</h6>
                  <h3 className="text-warning">{reportData.bookings?.occupancyRate || 0}%</h3>
                  <small className="text-muted">Current Period</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center border-0 shadow-sm">
                <Card.Body>
                  <h6 className="text-muted">Avg. Rating</h6>
                  <h3 className="text-info">{(reportData.performance?.averageRating || 0).toFixed(1)}</h3>
                  <small className="text-muted">Customer Satisfaction</small>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Revenue Chart */}
          <Row className="mb-4">
            <Col md={8}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Revenue Trend</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={reportData.revenue?.monthlyRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Room Type Distribution</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={reportData.rooms?.roomTypeDistribution || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {(reportData.rooms?.roomTypeDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="bookings" title="Bookings">
          <Row>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Booking Status</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped>
                    <tbody>
                      <tr>
                        <td>Total Bookings</td>
                        <td><Badge bg="primary">{reportData.bookings?.total || 0}</Badge></td>
                      </tr>
                      <tr>
                        <td>Confirmed</td>
                        <td><Badge bg="success">{reportData.bookings?.confirmed || 0}</Badge></td>
                      </tr>
                      <tr>
                        <td>Cancelled</td>
                        <td><Badge bg="danger">{reportData.bookings?.cancelled || 0}</Badge></td>
                      </tr>
                      <tr>
                        <td>Completed</td>
                        <td><Badge bg="info">{reportData.bookings?.completed || 0}</Badge></td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Top Performing Rooms</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped>
                    <thead>
                      <tr>
                        <th>Room</th>
                        <th>Bookings</th>
                        <th>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData.performance?.topRooms || []).map((room, index) => (
                        <tr key={index}>
                          <td>{room.roomName}</td>
                          <td>{room.bookings}</td>
                          <td>₹{room.revenue.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="revenue" title="Revenue">
          <Row>
            <Col md={8}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Monthly Revenue Breakdown</h5>
                </Card.Header>
                <Card.Body>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={reportData.revenue?.monthlyRevenue || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₹${value}`, 'Revenue']} />
                      <Legend />
                      <Bar dataKey="revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Revenue Sources</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped>
                    <tbody>
                      <tr>
                        <td>Room Bookings</td>
                        <td>₹{(reportData.revenue?.roomRevenue || 0).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td>Extra Services</td>
                        <td>₹{(reportData.revenue?.extraServicesRevenue || 0).toLocaleString()}</td>
                      </tr>
                      <tr className="table-active">
                        <td><strong>Total</strong></td>
                        <td><strong>₹{(reportData.revenue?.totalRevenue || 0).toLocaleString()}</strong></td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="customers" title="Customers">
          <Row>
            <Col md={6}>
              <Card>
                <Card.Header>
                  <h5 className="mb-0">Customer Statistics</h5>
                </Card.Header>
                <Card.Body>
                  <Table striped>
                    <tbody>
                      <tr>
                        <td>Total Customers</td>
                        <td><Badge bg="primary">{reportData.customers?.totalCustomers || 0}</Badge></td>
                      </tr>
                      <tr>
                        <td>New Customers</td>
                        <td><Badge bg="success">{reportData.customers?.newCustomers || 0}</Badge></td>
                      </tr>
                      <tr>
                        <td>Returning Customers</td>
                        <td><Badge bg="info">{reportData.customers?.returningCustomers || 0}</Badge></td>
                      </tr>
                      <tr>
                        <td>Loyalty Members</td>
                        <td><Badge bg="warning">{reportData.customers?.loyaltyMembers || 0}</Badge></td>
                      </tr>
                      <tr>
                        <td>Avg. Loyalty Points</td>
                        <td>{reportData.customers?.averageLoyaltyPoints || 0}</td>
                      </tr>
                    </tbody>
                  </Table>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default ReportsAnalytics;