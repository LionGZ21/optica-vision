import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { ETIQUETAS_ROL } from '../auth/roles.js';
import { secciones } from '../config/navigation.jsx';
import Icon from '../components/Icon.jsx';
import Logo from '../components/Logo.jsx';

function enlace({ isActive }) {
  return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? 'bg-white/15 text-white' : 'text-brand-100 hover:bg-white/10 hover:text-white'
  }`;
}

export default function AppLayout() {
  const { session, logout, hasRole } = useAuth();
  const [abierto, setAbierto] = useState(false);

  const visibles = secciones
    .map((s) => ({ ...s, items: s.items.filter((i) => hasRole(i.roles)) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="flex h-full">
      {abierto && (
        <div className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden" onClick={() => setAbierto(false)} />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-brand-900 transition-transform lg:static lg:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5">
          <Logo claro />
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          <NavLink to="/" end className={enlace} onClick={() => setAbierto(false)}>
            <Icon name="home" /> Inicio
          </NavLink>

          {visibles.map((s) => (
            <div key={s.titulo}>
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-brand-300">{s.titulo}</p>
              <div className="space-y-0.5">
                {s.items.map((i) => (
                  <NavLink key={i.to} to={i.to} className={enlace} onClick={() => setAbierto(false)}>
                    <Icon name={i.icono} /> {i.etiqueta}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
          <button
            type="button"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setAbierto(true)}
            aria-label="Abrir menú"
          >
            <Icon name="menu" />
          </button>

          <div className="ml-auto flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-800">{session.nombre}</p>
              <p className="text-xs text-slate-500">
                {session.roles.map((r) => ETIQUETAS_ROL[r] ?? r).join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50"
            >
              <Icon name="logout" className="h-4 w-4" /> Salir
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
