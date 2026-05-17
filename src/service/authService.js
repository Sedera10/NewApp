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

    // GESTION DU PANIER (Fusion au moment du login)
    try {
        const { cartService, localCartService } = await import('./Cart');
        const newCustomerId = sessionData.id;
        
        let anonymeCartId = localStorage.getItem(`current_cart_id_1`);
        let currentAnonymeCart = localCartService.getCart(1);
        
        if (anonymeCartId || (currentAnonymeCart && currentAnonymeCart.length > 0)) { 
           // Mettre à jour l'API pour lier le panier au nouveau client
           if (anonymeCartId) { // S'il avait fait un appel API récent
               await cartService.updateCart(anonymeCartId, { id_customer: newCustomerId, id_currency: 1, id_lang: 1 });
               localStorage.setItem(`current_cart_id_${newCustomerId}`, anonymeCartId);
               localStorage.removeItem(`current_cart_id_1`);
           }
           
           // Migration des produits dans le state local (on pourrait aussi récupérer l'ancien de l'utilisateur et fusionner, etc.)
           if (currentAnonymeCart && currentAnonymeCart.length > 0) {
               currentAnonymeCart.forEach(item => {
                  localCartService.addToCart(newCustomerId, item, item.quantity);
               });
               localCartService.clearCart(1);
           }
        } else {
           // Si pas de panier anonyme, on vérifie si le client a un vieux panier disponible
           const lastCart = await cartService.getLastCart(newCustomerId);
           if (lastCart) {
              const lastCartId = typeof lastCart.id === 'object' ? lastCart.id['#text'] : lastCart.id;
              localStorage.setItem(`current_cart_id_${newCustomerId}`, lastCartId);
              
              // On recrée la structure locale (facultatif si pre-chargé via API sur Checkout, mais utile pour l'UI)
              let cartRows = lastCart?.associations?.cart_rows?.cart_row || [];
              if (!Array.isArray(cartRows)) cartRows = [cartRows];
              
              if (cartRows.length > 0) {
                  // Import productService pour récupérer les détails n'est pas possible ici rapidement
                  // Idéalement on ferait un cartService.formatCart() si besoin
                  console.log("Vieux panier récupéré pour la session :", lastCartId);
              }
           }
        }
    } catch (e) {
       console.error("Erreur durant la synchronisation du panier au login:", e);
    }

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