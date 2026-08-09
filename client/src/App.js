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
          <Navbar bg="white" variant="light" className="shadow-sm">
            <Container>
              <Navbar.Brand>
                <Link to={'/'} className="nav-link text-primary fw-bold">
                  Cairo Crave
                </Link>
              </Navbar.Brand>

              <Nav className="justify-content-end align-items-center">
                {!token ? (
                  <Nav>
                    <Link to={'/login'} className="nav-link">
                      Login
                    </Link>
                  </Nav>
                ) : (
                  <>
                    <Nav>
                      <Link to={'/pos'} className="nav-link">
                        POS Simulator
                      </Link>
                    </Nav>
                    <Nav>
                      <Link to={'/'} className="nav-link">
                        Kitchen Display
                      </Link>
                    </Nav>
                    {role === 'Manager' && (
                      <Nav>
                        <Link to={'/dashboard'} className="nav-link text-primary">
                          Manager Analytics
                        </Link>
                      </Nav>
                    )}
                    <Nav>
                      <button onClick={handleLogout} className="btn btn-link nav-link text-danger">
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
