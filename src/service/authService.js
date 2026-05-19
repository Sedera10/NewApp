// Service d'authentification (Back-Office et Front-Office)
import api from './api';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false });

const getTextVal = (val) => {
  if (val && typeof val === 'object' && val['#text'] !== undefined) {
    return val['#text'];
  }
  return val;
};

export const loginBO = (username, password) => {
  const secretUsername = import.meta.env.VITE_ADMIN_USERNAME;
  const secretPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  if (username === secretUsername && password === secretPassword) {
    localStorage.setItem('isAdmin', 'true');
    return true;
  } else {
    return false;
  }
};

export const syncCartAfterAuth = async (sessionData) => {
  try {
    const { cartService, localCartService } = await import('./Cart');
    const newCustomerId = sessionData.id;
    const anonymousCustomerId = 0;

    let anonymeCartId = localStorage.getItem(`current_cart_id_${anonymousCustomerId}`);
    let currentAnonymeCart = localCartService.getCart(anonymousCustomerId);

    if (anonymeCartId || (currentAnonymeCart && currentAnonymeCart.length > 0)) {
      const itemsToApi = (currentAnonymeCart || []).map(item => ({
        id_product: item.id,
        id_product_attribute: item.idProductAttribute || item.id_product_attribute || 0,
        quantity: item.quantity,
        id_address_delivery: 0
      }));

      if (anonymeCartId) {
        await cartService.updateCart(anonymeCartId, {
          id_customer: newCustomerId,
          id_currency: 1,
          id_lang: 1,
          associations: {
            cart_rows: {
              cart_row: itemsToApi
            }
          }
        });
        localStorage.setItem(`current_cart_id_${newCustomerId}`, anonymeCartId);
        localStorage.removeItem(`current_cart_id_${anonymousCustomerId}`);
      } else if (itemsToApi.length > 0) {
        const createdCart = await cartService.createCart(newCustomerId, itemsToApi, 1, 1, 0);
        if (createdCart?.id) {
          const createdId = typeof createdCart.id === 'object' ? createdCart.id['#text'] : createdCart.id;
          localStorage.setItem(`current_cart_id_${newCustomerId}`, createdId);
        }
      }

      if (currentAnonymeCart && currentAnonymeCart.length > 0) {
        localCartService.setCart(newCustomerId, currentAnonymeCart);
        localCartService.clearCart(anonymousCustomerId);
      }
    } else {
      const lastCart = await cartService.getLastCart(newCustomerId);
      if (lastCart) {
        const lastCartId = typeof lastCart.id === 'object' ? lastCart.id['#text'] : lastCart.id;
        localStorage.setItem(`current_cart_id_${newCustomerId}`, lastCartId);

        try {
          const formattedCart = await cartService.formatCart(lastCart);
          localCartService.setCart(newCustomerId, formattedCart?.products || []);
        } catch (formatError) {
          console.warn('Impossible de reconstruire le panier local depuis le dernier panier.', formatError);
        }
      } else {
        const createdCart = await cartService.createCart(newCustomerId, [], 1, 1, 0);
        if (createdCart?.id) {
          const createdId = typeof createdCart.id === 'object' ? createdCart.id['#text'] : createdCart.id;
          localStorage.setItem(`current_cart_id_${newCustomerId}`, createdId);
        }
        localCartService.setCart(newCustomerId, []);
      }
    }

    const currentCartId = localStorage.getItem(`current_cart_id_${newCustomerId}`);
    const currentCartItems = localCartService.getCart(newCustomerId);
    console.log('Panier courant apres authentification:', {
      customerId: newCustomerId,
      currentCartId,
      items: currentCartItems,
      totalItems: localCartService.getTotalItems(newCustomerId)
    });
  } catch (e) {
    console.error("Erreur durant la synchronisation du panier au login:", e);
  }
};

export const loginFO = async (email, password) => {
  try {
    const response = await api.get(`/customers?filter[email]=${email}&display=full`);
    const data = parser.parse(response.data);
    const customers = data.prestashop.customers.customer;

    if (!customers) {
      throw new Error("Aucun compte associé à cet email.");
    }
    // on récupère l'objet client (souvent le premier du tableau)
    const client = Array.isArray(customers) ? customers[0] : customers;
    // Ici, on considère la connexion réussie pour le test local
    const sessionData = {
      id: getTextVal(client.id),
      firstname: getTextVal(client.firstname),
      lastname: getTextVal(client.lastname),
      email: getTextVal(client.email),
      isLoggedIn: true
    };

    console.log('Session created:', sessionData);
    localStorage.setItem('client_session', JSON.stringify(sessionData));
    await syncCartAfterAuth(sessionData);

    return sessionData;

  } catch (error) {
    console.error("Erreur login:", error);
    throw error;
  }
};

export const isAuthenticatedCustomer = () => {
  const session = localStorage.getItem('client_session');
  if (!session) return false;
  const parsedSession = JSON.parse(session);

  return parsedSession.isLoggedIn === true;
}

export const logoutFO = () => {
  localStorage.removeItem('client_session');
}

export const logoutBO = () => {
  localStorage.removeItem('isAdmin');
}

export const isAuthenticatedAdmin = () => {
  return localStorage.getItem('isAdmin') === 'true';
};