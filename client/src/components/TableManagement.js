import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Modal } from 'react-bootstrap';
import { Utensils, Users, Clock, CheckCircle, RefreshCw, PlusCircle } from 'lucide-react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const TABLES_CONFIG = [
  { id: 'T1', name: 'Table 1', seats: 2, section: 'Main Dining' },
  { id: 'T2', name: 'Table 2', seats: 4, section: 'Main Dining' },
  { id: 'T3', name: 'Table 3', seats: 4, section: 'Main Dining' },
  { id: 'T4', name: 'Table 4', seats: 6, section: 'Main Dining' },
  { id: 'T5', name: 'Table 5', seats: 2, section: 'Main Dining' },
  { id: 'T6', name: 'Table 6', seats: 8, section: 'Main Dining' },
  { id: 'T7', name: 'Terrace 1', seats: 4, section: 'Nile Terrace' },
  { id: 'T8', name: 'Terrace 2', seats: 4, section: 'Nile Terrace' },
  { id: 'T9', name: 'Terrace 3', seats: 2, section: 'Nile Terrace' },
  { id: 'T10', name: 'Terrace 4', seats: 6, section: 'Nile Terrace' },
  { id: 'T11', name: 'VIP Suite 1', seats: 10, section: 'VIP Lounge' },
  { id: 'T12', name: 'VIP Suite 2', seats: 12, section: 'VIP Lounge' },
];

