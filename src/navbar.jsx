import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const { pathname } = useLocation();
  const isSearch = pathname === '/search';

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${!isSearch ? 'active' : ''}`}>
        <span className="nav-icon">🏭</span>
        <span className="nav-label">Dépôts</span>
      </Link>
      <Link to="/search" className={`nav-item ${isSearch ? 'active' : ''}`}>
        <span className="nav-icon">🔍</span>
        <span className="nav-label">Recherche</span>
      </Link>
    </nav>
  );
};

export default Navbar;
