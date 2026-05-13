import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../../components/layout/Header';
import { localCartService } from '../../../service/Cart';
import './CartPage.css';

const CartPage = () => {
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('client_session'));
    const userId = currentUser?.id || 0;
    setCustomerId(userId);

    const cartItems = localCartService.getCart(userId);
    setCart(cartItems);
  }, []);

  const handleUpdateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      handleRemoveFromCart(productId);
    } else {
      const updatedCart = localCartService.updateQuantity(customerId, productId, newQuantity);
      setCart(updatedCart);
    }
  };

  const handleRemoveFromCart = (productId) => {
    const updatedCart = localCartService.removeFromCart(customerId, productId);
    setCart(updatedCart);
  };

  const handleClearCart = () => {
    if (window.confirm('Êtes-vous sûr de vouloir vider le panier ?')) {
      localCartService.clearCart(customerId);
      setCart([]);
    }
  };

  const totalAmount = localCartService.getTotalAmount(customerId);
  const totalItems = localCartService.getTotalItems(customerId);

  return (
    <>
      <Header />
      <div className="cart-container">
        <div className="cart-header">
          <h1>Mon Panier</h1>
          <button
            onClick={() => navigate('/mystore/fr')}
            className="continue-shopping-btn"
          >
            ← Continuer les achats
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <p>Votre panier est vide</p>
            <button
              onClick={() => navigate('/mystore/fr')}
              className="shop-btn"
            >
              Commencer à acheter
            </button>
          </div>
        ) : (
          <div className="cart-content">
            <div className="cart-items">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th>Prix</th>
                    <th>Quantité</th>
                    <th>Total</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map(item => (
                    <tr key={item.id} className="cart-item-row">
                      <td>
                        <div className="product-info">
                          <img src={item.image} alt={item.name} className="product-thumbnail" />
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="price">{item.price.toFixed(2)} €</td>
                      <td className="quantity">
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                          className="qty-btn"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          min="1"
                          onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="qty-input"
                        />
                        <button
                          onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          className="qty-btn"
                        >
                          +
                        </button>
                      </td>
                      <td className="total">{(item.price * item.quantity).toFixed(2)} €</td>
                      <td>
                        <button
                          onClick={() => handleRemoveFromCart(item.id)}
                          className="remove-btn"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={handleClearCart}
                className="clear-cart-btn"
              >
                Vider le panier
              </button>
            </div>

            <div className="cart-summary">
              <h2>Résumé</h2>
              <div className="summary-row">
                <span>Articles ({totalItems}):</span>
                <span>{totalAmount.toFixed(2)} €</span>
              </div>
              <div className="summary-row">
                <span>Frais de port:</span>
                <span>Gratuit</span>
              </div>
              <div className="summary-row total-row">
                <span>Total:</span>
                <span className="total-amount">{totalAmount.toFixed(2)} €</span>
              </div>
              <button className="checkout-btn" onClick={() => navigate('/mystore/fr/checkout')}>
                Procéder au paiement
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartPage;
