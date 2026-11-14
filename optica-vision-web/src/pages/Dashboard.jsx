import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { http, mensajeError } from '../api/http.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { secciones } from '../config/navigation.jsx';
import Card from '../components/Card.jsx';
import Icon from '../components/Icon.jsx';
import PageHeader from '../components/PageHeader.jsx';
import Spinner from '../components/Spinner.jsx';

export default function Dashboard() {
  const { session, hasRole } = useAuth();
  const [estado, setEstado] = useState({ cargando: true, ok: false, detalle: '' });

  // Prueba de conexión frontend -> API (usa el endpoint protegido /api/auth/me)
  useEffect(() => {
    let cancelado = false;
    http
      .get('/api/auth/me')
      .then(() => !cancelado && setEstado({ cargando: false, ok: true, detalle: '' }))
      .catch((err) => !cancelado && setEstado({ cargando: false, ok: false, detalle: mensajeError(err) }));
    return () => {
      cancelado = true;
    };
  }, []);

  const modulos = secciones.flatMap((s) => s.items).filter((i) => hasRole(i.roles));

  return (
    <>
      <PageHeader titulo={`Bienvenido, ${session.nombre}`} descripcion="Resumen de su sesión y accesos disponibles." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card>
          <p className="text-sm font-medium text-slate-500">Conexión con la API</p>
          <div className="mt-2 flex items-center gap-2">
            {estado.cargando ? (
              <><Spinner className="h-4 w-4" /><span className="text-sm">Verificando…</span></>
            ) : estado.ok ? (
              <><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /><span className="text-sm font-medium text-emerald-700">Conectada correctamente</span></>
            ) : (
              <><span className="h-2.5 w-2.5 rounded-full bg-red-500" /><span className="text-sm font-medium text-red-700">{estado.detalle}</span></>
            )}
          </div>
        </Card>
        <Card>
          <p className="text-sm font-medium text-slate-500">Su cuenta</p>
          <p className="mt-2 text-sm text-slate-800">{session.email}</p>
        </Card>
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Accesos rápidos</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {modulos.map((m) => (
          <Link key={m.to} to={m.to} className="group">
            <Card className="h-full transition group-hover:ring-brand-300">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <Icon name={m.icono} />
                </span>
                <p className="font-medium text-slate-800">{m.etiqueta}</p>
              </div>
              <p className="mt-3 text-sm text-slate-500">{m.descripcion}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
