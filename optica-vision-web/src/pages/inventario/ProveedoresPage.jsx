import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Input, Select } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';

function ProveedorForm({ proveedor, onCerrar, onGuardado }) {
  const editando = Boolean(proveedor?.id);
  const [f, setF] = useState({
    codigo: proveedor?.codigo ?? '',
    razonSocial: proveedor?.razonSocial ?? '',
    ruc: proveedor?.ruc ?? '',
    contacto: proveedor?.contacto ?? '',
    telefono: proveedor?.telefono ?? '',
    email: proveedor?.email ?? '',
    direccion: proveedor?.direccion ?? '',
    diasCredito: proveedor?.diasCredito ?? 0,
    activo: proveedor?.activo ?? true,
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const body = { ...f, diasCredito: Number(f.diasCredito || 0) };
      if (editando) await http.put(`/api/proveedores/${proveedor.id}`, body);
      else await http.post('/api/proveedores', body);
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={editando ? 'Editar proveedor' : 'Nuevo proveedor'} ancho="max-w-2xl" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Alert>{error}</Alert></div>
        <Campo label="Código"><Input required disabled={editando} maxLength={20} value={f.codigo} onChange={set('codigo')} /></Campo>
        <Campo label="RUC"><Input value={f.ruc} onChange={set('ruc')} /></Campo>
        <Campo label="Razón social" className="sm:col-span-2"><Input required value={f.razonSocial} onChange={set('razonSocial')} /></Campo>
        <Campo label="Contacto"><Input value={f.contacto} onChange={set('contacto')} /></Campo>
        <Campo label="Teléfono"><Input value={f.telefono} onChange={set('telefono')} /></Campo>
        <Campo label="Correo"><Input type="email" value={f.email} onChange={set('email')} /></Campo>
        <Campo label="Días de crédito"><Input type="number" min="0" value={f.diasCredito} onChange={set('diasCredito')} /></Campo>
        <Campo label="Dirección" className="sm:col-span-2"><Input value={f.direccion} onChange={set('direccion')} /></Campo>
        {editando && (
          <Campo label="Estado">
            <Select value={String(f.activo)} onChange={(e) => setF({ ...f, activo: e.target.value === 'true' })}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </Select>
          </Campo>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function ProveedoresPage() {
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const [form, setForm] = useState(null);
  const lista = useFetch(() => http.get('/api/proveedores', { params: { q: q || undefined } }).then((r) => r.data), [q]);

  return (
    <>
      <PageHeader
        titulo="Proveedores"
        descripcion="Proveedores de mercadería y de consignación."
        acciones={<Button onClick={() => setForm({})}>Nuevo proveedor</Button>}
      />
      <Card>
        <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setQ(texto.trim()); }}>
          <Input placeholder="Buscar por nombre o código…" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <Alert>{lista.error}</Alert>
        {lista.loading ? <Spinner /> : (
          <div className="overflow-x-auto">
            <table className={T.tabla}>
              <thead><tr>
                <th className={T.th}>Código</th><th className={T.th}>Razón social</th><th className={T.th}>Contacto</th>
                <th className={T.th}>Teléfono</th><th className={T.thR}>Crédito (días)</th><th className={T.th}>Estado</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {lista.data?.map((p) => (
                  <tr key={p.id} className={T.filaClic} onClick={() => setForm(p)}>
                    <td className={T.td}>{p.codigo}</td><td className={T.td}>{p.razonSocial}</td>
                    <td className={T.td}>{p.contacto}</td><td className={T.td}>{p.telefono}</td>
                    <td className={T.tdR}>{p.diasCredito}</td>
                    <td className={T.td}><Badge tono={p.activo ? 'verde' : 'gris'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                  </tr>
                ))}
                {lista.data?.length === 0 && <tr><td colSpan={6} className="py-8 text-center text-slate-500">Sin proveedores.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {form && <ProveedorForm proveedor={form} onCerrar={() => setForm(null)} onGuardado={() => { setForm(null); lista.reload(); }} />}
    </>
  );
}
