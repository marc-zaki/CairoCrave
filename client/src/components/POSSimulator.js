import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button, Form, Badge, Modal } from 'react-bootstrap';
import { Search, ShoppingCart, CheckCircle, Plus, Minus, Trash2 } from 'lucide-react';
import axios from 'axios';

const POSSimulator = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);

  const presetNotes = ['No Pickles', 'Extra Cheese', 'Extra Ketchup', 'No Onions', 'Spicy'];

  useEffect(() => {
    fetchMenu();
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

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    try {
      const orderData = {
        items: cart.map(item => {
          const finalNotes = [...(item.itemNotes || []), item.customNote].filter(Boolean).join(', ');
          return {
            menuItem: item._id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            customNotes: finalNotes
          };
        }),
        totalPrice: total,
        status: 'Pending'
      };
      
      const res = await axios.post('http://localhost:4000/api/orders/create-order', orderData);
      setLastOrder(res.data);
      setShowReceipt(true);
      setCart([]);
    } catch (err) {
      console.error('Checkout failed', err);
      alert('Checkout failed!');
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    return true;
  });

  return (
    <Row className="h-100">
      {/* Menu Area */}
      <Col md={8} className="pe-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold mb-0">Menu</h2>
          <div className="d-flex gap-3 w-50">
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
                className="pl-5 rounded-pill"
                style={{ paddingLeft: '40px' }}
              />
              <Search className="position-absolute text-muted" size={18} style={{ left: '15px', top: '10px' }} />
            </div>
          </div>
        </div>

        <Row className="g-4">
          {filteredMenuItems.map(item => (
            <Col xl={4} lg={6} key={item._id}>
              <Card className="h-100 shadow-sm border-0 rounded-4 overflow-hidden h-hover">
                <Card.Body className="d-flex flex-column">
                  <Badge bg="primary" className="align-self-start mb-2 px-3 py-2 rounded-pill">
                    {item.category}
                  </Badge>
                  <Card.Title className="fw-bold fs-5">{item.name}</Card.Title>
                  <Card.Text className="text-muted small flex-grow-1">
                    {item.description}
                  </Card.Text>
                  <div className="d-flex justify-content-between align-items-end mt-3">
                    <span className="fw-bold fs-5 text-primary">{item.price} EGP</span>
                    <Button 
                      variant="outline-primary" 
                      className="rounded-circle p-2 lh-1"
                      onClick={() => addToCart(item)}
                      disabled={!item.inStock}
                    >
                      <Plus size={20} />
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Col>

      {/* Cart Sidebar */}
      <Col md={4}>
        <Card className="shadow-sm border-0 rounded-4 h-100">
          <Card.Body className="d-flex flex-column p-4">
            <div className="d-flex align-items-center mb-4">
              <ShoppingCart className="text-primary me-2" />
              <h4 className="fw-bold mb-0">Current Order</h4>
            </div>

            <div className="flex-grow-1 overflow-auto pe-2 mb-4" style={{ maxHeight: '50vh' }}>
              {cart.length === 0 ? (
                <div className="text-center text-muted mt-5">
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item._id} className="mb-3 pb-3 border-bottom">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div className="w-50">
                        <h6 className="fw-bold mb-1">{item.name}</h6>
                        <span className="text-muted small">{item.price} EGP</span>
                      </div>
                      <div className="d-flex align-items-center">
                        <Button variant="light" size="sm" className="p-1" onClick={() => updateQuantity(item._id, -1)}>
                          <Minus size={16} />
                        </Button>
                        <span className="mx-2 fw-bold">{item.quantity}</span>
                        <Button variant="light" size="sm" className="p-1" onClick={() => updateQuantity(item._id, 1)}>
                          <Plus size={16} />
                        </Button>
                        <Button variant="link" className="text-danger p-1 ms-2" onClick={() => removeFromCart(item._id)}>
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Item Notes Section */}
                    <div className="bg-light p-2 rounded-3 mt-2">
                      <div className="d-flex flex-wrap gap-1 mb-2">
                        {presetNotes.map(preset => (
                          <Badge 
                            key={preset}
                            bg={(item.itemNotes || []).includes(preset) ? 'primary' : 'secondary'}
                            className="rounded-pill p-2"
                            style={{ cursor: 'pointer', fontSize: '0.7rem' }}
                            onClick={() => togglePresetNote(item._id, preset)}
                          >
                            {preset}
                          </Badge>
                        ))}
                      </div>
                      <Form.Control 
                        size="sm"
                        type="text" 
                        placeholder="Other custom note..." 
                        value={item.customNote || ''}
                        onChange={(e) => handleCustomNoteChange(item._id, e.target.value)}
                        className="rounded-3 border-0"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-auto">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h5 className="mb-0 text-muted">Total</h5>
                <h3 className="fw-bold mb-0 text-primary">{total.toFixed(2)} EGP</h3>
              </div>

              <Button 
                variant="primary" 
                size="lg" 
                className="w-100 fw-bold rounded-pill py-3 d-flex align-items-center justify-content-center"
                disabled={cart.length === 0}
                onClick={handleCheckout}
              >
                <CheckCircle className="me-2" /> Place Order
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
            <h3 className="fw-bold">Order Placed!</h3>
            <p className="text-muted">Order #{lastOrder?.orderNumber}</p>
          </div>
          
          <div className="bg-light rounded-4 p-4 text-start mb-4">
            {lastOrder?.items?.map((item, idx) => (
              <div key={idx} className="mb-2">
                <div className="d-flex justify-content-between">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{item.price * item.quantity} EGP</span>
                </div>
                {item.customNotes && (
                  <div className="text-muted small fst-italic ps-3">
                    - {item.customNotes}
                  </div>
                )}
              </div>
            ))}
            <hr />
            <div className="d-flex justify-content-between fw-bold fs-5">
              <span>Total</span>
              <span className="text-primary">{lastOrder?.totalPrice} EGP</span>
            </div>
          </div>
          <Button variant="outline-primary" className="rounded-pill px-5" onClick={() => setShowReceipt(false)}>
            New Order
          </Button>
        </Modal.Body>
      </Modal>

      <style type="text/css">
        {`
          .h-hover:hover {
            transform: translateY(-5px);
            transition: transform 0.3s ease;
            box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
          }
        `}
      </style>
    </Row>
  );
};

export default POSSimulator;
