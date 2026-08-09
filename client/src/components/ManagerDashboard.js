import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Tab, Nav, Table, Button, Badge, Modal, Form } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Activity, Users, Menu as MenuIcon, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const ManagerDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [iftarMode, setIftarMode] = useState(false);

  // Menu Modal State
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [menuForm, setMenuForm] = useState({ name: '', category: '', price: '', inStock: true });

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

  // Mock data for graphs if real data is too small to look good
  const velocityData = [
    { time: '12:00', orders: 12, capacity: 50 },
    { time: '13:00', orders: 25, capacity: 50 },
    { time: '14:00', orders: 18, capacity: 50 },
    { time: '15:00', orders: 10, capacity: 50 },
    { time: '16:00', orders: 15, capacity: 50 },
    { time: '17:00', orders: iftarMode ? 65 : 20, capacity: 50 },
    { time: '18:00', orders: iftarMode ? 90 : 35, capacity: 50 },
  ];

  const inventoryData = inventory.map(item => ({
    name: item.itemName,
    quantity: item.quantity,
    threshold: item.threshold
  })).slice(0, 6); // Just show top 6 for chart

  const openEditMenu = (item) => {
    setEditingMenu(item);
    setMenuForm({ name: item.name, category: item.category, price: item.price, inStock: item.inStock });
    setShowMenuModal(true);
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
      fetchData(); // Refresh data
    } catch (err) {
      console.error('Failed to save menu', err);
    }
  };

  const handleDeleteMenu = async (id) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await axios.delete(`http://localhost:4000/api/menu/delete-menu/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete menu', err);
    }
  };

  return (
    <div className="pb-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Manager Dashboard</h2>
        <Button
          variant={iftarMode ? 'danger' : 'outline-danger'}
          className="rounded-pill px-4 fw-bold shadow-sm"
          onClick={() => setIftarMode(!iftarMode)}
        >
          {iftarMode ? 'Iftar Rush Mode: ACTIVE' : 'Enable Iftar Rush Mode'}
        </Button>
      </div>

      <Tab.Container defaultActiveKey="analytics">
        <Nav variant="pills" className="mb-4 bg-white p-2 rounded-pill shadow-sm d-inline-flex">
          <Nav.Item>
            <Nav.Link eventKey="analytics" className="rounded-pill px-4 fw-bold">
              <Activity size={18} className="me-2 mb-1" /> Analytics
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="users" className="rounded-pill px-4 fw-bold">
              <Users size={18} className="me-2 mb-1" /> Users
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="menu" className="rounded-pill px-4 fw-bold">
              <MenuIcon size={18} className="me-2 mb-1" /> Menu
            </Nav.Link>
          </Nav.Item>
        </Nav>

        <Tab.Content>
          <Tab.Pane eventKey="analytics">
            <Row className="g-4 mb-4">
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Body>
                    <h6 className="text-muted fw-bold">Total Orders Today</h6>
                    <h2 className="fw-bold text-primary">{orders.length}</h2>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Body>
                    <h6 className="text-muted fw-bold">Revenue Today</h6>
                    <h2 className="fw-bold text-success">
                      {orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toFixed(2)} EGP
                    </h2>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Body>
                    <h6 className="text-muted fw-bold">Low Stock Items</h6>
                    <h2 className="fw-bold text-danger">
                      {inventory.filter(i => i.quantity <= i.threshold).length}
                    </h2>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-4 h-100 bg-primary text-white">
                  <Card.Body>
                    <h6 className="fw-bold text-white-50">System Status</h6>
                    <h2 className="fw-bold d-flex align-items-center">
                      Optimal <Activity className="ms-2" />
                    </h2>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            <Row className="g-4">
              <Col md={7}>
                <Card className="border-0 shadow-sm rounded-4">
                  <Card.Body>
                    <Card.Title className="fw-bold mb-4">Order Velocity vs Kitchen Capacity</Card.Title>
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={velocityData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Line type="monotone" dataKey="orders" stroke="#0d6efd" strokeWidth={3} name="Orders Placed" />
                          <Line type="step" dataKey="capacity" stroke="#dc3545" strokeWidth={2} strokeDasharray="5 5" name="Max Capacity" />
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
                    <div style={{ height: '300px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={inventoryData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis />
                          <RechartsTooltip />
                          <Legend />
                          <Bar dataKey="quantity" fill="#0d6efd" name="Current Stock" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="threshold" fill="#ffc107" name="Reorder Alert Level" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab.Pane>

          <Tab.Pane eventKey="users">
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-0">
                <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                  <Card.Title className="fw-bold mb-0">Staff Accounts</Card.Title>
                  <Button variant="primary" size="sm" className="rounded-pill px-3">Add User</Button>
                </div>
                <Table hover responsive className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 ps-4">Username</th>
                      <th className="border-0">Email</th>
                      <th className="border-0">Role</th>
                      <th className="border-0 pe-4 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user._id}>
                        <td className="ps-4 fw-bold">{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <Badge bg={user.role === 'Manager' ? 'primary' : 'secondary'} className="rounded-pill">
                            {user.role}
                          </Badge>
                        </td>
                        <td className="pe-4 text-end">
                          <Button variant="light" size="sm" className="text-primary fw-bold me-2">Edit</Button>
                          <Button variant="light" size="sm" className="text-danger fw-bold">Delete</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Tab.Pane>

          <Tab.Pane eventKey="menu">
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-0">
                <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                  <Card.Title className="fw-bold mb-0">Menu Items</Card.Title>
                  <Button variant="primary" size="sm" className="rounded-pill px-3" onClick={() => { setEditingMenu(null); setMenuForm({ name: '', category: '', price: '', inStock: true }); setShowMenuModal(true); }}>Add Item</Button>
                </div>
                <Table hover responsive className="mb-0 align-middle">
                  <thead className="bg-light">
                    <tr>
                      <th className="border-0 ps-4">Item Name</th>
                      <th className="border-0">Category</th>
                      <th className="border-0">Price</th>
                      <th className="border-0">Status</th>
                      <th className="border-0 pe-4 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item._id}>
                        <td className="ps-4 fw-bold">{item.name}</td>
                        <td>{item.category}</td>
                        <td>{item.price} EGP</td>
                        <td>
                          {item.inStock ?
                            <Badge bg="success" className="rounded-pill">In Stock</Badge> :
                            <Badge bg="danger" className="rounded-pill">Out of Stock</Badge>
                          }
                        </td>
                        <td className="pe-4 text-end">
                          <Button variant="light" size="sm" className="text-primary fw-bold me-2" onClick={() => openEditMenu(item)}>Edit</Button>
                          <Button variant="light" size="sm" className="text-danger fw-bold" onClick={() => handleDeleteMenu(item._id)}>Delete</Button>
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

      {/* Menu Item Edit/Add Modal */}
      <Modal show={showMenuModal} onHide={() => setShowMenuModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">{editingMenu ? 'Edit Menu Item' : 'Add Menu Item'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSaveMenu}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Item Name</Form.Label>
              <Form.Control
                required
                value={menuForm.name}
                onChange={e => setMenuForm({ ...menuForm, name: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Category</Form.Label>
              <Form.Select
                required
                value={menuForm.category}
                onChange={e => setMenuForm({ ...menuForm, category: e.target.value })}
              >
                <option value="">Select Category</option>
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
            <Form.Group className="mb-3">
              <Form.Label className="small fw-bold">Price (EGP)</Form.Label>
              <Form.Control
                type="number"
                required
                value={menuForm.price}
                onChange={e => setMenuForm({ ...menuForm, price: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="switch"
                id="stock-switch"
                label="In Stock"
                checked={menuForm.inStock}
                onChange={e => setMenuForm({ ...menuForm, inStock: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer className="border-0">
            <Button variant="light" onClick={() => setShowMenuModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save Changes</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ManagerDashboard;
