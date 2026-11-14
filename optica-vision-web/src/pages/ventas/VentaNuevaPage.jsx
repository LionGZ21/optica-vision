import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import ArticuloPicker from '../../components/ArticuloPicker.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Input, Select, Textarea } from '../../components/Field.jsx';
import PacientePicker from '../../components/PacientePicker.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { money, r2 } from '../../utils/format.js';

/** Calcula una línea con la lista de precios elegida (vista previa; el servidor recalcula al guardar). */
function calcular(l, listaId) {
  const disp = l.precios.filter((p) => String(p.listaPrecioId) === String(listaId));
  const sel = disp.find((p) => p.unidadMedidaId === Number(l.unidadMedidaId)) ?? disp[0];
  const cant = Number(l.cantidad) || 0;
  const desc = Number(l.descuento) || 0;
  const precio = sel ? Number(sel.precio) : 0;
  const bruto = r2(cant * precio);
  const subtotal = r2(bruto - desc);
  const impuesto = r2((subtotal * l.impuestoPct) / 100);
  return {
    disp, sel, precio, subtotal, impuesto,
    total: r2(subtotal + impuesto),
    valida: Boolean(sel) && cant > 0 && desc >= 0 && desc <= bruto,
  };
}

export default function VentaNuevaPage() {
  const navigate = useNavigate();
  const base = useFetch(async () => {
    const [b, l] = await Promise.all([
      http.get('/api/bodegas', { params: { tipo: 'VENTA', activa: true } }),
      http.get('/api/catalogos/listas-precio'),
    ]);
    return { bodegas: b.data, listas: l.data.filter((x) => x.activa) };
  }, []);

  const [bodegaId, setBodegaId] = useState('');
  const [listaId, setListaId] = useState('');
  const [paciente, setPaciente] = useState(null);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [obs, setObs] = useState('');
  const [lineas, setLineas] = useState([]);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!base.data) return;
    setBodegaId((p) => p || String(base.data.bodegas[0]?.id ?? ''));
    setListaId((p) => p || String((base.data.listas.find((l) => l.esPredeterminada) ?? base.data.listas[0])?.id ?? ''));
  }, [base.data]);

  async function agregar(a) {
    setError('');
    try {
      const { data } = await http.get(`/api/articulos/${a.id}`);
      setLineas((ls) => [...ls, {
        key: `${a.id}-${Date.now()}-${Math.random()}`,
        articuloId: a.id,
        codigo: data.articulo.codigo,
        nombre: data.articulo.nombre,
        impuestoPct: Number(data.articulo.impuestoPorcentaje),
        precios: data.precios.filter((p) => p.activo),
        unidadMedidaId: data.articulo.unidadBaseId,
        cantidad: 1,
        descuento: 0,
      }]);
    } catch (e) {
      setError(mensajeError(e));
    }
  }

  const cambiar = (key, campo, valor) =>
    setLineas((ls) => ls.map((l) => (l.key === key ? { ...l, [campo]: valor } : l)));
  const quitar = (key) => setLineas((ls) => ls.filter((l) => l.key !== key));

  const calc = lineas.map((l) => ({ l, c: calcular(l, listaId) }));
  const subtotal = r2(calc.reduce((s, x) => s + x.c.subtotal, 0));
  const impuesto = r2(calc.reduce((s, x) => s + x.c.impuesto, 0));
  const total = r2(subtotal + impuesto);
  const moneda = base.data?.listas.find((l) => String(l.id) === String(listaId))?.moneda ?? 'NIO';

  async function guardar(confirmar) {
    setError('');
    if (!bodegaId) { setError('Seleccione la bodega de venta.'); return; }
    if (calc.length === 0) { setError('Agregue al menos un artículo.'); return; }
    const mala = calc.find((x) => !x.c.valida);
    if (mala) { setError(`Revise la línea de ${mala.l.codigo}: sin precio en la lista elegida, cantidad o descuento inválidos.`); return; }

    const bodega = base.data.bodegas.find((b) => String(b.id) === String(bodegaId));
    setGuardando(true);
    let ventaId = null;
    try {
      const { data } = await http.post('/api/ventas', {
        sucursalId: bodega.sucursalId,
        bodegaId: bodega.id,
        pacienteId: paciente?.id ?? null,
        clienteNombre: paciente ? null : clienteNombre || null,
        clienteIdentificacion: paciente ? null : clienteId || null,
        listaPrecioId: Number(listaId),
        observaciones: obs || null,
        lineas: calc.map((x) => ({
          articuloId: x.l.articuloId,
          unidadMedidaId: x.c.sel.unidadMedidaId,
          cantidad: Number(x.l.cantidad),
          descuento: Number(x.l.descuento) || 0,
        })),
      });
      ventaId = data.id;
      if (confirmar) await http.post(`/api/ventas/${ventaId}/confirmar`);
      navigate(`/ventas/${ventaId}`);
    } catch (e) {
      if (ventaId) {
        // La venta se guardó pero no pudo confirmarse (p. ej. stock insuficiente)
        navigate(`/ventas/${ventaId}`, { state: { aviso: `La venta quedó en borrador. No se pudo confirmar: ${mensajeError(e)}` } });
      } else {
        setError(mensajeError(e));
        setGuardando(false);
      }
    }
  }

  if (base.loading) return <Spinner />;

  return (
    <>
      <PageHeader titulo="Nueva venta" descripcion="Los precios e impuestos los define el sistema según la lista de precios." />
      <Alert>{base.error}</Alert>
      <Alert>{error}</Alert>
      {base.data?.bodegas.length === 0 && <Alert tipo="aviso">No hay bodegas de venta activas. Cree una desde la API o la base de datos.</Alert>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <h2 className="mb-3 font-semibold text-brand-900">Artículos</h2>
            <ArticuloPicker soloVenta onSelect={agregar} />
            <div className="mt-4 overflow-x-auto">
              <table className={T.tabla}>
                <thead><tr>
                  <th className={T.th}>Artículo</th><th className={T.th}>Unidad</th><th className={T.thR}>Cant.</th>
                  <th className={T.thR}>Precio</th><th className={T.thR}>Desc.</th><th className={T.thR}>Total</th><th className={T.th}></th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {calc.map(({ l, c }) => (
                    <tr key={l.key} className={T.fila}>
                      <td className={T.td}>
                        <span className="font-medium">{l.codigo}</span> · {l.nombre}
                        {!c.sel && <span className="block text-xs text-red-600">Sin precio en esta lista</span>}
                      </td>
                      <td className={T.td}>
                        <select
                          className="rounded border border-slate-300 px-2 py-1 text-sm"
                          value={c.sel?.unidadMedidaId ?? ''}
                          onChange={(e) => cambiar(l.key, 'unidadMedidaId', Number(e.target.value))}
                        >
                          {c.disp.map((p) => <option key={p.unidadMedidaId} value={p.unidadMedidaId}>{p.unidad}</option>)}
                        </select>
                      </td>
                      <td className={T.tdR}>
                        <input type="number" min="0" step="any" className="w-20 rounded border border-slate-300 px-2 py-1 text-right"
                          value={l.cantidad} onChange={(e) => cambiar(l.key, 'cantidad', e.target.value)} />
                      </td>
                      <td className={T.tdR}>{money(c.precio, moneda)}</td>
                      <td className={T.tdR}>
                        <input type="number" min="0" step="0.01" className="w-24 rounded border border-slate-300 px-2 py-1 text-right"
                          value={l.descuento} onChange={(e) => cambiar(l.key, 'descuento', e.target.value)} />
                      </td>
                      <td className={T.tdR}>{money(c.total, moneda)}</td>
                      <td className={T.td}>
                        <button type="button" className="text-slate-400 hover:text-red-600" onClick={() => quitar(l.key)} aria-label="Quitar línea">×</button>
                      </td>
                    </tr>
                  ))}
                  {calc.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-500">Busque y agregue artículos a la venta.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="font-semibold text-brand-900">Datos de la venta</h2>
            <Campo label="Bodega de venta">
              <Select value={bodegaId} onChange={(e) => setBodegaId(e.target.value)}>
                {base.data?.bodegas.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </Select>
            </Campo>
            <Campo label="Lista de precios">
              <Select value={listaId} onChange={(e) => setListaId(e.target.value)}>
                {base.data?.listas.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </Select>
            </Campo>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Paciente (opcional)</span>
              <PacientePicker valor={paciente} onSelect={setPaciente} />
            </div>
            {!paciente && (
              <>
                <Campo label="Nombre del cliente"><Input value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} placeholder="Consumidor final" /></Campo>
                <Campo label="Identificación"><Input value={clienteId} onChange={(e) => setClienteId(e.target.value)} /></Campo>
              </>
            )}
            <Campo label="Observaciones"><Textarea value={obs} onChange={(e) => setObs(e.target.value)} /></Campo>
          </Card>

          <Card>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Subtotal</dt><dd className="tabular-nums">{money(subtotal, moneda)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Impuesto</dt><dd className="tabular-nums">{money(impuesto, moneda)}</dd></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold text-brand-900">
                <dt>Total</dt><dd className="tabular-nums">{money(total, moneda)}</dd>
              </div>
            </dl>
            <div className="mt-4 grid gap-2">
              <Button disabled={guardando} onClick={() => guardar(true)}>Guardar y confirmar</Button>
              <Button variant="secondary" disabled={guardando} onClick={() => guardar(false)}>Guardar como borrador</Button>
            </div>
            <p className="mt-3 text-xs text-slate-500">Al confirmar se descuenta el inventario. Si no hay existencias suficientes, la venta queda en borrador.</p>
          </Card>
        </div>
      </div>
    </>
  );
}
