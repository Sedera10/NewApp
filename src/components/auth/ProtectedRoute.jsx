import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticatedAdmin } from '../../service/auth/Login';

const ProtectedRoute = ({ children }) => {
  if (!isAuthenticatedAdmin()) {
    // Si l'utilisateur n'est pas un admin connecté, on le redirige vers le login
    return <Navigate to="/mystore/admin" replace />;
  }
  // S'il est connecté, on affiche le composant enfant normal
  return children;
};

export default ProtectedRoute;