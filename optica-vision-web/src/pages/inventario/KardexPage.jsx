import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import ArticuloPicker from '../../components/ArticuloPicker.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Input, Select, Textarea } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { fechaHora, num } from '../../utils/format.js';

const PAGE_SIZE = 50;
const TIPOS = [
  'ENTRADA', 'SALIDA', 'VENTA', 'DEFECTO', 'DEVOLUCION_CLIENTE', 'DEVOLUCION_PROVEEDOR',
  'TRASLADO_SALIDA', 'TRASLADO_ENTRADA', 'ENTRADA_CONSIGNACION', 'DEVOLUCION_CONSIGNACION',
  'CONSUMO_LABORATORIO', 'AJUSTE',
];
const MANUALES = [
  ['ENTRADA', 'Entrada'], ['SALIDA', 'Salida'], ['DEFECTO', 'Defecto / merma'],
  ['DEVOLUCION_CLIENTE', 'Devolución de cliente'], ['DEVOLUCION_PROVEEDOR', 'Devolución a proveedor'],
  ['AJUSTE', 'Ajuste (con signo + o −)'],
];

function MovimientoModal({ bodegas, onCerrar, onGuardado }) {
  const [articulo, setArticulo] = useState(null);
  const [f, setF] = useState({ bodegaId: '', tipoMovimiento: 'ENTRADA', cantidad: '', costoUnitario: '', observacion: '' });
  const [error, setError] = useState('');
  const [resultado, setResultado] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (!articulo) { setError('Seleccione un artículo.'); return; }
    setGuardando(true);
    try {
      const { data } = await http.post('/api/inventario/movimientos', {
        articuloId: articulo.id,
        bodegaId: Number(f.bodegaId),
        tipoMovimiento: f.tipoMovimiento,
        cantidad: Number(f.cantidad),
        costoUnitario: f.costoUnitario === '' ? null : Number(f.costoUnitario),
        observacion: f.observacion || null,
      });
      setResultado(data);
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Registrar movimiento de inventario" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <Alert>{error}</Alert>
        {resultado && <Alert tipo="ok">Movimiento registrado. Saldo: {num(resultado.saldoAnterior)} → <strong>{num(resultado.saldoNuevo)}</strong></Alert>}

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Artículo</span>
          {articulo ? (
            <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm ring-1 ring-brand-200">
              <span>{articulo.codigo} · {articulo.nombre}</span>
              <button type="button" onClick={() => setArticulo(null)} className="text-slate-500 hover:text-slate-800" aria-label="Quitar">×</button>
            </div>
          ) : <ArticuloPicker onSelect={setArticulo} />}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Bodega">
            <Select required value={f.bodegaId} onChange={set('bodegaId')}>
              <option value="">— Seleccione —</option>
              {bodegas.filter((b) => b.tipo !== 'TRANSITO' && b.activa).map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          </Campo>
          <Campo label="Tipo de movimiento">
            <Select value={f.tipoMovimiento} onChange={set('tipoMovimiento')}>
              {MANUALES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </Select>
          </Campo>
          <Campo label="Cantidad" ayuda={f.tipoMovimiento === 'AJUSTE' ? 'Use negativo para restar.' : 'Siempre positiva.'}>
            <Input required type="number" step="any" value={f.cantidad} onChange={set('cantidad')} />
          </Campo>
          <Campo label="Costo unitario (opcional)">
            <Input type="number" min="0" step="0.01" value={f.costoUnitario} onChange={set('costoUnitario')} />
          </Campo>
        </div>
        <Campo label={f.tipoMovimiento === 'AJUSTE' ? 'Observación (obligatoria)' : 'Observación'}>
          <Textarea required={f.tipoMovimiento === 'AJUSTE'} value={f.observacion} onChange={set('observacion')} />
        </Campo>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cerrar</Button>
          <Button type="submit" disabled={guardando}>{guardando ? 'Registrando…' : 'Registrar'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function KardexPage() {
  const bodegas = useFetch(() => http.get('/api/bodegas').then((r) => r.data), []);
  const [articulo, setArticulo] = useState(null);
  const [bodegaId, setBodegaId] = useState('');
  const [tipo, setTipo] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);

  const lista = useFetch(
    () => http.get('/api/inventario/kardex', {
      params: {
        articuloId: articulo?.id,
        bodegaId: bodegaId || undefined,
        tipo: tipo || undefined,
        desde: desde ? new Date(`${desde}T00:00:00`).toISOString() : undefined,
        hasta: hasta ? new Date(`${hasta}T23:59:59`).toISOString() : undefined,
        page,
        pageSize: PAGE_SIZE,
      },
    }).then((r) => r.data),
    [articulo, bodegaId, tipo, desde, hasta, page],
  );

  const reset = (fn) => (v) => { setPage(1); fn(v); };

  return (
    <>
      <PageHeader
        titulo="Kardex"
        descripcion="Historial inmutable de movimientos de inventario."
        acciones={<Button onClick={() => setModal(true)}>Registrar movimiento</Button>}
      />
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Artículo</span>
            {articulo ? (
              <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm ring-1 ring-brand-200">
                <span className="truncate">{articulo.codigo} · {articulo.nombre}</span>
                <button type="button" onClick={() => reset(setArticulo)(null)} className="ml-2 text-slate-500 hover:text-slate-800" aria-label="Quitar">×</button>
              </div>
            ) : <ArticuloPicker onSelect={reset(setArticulo)} />}
          </div>
          <Campo label="Bodega">
            <Select value={bodegaId} onChange={(e) => reset(setBodegaId)(e.target.value)}>
              <option value="">Todas</option>
              {bodegas.data?.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          </Campo>
          <Campo label="Tipo">
            <Select value={tipo} onChange={(e) => reset(setTipo)(e.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map((t) => <option key={t} value={t}>{t.replaceAll('_', ' ')}</option>)}
            </Select>
          </Campo>
          <div className="grid grid-cols-2 gap-2">
            <Campo label="Desde"><Input type="date" value={desde} onChange={(e) => reset(setDesde)(e.target.value)} /></Campo>
            <Campo label="Hasta"><Input type="date" value={hasta} onChange={(e) => reset(setHasta)(e.target.value)} /></Campo>
          </div>
        </div>

        <Alert>{lista.error}</Alert>
        {lista.loading ? <Spinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className={T.tabla}>
                <thead><tr>
                  <th className={T.th}>Fecha</th><th className={T.th}>Tipo</th><th className={T.th}>Artículo</th><th className={T.th}>Bodega</th>
                  <th className={T.thR}>Cantidad</th><th className={T.thR}>Saldo anterior</th><th className={T.thR}>Saldo nuevo</th><th className={T.th}>Detalle</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lista.data?.items.map((m) => (
                    <tr key={m.id} className={T.fila}>
                      <td className={T.td}>{fechaHora(m.fecha)}</td>
                      <td className={T.td}><Badge tono={m.cantidad > 0 ? 'verde' : 'rojo'}>{m.tipoMovimiento.replaceAll('_', ' ')}</Badge></td>
                      <td className={T.td}>{m.codigo} · {m.articulo}</td>
                      <td className={T.td}>{m.bodega}</td>
                      <td className={`${T.tdR} font-medium ${m.cantidad > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{m.cantidad > 0 ? '+' : ''}{num(m.cantidad)}</td>
                      <td className={T.tdR}>{num(m.saldoAnterior)}</td>
                      <td className={T.tdR}>{num(m.saldoNuevo)}</td>
                      <td className={T.td}>{m.documentoTipo}{m.documentoId ? ` #${m.documentoId}` : ''}{m.observacion ? ` · ${m.observacion}` : ''}</td>
                    </tr>
                  ))}
                  {lista.data?.items.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-500">Sin movimientos para ese filtro.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={lista.data?.total ?? 0} onChange={setPage} />
          </>
        )}
      </Card>

      {modal && bodegas.data && (
        <MovimientoModal bodegas={bodegas.data} onCerrar={() => setModal(false)} onGuardado={lista.reload} />
      )}
    </>
  );
}
