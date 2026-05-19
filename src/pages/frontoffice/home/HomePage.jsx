import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { customerService } from '../../../service/Customer';
import { localCartService, cartService } from '../../../service/Cart';
import { syncCartAfterAuth } from '../../../service/authService';
import { MdPerson } from 'react-icons/md';
import './HomePage.css';

const HomePage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [avatarError, setAvatarError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const [, fetchedUsers] = await Promise.all([
          customerService.getCustomerById(1),
          customerService.getCustomers()
        ]);
        const usersArray = Array.isArray(fetchedUsers) ? fetchedUsers : [fetchedUsers];
        setUsers(usersArray);
      } catch (error) {
        console.error('Erreur lors du chargement des utilisateurs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const getTextVal = (val) => {
    if (val && typeof val === 'object' && val['#text'] !== undefined) {
      return val['#text'];
    }
    return val;
  };

  const ensureVisitorCart = async () => {
    try {
      const visitorId = 0;
      const localItems = localCartService.getCart(visitorId);
      let currentCartId = localStorage.getItem(`current_cart_id_${visitorId}`);

      if (localItems.length > 0 && !currentCartId) {
        const itemsToApi = localItems.map(item => ({
          id_product: item.id,
          id_product_attribute: item.idProductAttribute || item.id_product_attribute || 0,
          quantity: item.quantity,
          id_address_delivery: 0
        }));
        const createdCart = await cartService.createCart(visitorId, itemsToApi, 1, 1, 0);
        if (createdCart?.id) {
          const createdId = typeof createdCart.id === 'object' ? createdCart.id['#text'] : createdCart.id;
          localStorage.setItem(`current_cart_id_${visitorId}`, createdId);
          currentCartId = createdId;
        }
      }

      if (localItems.length === 0 && !currentCartId) {
        const lastCart = await cartService.getLastAnonymousCart();
        if (lastCart) {
          const lastCartId = typeof lastCart.id === 'object' ? lastCart.id['#text'] : lastCart.id;
          localStorage.setItem(`current_cart_id_${visitorId}`, lastCartId);
          currentCartId = lastCartId;

          const formattedCart = await cartService.formatCart(lastCart);
          localCartService.setCart(visitorId, formattedCart?.products || []);
        } else {
          const createdCart = await cartService.createCart(visitorId, [], 1, 1, 0);
          if (createdCart?.id) {
            const createdId = typeof createdCart.id === 'object' ? createdCart.id['#text'] : createdCart.id;
            localStorage.setItem(`current_cart_id_${visitorId}`, createdId);
            currentCartId = createdId;
          }
          localCartService.setCart(visitorId, []);
        }
      }

      console.log('Panier courant visiteur:', {
        customerId: visitorId,
        currentCartId,
        items: localCartService.getCart(visitorId),
        totalItems: localCartService.getTotalItems(visitorId)
      });
    } catch (error) {
      console.error('Erreur lors de la creation du panier visiteur:', error);
    }
  };

  const handleSelectUser = async (user) => {
    let sessionData;
    if (user) {
      sessionData = {
        id: getTextVal(user.id),
        firstname: getTextVal(user.firstname),
        lastname: getTextVal(user.lastname),
        email: getTextVal(user.email),
        isLoggedIn: true
      };
    } else {
      sessionData = {
        id: 0,
        firstname: "Visteur",
        lastname: "Anonyme",
        email: "",
        type: 2,
        isLoggedIn: true
      };
    }

    localStorage.setItem('client_session', JSON.stringify(sessionData));
    if (sessionData.id !== 0) {
      await syncCartAfterAuth(sessionData);
    } else {
      await ensureVisitorCart();
    }
    navigate('/mystore/fr/products');
  };

  if (loading) {
    return <div className="user-selection-loading">Chargement des utilisateurs...</div>;
  }

  return (
    <div className="user-selection-container">
      <div className="user-selection-card">
        <h2>Choisissez un compte</h2>
        
        <div className="users-grid">
          {users.map(u => (
            <div 
              key={getTextVal(u.id)} 
              className="user-card"
              onClick={() => handleSelectUser(u)}
            >
              <div className="user-avatar">
                <img
                  src="/user.png"
                  alt="user"
                  className="user-profile-img"
                  onError={() => setAvatarError(true)}
                />
                {avatarError && <MdPerson size={40} color="#555" />}
              </div>
              <div className="user-info">
                <strong>{getTextVal(u.firstname)} {getTextVal(u.lastname)}</strong>
                <span>{getTextVal(u.email)}</span>
              </div>
            </div>
          ))}
          
          <div 
            className="user-card anonymous-card"
            onClick={() => handleSelectUser(null)}
          >
            <div className="user-avatar">
              <img
                src="/user.png"
                alt="user"
                className="user-profile-img"
                onError={() => setAvatarError(true)}
              />
              <MdPerson size={40} color="#777" />
            </div>
            <div className="user-info">
              <strong>Continuer en tant qu'anonyme</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;