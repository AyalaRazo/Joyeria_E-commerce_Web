import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface RequireUserAuthProps {
  children: React.ReactElement;
}

const RequireUserAuth: React.FC<RequireUserAuthProps> = ({ children }) => {
  const { user, loading } = useAuth();

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-300"></div>
      </div>
    );
  }

  // Redirigir si no hay usuario
  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default RequireUserAuth;
