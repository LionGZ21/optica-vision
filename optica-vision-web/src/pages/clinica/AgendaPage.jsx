import { useState } from 'react';
import { http } from '../../api/http.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { GRUPOS } from '../../auth/roles.js';
import Alert from '../../components/Alert.jsx';
import Badge, { tonoEstado } from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Select } from '../../components/Field.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Spinner from '../../components/Spinner.jsx';
import useFetch from '../../hooks/useFetch.js';
import { hora, toISODate } from '../../utils/format.js';
import { CitaDetalleModal, CitaNuevaModal } from './CitaModales.jsx';
import ProfesionalesModal from './ProfesionalesModal.jsx';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function lunesDe(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export default function AgendaPage() {
  const { hasRole } = useAuth();
  const esDireccion = hasRole(GRUPOS.direccion);

  const [semana, setSemana] = useState(() => lunesDe(new Date()));
  const [profesionalId, setProfesionalId] = useState('');
  const [sucursalId, setSucursalId] = useState('');
  const [nueva, setNueva] = useState(null);        // null | { fecha }
  const [cita, setCita] = useState(null);
  const [verProfesionales, setVerProfesionales] = useState(false);

  const cat = useFetch(async () => {
    const [p, s] = await Promise.all([http.get('/api/profesionales'), http.get('/api/sucursales')]);
    return { profesionales: p.data, sucursales: s.data };
  }, []);

  const dias = Array.from({ length: 7 }, (_, i) => new Date(semana.getFullYear(), semana.getMonth(), semana.getDate() + i));
  const fin = new Date(semana.getFullYear(), semana.getMonth(), semana.getDate() + 7);

  const citas = useFetch(
    () => http.get('/api/citas', {
      params: {
        desde: semana.toISOString(),
        hasta: fin.toISOString(),
        profesionalId: profesionalId || undefined,
        sucursalId: sucursalId || undefined,
      },
    }).then((r) => r.data),
    [semana, profesionalId, sucursalId],
  );

  const mover = (dias7) => setSemana(new Date(semana.getFullYear(), semana.getMonth(), semana.getDate() + dias7));
  const porDia = (d) => (citas.data ?? []).filter((c) => toISODate(new Date(c.inicio)) === toISODate(d));
  const hoy = toISODate(new Date());

  const rango = `${dias[0].toLocaleDateString('es-NI', { day: 'numeric', month: 'short' })} – ${dias[6].toLocaleDateString('es-NI', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <>
      <PageHeader
        titulo="Agenda médica"
        descripcion="Citas de pacientes con oftalmólogos y optómetras."
        acciones={
          <>
            {esDireccion && <Button variant="secondary" onClick={() => setVerProfesionales(true)}>Profesionales</Button>}
            <Button onClick={() => setNueva({ fecha: hoy })} disabled={!cat.data}>Nueva cita</Button>
          </>
        }
      />

      <Alert>{cat.error || citas.error}</Alert>
      {cat.data?.profesionales.length === 0 && (
        <Alert tipo="aviso">
          Aún no hay profesionales registrados.{esDireccion ? ' Use el botón "Profesionales" para agregar el primero.' : ' Pida al administrador que los registre.'}
        </Alert>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => mover(-7)}>‹</Button>
            <span className="min-w-52 text-center text-sm font-medium text-slate-700">{rango}</span>
            <Button variant="secondary" onClick={() => mover(7)}>›</Button>
            <Button variant="ghost" onClick={() => setSemana(lunesDe(new Date()))}>Hoy</Button>
          </div>
          <div className="w-56">
            <Campo label="Profesional">
              <Select value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)}>
                <option value="">Todos</option>
                {cat.data?.profesionales.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
              </Select>
            </Campo>
          </div>
          <div className="w-56">
            <Campo label="Sucursal">
              <Select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
                <option value="">Todas</option>
                {cat.data?.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </Select>
            </Campo>
          </div>
          {citas.loading && <Spinner className="mb-2 h-5 w-5" />}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-7">
        {dias.map((d, i) => {
          const iso = toISODate(d);
          const lista = porDia(d);
          return (
            <div key={iso} className={`rounded-xl bg-white p-3 ring-1 ${iso === hoy ? 'ring-brand-400' : 'ring-slate-200'}`}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{DIAS[i]}</p>
                  <p className={`text-lg font-semibold ${iso === hoy ? 'text-brand-700' : 'text-slate-800'}`}>{d.getDate()}</p>
                </div>
                <button
                  type="button"
                  disabled={!cat.data}
                  onClick={() => setNueva({ fecha: iso })}
                  className="rounded-lg px-2 py-1 text-lg leading-none text-brand-700 hover:bg-brand-50 disabled:opacity-40"
                  aria-label={`Nueva cita el ${iso}`}
                >
                  +
                </button>
              </div>
              <div className="space-y-2">
                {lista.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCita(c)}
                    className={`w-full rounded-lg border border-slate-200 p-2 text-left text-xs hover:border-brand-300 hover:bg-brand-50 ${['CANCELADA', 'NO_ASISTIO'].includes(c.estado) ? 'opacity-60' : ''}`}
                  >
                    <span className="font-semibold text-slate-800">{hora(c.inicio)} – {hora(c.fin)}</span>
                    <span className="block truncate text-slate-700">{c.paciente}</span>
                    {!profesionalId && <span className="block truncate text-slate-500">{c.profesional}</span>}
                    <span className="mt-1 inline-block"><Badge tono={tonoEstado(c.estado)}>{c.estado.replace('_', ' ')}</Badge></span>
                  </button>
                ))}
                {lista.length === 0 && <p className="py-2 text-center text-xs text-slate-400">Sin citas</p>}
              </div>
            </div>
          );
        })}
      </div>

      {nueva && cat.data && (
        <CitaNuevaModal
          fecha={nueva.fecha}
          profesionales={cat.data.profesionales}
          sucursales={cat.data.sucursales}
          profesionalId={profesionalId}
          sucursalId={sucursalId}
          onCerrar={() => setNueva(null)}
          onGuardado={() => { setNueva(null); citas.reload(); }}
        />
      )}
      {cita && <CitaDetalleModal cita={cita} onCerrar={() => setCita(null)} onCambio={() => { setCita(null); citas.reload(); }} />}
      {verProfesionales && <ProfesionalesModal onCerrar={() => setVerProfesionales(false)} onCambio={cat.reload} />}
    </>
  );
}
