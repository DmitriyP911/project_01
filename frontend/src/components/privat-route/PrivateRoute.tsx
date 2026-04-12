import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

interface PrivateRouteProps {
  children: ReactNode;
}

export const PrivateRoute = ({ children }: PrivateRouteProps): JSX.Element => {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Загрузка...</div>;
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};
