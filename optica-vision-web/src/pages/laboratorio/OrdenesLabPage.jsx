import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { GRUPOS } from '../../auth/roles.js';
import Alert from '../../components/Alert.jsx';
import ArticuloPicker from '../../components/ArticuloPicker.jsx';
import Badge, { tonoEstado } from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Input, Select, Textarea } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PacientePicker from '../../components/PacientePicker.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { aNumero, fechaSolo, num } from '../../utils/format.js';

const PAGE_SIZE = 25;
const ROLES_LINEA = [['MONTURA', 'Montura'], ['LENTE_OD', 'Lente OD'], ['LENTE_OI', 'Lente OI'], ['INSUMO', 'Insumo']];
const ESTADOS = ['PENDIENTE', 'EN_PROCESO', 'CONTROL_CALIDAD', 'LISTA', 'ENTREGADA', 'CANCELADA'];

// Siguientes estados permitidos (coinciden con el backend). EN_PROCESO se alcanza al consumir inventario.
const SIGUIENTES = {
  PENDIENTE: [['CANCELADA', 'Cancelar orden']],
  EN_PROCESO: [['CONTROL_CALIDAD', 'Pasar a control de calidad']],
  CONTROL_CALIDAD: [['LISTA', 'Marcar como lista'], ['EN_PROCESO', 'Devolver a proceso']],
  LISTA: [['ENTREGADA', 'Entregar al paciente']],
};

