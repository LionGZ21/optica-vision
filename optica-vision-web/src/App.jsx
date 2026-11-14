import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext.jsx';
import { RequireAuth, RequireRole } from './auth/guards.jsx';
import { rutas, rutasExtra } from './config/navigation.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Pendiente from './pages/Pendiente.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<Dashboard />} />

              {/* Rutas generadas desde config/navigation.jsx, protegidas por rol */}
              {rutas.map((r) => {
                const Pagina = r.componente ?? Pendiente;
                return (
                  <Route
                    key={r.to}
                    path={r.to}
                    element={
                      <RequireRole roles={r.roles}>
                        <Pagina titulo={r.etiqueta} descripcion={r.descripcion} />
                      </RequireRole>
                    }
                  />
                );
              })}

              {rutasExtra.map((r) => {
                const Pagina = r.componente;
                return (
                  <Route
                    key={r.to}
                    path={r.to}
                    element={
                      <RequireRole roles={r.roles}>
                        <Pagina />
                      </RequireRole>
                    }
                  />
                );
              })}

              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
