import { useState } from 'react';
import { http } from '../../api/http.js';
import { cargarCatalogos } from '../../api/catalogos.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { GRUPOS } from '../../auth/roles.js';
import Alert from '../../components/Alert.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Input, Select } from '../../components/Field.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { num } from '../../utils/format.js';
import ArticuloDetalle from './ArticuloDetalle.jsx';
import ArticuloForm from './ArticuloForm.jsx';

const PAGE_SIZE = 25;

export default function ArticulosPage() {
  const { hasRole } = useAuth();
  const puedeCrear = hasRole(GRUPOS.inventario);

  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const [activo, setActivo] = useState('true');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);       // null | {} (nuevo) | artículo (editar)
  const [detalleId, setDetalleId] = useState(null);

  const cat = useFetch(() => cargarCatalogos(), []);
  const lista = useFetch(
    () => http.get('/api/articulos', {
      params: { q: q || undefined, activo: activo === '' ? undefined : activo === 'true', page, pageSize: PAGE_SIZE },
    }).then((r) => r.data),
    [q, activo, page],
  );

  function buscar(e) {
    e.preventDefault();
    setPage(1);
    setQ(texto.trim());
  }

  return (
    <>
      <PageHeader
        titulo="Artículos"
        descripcion="Catálogo de artículos con taxonomía, proveedores y precios."
        acciones={puedeCrear && cat.data && <Button onClick={() => setForm({})}>Nuevo artículo</Button>}
      />

      <Card>
        <form onSubmit={buscar} className="mb-4 flex flex-wrap gap-2">
          <div className="min-w-60 flex-1"><Input placeholder="Buscar por código o nombre…" value={texto} onChange={(e) => setTexto(e.target.value)} /></div>
          <div className="w-40">
            <Select value={activo} onChange={(e) => { setPage(1); setActivo(e.target.value); }}>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
              <option value="">Todos</option>
            </Select>
          </div>
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>

        <Alert>{lista.error || cat.error}</Alert>
        {lista.loading ? <Spinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className={T.tabla}>
                <thead><tr>
                  <th className={T.th}>Código</th><th className={T.th}>Nombre</th><th className={T.th}>Marca</th>
                  <th className={T.th}>Subfamilia</th><th className={T.thR}>Stock</th><th className={T.th}>Estado</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lista.data?.items.map((a) => (
                    <tr key={a.id} className={T.filaClic} onClick={() => setDetalleId(a.id)}>
                      <td className={T.td}>{a.codigo}</td>
                      <td className={T.td}>
                        {a.nombre}
                        {a.uso === 'CONSUMO_INTERNO' && <span className="ml-2"><Badge tono="ambar">Consumo interno</Badge></span>}
                      </td>
                      <td className={T.td}>{a.marca}</td>
                      <td className={T.td}>{a.subfamilia}</td>
                      <td className={T.tdR}>
                        <span className={a.stockMinimo > 0 && a.stockTotal < a.stockMinimo ? 'font-semibold text-red-600' : ''}>{num(a.stockTotal)}</span>
                      </td>
                      <td className={T.td}><Badge tono={a.activo ? 'verde' : 'gris'}>{a.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                    </tr>
                  ))}
                  {lista.data?.items.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">No hay artículos con ese criterio.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={lista.data?.total ?? 0} onChange={setPage} />
          </>
        )}
      </Card>

      {detalleId && cat.data && (
        <ArticuloDetalle
          id={detalleId}
          catalogos={cat.data}
          onCerrar={() => setDetalleId(null)}
          onCambio={lista.reload}
          onEditar={(art) => { setDetalleId(null); setForm(art); }}
        />
      )}
      {form && cat.data && (
        <ArticuloForm
          articulo={form}
          catalogos={cat.data}
          onCerrar={() => setForm(null)}
          onGuardado={() => { setForm(null); lista.reload(); }}
        />
      )}
    </>
  );
}
