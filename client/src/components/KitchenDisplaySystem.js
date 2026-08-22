import React, { useState, useEffect, useRef } from 'react';
import { Row, Col, Card, Badge, Button } from 'react-bootstrap';
import { Clock, ChefHat, Package, Check, Truck, Volume2, VolumeX, RotateCcw, Filter, Utensils } from 'lucide-react';
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

const STATIONS = ['All Stations', 'Grill', 'Fryer', 'Salad/Sides', 'Beverages', 'Assembly'];

// Synthesize pleasant kitchen chime using Web Audio API
const playKitchenChime = (type = 'new') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'urgent') {
      // Rapid double alert
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      // Pleasant order notification ding-dong
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.18); // A5

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.start(now);
      osc1.stop(now + 0.2);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.6);
    }
  } catch (e) {
    console.log('Web Audio disabled or not yet initiated by user interaction');
  }
};

const KitchenDisplaySystem = () => {
  const [orders, setOrders] = useState([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedStation, setSelectedStation] = useState('All Stations');
  const [currentTime, setCurrentTime] = useState(Date.now());
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  useEffect(() => {
    fetchOrders();

    // Timer tick every 5 seconds to update SLA status dynamically
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 5000);

    // Socket.io connection
    const socket = io('http://localhost:4000');
    
    socket.on('new_order', (order) => {
      setOrders(prev => [order, ...prev]);
      if (soundRef.current) playKitchenChime('new');
    });

    socket.on('order_updated', (updatedOrder) => {
      setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
    });

    return () => {
      clearInterval(timer);
      socket.disconnect();
    };
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
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status: STAGES[nextIndex] } : o));
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const rollbackStatus = async (id, currentStatus) => {
    const prevIndex = STAGES.indexOf(currentStatus) - 1;
    if (prevIndex < 0) return;

    try {
      await axios.put(`http://localhost:4000/api/orders/update-order/${id}`, {
        status: STAGES[prevIndex]
      });
      setOrders(prev => prev.map(o => o._id === id ? { ...o, status: STAGES[prevIndex] } : o));
    } catch (err) {
      console.error('Error reverting status:', err);
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

  // SLA Calculation in minutes
  const getSLAInfo = (createdAt, status) => {
    if (status === 'Delivered') return { minutes: 0, text: 'Done', color: 'secondary', isCritical: false };
    const elapsedMinutes = Math.floor((currentTime - new Date(createdAt || Date.now())) / 60000);

    if (elapsedMinutes < 8) {
      return { minutes: elapsedMinutes, text: `${elapsedMinutes}m (Normal)`, color: 'success', isCritical: false };
    } else if (elapsedMinutes < 15) {
      return { minutes: elapsedMinutes, text: `${elapsedMinutes}m (Rush)`, color: 'warning', isCritical: false };
    } else {
      return { minutes: elapsedMinutes, text: `🚨 ${elapsedMinutes}m (OVERDUE)`, color: 'danger', isCritical: true };
    }
  };

  // Filter orders by station
  const matchesStation = (order) => {
    if (selectedStation === 'All Stations') return true;
    return order.items.some(item => (item.station || 'General').toLowerCase() === selectedStation.toLowerCase());
  };

  return (
    <div className="h-100 pb-5">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center">
            <ChefHat className="me-2 text-primary" /> Kitchen Display System (KDS)
          </h2>
          <p className="text-muted mb-0">Live multi-stage kitchen routing, SLA timers & station-specific work orders</p>
        </div>

        <div className="d-flex align-items-center gap-2">
          {/* Sound Toggle */}
          <Button
            variant={soundEnabled ? 'outline-success' : 'outline-secondary'}
            className="rounded-pill px-3 fw-bold d-flex align-items-center gap-2"
            onClick={() => {
              if (!soundEnabled) playKitchenChime('new');
              setSoundEnabled(!soundEnabled);
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            {soundEnabled ? 'Audio Alerts: ON' : 'Audio Muted'}
          </Button>

          <Badge bg="success" className="px-3 py-2 rounded-pill d-flex align-items-center">
            <span className="me-2 rounded-circle bg-white" style={{ width: 8, height: 8 }}></span>
            Live Sync Active
          </Badge>
        </div>
      </div>

      {/* Station Filters */}
      <div className="d-flex flex-wrap gap-2 mb-4 bg-white p-2 rounded-pill shadow-sm d-inline-flex align-items-center">
        <span className="text-muted small fw-bold ms-2 me-1 d-flex align-items-center">
          <Filter size={14} className="me-1" /> Station:
        </span>
        {STATIONS.map(st => (
          <Button
            key={st}
            variant={selectedStation === st ? 'primary' : 'light'}
            size="sm"
            className="rounded-pill px-3 fw-bold border-0"
            onClick={() => setSelectedStation(st)}
          >
            {st}
          </Button>
        ))}
      </div>

      {/* Kanban Board */}
      <Row className="flex-nowrap overflow-auto g-3 pb-3" style={{ minHeight: '75vh' }}>
        {STAGES.map(stage => {
          const stageOrders = orders.filter(o => o.status === stage && matchesStation(o));

          return (
            <Col key={stage} style={{ minWidth: '330px', maxWidth: '360px' }}>
              <div className="bg-white rounded-4 shadow-sm p-3 h-100 border-top border-4" style={{ borderColor: `var(--bs-${getStatusColor(stage)})` }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0 d-flex align-items-center">
                    {ICONS[stage]} {stage}
                  </h5>
                  <Badge bg="light" text="dark" className="rounded-pill fs-6 border">
                    {stageOrders.length}
                  </Badge>
                </div>

                <div className="d-flex flex-column gap-3">
                  {stageOrders.map(order => {
                    const sla = getSLAInfo(order.createdAt, order.status);

                    return (
                      <Card
                        key={order._id}
                        className={`border-0 rounded-4 shadow-sm order-card ${sla.isCritical ? 'border border-2 border-danger pulse-critical bg-danger-subtle' : 'bg-light'}`}
                      >
                        <Card.Body className="p-3">
                          {/* Card Header: Order # & SLA Timer */}
                          <div className="d-flex justify-content-between align-items-start border-bottom pb-2 mb-2">
                            <div>
                              <div className="fw-bold text-primary fs-5">#{order.orderNumber}</div>
                              {order.orderType === 'Dine-In' ? (
                                <Badge bg="primary" className="rounded-pill small">
                                  <Utensils size={10} className="me-1" /> {order.tableNumber || 'Table'}
                                </Badge>
                              ) : order.orderType === 'Delivery' ? (
                                <Badge bg="info" className="rounded-pill small">
                                  <Truck size={10} className="me-1" /> Delivery ({order.deliveryInfo?.zone || 'Cairo'})
                                </Badge>
                              ) : (
                                <Badge bg="secondary" className="rounded-pill small">Takeaway</Badge>
                              )}
                            </div>

                            <div className="text-end">
                              <Badge bg={sla.color} className="rounded-pill fw-bold">
                                <Clock size={11} className="me-1" /> {sla.text}
                              </Badge>
                              <div className="text-muted small mt-1">
                                {new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          </div>
                          
                          {/* Order Items */}
                          <div className="mb-3">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="mb-2 p-1.5 bg-white rounded-3 shadow-xs border border-light">
                                <div className="d-flex justify-content-between small fw-bold mb-1">
                                  <span>{item.quantity}x {item.name}</span>
                                  {item.station && item.station !== 'General' && (
                                    <span className="badge bg-light text-secondary border">{item.station}</span>
                                  )}
                                </div>
                                {item.customNotes && (
                                  <div className="ms-1 px-2 py-0.5 bg-danger-subtle rounded text-danger small fst-italic">
                                    ⚠️ {item.customNotes}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>

                          {/* Action Buttons */}
                          <div className="d-flex gap-2">
                            {stage !== 'Pending' && (
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                className="rounded-pill"
                                title="Revert to previous stage"
                                onClick={() => rollbackStatus(order._id, stage)}
                              >
                                <RotateCcw size={14} />
                              </Button>
                            )}

                            {stage !== 'Delivered' && (
                              <Button 
                                variant={getStatusColor(stage)} 
                                size="sm" 
                                className="w-100 rounded-pill fw-bold"
                                onClick={() => updateStatus(order._id, stage)}
                              >
                                Advance to {STAGES[STAGES.indexOf(stage) + 1]}
                              </Button>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </Col>
          );
        })}
      </Row>

      <style type="text/css">
        {`
          .order-card {
            transition: all 0.2s ease;
          }
          .order-card:hover {
            transform: translateY(-2px);
          }
          .pulse-critical {
            animation: pulseAlert 2s infinite;
          }
          @keyframes pulseAlert {
            0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.4); }
            70% { box-shadow: 0 0 0 8px rgba(220, 53, 69, 0); }
            100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
          }
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
