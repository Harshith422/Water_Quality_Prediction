import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaWater, FaChartLine, FaHistory, FaCog, FaFlask, FaBars, FaTimes, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import './Navbar.css';

const Navbar = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    setIsMobileMenuOpen(false);
  };

  const navItems = [
    { path: '/', icon: <FaWater />, label: 'Dashboard' },
    { path: '/predict', icon: <FaFlask />, label: 'Predict' },
    { path: '/analytics', icon: <FaChartLine />, label: 'Analytics' },
    { path: '/history', icon: <FaHistory />, label: 'History' },
    { path: '/settings', icon: <FaCog />, label: 'Settings' },
  ];

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <FaWater className="logo-icon" />
          <span className="logo-text">Water Quality Monitor</span>
        </Link>

        <div className="mobile-menu-icon" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </div>

        <ul className={isMobileMenuOpen ? 'nav-menu active' : 'nav-menu'}>
          {navItems.map((item) => (
            <li key={item.path} className="nav-item">
              <Link
                to={item.path}
                className={location.pathname === item.path ? 'nav-link active' : 'nav-link'}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
          <li className="nav-item user-info-section">
            <span className="user-email">{user?.email || 'User'}</span>
            <button
              className="logout-button"
              onClick={handleLogout}
              title="Logout"
            >
              <FaSignOutAlt className="nav-icon" />
              <span className="nav-label">Logout</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;