const TableManagement = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedTableOrder, setSelectedTableOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [manualStatuses, setManualStatuses] = useState({});
  const history = useHistory();

  useEffect(() => {
    fetchActiveOrders();

    const socket = io('http://localhost:4000');
    socket.on('new_order', () => fetchActiveOrders());
    socket.on('order_updated', () => fetchActiveOrders());
    socket.on('table_updated', () => fetchActiveOrders());

    return () => socket.disconnect();
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const res = await axios.get('http://localhost:4000/api/orders/active-tables');
      setActiveOrders(res.data);
    } catch (err) {
      console.error('Error fetching table orders:', err);
    }
  };

  const getTableOrder = (tableId) => {
    return activeOrders.find(o => o.tableNumber === tableId && o.status !== 'Delivered');
  };

  const getTableStatus = (tableId) => {
    if (manualStatuses[tableId]) return manualStatuses[tableId];
    const order = getTableOrder(tableId);
    if (!order) return 'Available';
    if (order.paymentStatus === 'Unpaid' && order.status === 'Ready') return 'Bill Requested';
    return 'Occupied';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Available':
        return <Badge bg="success" className="px-2 py-1 rounded-pill">Available</Badge>;
      case 'Occupied':
        return <Badge bg="primary" className="px-2 py-1 rounded-pill">Occupied</Badge>;
      case 'Bill Requested':
        return <Badge bg="warning" text="dark" className="px-2 py-1 rounded-pill">Bill Requested</Badge>;
      case 'Cleaning':
        return <Badge bg="secondary" className="px-2 py-1 rounded-pill">Cleaning</Badge>;
      default:
        return <Badge bg="light" text="dark">Unknown</Badge>;
    }
  };

  const getCardBorder = (status) => {
    switch (status) {
      case 'Available': return 'border-success';
      case 'Occupied': return 'border-primary';
      case 'Bill Requested': return 'border-warning';
      case 'Cleaning': return 'border-secondary';
      default: return '';
    }
  };

  const handleStartOrder = (tableId) => {
    history.push(`/pos?table=${encodeURIComponent(tableId)}&type=Dine-In`);
  };

  const handleViewOrder = (order) => {
    setSelectedTableOrder(order);
    setShowOrderModal(true);
  };

  const handleClearTable = async (orderId, tableId) => {
    if (!window.confirm(`Clear table and complete order?`)) return;
    try {
      if (orderId) {
        await axios.put(`http://localhost:4000/api/orders/update-order/${orderId}`, {
          status: 'Delivered',
          paymentStatus: 'Paid'
        });
      }
      setManualStatuses(prev => ({ ...prev, [tableId]: 'Available' }));
      setShowOrderModal(false);
      fetchActiveOrders();
    } catch (err) {
      console.error('Failed to clear table:', err);
    }
  };

  const filteredTables = selectedSection === 'All'
    ? TABLES_CONFIG
    : TABLES_CONFIG.filter(t => t.section === selectedSection);

  const totalTables = TABLES_CONFIG.length;
  const occupiedCount = TABLES_CONFIG.filter(t => getTableStatus(t.id) === 'Occupied' || getTableStatus(t.id) === 'Bill Requested').length;
  const availableCount = totalTables - occupiedCount;
  const occupancyRate = Math.round((occupiedCount / totalTables) * 100);

  const getElapsedTime = (createdAt) => {
    if (!createdAt) return '0m';
    const elapsedMinutes = Math.floor((new Date() - new Date(createdAt)) / 60000);
    return `${elapsedMinutes}m`;
  };

  return (
    <div className="pb-5">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center">
            <Utensils className="me-2 text-primary" /> Table & Floor Plan Management
          </h2>
          <p className="text-muted mb-0">Live interactive dining room floor status with table assignments & bill tracking</p>
        </div>
        <Button
          variant="outline-primary"
          className="rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
          onClick={fetchActiveOrders}
        >
          <RefreshCw size={16} /> Refresh Tables
        </Button>
      </div>

      {/* KPI Metrics */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body>
              <span className="text-muted fw-bold small">Total Capacity</span>
              <h3 className="fw-bold text-dark mb-0">{totalTables} Tables</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4 bg-success text-white">
            <Card.Body>
              <span className="text-white-50 fw-bold small">Available Now</span>
              <h3 className="fw-bold mb-0">{availableCount} Tables</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4 bg-primary text-white">
            <Card.Body>
              <span className="text-white-50 fw-bold small">Occupied / Dining</span>
              <h3 className="fw-bold mb-0">{occupiedCount} Tables</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body>
              <span className="text-muted fw-bold small">Table Occupancy Rate</span>
              <h3 className="fw-bold text-primary mb-0">{occupancyRate}%</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Section Filter Pills */}
      <div className="d-flex gap-2 mb-4 bg-white p-2 rounded-pill shadow-sm d-inline-flex">
        {['All', 'Main Dining', 'Nile Terrace', 'VIP Lounge'].map(sec => (
          <Button
            key={sec}
            variant={selectedSection === sec ? 'primary' : 'light'}
            size="sm"
            className="rounded-pill px-3 fw-bold border-0"
            onClick={() => setSelectedSection(sec)}
          >
            {sec}
          </Button>
        ))}
      </div>

      {/* Floor Plan Grid */}
      <Row className="g-4">
        {filteredTables.map(table => {
          const order = getTableOrder(table.id);
          const status = getTableStatus(table.id);
          const borderClass = getCardBorder(status);

          return (
            <Col key={table.id} xs={12} sm={6} md={4} lg={3}>
              <Card className={`border-2 shadow-sm rounded-4 h-100 transition-all ${borderClass}`} style={{ minHeight: '220px' }}>
                <Card.Body className="d-flex flex-column justify-content-between p-4">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h4 className="fw-bold mb-0">{table.name}</h4>
                      {getStatusBadge(status)}
                    </div>
                    <div className="text-muted small mb-3 d-flex align-items-center">
                      <Users size={14} className="me-1" /> {table.seats} Seats • {table.section}
                    </div>

                    {order ? (
                      <div className="bg-light p-2.5 rounded-3 mb-3 small">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="fw-bold text-primary">{order.orderNumber}</span>
                          <span className="text-muted d-flex align-items-center">
                            <Clock size={12} className="me-1" /> {getElapsedTime(order.createdAt)}
                          </span>
                        </div>
                        <div className="d-flex justify-content-between text-muted">
                          <span>{order.items.reduce((s, i) => s + i.quantity, 0)} Items</span>
                          <span className="fw-bold text-success">{order.totalPrice} EGP</span>
                        </div>
                        <div className="mt-1">
                          <Badge bg="secondary" className="me-1">{order.status}</Badge>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 text-center text-muted bg-light rounded-3 mb-3 small">
                        <CheckCircle size={20} className="text-success mb-1" />
                        <div>Ready for guests</div>
                      </div>
                    )}
                  </div>

                  <div>
                    {order ? (
                      <div className="d-flex gap-2">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="w-100 rounded-pill fw-bold"
                          onClick={() => handleViewOrder(order)}
                        >
                          View Order
                        </Button>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          className="rounded-pill fw-bold"
                          title="Clear Table"
                          onClick={() => handleClearTable(order._id, table.id)}
                        >
                          Clear
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-100 rounded-pill fw-bold d-flex align-items-center justify-content-center gap-1"
                        onClick={() => handleStartOrder(table.id)}
                      >
                        <PlusCircle size={15} /> Order Now
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Table Order Details Modal */}
      <Modal show={showOrderModal} onHide={() => setShowOrderModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">
            {selectedTableOrder ? `Order ${selectedTableOrder.orderNumber} - ${selectedTableOrder.tableNumber}` : 'Table Order'}
          </Modal.Title>
        </Modal.Header>
        {selectedTableOrder && (
          <Modal.Body>
            <div className="mb-3 d-flex justify-content-between align-items-center">
              <div>
                <span className="badge bg-primary me-2">{selectedTableOrder.status}</span>
                <span className="badge bg-secondary">{selectedTableOrder.orderType}</span>
              </div>
              <span className="text-muted small">
                Started {new Date(selectedTableOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <h6 className="fw-bold mb-2">Ordered Items</h6>
            <div className="bg-light p-3 rounded-4 mb-3">
              {selectedTableOrder.items.map((item, idx) => (
                <div key={idx} className="d-flex justify-content-between align-items-center py-1 border-bottom border-light">
                  <div>
                    <span className="fw-bold me-2">{item.quantity}x</span>
                    <span>{item.name}</span>
                    {item.customNotes && <div className="text-muted small ps-4">{item.customNotes}</div>}
                  </div>
                  <span className="fw-bold">{item.price * item.quantity} EGP</span>
                </div>
              ))}
            </div>

            <div className="d-flex justify-content-between align-items-center p-3 bg-primary bg-opacity-10 rounded-4 mb-3">
              <span className="fw-bold fs-5">Total Bill:</span>
              <span className="fw-bold fs-4 text-primary">{selectedTableOrder.totalPrice} EGP</span>
            </div>

            <div className="d-flex gap-2">
              <Button
                variant="success"
                className="w-100 rounded-pill fw-bold"
                onClick={() => handleClearTable(selectedTableOrder._id, selectedTableOrder.tableNumber)}
              >
                Mark Paid & Clear Table
              </Button>
              <Button
                variant="light"
                className="rounded-pill"
                onClick={() => setShowOrderModal(false)}
              >
                Close
              </Button>
            </div>
          </Modal.Body>
        )}
      </Modal>
    </div>
  );
};

export default TableManagement;
