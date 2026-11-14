import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import NoAutorizado from '../pages/NoAutorizado.jsx';

/** Exige sesión iniciada; si no, envía a /login recordando la página solicitada. */
export function RequireAuth() {
  const { session } = useAuth();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}

/** Exige que el usuario tenga alguno de los roles indicados. */
export function RequireRole({ roles, children }) {
  const { hasRole } = useAuth();
  if (!hasRole(roles)) return <NoAutorizado />;
  return children;
}
