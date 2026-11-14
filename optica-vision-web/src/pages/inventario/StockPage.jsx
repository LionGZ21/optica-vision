import { useState } from 'react';
import { http } from '../../api/http.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { GRUPOS } from '../../auth/roles.js';
import Alert from '../../components/Alert.jsx';
import ArticuloPicker from '../../components/ArticuloPicker.jsx';
import Badge from '../../components/Badge.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Select } from '../../components/Field.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { num } from '../../utils/format.js';

const PAGE_SIZE = 50;

function Existencias() {
  const bodegas = useFetch(() => http.get('/api/bodegas').then((r) => r.data), []);
  const [bodegaId, setBodegaId] = useState('');
  const [articulo, setArticulo] = useState(null);
  const [conExistencia, setConExistencia] = useState(true);
  const [page, setPage] = useState(1);

  const lista = useFetch(
    () => http.get('/api/inventario/stock', {
      params: {
        bodegaId: bodegaId || undefined,
        articuloId: articulo?.id,
        soloConExistencia: conExistencia,
        page,
        pageSize: PAGE_SIZE,
      },
    }).then((r) => r.data),
    [bodegaId, articulo, conExistencia, page],
  );

  return (
    <Card>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Campo label="Bodega">
          <Select value={bodegaId} onChange={(e) => { setPage(1); setBodegaId(e.target.value); }}>
            <option value="">Todas</option>
            {bodegas.data?.map((b) => <option key={b.id} value={b.id}>{b.nombre}{b.tipo === 'TRANSITO' ? ' (tránsito)' : ''}</option>)}
          </Select>
        </Campo>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Artículo</span>
          {articulo ? (
            <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm ring-1 ring-brand-200">
              <span>{articulo.codigo} · {articulo.nombre}</span>
              <button type="button" onClick={() => { setPage(1); setArticulo(null); }} className="text-slate-500 hover:text-slate-800" aria-label="Quitar">×</button>
            </div>
          ) : <ArticuloPicker onSelect={(a) => { setPage(1); setArticulo(a); }} />}
        </div>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={conExistencia} onChange={(e) => { setPage(1); setConExistencia(e.target.checked); }} />
          Solo con existencia
        </label>
      </div>

      <Alert>{lista.error}</Alert>
      {lista.loading ? <Spinner /> : (
        <>
          <div className="overflow-x-auto">
            <table className={T.tabla}>
              <thead><tr>
                <th className={T.th}>Código</th><th className={T.th}>Artículo</th><th className={T.th}>Bodega</th>
                <th className={T.th}>Tipo</th><th className={T.thR}>Cantidad</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {lista.data?.items.map((s) => (
                  <tr key={`${s.bodegaId}-${s.articuloId}`} className={T.fila}>
                    <td className={T.td}>{s.codigo}</td><td className={T.td}>{s.articulo}</td><td className={T.td}>{s.bodega}</td>
                    <td className={T.td}><Badge tono={s.tipoBodega === 'TRANSITO' ? 'ambar' : 'gris'}>{s.tipoBodega}</Badge></td>
                    <td className={T.tdR}>{num(s.cantidad)}</td>
                  </tr>
                ))}
                {lista.data?.items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Sin existencias para ese filtro.</td></tr>}
              </tbody>
            </table>
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={lista.data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </Card>
  );
}

function BajoMinimo() {
  const lista = useFetch(() => http.get('/api/inventario/stock/bajo-minimo').then((r) => r.data), []);
  return (
    <Card>
      <Alert>{lista.error}</Alert>
      {lista.loading ? <Spinner /> : (
        <div className="overflow-x-auto">
          <table className={T.tabla}>
            <thead><tr>
              <th className={T.th}>Código</th><th className={T.th}>Artículo</th>
              <th className={T.thR}>Stock total</th><th className={T.thR}>Mínimo</th><th className={T.thR}>Faltante</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {lista.data?.map((a) => (
                <tr key={a.id} className={T.fila}>
                  <td className={T.td}>{a.codigo}</td><td className={T.td}>{a.nombre}</td>
                  <td className={T.tdR}>{num(a.stockTotal)}</td><td className={T.tdR}>{num(a.stockMinimo)}</td>
                  <td className={`${T.tdR} font-semibold text-red-600`}>{num(a.stockMinimo - a.stockTotal)}</td>
                </tr>
              ))}
              {lista.data?.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">Ningún artículo está por debajo de su mínimo.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function StockPage() {
  const { hasRole } = useAuth();
  const puedeBajoMinimo = hasRole(GRUPOS.inventario);
  const [tab, setTab] = useState('existencias');

  const clase = (t) => `rounded-lg px-4 py-2 text-sm font-medium ${tab === t ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-300 hover:bg-slate-50'}`;

  return (
    <>
      <PageHeader titulo="Stock" descripcion="Existencias por bodega. El stock nunca puede quedar negativo." />
      {puedeBajoMinimo && (
        <div className="mb-4 flex gap-2">
          <button type="button" className={clase('existencias')} onClick={() => setTab('existencias')}>Existencias</button>
          <button type="button" className={clase('bajo')} onClick={() => setTab('bajo')}>Bajo el mínimo</button>
        </div>
      )}
      {tab === 'existencias' || !puedeBajoMinimo ? <Existencias /> : <BajoMinimo />}
    </>
  );
}
