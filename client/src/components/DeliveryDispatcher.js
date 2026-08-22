import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Badge, Modal, Form } from 'react-bootstrap';
import { Truck, Phone, MapPin, User, Clock, MessageSquare, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const DRIVER_PRESETS = [
  { name: 'Ahmed Hassan', phone: '+20 101 234 5678' },
  { name: 'Mohamed Ali', phone: '+20 112 345 6789' },
  { name: 'Karim Tarek', phone: '+20 120 987 6543' },
  { name: 'Omar Khaled', phone: '+20 109 876 5432' },
];

export const CAIRO_ZONES = [
  { name: 'New Cairo (5th Settlement)', fee: 40, eta: '35-45 mins' },
  { name: 'Maadi & Degla', fee: 35, eta: '30-40 mins' },
  { name: 'Zamalek & Downtown', fee: 30, eta: '25-35 mins' },
  { name: 'Nasr City & Heliopolis', fee: 35, eta: '30-40 mins' },
  { name: 'Sheikh Zayed & 6th October', fee: 50, eta: '45-60 mins' },
  { name: 'Dokki & Mohandessin', fee: 30, eta: '25-35 mins' },
  { name: 'Garden City / Manial', fee: 30, eta: '20-30 mins' },
];

const DeliveryDispatcher = () => {
  const [orders, setOrders] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [driverForm, setDriverForm] = useState({ driverName: '', driverPhone: '' });

  useEffect(() => {
    fetchDeliveryOrders();

    const socket = io('http://localhost:4000');
    socket.on('new_order', () => fetchDeliveryOrders());
    socket.on('order_updated', () => fetchDeliveryOrders());
    socket.on('delivery_updated', () => fetchDeliveryOrders());

    return () => socket.disconnect();
  }, []);

  const fetchDeliveryOrders = async () => {
    try {
      const res = await axios.get('http://localhost:4000/api/orders?orderType=Delivery');
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching delivery orders:', err);
    }
  };

  const handleOpenAssign = (order) => {
    setSelectedOrder(order);
    setDriverForm({
      driverName: order.deliveryInfo?.driverName || DRIVER_PRESETS[0].name,
      driverPhone: order.deliveryInfo?.driverPhone || DRIVER_PRESETS[0].phone
    });
    setShowDriverModal(true);
  };

  const handleSaveDriver = async (e) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      await axios.put(`http://localhost:4000/api/orders/assign-driver/${selectedOrder._id}`, {
        driverName: driverForm.driverName,
        driverPhone: driverForm.driverPhone,
        dispatchedAt: new Date()
      });
      setShowDriverModal(false);
      fetchDeliveryOrders();
    } catch (err) {
      console.error('Failed to assign driver:', err);
    }
  };

  const handleStatusUpdate = async (orderId, newStatus) => {
    try {
      const payload = { status: newStatus };
      if (newStatus === 'Delivered') {
        payload['deliveryInfo.deliveredAt'] = new Date();
      }
      await axios.put(`http://localhost:4000/api/orders/update-order/${orderId}`, payload);
      fetchDeliveryOrders();
    } catch (err) {
      console.error('Failed to update delivery status:', err);
    }
  };

  const openWhatsApp = (order) => {
    const rawPhone = (order.customerInfo?.phone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('20') ? rawPhone : (rawPhone.startsWith('0') ? `2${rawPhone}` : `20${rawPhone}`);
    
    const driverText = order.deliveryInfo?.driverName 
      ? `🛵 Driver: ${order.deliveryInfo.driverName} (${order.deliveryInfo.driverPhone || 'N/A'})`
      : '👨‍🍳 Currently being prepared in our kitchen!';

    const message = `👋 Hello ${order.customerInfo?.name || 'Valued Customer'}!
🍔 *CairoCrave Order #${order.orderNumber} Update:*
Status: *${order.status}*
${driverText}
📍 Delivery to: ${order.customerInfo?.address || 'Your address'} (${order.deliveryInfo?.zone || 'Cairo'})
💰 Total Amount: ${order.totalPrice} EGP
Thank you for choosing CairoCrave!`;

    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${cleanPhone}?text=${encoded}`, '_blank');
  };

  const filteredOrders = filterStatus === 'All'
    ? orders
    : orders.filter(o => {
        if (filterStatus === 'Active') return o.status !== 'Delivered';
        if (filterStatus === 'Dispatched') return o.deliveryInfo?.driverName && o.status !== 'Delivered';
        return o.status === filterStatus;
      });

  const activeDeliveries = orders.filter(o => o.status !== 'Delivered');
  const deliveredToday = orders.filter(o => o.status === 'Delivered');
  const totalDeliveryRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);

  const getElapsedTime = (createdAt) => {
    if (!createdAt) return '0m';
    const elapsedMinutes = Math.floor((new Date() - new Date(createdAt)) / 60000);
    return `${elapsedMinutes}m ago`;
  };

  return (
    <div className="pb-5">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center">
            <Truck className="me-2 text-primary" /> Delivery Dispatcher & Driver Hub
          </h2>
          <p className="text-muted mb-0">Cairo Zones delivery fleet routing, courier assignment, and WhatsApp live updates</p>
        </div>
        <Button
          variant="outline-primary"
          className="rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
          onClick={fetchDeliveryOrders}
        >
          <RefreshCw size={16} /> Refresh Deliveries
        </Button>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4 bg-primary text-white">
            <Card.Body>
              <span className="text-white-50 fw-bold small">Active Deliveries</span>
              <h3 className="fw-bold mb-0">{activeDeliveries.length} In-Transit</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4 bg-success text-white">
            <Card.Body>
              <span className="text-white-50 fw-bold small">Completed Today</span>
              <h3 className="fw-bold mb-0">{deliveredToday.length} Delivered</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body>
              <span className="text-muted fw-bold small">Active Couriers</span>
              <h3 className="fw-bold text-dark mb-0">{DRIVER_PRESETS.length} On Duty</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm rounded-4">
            <Card.Body>
              <span className="text-muted fw-bold small">Total Delivery Revenue</span>
              <h3 className="fw-bold text-primary mb-0">{totalDeliveryRevenue.toFixed(2)} EGP</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filter Tabs */}
      <div className="d-flex gap-2 mb-4 bg-white p-2 rounded-pill shadow-sm d-inline-flex">
        {['All', 'Active', 'Pending', 'Prepping', 'Ready', 'Delivered'].map(status => (
          <Button
            key={status}
            variant={filterStatus === status ? 'primary' : 'light'}
            size="sm"
            className="rounded-pill px-3 fw-bold border-0"
            onClick={() => setFilterStatus(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Orders Grid */}
      <Row className="g-4">
        {filteredOrders.length === 0 ? (
          <Col xs={12}>
            <Card className="border-0 shadow-sm rounded-4 text-center p-5">
              <Truck size={48} className="text-muted mx-auto mb-3" />
              <h5 className="fw-bold text-muted">No delivery orders found</h5>
              <p className="text-muted small">Place a Delivery order in POS Simulator to see it here.</p>
            </Card>
          </Col>
        ) : (
          filteredOrders.map(order => (
            <Col key={order._id} xs={12} lg={6}>
              <Card className={`border-0 shadow-sm rounded-4 h-100 ${order.status === 'Delivered' ? 'bg-light' : 'bg-white'}`}>
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3 border-bottom pb-2">
                    <div>
                      <span className="fw-bold fs-5 text-primary me-2">{order.orderNumber}</span>
                      <Badge bg={order.status === 'Delivered' ? 'success' : (order.status === 'Ready' ? 'warning' : 'info')} className="rounded-pill">
                        {order.status}
                      </Badge>
                    </div>
                    <span className="text-muted small d-flex align-items-center">
                      <Clock size={14} className="me-1" /> {getElapsedTime(order.createdAt)}
                    </span>
                  </div>

                  <Row className="mb-3 g-2">
                    <Col sm={6}>
                      <div className="text-muted small">Customer</div>
                      <div className="fw-bold d-flex align-items-center">
                        <User size={14} className="me-1 text-primary" />
                        {order.customerInfo?.name || 'Customer'}
                      </div>
                      <div className="small text-muted d-flex align-items-center mt-1">
                        <Phone size={13} className="me-1" /> {order.customerInfo?.phone || 'No phone'}
                      </div>
                    </Col>
                    <Col sm={6}>
                      <div className="text-muted small">Delivery Address & Zone</div>
                      <div className="fw-bold text-dark d-flex align-items-center">
                        <MapPin size={14} className="me-1 text-danger" />
                        {order.deliveryInfo?.zone || 'Cairo Zone'}
                      </div>
                      <div className="small text-muted text-truncate">{order.customerInfo?.address || 'Address not provided'}</div>
                    </Col>
                  </Row>

                  {/* Order Items Preview */}
                  <div className="bg-light p-2.5 rounded-3 mb-3 small">
                    <div className="fw-bold mb-1 text-muted">Order Contents:</div>
                    {order.items.map((i, idx) => (
                      <span key={idx} className="badge bg-white text-dark me-1 mb-1 border shadow-xs">
                        {i.quantity}x {i.name}
                      </span>
                    ))}
                    <div className="d-flex justify-content-between mt-2 pt-1 border-top fw-bold">
                      <span>Total (incl. {order.deliveryFee || 0} EGP fee):</span>
                      <span className="text-primary">{order.totalPrice} EGP</span>
                    </div>
                  </div>

                  {/* Assigned Courier */}
                  <div className="p-2.5 rounded-3 border mb-3 d-flex justify-content-between align-items-center">
                    <div>
                      <span className="small text-muted">Assigned Courier:</span>
                      <div className="fw-bold text-dark">
                        {order.deliveryInfo?.driverName ? (
                          <span className="text-success">🛵 {order.deliveryInfo.driverName} ({order.deliveryInfo.driverPhone})</span>
                        ) : (
                          <span className="text-danger small">⚠️ Unassigned Courier</span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="rounded-pill px-3 fw-bold"
                      onClick={() => handleOpenAssign(order)}
                    >
                      {order.deliveryInfo?.driverName ? 'Change Driver' : 'Assign Driver'}
                    </Button>
                  </div>

                  {/* Actions Bar */}
                  <div className="d-flex flex-wrap gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      className="rounded-pill px-3 fw-bold d-flex align-items-center gap-1 shadow-sm"
                      onClick={() => openWhatsApp(order)}
                    >
                      <MessageSquare size={15} /> WhatsApp Customer
                    </Button>

                    {order.status !== 'Delivered' && (
                      <>
                        {order.status !== 'Ready' && (
                          <Button
                            variant="warning"
                            size="sm"
                            className="rounded-pill px-3 fw-bold"
                            onClick={() => handleStatusUpdate(order._id, 'Ready')}
                          >
                            Mark Ready
                          </Button>
                        )}
                        <Button
                          variant="primary"
                          size="sm"
                          className="rounded-pill px-3 fw-bold"
                          onClick={() => handleStatusUpdate(order._id, 'Delivered')}
                        >
                          Mark Delivered
                        </Button>
                      </>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Driver Assignment Modal */}
      <Modal show={showDriverModal} onHide={() => setShowDriverModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Assign Delivery Courier</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveDriver}>
          <Modal.Body>
            <p className="text-muted small">
              Assign a courier for order <strong>{selectedOrder?.orderNumber}</strong> destined for <strong>{selectedOrder?.deliveryInfo?.zone || 'Cairo'}</strong>.
            </p>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Select Active Driver</Form.Label>
              <Form.Select
                value={driverForm.driverName}
                onChange={(e) => {
                  const preset = DRIVER_PRESETS.find(d => d.name === e.target.value);
                  setDriverForm({
                    driverName: e.target.value,
                    driverPhone: preset ? preset.phone : driverForm.driverPhone
                  });
                }}
              >
                {DRIVER_PRESETS.map((d, idx) => (
                  <option key={idx} value={d.name}>{d.name} ({d.phone})</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Driver Phone Number</Form.Label>
              <Form.Control
                required
                value={driverForm.driverPhone}
                onChange={(e) => setDriverForm({ ...driverForm, driverPhone: e.target.value })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowDriverModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="rounded-pill px-4 fw-bold">Save & Dispatch</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default DeliveryDispatcher;
