import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { mensajeError } from '../api/http.js';
import { useAuth } from '../auth/AuthContext.jsx';
import Button from '../components/Button.jsx';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Login() {
  const { session, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  if (session) return <Navigate to={destino} replace />;

  async function enviar(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await login(email.trim(), password);
      navigate(destino, { replace: true });
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-full">
      <div
        className="hidden flex-1 flex-col justify-between p-10 text-white lg:flex"
        style={{ background: 'linear-gradient(135deg, #10263f 0%, #1a5796 60%, #3385cf 100%)' }}
      >
        <Logo claro />
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Gestión clínica y comercial<br />en un solo lugar.</h2>
          <p className="mt-3 max-w-md text-brand-100">
            Inventario, agenda médica, expedientes, recetas y laboratorio integrados para cuidar la visión de sus pacientes.
          </p>
        </div>
        <p className="text-sm text-brand-200">© {new Date().getFullYear()} Óptica Visión</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-6">
        <form onSubmit={enviar} className="w-full max-w-sm space-y-5">
          <div className="lg:hidden"><Logo /></div>
          <div>
            <h1 className="text-2xl font-semibold text-brand-900">Iniciar sesión</h1>
            <p className="mt-1 text-sm text-slate-500">Ingrese con su cuenta del sistema.</p>
          </div>

          {error && (
            <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Correo electrónico</span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Contraseña</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200"
            />
          </label>

          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando ? <Spinner className="h-4 w-4" /> : <Icon name="lock" className="h-4 w-4" />}
            {cargando ? 'Ingresando…' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
