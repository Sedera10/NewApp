import React from 'react';
import { Search, ShoppingCart, User, Menu, ChevronDown } from 'lucide-react';
import './Header.css';
import logoUrl from '/logo.png'; // Placeholder import to prevent missing variable error

const Header = () => {
  return (
    <header className="site-header">
      <div className="header-container">
        {/* Logo ou Nom */}
        <div className="logo">
          <img src={logoUrl} alt="MyStore logo" style={{ height: '50px', width: 'auto', objectFit: 'contain', display: 'block' }} />
        </div>

        {/* Menu & Recherche */}
        <div className="search-nav-container">
          <div className="dropdown">
            <button className="dropdown-btn">
              Vêtements
            </button>
            <div className="dropdown-content">
              <a href="#">Homme</a>
              <a href="#">Femme</a>
            </div>
          </div>
          <div className="dropdown">
            <button className="dropdown-btn">
              Accessoires
            </button>
            <div className="dropdown-content">
              <a href="#">Papeterie</a>
              <a href="#">Accessoires de maison</a>
            </div>
          </div>

          <div className="search-bar">
            <input type="text" placeholder="Rechercher un produit..." />
            <button className="search-btn"><Search size={18} /></button>
          </div>
        </div>

        {/* Actions Utilisateur */}
        <div className="user-actions">
          <button className="action-btn">
            <User size={22} />
            <span>Connexion</span>
          </button>
          <button className="action-btn cart-btn">
            <ShoppingCart size={22} />
            <span className="cart-count">2</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;