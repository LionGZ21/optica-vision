import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import { Campo, Input, Select } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';

const VACIO = { nombres: '', apellidos: '', tipo: 'OPTOMETRA', numeroColegiado: '', telefono: '', email: '' };

/** Alta y activación de profesionales (oftalmólogos y optómetras). Solo Administrador y Gerente. */
export default function ProfesionalesModal({ onCerrar, onCambio }) {
  const lista = useFetch(() => http.get('/api/profesionales').then((r) => r.data), []);
  const [f, setF] = useState(VACIO);
  const [error, setError] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function crear(e) {
    e.preventDefault();
    setError('');
    try {
      await http.post('/api/profesionales', {
        ...f,
        numeroColegiado: f.numeroColegiado || null,
        telefono: f.telefono || null,
        email: f.email || null,
        usuarioId: null,
      });
      setF(VACIO);
      lista.reload();
      onCambio();
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  async function alternar(p) {
    setError('');
    try {
      await http.put(`/api/profesionales/${p.id}`, {
        nombres: p.nombres, apellidos: p.apellidos, tipo: p.tipo, numeroColegiado: p.numeroColegiado,
        telefono: p.telefono, email: p.email, usuarioId: p.usuarioId, activo: !p.activo,
      });
      lista.reload();
      onCambio();
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  return (
    <Modal titulo="Profesionales" ancho="max-w-3xl" onCerrar={onCerrar}>
      <Alert>{error}</Alert>
      {lista.loading ? <Spinner /> : (
        <table className={T.tabla}>
          <thead><tr><th className={T.th}>Nombre</th><th className={T.th}>Tipo</th><th className={T.th}>Colegiado</th><th className={T.th}>Estado</th><th className={T.th}></th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {lista.data?.map((p) => (
              <tr key={p.id}>
                <td className={T.td}>{p.nombres} {p.apellidos}</td>
                <td className={T.td}>{p.tipo === 'OFTALMOLOGO' ? 'Oftalmólogo' : 'Optómetra'}</td>
                <td className={T.td}>{p.numeroColegiado}</td>
                <td className={T.td}><Badge tono={p.activo ? 'verde' : 'gris'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge></td>
                <td className={T.td}><button type="button" className="text-xs font-medium text-brand-700 hover:underline" onClick={() => alternar(p)}>{p.activo ? 'Desactivar' : 'Activar'}</button></td>
              </tr>
            ))}
            {lista.data?.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-slate-500">Aún no hay profesionales. Agregue el primero abajo.</td></tr>}
          </tbody>
        </table>
      )}

      <form onSubmit={crear} className="mt-6 grid gap-3 border-t border-slate-200 pt-4 sm:grid-cols-3">
        <h3 className="text-sm font-semibold text-slate-600 sm:col-span-3">Nuevo profesional</h3>
        <Campo label="Nombres"><Input required value={f.nombres} onChange={set('nombres')} /></Campo>
        <Campo label="Apellidos"><Input required value={f.apellidos} onChange={set('apellidos')} /></Campo>
        <Campo label="Tipo">
          <Select value={f.tipo} onChange={set('tipo')}>
            <option value="OPTOMETRA">Optómetra</option><option value="OFTALMOLOGO">Oftalmólogo</option>
          </Select>
        </Campo>
        <Campo label="N.º de colegiado"><Input value={f.numeroColegiado} onChange={set('numeroColegiado')} /></Campo>
        <Campo label="Teléfono"><Input value={f.telefono} onChange={set('telefono')} /></Campo>
        <Campo label="Correo"><Input type="email" value={f.email} onChange={set('email')} /></Campo>
        <div className="sm:col-span-3 flex justify-end"><Button type="submit">Agregar profesional</Button></div>
      </form>
    </Modal>
  );
}
