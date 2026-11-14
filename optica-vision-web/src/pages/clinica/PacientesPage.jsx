import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { GRUPOS } from '../../auth/roles.js';
import Alert from '../../components/Alert.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Input, Select } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Pagination from '../../components/Pagination.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { fechaSolo } from '../../utils/format.js';

const PAGE_SIZE = 25;

function PacienteForm({ paciente, soloLectura, onCerrar, onGuardado }) {
  const editando = Boolean(paciente?.id);
  const [f, setF] = useState({
    documentoIdentidad: paciente?.documentoIdentidad ?? '',
    nombres: paciente?.nombres ?? '',
    apellidos: paciente?.apellidos ?? '',
    fechaNacimiento: paciente?.fechaNacimiento ?? '',
    sexo: paciente?.sexo ?? '',
    telefono: paciente?.telefono ?? '',
    email: paciente?.email ?? '',
    direccion: paciente?.direccion ?? '',
    ocupacion: paciente?.ocupacion ?? '',
    activo: paciente?.activo ?? true,
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const body = {
        ...f,
        sexo: f.sexo || null,
        telefono: f.telefono || null,
        email: f.email || null,
        direccion: f.direccion || null,
        ocupacion: f.ocupacion || null,
      };
      if (editando) await http.put(`/api/pacientes/${paciente.id}`, body);
      else await http.post('/api/pacientes', body);
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={editando ? 'Paciente' : 'Nuevo paciente'} ancho="max-w-2xl" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Alert>{error}</Alert></div>
        <Campo label="Documento de identidad"><Input required disabled={soloLectura} value={f.documentoIdentidad} onChange={set('documentoIdentidad')} /></Campo>
        <Campo label="Fecha de nacimiento"><Input required type="date" disabled={soloLectura} value={f.fechaNacimiento} onChange={set('fechaNacimiento')} /></Campo>
        <Campo label="Nombres"><Input required disabled={soloLectura} value={f.nombres} onChange={set('nombres')} /></Campo>
        <Campo label="Apellidos"><Input required disabled={soloLectura} value={f.apellidos} onChange={set('apellidos')} /></Campo>
        <Campo label="Sexo">
          <Select disabled={soloLectura} value={f.sexo} onChange={set('sexo')}>
            <option value="">—</option><option value="F">Femenino</option><option value="M">Masculino</option><option value="O">Otro</option>
          </Select>
        </Campo>
        <Campo label="Teléfono"><Input disabled={soloLectura} value={f.telefono} onChange={set('telefono')} /></Campo>
        <Campo label="Correo"><Input type="email" disabled={soloLectura} value={f.email} onChange={set('email')} /></Campo>
        <Campo label="Ocupación"><Input disabled={soloLectura} value={f.ocupacion} onChange={set('ocupacion')} /></Campo>
        <Campo label="Dirección" className="sm:col-span-2"><Input disabled={soloLectura} value={f.direccion} onChange={set('direccion')} /></Campo>
        {editando && !soloLectura && (
          <Campo label="Estado">
            <Select value={String(f.activo)} onChange={(e) => setF({ ...f, activo: e.target.value === 'true' })}>
              <option value="true">Activo</option><option value="false">Inactivo</option>
            </Select>
          </Campo>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button variant="secondary" onClick={onCerrar}>{soloLectura ? 'Cerrar' : 'Cancelar'}</Button>
          {!soloLectura && <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>}
        </div>
      </form>
    </Modal>
  );
}

export default function PacientesPage() {
  const { hasRole } = useAuth();
  const puedeEditar = hasRole(GRUPOS.agenda);

  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);

  const lista = useFetch(
    () => http.get('/api/pacientes', { params: { q: q || undefined, page, pageSize: PAGE_SIZE } }).then((r) => r.data),
    [q, page],
  );

  return (
    <>
      <PageHeader
        titulo="Pacientes"
        descripcion="Registro de pacientes. Al crear uno se genera su expediente clínico."
        acciones={puedeEditar && <Button onClick={() => setForm({})}>Nuevo paciente</Button>}
      />
      <Card>
        <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(texto.trim()); }}>
          <Input placeholder="Buscar por nombre o documento…" value={texto} onChange={(e) => setTexto(e.target.value)} />
          <Button type="submit" variant="secondary">Buscar</Button>
        </form>
        <Alert>{lista.error}</Alert>
        {lista.loading ? <Spinner /> : (
          <>
            <div className="overflow-x-auto">
              <table className={T.tabla}>
                <thead><tr>
                  <th className={T.th}>Documento</th><th className={T.th}>Paciente</th><th className={T.th}>Nacimiento</th>
                  <th className={T.th}>Teléfono</th><th className={T.th}>Estado</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {lista.data?.items.map((p) => (
                    <tr key={p.id} className={T.filaClic} onClick={() => setForm(p)}>
                      <td className={T.td}>{p.documentoIdentidad}</td>
                      <td className={T.td}>{p.apellidos}, {p.nombres}</td>
                      <td className={T.td}>{fechaSolo(p.fechaNacimiento)}</td>
                      <td className={T.td}>{p.telefono}</td>
                      <td className={T.td}><Badge tono={p.activo ? 'verde' : 'gris'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                    </tr>
                  ))}
                  {lista.data?.items.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500">No hay pacientes con ese criterio.</td></tr>}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageSize={PAGE_SIZE} total={lista.data?.total ?? 0} onChange={setPage} />
          </>
        )}
      </Card>
      {form && (
        <PacienteForm
          paciente={form}
          soloLectura={!puedeEditar}
          onCerrar={() => setForm(null)}
          onGuardado={() => { setForm(null); lista.reload(); }}
        />
      )}
    </>
  );
}
