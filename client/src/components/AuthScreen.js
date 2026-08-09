import React, { useState } from 'react';
import { Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';
import axios from 'axios';

const AuthScreen = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', role: 'Cook' });
  const [error, setError] = useState('');
  const history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      // Use full URL if backend runs on port 4000 and frontend on 3000
      const response = await axios.post(`http://localhost:4000${endpoint}`, formData);
      
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', user.role);
      
      // Redirect to POS or KDS based on role
      window.location.href = user.role === 'Manager' ? '/dashboard' : '/';
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <Row className="justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <Col md={6} lg={4}>
        <Card className="shadow-sm border-0 rounded-4">
          <Card.Body className="p-5">
            <h2 className="text-center fw-bold mb-4 text-primary">Cairo Crave</h2>
            <h5 className="text-center text-muted mb-4">{isLogin ? 'Sign In' : 'Create Account'}</h5>
            
            {error && <Alert variant="danger">{error}</Alert>}
            
            <Form onSubmit={handleSubmit}>
              {!isLogin && (
                <Form.Group className="mb-3">
                  <Form.Label>Username</Form.Label>
                  <Form.Control 
                    type="text" 
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required 
                  />
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control 
                  type="email" 
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required 
                />
              </Form.Group>

              <Form.Group className="mb-4">
                <Form.Label>Password</Form.Label>
                <Form.Control 
                  type="password" 
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required 
                />
              </Form.Group>

              {!isLogin && (
                <Form.Group className="mb-4">
                  <Form.Label>Role</Form.Label>
                  <Form.Select 
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="Cook">Cook</option>
                    <option value="Manager">Manager</option>
                  </Form.Select>
                </Form.Group>
              )}

              <Button variant="primary" type="submit" className="w-100 py-2 mb-3 fw-bold rounded-3">
                {isLogin ? 'Login' : 'Sign Up'}
              </Button>

              <div className="text-center">
                <Button variant="link" onClick={() => setIsLogin(!isLogin)} className="text-decoration-none">
                  {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
};

export default AuthScreen;
