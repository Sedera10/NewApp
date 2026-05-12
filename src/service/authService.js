// Service d'authentification (Back-Office et Front-Office)
import api from './api';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ ignoreAttributes: false });

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
      id: client.id,
      firstname: client.firstname,
      lastname: client.lastname,
      email: client.email,
      isLoggedIn: true
    };
    
    localStorage.setItem('client_session', JSON.stringify(sessionData));
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