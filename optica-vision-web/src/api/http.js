import axios from 'axios';

export const TOKEN_KEY = 'ov_token';

// Instancia única de axios para toda la aplicación.
export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  timeout: 30000,
});

// Adjunta el JWT a cada petición.
http.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Si la API responde 401 (token vencido o inválido), cierra la sesión.
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && onUnauthorized) onUnauthorized();
    return Promise.reject(error);
  },
);

/** Convierte cualquier error de axios en un texto claro para el usuario. */
export function mensajeError(error) {
  if (error.response) {
    const data = error.response.data;
    if (data?.mensaje) return data.mensaje;           // errores de negocio de nuestra API
    if (data?.errors) return Object.values(data.errors).flat().join(' ');  // validación de ASP.NET
    if (data?.title) return data.title;
    if (error.response.status === 403) return 'No tiene permiso para realizar esta acción.';
    return `Error ${error.response.status} del servidor.`;
  }
  if (error.request) return 'No se pudo conectar con la API. Verifique que el backend esté en ejecución.';
  return error.message ?? 'Error inesperado.';
}
