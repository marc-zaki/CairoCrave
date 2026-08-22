import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Badge, Modal } from 'react-bootstrap';
import { Search, ShoppingCart, CheckCircle, Plus, Minus, Trash2, Utensils, Truck, ShoppingBag } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { CAIRO_ZONES } from './DeliveryDispatcher';

const TABLES_LIST = [
  'T1 (2 Seats)', 'T2 (4 Seats)', 'T3 (4 Seats)', 'T4 (6 Seats)', 'T5 (2 Seats)', 'T6 (8 Seats)',
  'Terrace 1 (4 Seats)', 'Terrace 2 (4 Seats)', 'Terrace 3 (2 Seats)', 'Terrace 4 (6 Seats)',
  'VIP Suite 1 (10 Seats)', 'VIP Suite 2 (12 Seats)'
];

const POSSimulator = () => {
  const location = useLocation();
  const [menuItems, setMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  // Order Type & Details
  const [orderType, setOrderType] = useState('Dine-In');
  const [tableNumber, setTableNumber] = useState('T1');
  const [selectedZone, setSelectedZone] = useState(CAIRO_ZONES[0].name);
  const [customerInfo, setCustomerInfo] = useState({ name: '', phone: '', address: '', notes: '' });
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const presetNotes = ['No Pickles', 'Extra Cheese', 'Extra Ketchup', 'No Onions', 'Spicy'];

  // Check URL params for preselected table
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tableParam = params.get('table');
    const typeParam = params.get('type');
    if (tableParam) setTableNumber(tableParam);
    if (typeParam) setOrderType(typeParam);
  }, [location]);

  useEffect(() => {
    fetchMenu();

    const socket = io('http://localhost:4000');
    socket.on('menu_updated', () => fetchMenu());
    socket.on('inventory_updated', () => fetchMenu());

    return () => socket.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const fetchMenu = async () => {
    try {
      const url = searchQuery 
        ? `http://localhost:4000/api/menu?search=${searchQuery}`
        : 'http://localhost:4000/api/menu';
      const res = await axios.get(url);
      setMenuItems(res.data);
    } catch (err) {
      console.error('Error fetching menu:', err);
    }
  };

  const addToCart = (item) => {
    if (!item.inStock) return;
    const existing = cart.find(c => c._id === item._id);
    if (existing) {
      setCart(cart.map(c => c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { ...item, quantity: 1, itemNotes: [], customNote: '' }]);
    }
  };

  const updateQuantity = (id, delta) => {
    setCart(cart.map(item => {
      if (item._id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const togglePresetNote = (id, preset) => {
    setCart(cart.map(item => {
      if (item._id === id) {
        const notes = item.itemNotes || [];
        if (notes.includes(preset)) {
          return { ...item, itemNotes: notes.filter(n => n !== preset) };
        } else {
          return { ...item, itemNotes: [...notes, preset] };
        }
      }
      return item;
    }));
  };

  const handleCustomNoteChange = (id, value) => {
    setCart(cart.map(item => {
      if (item._id === id) return { ...item, customNote: value };
      return item;
    }));
  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item._id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const zoneObj = CAIRO_ZONES.find(z => z.name === selectedZone);
  const deliveryFee = orderType === 'Delivery' ? (zoneObj ? zoneObj.fee : 35) : 0;
  const total = subtotal + deliveryFee;

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (orderType === 'Delivery' && (!customerInfo.phone || !customerInfo.address)) {
      alert('Please enter Customer Phone and Delivery Address for delivery orders.');
      return;
    }

    try {
      const orderData = {
        items: cart.map(item => {
          const finalNotes = [...(item.itemNotes || []), item.customNote].filter(Boolean).join(', ');
          return {
            menuItem: item._id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            costPrice: item.costPrice || 0,
            station: item.station || 'General',
            customNotes: finalNotes
          };
        }),
        orderType: orderType,
        tableNumber: orderType === 'Dine-In' ? tableNumber.split(' ')[0] : '',
        customerInfo: customerInfo,
        deliveryInfo: orderType === 'Delivery' ? {
          zone: selectedZone,
          deliveryFee: deliveryFee
        } : {},
        deliveryFee: deliveryFee,
        subtotal: subtotal,
        totalPrice: total,
        paymentMethod: paymentMethod,
        status: 'Pending'
      };
      
      const res = await axios.post('http://localhost:4000/api/orders/create-order', orderData);
      setLastOrder(res.data);
      setShowReceipt(true);
      setCart([]);
      setCustomerInfo({ name: '', phone: '', address: '', notes: '' });
    } catch (err) {
      console.error('Checkout failed', err);
      alert('Checkout failed! Please try again.');
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    return true;
  });

  return (
    <Row className="h-100 pb-5">
      {/* Menu Area */}
      <Col md={8} className="pe-4">
        {/* Header & Category Filters */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
          <div>
            <h2 className="fw-bold mb-0">POS Terminal</h2>
            <span className="text-muted small">Select items to construct the order ticket</span>
          </div>

          <div className="d-flex gap-2 flex-grow-1 justify-content-end" style={{ maxWidth: '500px' }}>
            <Form.Select 
              className="rounded-pill w-auto fw-bold"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              <option value="Burgers">Burgers</option>
              <option value="Sandwiches">Sandwiches</option>
              <option value="Chicken">Chicken</option>
              <option value="Salads">Salads</option>
              <option value="Sides">Sides</option>
              <option value="Beverages">Beverages</option>
              <option value="Desserts">Desserts</option>
              <option value="Combos">Combos</option>
            </Form.Select>
            <div className="position-relative flex-grow-1">
              <Form.Control
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-pill"
                style={{ paddingLeft: '38px' }}
              />
              <Search className="position-absolute text-muted" size={17} style={{ left: '14px', top: '10px' }} />
            </div>
          </div>
        </div>

        {/* Menu Cards Grid */}
        <Row className="g-3">
          {filteredMenuItems.map(item => (
            <Col xl={4} lg={6} key={item._id}>
              <Card className={`h-100 shadow-sm border-0 rounded-4 overflow-hidden h-hover ${!item.inStock ? 'opacity-75 bg-light' : 'bg-white'}`}>
                <Card.Body className="d-flex flex-column p-3.5">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Badge bg="primary" className="px-3 py-1.5 rounded-pill">
                      {item.category}
                    </Badge>
                    {!item.inStock && (
                      <Badge bg="danger" className="rounded-pill px-2.5 py-1 fw-bold">
                        86'd Out of Stock
                      </Badge>
                    )}
                  </div>
                  <Card.Title className="fw-bold fs-5 mb-1">{item.name}</Card.Title>
                  <Card.Text className="text-muted small flex-grow-1 mb-3">
                    {item.description || 'Prepared fresh on order'}
                  </Card.Text>
                  <div className="d-flex justify-content-between align-items-center mt-auto pt-2 border-top">
                    <span className="fw-bold fs-5 text-primary">{item.price} EGP</span>
                    <Button 
                      variant={item.inStock ? 'primary' : 'secondary'} 
                      size="sm"
                      className="rounded-pill px-3 fw-bold d-flex align-items-center gap-1"
                      onClick={() => addToCart(item)}
                      disabled={!item.inStock}
                    >
                      <Plus size={16} /> Add
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Col>

      {/* Cart & Order Dispatch Sidebar */}
      <Col md={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100">
          <Card.Body className="d-flex flex-column p-4">
            {/* Order Type Tabs */}
            <div className="mb-3">
              <div className="d-flex bg-light p-1 rounded-pill mb-3">
                <Button
                  variant={orderType === 'Dine-In' ? 'primary' : 'light'}
                  size="sm"
                  className="w-100 rounded-pill fw-bold border-0 d-flex align-items-center justify-content-center gap-1"
                  onClick={() => setOrderType('Dine-In')}
                >
                  <Utensils size={14} /> Dine-In
                </Button>
                <Button
                  variant={orderType === 'Takeaway' ? 'primary' : 'light'}
                  size="sm"
                  className="w-100 rounded-pill fw-bold border-0 d-flex align-items-center justify-content-center gap-1"
                  onClick={() => setOrderType('Takeaway')}
                >
                  <ShoppingBag size={14} /> Takeaway
                </Button>
                <Button
                  variant={orderType === 'Delivery' ? 'primary' : 'light'}
                  size="sm"
                  className="w-100 rounded-pill fw-bold border-0 d-flex align-items-center justify-content-center gap-1"
                  onClick={() => setOrderType('Delivery')}
                >
                  <Truck size={14} /> Delivery
                </Button>
              </div>

              {/* Order Specific Inputs */}
              {orderType === 'Dine-In' && (
                <Form.Group className="mb-3">
                  <Form.Label className="small fw-bold text-muted">Select Table</Form.Label>
                  <Form.Select
                    size="sm"
                    className="rounded-3 fw-bold"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                  >
                    {TABLES_LIST.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              )}

              {orderType === 'Delivery' && (
                <div className="bg-light p-3 rounded-4 mb-3 small">
                  <Form.Group className="mb-2">
                    <Form.Label className="small fw-bold">Cairo Zone</Form.Label>
                    <Form.Select
                      size="sm"
                      className="rounded-3"
                      value={selectedZone}
                      onChange={(e) => setSelectedZone(e.target.value)}
                    >
                      {CAIRO_ZONES.map(z => (
                        <option key={z.name} value={z.name}>{z.name} (+{z.fee} EGP Fee - {z.eta})</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Row className="g-2 mb-2">
                    <Col>
                      <Form.Control
                        size="sm"
                        placeholder="Customer Name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                      />
                    </Col>
                    <Col>
                      <Form.Control
                        size="sm"
                        placeholder="Phone (e.g. 010...)"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                      />
                    </Col>
                  </Row>
                  <Form.Control
                    size="sm"
                    placeholder="Delivery Street Address / Building / Apt"
                    value={customerInfo.address}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, address: e.target.value })}
                  />
                </div>
              )}

              {orderType === 'Takeaway' && (
                <Row className="g-2 mb-3">
                  <Col>
                    <Form.Control
                      size="sm"
                      placeholder="Customer Name"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
                    />
                  </Col>
                  <Col>
                    <Form.Control
                      size="sm"
                      placeholder="Phone (optional)"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    />
                  </Col>
                </Row>
              )}
            </div>

            {/* Cart Items List */}
            <div className="d-flex align-items-center mb-2">
              <ShoppingCart className="text-primary me-2" size={18} />
              <h5 className="fw-bold mb-0">Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</h5>
            </div>

            <div className="flex-grow-1 overflow-auto pe-2 mb-3" style={{ maxHeight: '35vh' }}>
              {cart.length === 0 ? (
                <div className="text-center text-muted py-5">
                  <p className="mb-0">Your order cart is empty.</p>
                  <span className="small">Click items on the left to add.</span>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item._id} className="mb-2 pb-2 border-bottom">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <div className="w-50">
                        <div className="fw-bold small">{item.name}</div>
                        <span className="text-muted small">{item.price} EGP</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <Button variant="light" size="sm" className="p-1" onClick={() => updateQuantity(item._id, -1)}>
                          <Minus size={14} />
                        </Button>
                        <span className="mx-2 fw-bold small">{item.quantity}</span>
                        <Button variant="light" size="sm" className="p-1" onClick={() => updateQuantity(item._id, 1)}>
                          <Plus size={14} />
                        </Button>
                        <Button variant="link" className="text-danger p-1 ms-1" onClick={() => removeFromCart(item._id)}>
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Item Notes */}
                    <div className="bg-light p-1.5 rounded-3 mt-1">
                      <div className="d-flex flex-wrap gap-1 mb-1">
                        {presetNotes.map(preset => (
                          <Badge 
                            key={preset}
                            bg={(item.itemNotes || []).includes(preset) ? 'primary' : 'secondary'}
                            className="rounded-pill px-2 py-1"
                            style={{ cursor: 'pointer', fontSize: '0.65rem' }}
                            onClick={() => togglePresetNote(item._id, preset)}
                          >
                            {preset}
                          </Badge>
                        ))}
                      </div>
                      <Form.Control 
                        size="sm"
                        type="text" 
                        placeholder="Custom instruction..." 
                        value={item.customNote || ''}
                        onChange={(e) => handleCustomNoteChange(item._id, e.target.value)}
                        className="rounded-3 border-0 bg-white"
                        style={{ fontSize: '0.8rem' }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="mb-3">
              <span className="small text-muted fw-bold d-block mb-1">Payment Tender</span>
              <div className="d-flex gap-1">
                {['Cash', 'Credit Card', 'Mobile Wallet'].map(m => (
                  <Button
                    key={m}
                    variant={paymentMethod === m ? 'dark' : 'outline-secondary'}
                    size="sm"
                    className="rounded-pill flex-grow-1 small fw-bold"
                    onClick={() => setPaymentMethod(m)}
                  >
                    {m}
                  </Button>
                ))}
              </div>
            </div>

            {/* Price Calculations & Submit */}
            <div className="mt-auto pt-2 border-top">
              <div className="d-flex justify-content-between text-muted small mb-1">
                <span>Subtotal:</span>
                <span>{subtotal.toFixed(2)} EGP</span>
              </div>
              {orderType === 'Delivery' && (
                <div className="d-flex justify-content-between text-muted small mb-1">
                  <span>Delivery Fee ({selectedZone}):</span>
                  <span>+{deliveryFee.toFixed(2)} EGP</span>
                </div>
              )}
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="mb-0 fw-bold">Total Bill:</h5>
                <h3 className="fw-bold mb-0 text-primary">{total.toFixed(2)} EGP</h3>
              </div>

              <Button 
                variant="primary" 
                size="lg" 
                className="w-100 fw-bold rounded-pill py-2.5 d-flex align-items-center justify-content-center"
                disabled={cart.length === 0}
                onClick={handleCheckout}
              >
                <CheckCircle className="me-2" size={18} /> Place Order ({orderType})
              </Button>
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Receipt Modal */}
      <Modal show={showReceipt} onHide={() => setShowReceipt(false)} centered>
        <Modal.Header closeButton className="border-0 pb-0">
        </Modal.Header>
        <Modal.Body className="text-center pt-0 pb-5 px-5">
          <div className="mb-4">
            <CheckCircle size={60} className="text-success mb-3" />
            <h3 className="fw-bold">Order Confirmed!</h3>
            <p className="text-muted mb-0">Order #{lastOrder?.orderNumber}</p>
            <Badge bg="primary" className="rounded-pill mt-1">
              {lastOrder?.orderType} {lastOrder?.tableNumber ? `- ${lastOrder.tableNumber}` : ''}
            </Badge>
          </div>
          
          <div className="bg-light rounded-4 p-4 text-start mb-4">
            {lastOrder?.items?.map((item, idx) => (
              <div key={idx} className="mb-2">
                <div className="d-flex justify-content-between small">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="fw-bold">{item.price * item.quantity} EGP</span>
                </div>
                {item.customNotes && (
                  <div className="text-muted small fst-italic ps-3">
                    - {item.customNotes}
                  </div>
                )}
              </div>
            ))}
            {lastOrder?.deliveryFee > 0 && (
              <div className="d-flex justify-content-between small text-muted mt-2">
                <span>Delivery Fee:</span>
                <span>+{lastOrder.deliveryFee} EGP</span>
              </div>
            )}
            <hr />
            <div className="d-flex justify-content-between fw-bold fs-5">
              <span>Total Paid:</span>
              <span className="text-primary">{lastOrder?.totalPrice} EGP</span>
            </div>
            <div className="text-muted small mt-1">Payment Method: {lastOrder?.paymentMethod}</div>
          </div>
          <Button variant="primary" className="rounded-pill px-5 fw-bold" onClick={() => setShowReceipt(false)}>
            Start Next Order
          </Button>
        </Modal.Body>
      </Modal>

      <style type="text/css">
        {`
          .h-hover:hover {
            transform: translateY(-3px);
            transition: transform 0.2s ease;
            box-shadow: 0 .5rem 1rem rgba(0,0,0,.1)!important;
          }
        `}
      </style>
    </Row>
  );
};

export default POSSimulator;
