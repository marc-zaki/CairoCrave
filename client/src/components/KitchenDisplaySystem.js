import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { Clock, ChefHat, Package, Check, Truck } from 'lucide-react';
import axios from 'axios';
import { io } from 'socket.io-client';

const STAGES = ['Pending', 'Prepping', 'Assembly', 'Ready', 'Delivered'];

const ICONS = {
  Pending: <Clock size={16} className="me-1" />,
  Prepping: <ChefHat size={16} className="me-1" />,
  Assembly: <Package size={16} className="me-1" />,
  Ready: <Check size={16} className="me-1" />,
  Delivered: <Truck size={16} className="me-1" />
};

const KitchenDisplaySystem = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    fetchOrders();

    // Socket.io connection
    const socket = io('http://localhost:4000');
    
    socket.on('new_order', (order) => {
      setOrders(prev => [order, ...prev]);
    });

    socket.on('order_updated', (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
    });

    return () => socket.disconnect();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await axios.get('http://localhost:4000/api/orders');
      setOrders(res.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
    }
  };

  const updateStatus = async (id, currentStatus) => {
    const nextIndex = STAGES.indexOf(currentStatus) + 1;
    if (nextIndex >= STAGES.length) return;
    
    try {
      await axios.put(`http://localhost:4000/api/orders/update-order/${id}`, {
        status: STAGES[nextIndex]
      });
      // Optimistically update the UI so it feels instant
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status: STAGES[nextIndex] } : o));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'danger';
      case 'Prepping': return 'warning';
      case 'Assembly': return 'info';
      case 'Ready': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div className="h-100 pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Kitchen Display System</h2>
        <Badge bg="success" className="px-3 py-2 rounded-pill d-flex align-items-center">
          <span className="me-2 rounded-circle bg-white" style={{ width: 8, height: 8 }}></span>
          Live Sync Active
        </Badge>
      </div>

      <Row className="flex-nowrap overflow-auto g-3 pb-3" style={{ minHeight: '75vh' }}>
        {STAGES.map(stage => (
          <Col key={stage} style={{ minWidth: '320px', maxWidth: '350px' }}>
            <div className="bg-white rounded-4 shadow-sm p-3 h-100 border-top border-4" style={{ borderColor: `var(--bs-${getStatusColor(stage)})` }}>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 d-flex align-items-center">
                  {ICONS[stage]} {stage}
                </h5>
                <Badge bg="light" text="dark" className="rounded-pill fs-6">
                  {orders.filter(o => o.status === stage).length}
                </Badge>
              </div>

              <div className="d-flex flex-column gap-3">
                {orders
                  .filter(order => order.status === stage)
                  .map(order => (
                    <Card key={order._id} className="border-0 bg-light rounded-4 shadow-sm order-card">
                      <Card.Body className="p-3">
                        <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-2">
                          <span className="fw-bold text-primary">#{order.orderNumber}</span>
                          <span className="small text-muted text-end">
                            {new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="mb-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="mb-2">
                              <div className="d-flex justify-content-between small fw-bold mb-1">
                                <span>{item.quantity}x {item.name}</span>
                              </div>
                              {item.customNotes && (
                                <div className="ms-3 px-2 py-1 bg-white rounded text-danger small fst-italic border border-danger-subtle">
                                  {item.customNotes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {stage !== 'Delivered' && (
                          <Button 
                            variant={getStatusColor(stage)} 
                            size="sm" 
                            className="w-100 rounded-pill fw-bold"
                            onClick={() => updateStatus(order._id, stage)}
                          >
                            Move to {STAGES[STAGES.indexOf(stage) + 1]}
                          </Button>
                        )}
                      </Card.Body>
                    </Card>
                ))}
              </div>
            </div>
          </Col>
        ))}
      </Row>

      <style type="text/css">
        {`
          .order-card {
            transition: all 0.2s ease;
          }
          .order-card:hover {
            transform: scale(1.02);
          }
          /* Custom scrollbar for Kanban board */
          ::-webkit-scrollbar {
            height: 8px;
            width: 8px;
          }
          ::-webkit-scrollbar-track {
            background: #f1f1f1; 
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb {
            background: #c1c1c1; 
            border-radius: 4px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8; 
          }
        `}
      </style>
    </div>
  );
};

export default KitchenDisplaySystem;
