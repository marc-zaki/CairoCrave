import React from 'react';
import Nav from 'react-bootstrap/Nav';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import { BrowserRouter as Router, Switch, Route, Link, Redirect } from 'react-router-dom';

import AuthScreen from './components/AuthScreen';
import POSSimulator from './components/POSSimulator';
import KitchenDisplaySystem from './components/KitchenDisplaySystem';
import TableManagement from './components/TableManagement';
import DeliveryDispatcher from './components/DeliveryDispatcher';
import ManagerDashboard from './components/ManagerDashboard';

function App() {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/login';
  };

  return (
    <div className="App bg-light min-vh-100">
      <Router>
        <header className="App-header mb-4">
          <Navbar bg="white" variant="light" className="shadow-sm border-bottom">
            <Container fluid className="px-4">
              <Navbar.Brand>
                <Link to={'/'} className="nav-link text-primary fw-bold fs-4 d-flex align-items-center">
                  🍔 Cairo Crave
                </Link>
              </Navbar.Brand>

              <Nav className="justify-content-end align-items-center gap-1">
                {!token ? (
                  <Nav>
                    <Link to={'/login'} className="nav-link fw-bold">
                      Login
                    </Link>
                  </Nav>
                ) : (
                  <>
                    <Nav>
                      <Link to={'/pos'} className="nav-link fw-bold">
                        POS Terminal
                      </Link>
                    </Nav>
                    <Nav>
                      <Link to={'/'} className="nav-link fw-bold">
                        Kitchen Display
                      </Link>
                    </Nav>
                    <Nav>
                      <Link to={'/tables'} className="nav-link fw-bold text-dark">
                        Tables & Floor
                      </Link>
                    </Nav>
                    <Nav>
                      <Link to={'/delivery'} className="nav-link fw-bold text-dark">
                        Delivery Hub
                      </Link>
                    </Nav>
                    {role === 'Manager' && (
                      <Nav>
                        <Link to={'/dashboard'} className="nav-link text-primary fw-bold">
                          Manager Analytics
                        </Link>
                      </Nav>
                    )}
                    <Nav className="ms-2">
                      <button onClick={handleLogout} className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-bold">
                        Logout
                      </button>
                    </Nav>
                  </>
                )}
              </Nav>
            </Container>
          </Navbar>
        </header>

        <Container fluid className="px-4">
          <Switch>
            <Route exact path="/login">
              {token ? <Redirect to="/" /> : <AuthScreen />}
            </Route>
            <Route exact path="/pos">
              {!token ? <Redirect to="/login" /> : <POSSimulator />}
            </Route>
            <Route exact path="/tables">
              {!token ? <Redirect to="/login" /> : <TableManagement />}
            </Route>
            <Route exact path="/delivery">
              {!token ? <Redirect to="/login" /> : <DeliveryDispatcher />}
            </Route>
            <Route exact path="/dashboard">
              {!token || role !== 'Manager' ? <Redirect to="/login" /> : <ManagerDashboard />}
            </Route>
            <Route exact path="/">
              {!token ? <Redirect to="/login" /> : <KitchenDisplaySystem />}
            </Route>
          </Switch>
        </Container>
      </Router>
    </div>
  );
}

export default App;
