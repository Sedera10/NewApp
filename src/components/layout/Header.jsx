import React, { useState, useEffect } from 'react';
import { Search, ShoppingCart, User, Menu } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import './Header.css';
import logoUrl from '/logo.png';
import { logoutFO, logoutBO } from '../../service/authService';
import { urlContains } from '../../service/Util';
import { localCartService } from '../../service/Cart';

const Header = ({ toggleSidebar, isSidebarOpen }) => {
  const [customer, setCustomer] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  const loadCustomer = () => {
    const currentUser = JSON.parse(localStorage.getItem('client_session'));
    if (currentUser?.isLoggedIn) {
      setCustomer(currentUser);
      updateCartCount(currentUser.id);
    } else {
      updateCartCount(0);
    }
  };

  const updateCartCount = (customerId = 0) => {
    const count = localCartService.getTotalItems(customerId);
    setCartCount(count);
  };

  useEffect(() => {
    loadCustomer();

    const handleStorageChange = () => {
      loadCustomer();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const location = useLocation();
  const adminMode = urlContains(location.pathname, "/admin");
  const logoutRedirect = adminMode ? "/mystore/admin/login" : "mystore/fr/"

  return (
    <header className="site-header">
      <div className="header-container" style={adminMode ? { maxWidth: '100%', gap: '15px' } : {}}>
        { !adminMode ? (
          <>
            {/* Logo Front-Office */}
            <div className="logo d-flex align-items-center">
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
            <div className="user-actions d-flex align-items-center">
              { !customer ? (
                <button className="action-btn" onClick={() => { window.location.href = "/mystore/fr/login" }}>
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

              <button
                className="action-btn cart-btn"
                onClick={() => navigate('/mystore/fr/cart')}
              >
                <div className="icon-wrapper">
                  <ShoppingCart size={22} />
                </div>
                <span>Panier</span>
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </button>

              {/* Bouton déconnexion à droite si connecté */}
              {customer && (
                <div className="logout-container ms-3">
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
          </>
        ) : (
          <>
            {/* Header Admin - Section Gauche */}
            <div className="admin-header-left d-flex align-items-center gap-3" style={{ flex: 1 }}>
              <button
                className="btn btn-light d-flex align-items-center justify-content-center p-2 mb-0"
                onClick={toggleSidebar}
                style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
              >
                <Menu size={24} />
              </button>
              <nav aria-label="breadcrumb" className="d-flex align-items-center">
                <ol className="breadcrumb mb-0 bg-transparent p-0">
                  <li className="breadcrumb-item"><NavLink to="/mystore/admin" className="text-secondary text-decoration-none">Admin</NavLink></li>
                  <li className="breadcrumb-item active text-dark fw-bold" aria-current="page">Dashboard</li>
                </ol>
              </nav>
            </div>

            {/* Header Admin - Section Centre (Logo) */}
            <div className="admin-header-center d-flex justify-content-center" style={{ flex: 1 }}>
              <img src={logoUrl} alt="MyStore logo" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
            </div>

            {/* Header Admin - Section Droite */}
            <div className="admin-header-right d-flex justify-content-end align-items-center user-actions" style={{ flex: 1 }}>
               <div className="logout-container ms-auto">
                 <button
                   type="button"
                   className="btn btn-outline-danger btn-sm px-3 py-1"
                   onClick={() => {
                     logoutBO();
                     window.location.href = "/mystore/admin/login";
                   }}
                   style={{ borderRadius: '6px' }}
                 >
                   Logout
                 </button>
               </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
