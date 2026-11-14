import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import Badge, { tonoEstado } from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Select } from '../../components/Field.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { fechaHora, money } from '../../utils/format.js';

const PAGE_SIZE = 25;

export default function VentasPage() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);

  const lista = useFetch(
    () => http.get('/api/ventas', { params: { estado: estado || undefined, page, pageSize: PAGE_SIZE } }).then((r) => r.data),
    [estado, page],
  );

  return (
    <>
      <PageHeader
        titulo="Facturación"
        descripcion="Ventas, pagos y anulaciones."
        acciones={<Button onClick={() => navigate('/ventas/nueva')}>Nueva venta</Button>}
      />
      <Card>
        <div className="mb-4 w-56">
          <Campo label="Estado">
            <Select value={estado} onChange={(e) => { setPage(1); setEstado(e.target.value); }}>
              <option value="">Todos</option>
              <option value="BORRADOR">Borrador</option>
              <option value="CONFIRMADA">Confirmada</option>
              <option value="ANULADA">Anulada</option>
            </Select>
          </Campo>
        </div>

        <Alert>{lista.error}</Alert>
        {lista.loading ? <Spinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className={T.tabla}>
                <thead><tr>
                  <th className={T.th}>Número</th><th className={T.th}>Fecha</th><th className={T.th}>Cliente</th>
                  <th className={T.th}>Estado</th><th className={T.thR}>Total</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lista.data?.items.map((v) => (
                    <tr key={v.id} className={T.filaClic} onClick={() => navigate(`/ventas/${v.id}`)}>
                      <td className={T.td}>{v.numero}</td>
                      <td className={T.td}>{fechaHora(v.fecha)}</td>
                      <td className={T.td}>{v.cliente || 'Consumidor final'}</td>
                      <td className={T.td}><Badge tono={tonoEstado(v.estado)}>{v.estado}</Badge></td>
                      <td className={T.tdR}>{money(v.total, v.moneda)}</td>
                    </tr>
                  ))}
                  {lista.data?.items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No hay ventas registradas.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={lista.data?.total ?? 0} onChange={setPage} />
          </>
        )}
      </Card>
    </>
  );
}