function NuevaOrden({ onCerrar, onGuardado }) {
  const cat = useFetch(async () => {
    const [s, b] = await Promise.all([http.get('/api/sucursales'), http.get('/api/bodegas')]);
    return { sucursales: s.data.filter((x) => x.activa), bodegas: b.data.filter((x) => x.tipo !== 'TRANSITO' && x.activa) };
  }, []);
  const [paciente, setPaciente] = useState(null);
  const recetas = useFetch(
    () => (paciente ? http.get('/api/recetas', { params: { pacienteId: paciente.id } }).then((r) => r.data) : Promise.resolve([])),
    [paciente?.id],
  );
  const [f, setF] = useState({ recetaId: '', sucursalId: '', bodegaId: '', ventaId: '', tratamientos: '', fechaPromesa: '', observaciones: '' });
  const [lineas, setLineas] = useState([]);
  const [rol, setRol] = useState('MONTURA');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (lineas.length === 0) { setError('Agregue la montura y/o los lentes que se consumirán.'); return; }
    setGuardando(true);
    try {
      await http.post('/api/laboratorio/ordenes', {
        recetaId: Number(f.recetaId),
        sucursalId: Number(f.sucursalId),
        bodegaConsumoId: Number(f.bodegaId),
        ventaId: aNumero(f.ventaId),
        tratamientos: f.tratamientos || null,
        fechaPromesa: f.fechaPromesa || null,
        observaciones: f.observaciones || null,
        detalles: lineas.map((l) => ({ articuloId: l.articuloId, rol: l.rol, cantidad: Number(l.cantidad) })),
      });
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nueva orden de trabajo" ancho="max-w-3xl" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <Alert>{error || cat.error || recetas.error}</Alert>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Paciente</span>
          <PacientePicker valor={paciente} onSelect={(p) => { setPaciente(p); setF({ ...f, recetaId: '' }); }} />
        </div>
        <Campo label="Receta">
          <Select required value={f.recetaId} onChange={set('recetaId')} disabled={!paciente}>
            <option value="">{paciente ? '— Seleccione la receta —' : 'Primero elija un paciente'}</option>
            {recetas.data?.map((r) => <option key={r.id} value={r.id}>{r.numero} · {fechaSolo(r.fechaEmision)}{r.tipoLente ? ` · ${r.tipoLente}` : ''}</option>)}
          </Select>
        </Campo>
        {paciente && recetas.data?.length === 0 && <Alert tipo="aviso">Este paciente no tiene recetas. Créela primero en Expedientes.</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Sucursal">
            <Select required value={f.sucursalId} onChange={set('sucursalId')}>
              <option value="">— Seleccione —</option>
              {cat.data?.sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
          </Campo>
          <Campo label="Bodega de donde se consume el material">
            <Select required value={f.bodegaId} onChange={set('bodegaId')}>
              <option value="">— Seleccione —</option>
              {cat.data?.bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          </Campo>
          <Campo label="Fecha prometida de entrega"><Input type="date" value={f.fechaPromesa} onChange={set('fechaPromesa')} /></Campo>
          <Campo label="N.º interno de venta (opcional)"><Input type="number" min="1" value={f.ventaId} onChange={set('ventaId')} /></Campo>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Material (montura y cristales en blanco)</span>
          <div className="mb-2 flex gap-2">
            <div className="w-40"><Select value={rol} onChange={(e) => setRol(e.target.value)}>{ROLES_LINEA.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select></div>
            <div className="flex-1">
              <ArticuloPicker onSelect={(a) => setLineas((ls) => [...ls, { key: `${a.id}-${rol}-${Date.now()}`, articuloId: a.id, codigo: a.codigo, nombre: a.nombre, rol, cantidad: 1 }])} />
            </div>
          </div>
          {lineas.length > 0 && (
            <table className={T.tabla}>
              <thead><tr><th className={T.th}>Rol</th><th className={T.th}>Artículo</th><th className={T.thR}>Cant.</th><th className={T.th}></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {lineas.map((l) => (
                  <tr key={l.key}>
                    <td className={T.td}>{ROLES_LINEA.find(([v]) => v === l.rol)?.[1]}</td>
                    <td className={T.td}>{l.codigo} · {l.nombre}</td>
                    <td className={T.tdR}><input type="number" min="0.001" step="any" className="w-20 rounded border border-slate-300 px-2 py-1 text-right" value={l.cantidad}
                      onChange={(e) => setLineas((ls) => ls.map((x) => (x.key === l.key ? { ...x, cantidad: e.target.value } : x)))} /></td>
                    <td className={T.td}><button type="button" className="text-slate-400 hover:text-red-600" onClick={() => setLineas((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Quitar">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Campo label="Tratamientos (antirreflejo, fotocromático…)"><Input value={f.tratamientos} onChange={set('tratamientos')} /></Campo>
        <Campo label="Observaciones"><Textarea value={f.observaciones} onChange={set('observaciones')} /></Campo>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>Crear orden</Button>
        </div>
      </form>
    </Modal>
  );
}

function OrdenDetalle({ id, onCerrar, onCambio }) {
  const { hasRole } = useAuth();
  const puedeOperar = hasRole(GRUPOS.laboratorio);
  const det = useFetch(() => http.get(`/api/laboratorio/ordenes/${id}`).then((r) => r.data), [id]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const o = det.data;

  async function ejecutar(fn, mensaje) {
    setError(''); setOk(''); setTrabajando(true);
    try {
      await fn();
      setOk(mensaje);
      det.reload();
      onCambio();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setTrabajando(false);
    }
  }

  const pendientes = o?.detalles.some((d) => !d.consumido);
  const puedeConsumir = o && ['PENDIENTE', 'EN_PROCESO'].includes(o.estado) && pendientes;

  return (
    <Modal titulo={o ? `Orden ${o.numero}` : 'Orden de trabajo'} ancho="max-w-3xl" onCerrar={onCerrar}>
      {det.loading && !o && <Spinner />}
      <Alert>{det.error}</Alert>
      <Alert>{error}</Alert>
      <Alert tipo="ok">{ok}</Alert>
      {o && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <Badge tono={tonoEstado(o.estado)}>{o.estado.replace('_', ' ')}</Badge>
            <span><strong>{o.paciente}</strong></span>
            {o.fechaPromesa && <span className="text-slate-500">Prometida: {fechaSolo(o.fechaPromesa)}</span>}
          </div>
          {o.tratamientos && <p className="mb-2 text-sm text-slate-600">Tratamientos: {o.tratamientos}</p>}
          {o.observaciones && <p className="mb-2 text-sm text-slate-600">{o.observaciones}</p>}

          <table className={T.tabla}>
            <thead><tr><th className={T.th}>Rol</th><th className={T.th}>Artículo</th><th className={T.thR}>Cant.</th><th className={T.th}>Inventario</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {o.detalles.map((d) => (
                <tr key={d.id}>
                  <td className={T.td}>{ROLES_LINEA.find(([v]) => v === d.rol)?.[1] ?? d.rol}</td>
                  <td className={T.td}>{d.codigo} · {d.articulo}</td>
                  <td className={T.tdR}>{num(d.cantidad)}</td>
                  <td className={T.td}><Badge tono={d.consumido ? 'verde' : 'gris'}>{d.consumido ? 'Consumido' : 'Pendiente'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>

          {puedeOperar && (
            <div className="mt-5 flex flex-wrap gap-2">
              {puedeConsumir && (
                <Button disabled={trabajando} onClick={() => ejecutar(() => http.post(`/api/laboratorio/ordenes/${id}/consumir`), 'Material descontado del inventario. La orden está en proceso.')}>
                  Consumir material del inventario
                </Button>
              )}
              {(SIGUIENTES[o.estado] ?? []).map(([estado, texto]) => (
                <Button key={estado} variant="secondary" disabled={trabajando}
                  onClick={() => ejecutar(() => http.put(`/api/laboratorio/ordenes/${id}/estado`, { estado }), `Estado actualizado: ${estado.replace('_', ' ')}.`)}>
                  {texto}
                </Button>
              ))}
            </div>
          )}
          {o.estado === 'PENDIENTE' && puedeOperar && (
            <p className="mt-3 text-xs text-slate-500">Al consumir el material la orden pasa a "En proceso". Una orden con material consumido ya no puede cancelarse.</p>
          )}
        </>
      )}
    </Modal>
  );
}

export default function OrdenesLabPage() {
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [nueva, setNueva] = useState(false);
  const [detalleId, setDetalleId] = useState(null);

  const lista = useFetch(
    () => http.get('/api/laboratorio/ordenes', { params: { estado: estado || undefined, page, pageSize: PAGE_SIZE } }).then((r) => r.data),
    [estado, page],
  );

  return (
    <>
      <PageHeader
        titulo="Laboratorio · Órdenes de trabajo"
        descripcion="Enlazan la receta del paciente con el consumo de montura y cristales en blanco."
        acciones={<Button onClick={() => setNueva(true)}>Nueva orden</Button>}
      />
      <Card>
        <div className="mb-4 w-60">
          <Campo label="Estado">
            <Select value={estado} onChange={(e) => { setPage(1); setEstado(e.target.value); }}>
              <option value="">Todos</option>
              {ESTADOS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </Select>
          </Campo>
        </div>
        <Alert>{lista.error}</Alert>
        {lista.loading ? <Spinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className={T.tabla}>
                <thead><tr>
                  <th className={T.th}>Orden</th><th className={T.th}>Paciente</th><th className={T.th}>Entrega prometida</th><th className={T.th}>Estado</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lista.data?.items.map((o) => (
                    <tr key={o.id} className={T.filaClic} onClick={() => setDetalleId(o.id)}>
                      <td className={T.td}>{o.numero}</td><td className={T.td}>{o.paciente}</td>
                      <td className={T.td}>{o.fechaPromesa ? fechaSolo(o.fechaPromesa) : '—'}</td>
                      <td className={T.td}><Badge tono={tonoEstado(o.estado)}>{o.estado.replace('_', ' ')}</Badge></td>
                    </tr>
                  ))}
                  {lista.data?.items.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-500">No hay órdenes de trabajo.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={lista.data?.total ?? 0} onChange={setPage} />
          </>
        )}
      </Card>
      {nueva && <NuevaOrden onCerrar={() => setNueva(false)} onGuardado={() => { setNueva(false); lista.reload(); }} />}
      {detalleId && <OrdenDetalle id={detalleId} onCerrar={() => setDetalleId(null)} onCambio={lista.reload} />}
    </>
  );
}
