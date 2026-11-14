import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { http, setUnauthorizedHandler } from '../api/http.js';
import { clearSession, expiraEn, loadSession, saveSession } from './storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadSession());

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // Si la API responde 401, se cierra la sesión.
  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Cierre automático cuando vence el token.
  useEffect(() => {
    if (!session) return undefined;
    const restante = expiraEn(session.token) - Date.now();
    if (restante <= 0) {
      logout();
      return undefined;
    }
    const id = setTimeout(logout, Math.min(restante, 2_147_483_647));
    return () => clearTimeout(id);
  }, [session, logout]);

  const login = useCallback(async (email, password) => {
    const { data } = await http.post('/api/auth/login', { email, password });
    const nueva = {
      token: data.token,
      email: data.email,
      nombre: data.nombreCompleto,
      roles: data.roles ?? [],
    };
    saveSession(nueva);
    setSession(nueva);
    return nueva;
  }, []);

  /** true si no se exigen roles o si el usuario tiene al menos uno de ellos. */
  const hasRole = useCallback(
    (roles) => !roles || roles.length === 0 || roles.some((r) => session?.roles.includes(r)),
    [session],
  );

  const value = useMemo(() => ({ session, login, logout, hasRole }), [session, login, logout, hasRole]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  return ctx;
}
