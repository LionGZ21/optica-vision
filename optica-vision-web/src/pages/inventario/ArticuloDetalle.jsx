import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { GRUPOS } from '../../auth/roles.js';
import Alert from '../../components/Alert.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import { Campo, Input, Select } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { money, num } from '../../utils/format.js';

function Seccion({ titulo, children }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{titulo}</h3>
      {children}
    </section>
  );
}

export default function ArticuloDetalle({ id, catalogos, onCerrar, onEditar, onCambio }) {
  const { hasRole } = useAuth();
  const puedeInventario = hasRole(GRUPOS.inventario);
  const puedePrecios = hasRole(GRUPOS.direccion);

  const det = useFetch(() => http.get(`/api/articulos/${id}`).then((r) => r.data), [id]);
  const provs = useFetch(() => http.get('/api/proveedores', { params: { activo: true } }).then((r) => r.data), []);

  const undBase = catalogos.unidades[0]?.id ?? '';
  const [precio, setPrecio] = useState({ listaPrecioId: '', unidadMedidaId: String(undBase), precio: '' });
  const [costo, setCosto] = useState({ proveedorId: '', unidadMedidaId: String(undBase), precioCosto: '', codigoProveedor: '', esPrincipal: false });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  async function guardarPrecio(e) {
    e.preventDefault();
    setError(''); setOk('');
    try {
      await http.put(`/api/articulos/${id}/precios`, {
        listaPrecioId: Number(precio.listaPrecioId),
        unidadMedidaId: Number(precio.unidadMedidaId),
        precio: Number(precio.precio),
      });
      setOk('Precio de venta guardado (queda registrado en el historial).');
      setPrecio({ ...precio, precio: '' });
      det.reload(); onCambio();
    } catch (err) { setError(mensajeError(err)); }
  }

  async function guardarCosto(e) {
    e.preventDefault();
    setError(''); setOk('');
    try {
      await http.put(`/api/articulos/${id}/proveedores`, {
        proveedorId: Number(costo.proveedorId),
        unidadMedidaId: Number(costo.unidadMedidaId),
        precioCosto: Number(costo.precioCosto),
        codigoProveedor: costo.codigoProveedor || null,
        esPrincipal: costo.esPrincipal,
      });
      setOk('Costo del proveedor guardado (queda registrado en el historial).');
      setCosto({ ...costo, precioCosto: '', codigoProveedor: '' });
      det.reload();
    } catch (err) { setError(mensajeError(err)); }
  }

  const a = det.data?.articulo;

  return (
    <Modal titulo={a ? `${a.codigo} · ${a.nombre}` : 'Artículo'} ancho="max-w-4xl" onCerrar={onCerrar}>
      {det.loading && <Spinner />}
      <Alert>{det.error}</Alert>
      <Alert>{error}</Alert>
      <Alert tipo="ok">{ok}</Alert>

      {a && (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <dl className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
              <div><dt className="inline text-slate-500">Taxonomía: </dt><dd className="inline">{a.taxonomia}</dd></div>
              <div><dt className="inline text-slate-500">Marca: </dt><dd className="inline">{a.marca}</dd></div>
              <div><dt className="inline text-slate-500">Impuesto: </dt><dd className="inline">{a.impuesto} ({a.impuestoPorcentaje}%)</dd></div>
              <div><dt className="inline text-slate-500">Unidad base: </dt><dd className="inline">{a.unidadBase}</dd></div>
              <div><dt className="inline text-slate-500">Uso: </dt><dd className="inline">{a.uso === 'VENTA' ? 'Venta' : 'Consumo interno'}</dd></div>
              <div><dt className="inline text-slate-500">Stock mínimo: </dt><dd className="inline">{num(a.stockMinimo)}</dd></div>
              <div><Badge tono={a.activo ? 'verde' : 'gris'}>{a.activo ? 'Activo' : 'Inactivo'}</Badge></div>
            </dl>
            {puedeInventario && <Button variant="secondary" onClick={() => onEditar(a)}>Editar datos</Button>}
          </div>
          {a.descripcion && <p className="mt-3 text-sm text-slate-600">{a.descripcion}</p>}

          <Seccion titulo="Existencias por bodega">
            {det.data.stock.length === 0 ? <p className="text-sm text-slate-500">Sin movimientos de inventario.</p> : (
              <table className={T.tabla}>
                <thead><tr><th className={T.th}>Bodega</th><th className={T.th}>Tipo</th><th className={T.thR}>Cantidad</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {det.data.stock.map((s) => (
                    <tr key={s.bodegaId}><td className={T.td}>{s.bodega}</td><td className={T.td}>{s.tipoBodega}</td><td className={T.tdR}>{num(s.cantidad)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </Seccion>

          <Seccion titulo="Precios de venta por lista">
            {det.data.precios.length === 0 ? <p className="text-sm text-slate-500">Sin precios definidos: el artículo no se podrá facturar.</p> : (
              <table className={T.tabla}>
                <thead><tr><th className={T.th}>Lista</th><th className={T.th}>Unidad</th><th className={T.thR}>Precio (sin impuesto)</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {det.data.precios.map((p) => (
                    <tr key={p.id}><td className={T.td}>{p.lista}</td><td className={T.td}>{p.unidad}</td><td className={T.tdR}>{money(p.precio)}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {puedePrecios && (
              <form onSubmit={guardarPrecio} className="mt-3 grid items-end gap-3 sm:grid-cols-4">
                <Campo label="Lista">
                  <Select required value={precio.listaPrecioId} onChange={(e) => setPrecio({ ...precio, listaPrecioId: e.target.value })}>
                    <option value="">— Seleccione —</option>
                    {catalogos.listas.filter((l) => l.activa).map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                  </Select>
                </Campo>
                <Campo label="Unidad">
                  <Select value={precio.unidadMedidaId} onChange={(e) => setPrecio({ ...precio, unidadMedidaId: e.target.value })}>
                    {catalogos.unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </Select>
                </Campo>
                <Campo label="Precio"><Input required type="number" min="0" step="0.01" value={precio.precio} onChange={(e) => setPrecio({ ...precio, precio: e.target.value })} /></Campo>
                <Button type="submit">Guardar precio</Button>
              </form>
            )}
          </Seccion>

          <Seccion titulo="Proveedores y costos">
            {det.data.proveedores.length === 0 ? <p className="text-sm text-slate-500">Sin proveedores asignados.</p> : (
              <table className={T.tabla}>
                <thead><tr><th className={T.th}>Proveedor</th><th className={T.th}>Unidad</th><th className={T.th}>Cód. prov.</th><th className={T.thR}>Costo</th><th className={T.th}></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {det.data.proveedores.map((p) => (
                    <tr key={p.id}>
                      <td className={T.td}>{p.proveedor}</td><td className={T.td}>{p.unidad}</td><td className={T.td}>{p.codigoProveedor}</td>
                      <td className={T.tdR}>{money(p.precioCosto, p.moneda)}</td>
                      <td className={T.td}>{p.esPrincipal && <Badge tono="azul">Principal</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {puedeInventario && (
              <form onSubmit={guardarCosto} className="mt-3 grid items-end gap-3 sm:grid-cols-6">
                <Campo label="Proveedor" className="sm:col-span-2">
                  <Select required value={costo.proveedorId} onChange={(e) => setCosto({ ...costo, proveedorId: e.target.value })}>
                    <option value="">— Seleccione —</option>
                    {provs.data?.map((p) => <option key={p.id} value={p.id}>{p.razonSocial}</option>)}
                  </Select>
                </Campo>
                <Campo label="Unidad">
                  <Select value={costo.unidadMedidaId} onChange={(e) => setCosto({ ...costo, unidadMedidaId: e.target.value })}>
                    {catalogos.unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </Select>
                </Campo>
                <Campo label="Costo"><Input required type="number" min="0" step="0.01" value={costo.precioCosto} onChange={(e) => setCosto({ ...costo, precioCosto: e.target.value })} /></Campo>
                <Campo label="Cód. proveedor"><Input value={costo.codigoProveedor} onChange={(e) => setCosto({ ...costo, codigoProveedor: e.target.value })} /></Campo>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={costo.esPrincipal} onChange={(e) => setCosto({ ...costo, esPrincipal: e.target.checked })} /> Principal</label>
                  <Button type="submit">Guardar</Button>
                </div>
              </form>
            )}
          </Seccion>
        </>
      )}
    </Modal>
  );
}
