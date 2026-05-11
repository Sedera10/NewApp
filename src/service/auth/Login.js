// Service d'authentification (Back-Office et Front-Office)
export const loginBO = (username, password) => {
  const secretUsername = import.meta.env.VITE_ADMIN_USERNAME;
  const secretPassword = import.meta.env.VITE_ADMIN_PASSWORD;

  if (username === secretUsername && password === secretPassword) {
    localStorage.setItem('isAdmin', 'true');
    return true; // Connexion réussie
  } else {
    return false; // Échec
  }
};

export const loginFO = (username, password) => {
  console.log("Tentative de connexion Front-office :", username);
  return false;
};

export const isAuthenticatedAdmin = () => {
  return localStorage.getItem('isAdmin') === 'true';
};