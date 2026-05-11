import React , { useState, useEffect} from 'react';
import { Search, ShoppingCart, User, Menu, ChevronDown } from 'lucide-react';
import './Header.css';
import logoUrl from '/logo.png';
import { logoutFO } from '../../service/authService';

const Header = () => {
  const [customer, setCustomer] = useState(null);
  const loadCustomer = () => {
    const currentUser = JSON.parse(
      localStorage.getItem('client_session')
    );
    if (currentUser?.isLoggedIn) {
      setCustomer(currentUser);
    }
  }

  useEffect(() => {
    loadCustomer();
  }, []);

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
          { !customer ? (
            <button className="action-btn" onClick={()=> {window.location.href = "/mystore/fr/login"}}>
              <div className="icon-wrapper">
                <User size={22} />
              </div>
              <span>Connectez-vous</span>
            </button>
          ) : (
            <div className="action-btn logged-in-user">
              <div className="icon-wrapper">
                <User size={22} /> 
              </div>
              <span>{customer.firstname} {customer.lastname}</span>
            </div>
          )}
          
          <button className="action-btn cart-btn">
            <div className="icon-wrapper">
              <ShoppingCart size={22} />
            </div>
            <span>Panier</span>
            <span className="cart-count">2</span>
          </button>
        </div>

        {/* Bouton déconnexion à droite si connecté */}
        {customer && (
          <div className="logout-container">
            <button 
              type="button" 
              className="logout-btn" 
              onClick={() => {
                logoutFO();
                setCustomer(null);
                window.location.href = "/mystore/fr";
              }} 
            >
              Déconnexion
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;