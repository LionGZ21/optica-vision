import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { http, mensajeError } from '../../api/http.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { GRUPOS } from '../../auth/roles.js';
import Alert from '../../components/Alert.jsx';
import Badge, { tonoEstado } from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Input, Select } from '../../components/Field.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { fechaHora, money, num, r2 } from '../../utils/format.js';

const METODOS = [['EFECTIVO', 'Efectivo'], ['TARJETA', 'Tarjeta'], ['TRANSFERENCIA', 'Transferencia'], ['CHEQUE', 'Cheque'], ['OTRO', 'Otro']];

export default function VentaDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { hasRole } = useAuth();

  const det = useFetch(() => http.get(`/api/ventas/${id}`).then((r) => r.data), [id]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [pago, setPago] = useState({ metodo: 'EFECTIVO', monto: '', referencia: '' });

  const v = det.data;
  const pagado = v ? r2(v.pagos.reduce((s, p) => s + Number(p.monto), 0)) : 0;
  const saldo = v ? r2(v.total - pagado) : 0;
  const puedeAnular = v && (v.estado === 'BORRADOR' || (v.estado === 'CONFIRMADA' && hasRole(GRUPOS.direccion)));

  async function accion(fn, mensajeOk) {
    setError(''); setOk(''); setTrabajando(true);
    try {
      await fn();
      setOk(mensajeOk);
      det.reload();
    } catch (e) {
      setError(mensajeError(e));
    } finally {
      setTrabajando(false);
    }
  }

  const confirmar = () => accion(() => http.post(`/api/ventas/${id}/confirmar`), 'Venta confirmada: el inventario fue descontado.');

  const anular = () => {
    if (!window.confirm('¿Anular esta venta? Si estaba confirmada, el stock volverá al inventario.')) return;
    accion(() => http.post(`/api/ventas/${id}/anular`), 'Venta anulada.');
  };

  const registrarPago = (e) => {
    e.preventDefault();
    accion(async () => {
      await http.post(`/api/ventas/${id}/pagos`, {
        metodo: pago.metodo, monto: Number(pago.monto), referencia: pago.referencia || null,
      });
      setPago({ metodo: 'EFECTIVO', monto: '', referencia: '' });
    }, 'Pago registrado.');
  };

  if (det.loading && !v) return <Spinner />;

  return (
    <>
      <PageHeader
        titulo={v ? `Venta ${v.numero}` : 'Venta'}
        descripcion={v ? fechaHora(v.fecha) : ''}
        acciones={<Button variant="secondary" onClick={() => navigate('/ventas')}>Volver al listado</Button>}
      />
      <Alert>{det.error}</Alert>
      <Alert tipo="aviso">{location.state?.aviso}</Alert>
      <Alert>{error}</Alert>
      <Alert tipo="ok">{ok}</Alert>

      {v && (
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="space-y-6 xl:col-span-2">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-brand-900">Detalle</h2>
                <Badge tono={tonoEstado(v.estado)}>{v.estado}</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className={T.tabla}>
                  <thead><tr>
                    <th className={T.th}>Artículo</th><th className={T.thR}>Cant.</th><th className={T.thR}>Precio</th>
                    <th className={T.thR}>Desc.</th><th className={T.thR}>Impuesto</th><th className={T.thR}>Total</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {v.detalles.map((d) => (
                      <tr key={d.id} className={T.fila}>
                        <td className={T.td}>{d.codigo} · {d.articulo}</td>
                        <td className={T.tdR}>{num(d.cantidad)}</td>
                        <td className={T.tdR}>{money(d.precioUnitario, v.moneda)}</td>
                        <td className={T.tdR}>{money(d.descuento, v.moneda)}</td>
                        <td className={T.tdR}>{money(d.impuesto, v.moneda)} <span className="text-xs text-slate-400">({d.porcentajeImpuesto}%)</span></td>
                        <td className={T.tdR}>{money(d.total, v.moneda)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <h2 className="mb-3 font-semibold text-brand-900">Pagos</h2>
              {v.pagos.length === 0 ? <p className="text-sm text-slate-500">Aún no hay pagos registrados.</p> : (
                <table className={T.tabla}>
                  <thead><tr><th className={T.th}>Fecha</th><th className={T.th}>Método</th><th className={T.th}>Referencia</th><th className={T.thR}>Monto</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {v.pagos.map((p) => (
                      <tr key={p.id}><td className={T.td}>{fechaHora(p.fecha)}</td><td className={T.td}>{p.metodo}</td><td className={T.td}>{p.referencia}</td><td className={T.tdR}>{money(p.monto, v.moneda)}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}

              {v.estado !== 'ANULADA' && saldo > 0 && (
                <form onSubmit={registrarPago} className="mt-4 grid items-end gap-3 sm:grid-cols-4">
                  <Campo label="Método">
                    <Select value={pago.metodo} onChange={(e) => setPago({ ...pago, metodo: e.target.value })}>
                      {METODOS.map(([k, t]) => <option key={k} value={k}>{t}</option>)}
                    </Select>
                  </Campo>
                  <Campo label={`Monto (saldo ${money(saldo, v.moneda)})`}>
                    <Input required type="number" min="0.01" step="0.01" max={saldo} value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} />
                  </Campo>
                  <Campo label="Referencia"><Input value={pago.referencia} onChange={(e) => setPago({ ...pago, referencia: e.target.value })} /></Campo>
                  <Button type="submit" disabled={trabajando}>Registrar pago</Button>
                </form>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <h2 className="mb-2 font-semibold text-brand-900">Cliente</h2>
              <p className="text-sm text-slate-700">{v.clienteNombre || (v.pacienteId ? `Paciente #${v.pacienteId}` : 'Consumidor final')}</p>
              {v.clienteIdentificacion && <p className="text-sm text-slate-500">{v.clienteIdentificacion}</p>}
              {v.observaciones && <p className="mt-2 text-sm text-slate-500">{v.observaciones}</p>}
            </Card>

            <Card>
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="tabular-nums">{money(v.subtotal, v.moneda)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Descuentos</dt><dd className="tabular-nums">{money(v.descuento, v.moneda)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Impuesto</dt><dd className="tabular-nums">{money(v.impuesto, v.moneda)}</dd></div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-brand-900"><dt>Total</dt><dd className="tabular-nums">{money(v.total, v.moneda)}</dd></div>
                <div className="flex justify-between pt-1"><dt className="text-slate-500">Pagado</dt><dd className="tabular-nums">{money(pagado, v.moneda)}</dd></div>
                <div className="flex justify-between"><dt className="text-slate-500">Saldo</dt><dd className={`tabular-nums font-medium ${saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{money(saldo, v.moneda)}</dd></div>
              </dl>
              <div className="mt-4 grid gap-2">
                {v.estado === 'BORRADOR' && <Button disabled={trabajando} onClick={confirmar}>Confirmar venta</Button>}
                {puedeAnular && <Button variant="secondary" disabled={trabajando} onClick={anular}>Anular venta</Button>}
                <Link to="/ventas/nueva" className="text-center text-sm font-medium text-brand-700 hover:underline">Registrar otra venta</Link>
              </div>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
