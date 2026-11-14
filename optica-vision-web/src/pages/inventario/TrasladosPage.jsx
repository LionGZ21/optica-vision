import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import ArticuloPicker from '../../components/ArticuloPicker.jsx';
import Badge, { tonoEstado } from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Select, Textarea } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { fechaHora, num } from '../../utils/format.js';

const PAGE_SIZE = 25;

function NuevoTraslado({ bodegas, onCerrar, onGuardado }) {
  const normales = bodegas.filter((b) => b.tipo !== 'TRANSITO' && b.activa);
  const transitos = bodegas.filter((b) => b.tipo === 'TRANSITO' && b.activa);
  const [f, setF] = useState({
    origen: '', transito: String(transitos[0]?.id ?? ''), destino: '', observacion: '',
  });
  const [lineas, setLineas] = useState([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function agregar(a) {
    setLineas((ls) => (ls.some((l) => l.articuloId === a.id) ? ls
      : [...ls, { articuloId: a.id, codigo: a.codigo, nombre: a.nombre, cantidad: 1 }]));
  }

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (lineas.length === 0) { setError('Agregue al menos un artículo.'); return; }
    if (f.origen === f.destino) { setError('El origen y el destino deben ser distintos.'); return; }
    setGuardando(true);
    try {
      await http.post('/api/traslados', {
        bodegaOrigenId: Number(f.origen),
        bodegaTransitoId: Number(f.transito),
        bodegaDestinoId: Number(f.destino),
        observacion: f.observacion || null,
        lineas: lineas.map((l) => ({ articuloId: l.articuloId, cantidad: Number(l.cantidad) })),
      });
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nuevo traslado" ancho="max-w-3xl" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <Alert>{error}</Alert>
        {transitos.length === 0 && <Alert tipo="aviso">No hay una bodega de tránsito activa.</Alert>}
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Bodega de origen">
            <Select required value={f.origen} onChange={set('origen')}>
              <option value="">— Seleccione —</option>
              {normales.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          </Campo>
          <Campo label="Bodega de tránsito (camión)">
            <Select required value={f.transito} onChange={set('transito')}>
              {transitos.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          </Campo>
          <Campo label="Bodega de destino">
            <Select required value={f.destino} onChange={set('destino')}>
              <option value="">— Seleccione —</option>
              {normales.filter((b) => String(b.id) !== f.origen).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          </Campo>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Artículos a trasladar</span>
          <ArticuloPicker onSelect={agregar} />
          {lineas.length > 0 && (
            <table className={`${T.tabla} mt-3`}>
              <thead><tr><th className={T.th}>Artículo</th><th className={T.thR}>Cantidad</th><th className={T.th}></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {lineas.map((l) => (
                  <tr key={l.articuloId}>
                    <td className={T.td}>{l.codigo} · {l.nombre}</td>
                    <td className={T.tdR}>
                      <input type="number" min="0.001" step="any" className="w-24 rounded border border-slate-300 px-2 py-1 text-right"
                        value={l.cantidad}
                        onChange={(e) => setLineas((ls) => ls.map((x) => (x.articuloId === l.articuloId ? { ...x, cantidad: e.target.value } : x)))} />
                    </td>
                    <td className={T.td}><button type="button" className="text-slate-400 hover:text-red-600" onClick={() => setLineas((ls) => ls.filter((x) => x.articuloId !== l.articuloId))} aria-label="Quitar">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <Campo label="Observación"><Textarea value={f.observacion} onChange={set('observacion')} /></Campo>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>Crear traslado</Button>
        </div>
      </form>
    </Modal>
  );
}

function TrasladoDetalle({ id, nombre, onCerrar, onCambio }) {
  const det = useFetch(() => http.get(`/api/traslados/${id}`).then((r) => r.data), [id]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const t = det.data;

  async function accion(ruta, mensaje) {
    setError(''); setOk(''); setTrabajando(true);
    try {
      await http.post(`/api/traslados/${id}/${ruta}`);
      setOk(mensaje);
      det.reload();
      onCambio();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setTrabajando(false);
    }
  }

  return (
    <Modal titulo={t ? `Traslado ${t.numero}` : 'Traslado'} ancho="max-w-3xl" onCerrar={onCerrar}>
      {det.loading && !t && <Spinner />}
      <Alert>{det.error}</Alert>
      <Alert>{error}</Alert>
      <Alert tipo="ok">{ok}</Alert>
      {t && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Badge tono={tonoEstado(t.estado)}>{t.estado.replace('_', ' ')}</Badge>
            <span>{nombre(t.bodegaOrigenId)} → <em>{nombre(t.bodegaTransitoId)}</em> → {nombre(t.bodegaDestinoId)}</span>
          </div>
          <dl className="mb-4 grid gap-1 text-sm text-slate-600 sm:grid-cols-3">
            <div>Creado: {fechaHora(t.fechaCreacion)}</div>
            <div>Despachado: {t.fechaDespacho ? fechaHora(t.fechaDespacho) : '—'}</div>
            <div>Recibido: {t.fechaRecepcion ? fechaHora(t.fechaRecepcion) : '—'}</div>
          </dl>
          {t.observacion && <p className="mb-3 text-sm text-slate-600">{t.observacion}</p>}
          <table className={T.tabla}>
            <thead><tr><th className={T.th}>Artículo</th><th className={T.thR}>Cantidad</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {t.detalles.map((d) => <tr key={d.id}><td className={T.td}>{d.codigo} · {d.articulo}</td><td className={T.tdR}>{num(d.cantidad)}</td></tr>)}
            </tbody>
          </table>

          <div className="mt-5 flex flex-wrap gap-2">
            {t.estado === 'BORRADOR' && (
              <>
                <Button disabled={trabajando} onClick={() => accion('despachar', 'Despachado: la mercadería salió del origen y está en el camión.')}>Despachar al camión</Button>
                <Button variant="secondary" disabled={trabajando} onClick={() => accion('cancelar', 'Traslado cancelado.')}>Cancelar traslado</Button>
              </>
            )}
            {t.estado === 'EN_TRANSITO' && (
              <Button disabled={trabajando} onClick={() => accion('recibir', 'Recibido: la mercadería ingresó a la bodega de destino.')}>Recibir en destino</Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}

export default function TrasladosPage() {
  const bodegas = useFetch(() => http.get('/api/bodegas').then((r) => r.data), []);
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [nuevo, setNuevo] = useState(false);
  const [detalleId, setDetalleId] = useState(null);

  const lista = useFetch(
    () => http.get('/api/traslados', { params: { estado: estado || undefined, page, pageSize: PAGE_SIZE } }).then((r) => r.data),
    [estado, page],
  );
  const nombre = (id) => bodegas.data?.find((b) => b.id === id)?.nombre ?? `#${id}`;

  return (
    <>
      <PageHeader
        titulo="Traslados"
        descripcion="Movimiento de mercadería entre sucursales a través de la bodega de tránsito (camión)."
        acciones={<Button onClick={() => setNuevo(true)} disabled={!bodegas.data}>Nuevo traslado</Button>}
      />
      <Card>
        <div className="mb-4 w-56">
          <Campo label="Estado">
            <Select value={estado} onChange={(e) => { setPage(1); setEstado(e.target.value); }}>
              <option value="">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="EN_TRANSITO">En tránsito</option>
              <option value="RECIBIDO">Recibido</option>
              <option value="CANCELADO">Cancelado</option>
            </Select>
          </Campo>
        </div>
        <Alert>{lista.error || bodegas.error}</Alert>
        {lista.loading ? <Spinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className={T.tabla}>
                <thead><tr>
                  <th className={T.th}>Número</th><th className={T.th}>Ruta</th><th className={T.th}>Creado</th>
                  <th className={T.thR}>Líneas</th><th className={T.th}>Estado</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lista.data?.items.map((t) => (
                    <tr key={t.id} className={T.filaClic} onClick={() => setDetalleId(t.id)}>
                      <td className={T.td}>{t.numero}</td>
                      <td className={T.td}>{nombre(t.bodegaOrigenId)} → {nombre(t.bodegaDestinoId)}</td>
                      <td className={T.td}>{fechaHora(t.fechaCreacion)}</td>
                      <td className={T.tdR}>{t.lineas}</td>
                      <td className={T.td}><Badge tono={tonoEstado(t.estado)}>{t.estado.replace('_', ' ')}</Badge></td>
                    </tr>
                  ))}
                  {lista.data?.items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No hay traslados.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={lista.data?.total ?? 0} onChange={setPage} />
          </>
        )}
      </Card>

      {nuevo && bodegas.data && <NuevoTraslado bodegas={bodegas.data} onCerrar={() => setNuevo(false)} onGuardado={() => { setNuevo(false); lista.reload(); }} />}
      {detalleId && <TrasladoDetalle id={detalleId} nombre={nombre} onCerrar={() => setDetalleId(null)} onCambio={lista.reload} />}
    </>
  );
}
