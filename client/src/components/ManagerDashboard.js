import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Tab, Nav, Table, Button, Badge, Modal, Form } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Users, Menu as MenuIcon, RefreshCw, FileText, Download, Printer, Plus, Trash2, Package, Sliders } from 'lucide-react';
import axios from 'axios';

const ManagerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState([]);

  // Menu Modal & Recipe State
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [menuForm, setMenuForm] = useState({
    name: '',
    category: 'Burgers',
    price: '',
    costPrice: 0,
    station: 'General',
    inStock: true,
    ingredients: []
  });

  // Inventory Modal State
  const [showInvModal, setShowInvModal] = useState(false);
  const [editingInv, setEditingInv] = useState(null);
  const [invForm, setInvForm] = useState({ itemName: '', quantity: '', unit: 'pcs', costPerUnit: '', threshold: 10 });

  // Z-Report Modal State
  const [showZReport, setShowZReport] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersRes, usersRes, menuRes, invRes] = await Promise.all([
        axios.get('http://localhost:4000/api/orders'),
        axios.get('http://localhost:4000/api/users'),
        axios.get('http://localhost:4000/api/menu'),
        axios.get('http://localhost:4000/api/inventory')
      ]);
      setOrders(ordersRes.data);
      setUsers(usersRes.data);
      setMenuItems(menuRes.data);
      setInventory(invRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    }
  };

  // Financial & COGS Calculations
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || o.totalAmount || 0), 0);
  const totalCOGS = orders.reduce((sum, o) => sum + (o.costPrice || 0), 0);
  const grossProfit = totalRevenue - totalCOGS;
  const grossMarginPct = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Payment Breakdown for Z-Report
  const paymentBreakdown = {
    Cash: orders.filter(o => o.paymentMethod === 'Cash').reduce((s, o) => s + (o.totalPrice || 0), 0),
    'Credit Card': orders.filter(o => o.paymentMethod === 'Credit Card').reduce((s, o) => s + (o.totalPrice || 0), 0),
    'Mobile Wallet': orders.filter(o => o.paymentMethod === 'Mobile Wallet').reduce((s, o) => s + (o.totalPrice || 0), 0)
  };

  // Order Type Breakdown for Z-Report
  const orderTypeBreakdown = {
    'Dine-In': orders.filter(o => o.orderType === 'Dine-In'),
    Takeaway: orders.filter(o => o.orderType === 'Takeaway'),
    Delivery: orders.filter(o => o.orderType === 'Delivery')
  };

  // Mock velocity data
  const velocityData = [
    { time: '12:00', orders: 12, capacity: 50 },
    { time: '13:00', orders: 25, capacity: 50 },
    { time: '14:00', orders: 18, capacity: 50 },
    { time: '15:00', orders: 10, capacity: 50 },
    { time: '16:00', orders: 15, capacity: 50 },
    { time: '17:00', orders: 28, capacity: 50 },
    { time: '18:00', orders: 42, capacity: 50 },
  ];

  const inventoryChartData = inventory.map(item => ({
    name: item.itemName,
    quantity: item.quantity,
    threshold: item.threshold
  })).slice(0, 8);

  // 1-Click 86 Toggle (Feature 8)
  const handleToggleStock = async (id) => {
    try {
      await axios.put(`http://localhost:4000/api/menu/toggle-stock/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to toggle stock status:', err);
    }
  };

  // Menu Recipe Handlers
  const openEditMenu = (item) => {
    setEditingMenu(item);
    setMenuForm({
      name: item.name,
      category: item.category,
      price: item.price,
      costPrice: item.costPrice || 0,
      station: item.station || 'General',
      inStock: item.inStock,
      ingredients: item.ingredients ? item.ingredients.map(ing => ({
        inventoryItem: ing.inventoryItem?._id || ing.inventoryItem,
        quantityRequired: ing.quantityRequired || 1
      })) : []
    });
    setShowMenuModal(true);
  };

  const handleAddIngredientRow = () => {
    if (inventory.length === 0) return;
    setMenuForm(prev => ({
      ...prev,
      ingredients: [
        ...prev.ingredients,
        { inventoryItem: inventory[0]._id, quantityRequired: 1 }
      ]
    }));
  };

  const handleRemoveIngredientRow = (idx) => {
    setMenuForm(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx)
    }));
  };

  const handleIngredientChange = (idx, field, value) => {
    const updated = [...menuForm.ingredients];
    updated[idx][field] = value;

    // Recalculate estimated cost
    let calculatedCost = 0;
    updated.forEach(ing => {
      const invItem = inventory.find(i => i._id === ing.inventoryItem);
      if (invItem && invItem.costPerUnit) {
        calculatedCost += invItem.costPerUnit * (Number(ing.quantityRequired) || 1);
      }
    });

    setMenuForm(prev => ({
      ...prev,
      ingredients: updated,
      costPrice: calculatedCost > 0 ? Number(calculatedCost.toFixed(2)) : prev.costPrice
    }));
  };

  const handleSaveMenu = async (e) => {
    e.preventDefault();
    try {
      if (editingMenu) {
        await axios.put(`http://localhost:4000/api/menu/update-menu/${editingMenu._id}`, menuForm);
      } else {
        await axios.post(`http://localhost:4000/api/menu/create-menu`, menuForm);
      }
      setShowMenuModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save menu', err);
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await axios.delete(`http://localhost:4000/api/menu/delete-menu/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete menu', err);
    }
  };

  // Inventory Handlers
  const openEditInventory = (item) => {
    setEditingInv(item);
    setInvForm({
      itemName: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      costPerUnit: item.costPerUnit || 0,
      threshold: item.threshold
    });
    setShowInvModal(true);
  };

  const handleSaveInventory = async (e) => {
    e.preventDefault();
    try {
      if (editingInv) {
        await axios.put(`http://localhost:4000/api/inventory/update-inventory/${editingInv._id}`, invForm);
      } else {
        await axios.post(`http://localhost:4000/api/inventory/create-inventory`, invForm);
      }
      setShowInvModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save inventory', err);
    }
  };

  // Z-Report CSV Export (Feature 7)
  const exportZReportCSV = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += `CairoCrave End-of-Day Z-Report (${dateStr})\n\n`;
    csvContent += `Metric,Value\n`;
    csvContent += `Total Orders Placed,${orders.length}\n`;
    csvContent += `Gross Revenue (EGP),${totalRevenue.toFixed(2)}\n`;
    csvContent += `Cost of Goods Sold COGS (EGP),${totalCOGS.toFixed(2)}\n`;
    csvContent += `Gross Profit (EGP),${grossProfit.toFixed(2)}\n`;
    csvContent += `Gross Profit Margin %,${grossMarginPct}%\n\n`;
    csvContent += `Payment Tender,Total Collected (EGP)\n`;
    csvContent += `Cash,${paymentBreakdown.Cash.toFixed(2)}\n`;
    csvContent += `Credit Card,${paymentBreakdown['Credit Card'].toFixed(2)}\n`;
    csvContent += `Mobile Wallet (InstaPay/Vodafone),${paymentBreakdown['Mobile Wallet'].toFixed(2)}\n\n`;
    csvContent += `Order Type,Orders Count,Revenue (EGP)\n`;
    csvContent += `Dine-In,${orderTypeBreakdown['Dine-In'].length},${orderTypeBreakdown['Dine-In'].reduce((s, o) => s + (o.totalPrice || 0), 0).toFixed(2)}\n`;
    csvContent += `Takeaway,${orderTypeBreakdown.Takeaway.length},${orderTypeBreakdown.Takeaway.reduce((s, o) => s + (o.totalPrice || 0), 0).toFixed(2)}\n`;
    csvContent += `Delivery,${orderTypeBreakdown.Delivery.length},${orderTypeBreakdown.Delivery.reduce((s, o) => s + (o.totalPrice || 0), 0).toFixed(2)}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CairoCrave_ZReport_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pb-5">
      {/* Top Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-2">
        <div>
          <h2 className="fw-bold mb-1">Manager Operations Dashboard</h2>
          <p className="text-muted mb-0">Financial metrics, COGS profitability, recipe builder & 86 stock protection</p>
        </div>
        <div className="d-flex gap-2">
          <Button
            variant="success"
            className="rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
            onClick={() => setShowZReport(true)}
          >
            <FileText size={16} /> End-of-Day Z-Report
          </Button>
          <Button
            variant="outline-primary"
            className="rounded-pill px-4 fw-bold shadow-sm d-flex align-items-center gap-2"
            onClick={fetchData}
          >
            <RefreshCw size={16} /> Refresh Data
          </Button>
        </div>
      </div>

      <Tab.Container defaultActiveKey="analytics">
        <Nav variant="pills" className="mb-4 bg-white p-2 rounded-pill shadow-sm d-inline-flex">
          <Nav.Item>
            <Nav.Link eventKey="analytics" className="rounded-pill px-4 fw-bold">
              <Activity size={18} className="me-2 mb-1" /> Analytics & COGS
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="menu" className="rounded-pill px-4 fw-bold">
              <MenuIcon size={18} className="me-2 mb-1" /> Menu & Recipe Builder
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="inventory" className="rounded-pill px-4 fw-bold">
              <Package size={18} className="me-2 mb-1" /> Inventory Stock & Costs
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="users" className="rounded-pill px-4 fw-bold">
              <Users size={18} className="me-2 mb-1" /> Staff Accounts
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          {/* TAB 1: ANALYTICS & COGS */}
          <Tab.Pane eventKey="analytics">
            {/* KPI Cards */}
            <Row className="g-4 mb-4">
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Body>
                    <span className="text-muted fw-bold small">Total Revenue Today</span>
                    <h2 className="fw-bold text-success mb-0">{totalRevenue.toFixed(2)} EGP</h2>
                    <span className="text-muted small">{orders.length} orders recorded</span>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Body>
                    <span className="text-muted fw-bold small">Cost of Goods (COGS)</span>
                    <h2 className="fw-bold text-danger mb-0">{totalCOGS.toFixed(2)} EGP</h2>
                    <span className="text-muted small">Ingredient cost estimate</span>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100 bg-primary text-white">
                  <Card.Body>
                    <span className="text-white-50 fw-bold small">Gross Profit</span>
                    <h2 className="fw-bold mb-0">{grossProfit.toFixed(2)} EGP</h2>
                    <span className="text-white-50 small">Gross Margin: {grossMarginPct}%</span>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Body>
                    <span className="text-muted fw-bold small">Low Stock Items</span>
                    <h2 className="fw-bold text-warning mb-0">
                      {inventory.filter(i => i.quantity <= i.threshold).length}
                    </h2>
                    <span className="text-muted small">Below alert threshold</span>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Charts Row */}
            <Row className="g-4 mb-4">
              <Col md={7}>
                <Card className="border-0 shadow-sm rounded-4">
                  <Card.Body>
                    <Card.Title className="fw-bold mb-4">Order Velocity vs Kitchen Capacity</Card.Title>
                    <div style={{ height: '280px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={velocityData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="orders" stroke="#0d6efd" strokeWidth={3} name="Orders Placed" />
                          <Line type="step" dataKey="capacity" stroke="#dc3545" strokeWidth={2} strokeDasharray="5 5" name="Kitchen Capacity" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={5}>
                <Card className="border-0 shadow-sm rounded-4">
                  <Card.Body>
                    <Card.Title className="fw-bold mb-4">Inventory Burndown Tracker</Card.Title>
                    <div style={{ height: '280px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={inventoryChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Bar dataKey="quantity" fill="#0d6efd" name="Current Stock" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="threshold" fill="#ffc107" name="Reorder Alert" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Menu Item Profitability Matrix */}
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-0">
                <div className="p-4 border-bottom">
                  <h5 className="fw-bold mb-0">Menu Item Profitability & Margin Matrix</h5>
                  <span className="text-muted small">Analyze unit cost, price margins, and profit contribution</span>
                </div>
                <Table hover responsive className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 ps-4">Item Name</th>
                      <th className="border-0">Category</th>
                      <th className="border-0">Selling Price</th>
                      <th className="border-0">Recipe Cost (COGS)</th>
                      <th className="border-0">Gross Profit / Unit</th>
                      <th className="border-0">Profit Margin %</th>
                      <th className="border-0 pe-4 text-end">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => {
                      const cost = item.costPrice || 0;
                      const profit = item.price - cost;
                      const margin = item.price > 0 ? ((profit / item.price) * 100).toFixed(1) : 0;

                      return (
                        <tr key={item._id}>
                          <td className="ps-4 fw-bold">{item.name}</td>
                          <td><Badge bg="light" text="dark" className="border">{item.category}</Badge></td>
                          <td className="fw-bold text-dark">{item.price} EGP</td>
                          <td className="text-danger fw-bold">{cost > 0 ? `${cost.toFixed(2)} EGP` : '0 EGP'}</td>
                          <td className="text-success fw-bold">{profit.toFixed(2)} EGP</td>
                          <td>
                            <Badge bg={margin > 60 ? 'success' : (margin > 40 ? 'primary' : 'warning')} className="rounded-pill">
                              {margin}%
                            </Badge>
                          </td>
                          <td className="pe-4 text-end">
                            {item.inStock ? (
                              <Badge bg="success" className="rounded-pill">In Stock</Badge>
                            ) : (
                              <Badge bg="danger" className="rounded-pill">86'd Out</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* TAB 2: MENU & RECIPE BUILDER */}
          <Tab.Pane eventKey="menu">
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-0">
                <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                  <div>
                    <Card.Title className="fw-bold mb-0">Menu Catalog & Recipe Linker</Card.Title>
                    <span className="text-muted small">Configure ingredients, kitchen station tags, and 86 availability</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-pill px-4 fw-bold"
                    onClick={() => {
                      setEditingMenu(null);
                      setMenuForm({
                        name: '',
                        category: 'Burgers',
                        price: '',
                        costPrice: 0,
                        station: 'General',
                        inStock: true,
                        ingredients: []
                      });
                      setShowMenuModal(true);
                    }}
                  >
                    <Plus size={16} className="me-1" /> Add Menu Item
                  </Button>
                </div>
                <Table hover responsive className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 ps-4">Item Name</th>
                      <th className="border-0">Category</th>
                      <th className="border-0">Kitchen Station</th>
                      <th className="border-0">Price</th>
                      <th className="border-0">Cost Price</th>
                      <th className="border-0">Linked Ingredients</th>
                      <th className="border-0">Quick 86 / Stock</th>
                      <th className="border-0 pe-4 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item._id}>
                        <td className="ps-4 fw-bold">{item.name}</td>
                        <td><Badge bg="light" text="dark" className="border">{item.category}</Badge></td>
                        <td><Badge bg="info" className="rounded-pill">{item.station || 'General'}</Badge></td>
                        <td className="fw-bold">{item.price} EGP</td>
                        <td className="text-muted">{item.costPrice ? `${item.costPrice} EGP` : '-'}</td>
                        <td>
                          {item.ingredients && item.ingredients.length > 0 ? (
                            <span className="badge bg-secondary">{item.ingredients.length} items linked</span>
                          ) : (
                            <span className="text-muted small">None linked</span>
                          )}
                        </td>
                        <td>
                          <Button
                            variant={item.inStock ? 'outline-success' : 'danger'}
                            size="sm"
                            className="rounded-pill px-3 fw-bold small"
                            onClick={() => handleToggleStock(item._id)}
                          >
                            {item.inStock ? 'In Stock (Click to 86)' : '86\'d (Click to Enable)'}
                          </Button>
                        </td>
                        <td className="pe-4 text-end">
                          <Button variant="light" size="sm" className="text-primary fw-bold me-2" onClick={() => openEditMenu(item)}>Edit Recipe</Button>
                          <Button variant="light" size="sm" className="text-danger fw-bold" onClick={() => handleDeleteMenu(item._id)}>Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* TAB 3: INVENTORY STOCK & COSTS */}
          <Tab.Pane eventKey="inventory">
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-0">
                <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                  <div>
                    <Card.Title className="fw-bold mb-0">Inventory Master & Unit Costing</Card.Title>
                    <span className="text-muted small">Manage raw ingredients, stock levels, and cost per unit for COGS</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="rounded-pill px-4 fw-bold"
                    onClick={() => {
                      setEditingInv(null);
                      setInvForm({ itemName: '', quantity: '', unit: 'pcs', costPerUnit: '', threshold: 10 });
                      setShowInvModal(true);
                    }}
                  >
                    <Plus size={16} className="me-1" /> Add Ingredient
                  </Button>
                </div>
                <Table hover responsive className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 ps-4">Ingredient Name</th>
                      <th className="border-0">Quantity on Hand</th>
                      <th className="border-0">Unit</th>
                      <th className="border-0">Cost Per Unit (EGP)</th>
                      <th className="border-0">Threshold Alert</th>
                      <th className="border-0">Stock Health</th>
                      <th className="border-0 pe-4 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map(inv => {
                      const isLow = inv.quantity <= inv.threshold;
                      return (
                        <tr key={inv._id}>
                          <td className="ps-4 fw-bold">{inv.itemName}</td>
                          <td className={`fw-bold ${isLow ? 'text-danger' : 'text-dark'}`}>{inv.quantity}</td>
                          <td>{inv.unit}</td>
                          <td className="fw-bold">{inv.costPerUnit || 0} EGP</td>
                          <td>{inv.threshold} {inv.unit}</td>
                          <td>
                            {isLow ? (
                              <Badge bg="danger" className="rounded-pill">Low Stock Reorder</Badge>
                            ) : (
                              <Badge bg="success" className="rounded-pill">Healthy</Badge>
                            )}
                          </td>
                          <td className="pe-4 text-end">
                            <Button variant="light" size="sm" className="text-primary fw-bold me-2" onClick={() => openEditInventory(inv)}>Edit</Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          {/* TAB 4: USERS */}
          <Tab.Pane eventKey="users">
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-0">
                <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                  <Card.Title className="fw-bold mb-0">Staff Accounts</Card.Title>
                </div>
                <Table hover responsive className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 ps-4">Username</th>
                      <th className="border-0">Email</th>
                      <th className="border-0">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user._id}>
                        <td className="ps-4 fw-bold">{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <Badge bg={user.role === 'Manager' ? 'primary' : (user.role === 'Kitchen' ? 'warning' : 'secondary')} className="rounded-pill">
                            {user.role}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

      {/* Menu Item & Visual Recipe Builder Modal (Feature 8) */}
      <Modal show={showMenuModal} onHide={() => setShowMenuModal(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">{editingMenu ? 'Edit Menu Item & Recipe' : 'Add New Menu Item'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveMenu}>
          <Modal.Body>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Item Name</Form.Label>
                  <Form.Control
                    required
                    value={menuForm.name}
                    onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Category</Form.Label>
                  <Form.Select
                    required
                    value={menuForm.category}
                    onChange={e => setMenuForm({ ...menuForm, category: e.target.value })}
                  >
                    <option value="Burgers">Burgers</option>
                    <option value="Sandwiches">Sandwiches</option>
                    <option value="Chicken">Chicken</option>
                    <option value="Salads">Salads</option>
                    <option value="Sides">Sides</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                    <option value="Combos">Combos</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row className="g-3 mb-3">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Selling Price (EGP)</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    value={menuForm.price}
                    onChange={e => setMenuForm({ ...menuForm, price: Number(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Cost Price / COGS (EGP)</Form.Label>
                  <Form.Control
                    type="number"
                    value={menuForm.costPrice}
                    onChange={e => setMenuForm({ ...menuForm, costPrice: Number(e.target.value) })}
                  />
                  <Form.Text className="text-muted">Auto-computed from recipe below</Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Kitchen Station</Form.Label>
                  <Form.Select
                    value={menuForm.station}
                    onChange={e => setMenuForm({ ...menuForm, station: e.target.value })}
                  >
                    <option value="Grill">Grill</option>
                    <option value="Fryer">Fryer</option>
                    <option value="Salad/Sides">Salad/Sides</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Assembly">Assembly</option>
                    <option value="General">General</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            {/* Visual Recipe Builder Section */}
            <div className="border rounded-4 p-3 bg-light mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="fw-bold mb-0 d-flex align-items-center">
                  <Sliders size={16} className="me-2 text-primary" /> Recipe Ingredients (Auto-Deduct Stock)
                </h6>
                <Button variant="outline-primary" size="sm" className="rounded-pill fw-bold" onClick={handleAddIngredientRow}>
                  + Add Ingredient
                </Button>
              </div>
              <span className="text-muted small d-block mb-3">
                Link raw inventory ingredients to automatically deduct stock on order and calculate exact unit cost.
              </span>

              {menuForm.ingredients.length === 0 ? (
                <div className="text-center text-muted py-3 small">
                  No inventory ingredients linked yet.
                </div>
              ) : (
                menuForm.ingredients.map((ing, idx) => (
                  <Row key={idx} className="g-2 mb-2 align-items-center">
                    <Col md={7}>
                      <Form.Select
                        size="sm"
                        value={ing.inventoryItem}
                        onChange={e => handleIngredientChange(idx, 'inventoryItem', e.target.value)}
                      >
                        {inventory.map(inv => (
                          <option key={inv._id} value={inv._id}>
                            {inv.itemName} ({inv.unit}) - Cost: {inv.costPerUnit || 0} EGP/{inv.unit}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={3}>
                      <Form.Control
                        size="sm"
                        type="number"
                        placeholder="Quantity"
                        value={ing.quantityRequired}
                        onChange={e => handleIngredientChange(idx, 'quantityRequired', Number(e.target.value))}
                      />
                    </Col>
                    <Col md={2} className="text-end">
                      <Button variant="link" className="text-danger p-0" onClick={() => handleRemoveIngredientRow(idx)}>
                        <Trash2 size={16} />
                      </Button>
                    </Col>
                  </Row>
                ))
              )}
            </div>

            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="stock-switch-modal"
                label="In Stock (Available for POS Orders)"
                checked={menuForm.inStock}
                onChange={e => setMenuForm({ ...menuForm, inStock: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowMenuModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="rounded-pill px-4 fw-bold">Save Menu Item</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Inventory Item Modal */}
      <Modal show={showInvModal} onHide={() => setShowInvModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">{editingInv ? 'Edit Inventory Item' : 'Add Inventory Item'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveInventory}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Ingredient Name</Form.Label>
              <Form.Control
                required
                value={invForm.itemName}
                onChange={e => setInvForm({ ...invForm, itemName: e.target.value })}
              />
            </Form.Group>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Quantity on Hand</Form.Label>
                  <Form.Control
                    type="number"
                    required
                    value={invForm.quantity}
                    onChange={e => setInvForm({ ...invForm, quantity: Number(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Unit</Form.Label>
                  <Form.Control
                    required
                    placeholder="pcs, kg, liters, portions"
                    value={invForm.unit}
                    onChange={e => setInvForm({ ...invForm, unit: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>
            <Row className="g-3 mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Cost Per Unit (EGP)</Form.Label>
                  <Form.Control
                    type="number"
                    value={invForm.costPerUnit}
                    onChange={e => setInvForm({ ...invForm, costPerUnit: Number(e.target.value) })}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="small fw-bold">Reorder Alert Threshold</Form.Label>
                  <Form.Control
                    type="number"
                    value={invForm.threshold}
                    onChange={e => setInvForm({ ...invForm, threshold: Number(e.target.value) })}
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowInvModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" className="rounded-pill px-4 fw-bold">Save Ingredient</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* End-of-Day Z-Report Modal (Feature 7) */}
      <Modal show={showZReport} onHide={() => setShowZReport(false)} size="lg" centered>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="fw-bold d-flex align-items-center">
            <FileText className="me-2 text-success" /> CairoCrave End-of-Day Z-Report
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-4" id="printable-z-report">
          <div className="text-center mb-4 border-bottom pb-3">
            <h4 className="fw-bold text-primary mb-1">Cairo Crave Restaurant POS</h4>
            <div className="text-muted small">Daily Reconciliation & Sales Audit Report</div>
            <div className="badge bg-light text-dark mt-2 border">Generated on: {new Date().toLocaleString()}</div>
          </div>

          <Row className="g-3 mb-4">
            <Col md={3}>
              <div className="p-3 bg-light rounded-4 text-center">
                <span className="text-muted small">Orders Count</span>
                <h4 className="fw-bold text-dark mb-0">{orders.length}</h4>
              </div>
            </Col>
            <Col md={3}>
              <div className="p-3 bg-success bg-opacity-10 rounded-4 text-center">
                <span className="text-success small fw-bold">Gross Revenue</span>
                <h4 className="fw-bold text-success mb-0">{totalRevenue.toFixed(2)} EGP</h4>
              </div>
            </Col>
            <Col md={3}>
              <div className="p-3 bg-danger bg-opacity-10 rounded-4 text-center">
                <span className="text-danger small fw-bold">Total COGS</span>
                <h4 className="fw-bold text-danger mb-0">{totalCOGS.toFixed(2)} EGP</h4>
              </div>
            </Col>
            <Col md={3}>
              <div className="p-3 bg-primary bg-opacity-10 rounded-4 text-center">
                <span className="text-primary small fw-bold">Net Profit</span>
                <h4 className="fw-bold text-primary mb-0">{grossProfit.toFixed(2)} EGP</h4>
              </div>
            </Col>
          </Row>

          {/* Tender Breakdown */}
          <h6 className="fw-bold mb-2">Payment Tender Reconciliation</h6>
          <Table bordered hover size="sm" className="mb-4">
            <thead className="bg-light">
              <tr>
                <th>Payment Tender</th>
                <th className="text-end">Total Amount (EGP)</th>
                <th className="text-end">% of Sales</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>💵 Cash Drawer</td>
                <td className="text-end fw-bold">{paymentBreakdown.Cash.toFixed(2)} EGP</td>
                <td className="text-end">{totalRevenue > 0 ? ((paymentBreakdown.Cash / totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td>💳 Credit / Debit Card</td>
                <td className="text-end fw-bold">{paymentBreakdown['Credit Card'].toFixed(2)} EGP</td>
                <td className="text-end">{totalRevenue > 0 ? ((paymentBreakdown['Credit Card'] / totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td>📱 Mobile Wallets (InstaPay / Vodafone)</td>
                <td className="text-end fw-bold">{paymentBreakdown['Mobile Wallet'].toFixed(2)} EGP</td>
                <td className="text-end">{totalRevenue > 0 ? ((paymentBreakdown['Mobile Wallet'] / totalRevenue) * 100).toFixed(1) : 0}%</td>
              </tr>
            </tbody>
          </Table>

          {/* Order Channel Breakdown */}
          <h6 className="fw-bold mb-2">Channel Performance</h6>
          <Row className="g-2 mb-3">
            <Col md={4}>
              <div className="p-2.5 border rounded-3 text-center">
                <span className="text-muted small">🍽️ Dine-In</span>
                <div className="fw-bold">{orderTypeBreakdown['Dine-In'].length} orders • {orderTypeBreakdown['Dine-In'].reduce((s, o) => s + (o.totalPrice || 0), 0).toFixed(2)} EGP</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="p-2.5 border rounded-3 text-center">
                <span className="text-muted small">🛍️ Takeaway</span>
                <div className="fw-bold">{orderTypeBreakdown.Takeaway.length} orders • {orderTypeBreakdown.Takeaway.reduce((s, o) => s + (o.totalPrice || 0), 0).toFixed(2)} EGP</div>
              </div>
            </Col>
            <Col md={4}>
              <div className="p-2.5 border rounded-3 text-center">
                <span className="text-muted small">🛵 Delivery</span>
                <div className="fw-bold">{orderTypeBreakdown.Delivery.length} orders • {orderTypeBreakdown.Delivery.reduce((s, o) => s + (o.totalPrice || 0), 0).toFixed(2)} EGP</div>
              </div>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-success" className="rounded-pill fw-bold" onClick={exportZReportCSV}>
            <Download size={16} className="me-1" /> Export CSV
          </Button>
          <Button variant="outline-dark" className="rounded-pill fw-bold" onClick={() => window.print()}>
            <Printer size={16} className="me-1" /> Print Z-Report
          </Button>
          <Button variant="primary" className="rounded-pill px-4 fw-bold" onClick={() => setShowZReport(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ManagerDashboard;
