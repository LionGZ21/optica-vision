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
import { fechaSolo, money, num } from '../../utils/format.js';

const PAGE_SIZE = 25;

function NuevaConsignacion({ onCerrar, onGuardado }) {
  const cat = useFetch(async () => {
    const [p, b] = await Promise.all([http.get('/api/proveedores', { params: { activo: true } }), http.get('/api/bodegas')]);
    return { proveedores: p.data, bodegas: b.data.filter((x) => x.tipo !== 'TRANSITO' && x.activa) };
  }, []);
  const [f, setF] = useState({ proveedorId: '', bodegaId: '', observacion: '' });
  const [lineas, setLineas] = useState([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cambiar = (id, campo, v) => setLineas((ls) => ls.map((l) => (l.articuloId === id ? { ...l, [campo]: v } : l)));

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (lineas.length === 0) { setError('Agregue al menos un artículo.'); return; }
    setGuardando(true);
    try {
      await http.post('/api/consignaciones', {
        proveedorId: Number(f.proveedorId),
        bodegaId: Number(f.bodegaId),
        observacion: f.observacion || null,
        lineas: lineas.map((l) => ({ articuloId: l.articuloId, cantidad: Number(l.cantidad), costoUnitario: Number(l.costo) })),
      });
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nueva consignación" ancho="max-w-3xl" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <Alert>{error || cat.error}</Alert>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Proveedor">
            <Select required value={f.proveedorId} onChange={set('proveedorId')}>
              <option value="">— Seleccione —</option>
              {cat.data?.proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
            </Select>
          </Campo>
          <Campo label="Bodega de recepción">
            <Select required value={f.bodegaId} onChange={set('bodegaId')}>
              <option value="">— Seleccione —</option>
              {cat.data?.bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          </Campo>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Artículos recibidos en consignación</span>
          <ArticuloPicker onSelect={(a) => setLineas((ls) => (ls.some((l) => l.articuloId === a.id) ? ls : [...ls, { articuloId: a.id, codigo: a.codigo, nombre: a.nombre, cantidad: 1, costo: '' }]))} />
          {lineas.length > 0 && (
            <table className={`${T.tabla} mt-3`}>
              <thead><tr><th className={T.th}>Artículo</th><th className={T.thR}>Cantidad</th><th className={T.thR}>Costo unitario</th><th className={T.th}></th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {lineas.map((l) => (
                  <tr key={l.articuloId}>
                    <td className={T.td}>{l.codigo} · {l.nombre}</td>
                    <td className={T.tdR}><input type="number" min="0.001" step="any" required className="w-24 rounded border border-slate-300 px-2 py-1 text-right" value={l.cantidad} onChange={(e) => cambiar(l.articuloId, 'cantidad', e.target.value)} /></td>
                    <td className={T.tdR}><input type="number" min="0" step="0.01" required className="w-28 rounded border border-slate-300 px-2 py-1 text-right" value={l.costo} onChange={(e) => cambiar(l.articuloId, 'costo', e.target.value)} /></td>
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
          <Button type="submit" disabled={guardando}>Crear consignación</Button>
        </div>
      </form>
    </Modal>
  );
}

function ConsignacionDetalle({ id, onCerrar, onCambio }) {
  const det = useFetch(() => http.get(`/api/consignaciones/${id}`).then((r) => r.data), [id]);
  const [dev, setDev] = useState({});     // cantidades a devolver por detalle
  const [liq, setLiq] = useState({});     // cantidades a liquidar por detalle
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const c = det.data;

  async function ejecutar(fn, mensaje) {
    setError(''); setOk(''); setTrabajando(true);
    try {
      const resultado = await fn();
      setOk(typeof mensaje === 'function' ? mensaje(resultado) : mensaje);
      det.reload();
      onCambio();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setTrabajando(false);
    }
  }

  const recibir = () => ejecutar(() => http.post(`/api/consignaciones/${id}/recibir`), 'Mercadería recibida: ya forma parte del inventario.');
  const cerrar = () => ejecutar(() => http.post(`/api/consignaciones/${id}/cerrar`), 'Consignación cerrada.');
  const devolver = (d) => ejecutar(async () => {
    await http.post(`/api/consignaciones/detalles/${d.id}/devolver`, { cantidad: Number(dev[d.id]) });
    setDev({ ...dev, [d.id]: '' });
  }, 'Devolución registrada.');
  const liquidar = () => {
    const lineas = Object.entries(liq).filter(([, v]) => Number(v) > 0).map(([k, v]) => ({ detalleId: Number(k), cantidad: Number(v) }));
    if (lineas.length === 0) { setError('Indique las cantidades vendidas a liquidar.'); return; }
    ejecutar(async () => {
      const { data } = await http.post(`/api/consignaciones/${id}/liquidaciones`, { lineas });
      setLiq({});
      return data;
    }, (r) => `Liquidación ${r.numero} registrada por ${money(r.total)} a pagar al proveedor.`);
  };

  return (
    <Modal titulo={c ? `Consignación ${c.numero}` : 'Consignación'} ancho="max-w-4xl" onCerrar={onCerrar}>
      {det.loading && !c && <Spinner />}
      <Alert>{det.error}</Alert>
      <Alert>{error}</Alert>
      <Alert tipo="ok">{ok}</Alert>
      {c && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
            <Badge tono={tonoEstado(c.estado)}>{c.estado}</Badge>
            <span>Proveedor: <strong>{c.proveedor}</strong></span>
            <span className="text-slate-500">{fechaSolo(c.fecha)}</span>
          </div>
          <div className="overflow-x-auto">
            <table className={T.tabla}>
              <thead><tr>
                <th className={T.th}>Artículo</th><th className={T.thR}>Recibida</th><th className={T.thR}>Vendida</th>
                <th className={T.thR}>Devuelta</th><th className={T.thR}>Pendiente</th><th className={T.thR}>Costo</th>
                {c.estado === 'ABIERTA' && <><th className={T.thR}>Liquidar</th><th className={T.thR}>Devolver</th></>}
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {c.detalles.map((d) => (
                  <tr key={d.id}>
                    <td className={T.td}>{d.codigo} · {d.articulo}</td>
                    <td className={T.tdR}>{num(d.cantidadRecibida)}</td>
                    <td className={T.tdR}>{num(d.cantidadVendida)}</td>
                    <td className={T.tdR}>{num(d.cantidadDevuelta)}</td>
                    <td className={T.tdR}>{num(d.pendiente)}</td>
                    <td className={T.tdR}>{money(d.costoUnitario)}</td>
                    {c.estado === 'ABIERTA' && (
                      <>
                        <td className={T.tdR}>
                          <input type="number" min="0" max={d.pendiente} step="any" className="w-20 rounded border border-slate-300 px-2 py-1 text-right"
                            value={liq[d.id] ?? ''} onChange={(e) => setLiq({ ...liq, [d.id]: e.target.value })} />
                        </td>
                        <td className={T.tdR}>
                          <div className="flex justify-end gap-1">
                            <input type="number" min="0" max={d.pendiente} step="any" className="w-20 rounded border border-slate-300 px-2 py-1 text-right"
                              value={dev[d.id] ?? ''} onChange={(e) => setDev({ ...dev, [d.id]: e.target.value })} />
                            <Button variant="secondary" className="px-2 py-1" disabled={trabajando || !(Number(dev[d.id]) > 0)} onClick={() => devolver(d)}>OK</Button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {c.estado === 'BORRADOR' && <Button disabled={trabajando} onClick={recibir}>Recibir mercadería</Button>}
            {c.estado === 'ABIERTA' && (
              <>
                <Button disabled={trabajando} onClick={liquidar}>Liquidar lo vendido</Button>
                <Button variant="secondary" disabled={trabajando} onClick={cerrar}>Cerrar consignación</Button>
              </>
            )}
          </div>
          {c.estado === 'ABIERTA' && (
            <p className="mt-3 text-xs text-slate-500">
              Liquidar = pagar al proveedor lo que ya se vendió. Devolver = regresarle lo no vendido (sale del inventario).
              Para cerrar, no debe quedar mercadería pendiente.
            </p>
          )}
        </>
      )}
    </Modal>
  );
}

export default function ConsignacionesPage() {
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [nueva, setNueva] = useState(false);
  const [detalleId, setDetalleId] = useState(null);

  const lista = useFetch(
    () => http.get('/api/consignaciones', { params: { estado: estado || undefined, page, pageSize: PAGE_SIZE } }).then((r) => r.data),
    [estado, page],
  );

  return (
    <>
      <PageHeader
        titulo="Consignaciones"
        descripcion="Mercadería que los proveedores dejan en consignación: recepción, liquidación y devolución."
        acciones={<Button onClick={() => setNueva(true)}>Nueva consignación</Button>}
      />
      <Card>
        <div className="mb-4 w-56">
          <Campo label="Estado">
            <Select value={estado} onChange={(e) => { setPage(1); setEstado(e.target.value); }}>
              <option value="">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="ABIERTA">Abierta</option>
              <option value="CERRADA">Cerrada</option>
            </Select>
          </Campo>
        </div>
        <Alert>{lista.error}</Alert>
        {lista.loading ? <Spinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className={T.tabla}>
                <thead><tr>
                  <th className={T.th}>Número</th><th className={T.th}>Proveedor</th><th className={T.th}>Fecha</th>
                  <th className={T.thR}>Líneas</th><th className={T.th}>Estado</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lista.data?.items.map((c) => (
                    <tr key={c.id} className={T.filaClic} onClick={() => setDetalleId(c.id)}>
                      <td className={T.td}>{c.numero}</td><td className={T.td}>{c.proveedor}</td>
                      <td className={T.td}>{fechaSolo(c.fecha)}</td><td className={T.tdR}>{c.lineas}</td>
                      <td className={T.td}><Badge tono={tonoEstado(c.estado)}>{c.estado}</Badge></td>
                    </tr>
                  ))}
                  {lista.data?.items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No hay consignaciones.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={lista.data?.total ?? 0} onChange={setPage} />
          </>
        )}
      </Card>
      {nueva && <NuevaConsignacion onCerrar={() => setNueva(false)} onGuardado={() => { setNueva(false); lista.reload(); }} />}
      {detalleId && <ConsignacionDetalle id={detalleId} onCerrar={() => setDetalleId(null)} onCambio={lista.reload} />}
    </>
  );
}
