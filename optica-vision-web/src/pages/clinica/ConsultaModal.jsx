import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import Button from '../../components/Button.jsx';
import { Campo, Input, Select, Textarea } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import useFetch from '../../hooks/useFetch.js';
import { aNumero } from '../../utils/format.js';

export default function ConsultaModal({ expedienteId, onCerrar, onGuardado }) {
  const profs = useFetch(() => http.get('/api/profesionales', { params: { activo: true } }).then((r) => r.data), []);
  const [f, setF] = useState({
    profesionalId: '', motivoConsulta: '', anamnesis: '',
    avScOd: '', avScOi: '', avCcOd: '', avCcOi: '', pioOd: '', pioOi: '',
    biomicroscopia: '', fondoDeOjo: '', diagnostico: '', codigoCie10: '', planTratamiento: '',
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const texto = (v) => (v === '' ? null : v);

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      await http.post(`/api/expedientes/${expedienteId}/consultas`, {
        profesionalId: aNumero(f.profesionalId),
        citaId: null,
        motivoConsulta: texto(f.motivoConsulta), anamnesis: texto(f.anamnesis),
        avScOd: texto(f.avScOd), avScOi: texto(f.avScOi), avCcOd: texto(f.avCcOd), avCcOi: texto(f.avCcOi),
        pioOd: aNumero(f.pioOd), pioOi: aNumero(f.pioOi),
        biomicroscopia: texto(f.biomicroscopia), fondoDeOjo: texto(f.fondoDeOjo),
        diagnostico: texto(f.diagnostico), codigoCie10: texto(f.codigoCie10), planTratamiento: texto(f.planTratamiento),
      });
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nueva consulta" ancho="max-w-3xl" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-4">
        <div className="sm:col-span-4"><Alert>{error}</Alert></div>
        <Campo label="Profesional" className="sm:col-span-4" ayuda="Si su usuario está vinculado a un profesional, puede dejarlo vacío.">
          <Select value={f.profesionalId} onChange={set('profesionalId')}>
            <option value="">— Mi usuario —</option>
            {profs.data?.map((p) => <option key={p.id} value={p.id}>{p.nombres} {p.apellidos}</option>)}
          </Select>
        </Campo>
        <Campo label="Motivo de consulta" className="sm:col-span-4"><Input value={f.motivoConsulta} onChange={set('motivoConsulta')} /></Campo>
        <Campo label="Anamnesis" className="sm:col-span-4"><Textarea value={f.anamnesis} onChange={set('anamnesis')} /></Campo>

        <Campo label="AV s/c OD"><Input value={f.avScOd} onChange={set('avScOd')} placeholder="20/20" /></Campo>
        <Campo label="AV s/c OI"><Input value={f.avScOi} onChange={set('avScOi')} placeholder="20/20" /></Campo>
        <Campo label="AV c/c OD"><Input value={f.avCcOd} onChange={set('avCcOd')} /></Campo>
        <Campo label="AV c/c OI"><Input value={f.avCcOi} onChange={set('avCcOi')} /></Campo>
        <Campo label="PIO OD (mmHg)"><Input type="number" step="0.1" min="0" max="80" value={f.pioOd} onChange={set('pioOd')} /></Campo>
        <Campo label="PIO OI (mmHg)"><Input type="number" step="0.1" min="0" max="80" value={f.pioOi} onChange={set('pioOi')} /></Campo>
        <Campo label="Código CIE-10" className="sm:col-span-2"><Input maxLength={10} value={f.codigoCie10} onChange={set('codigoCie10')} /></Campo>

        <Campo label="Biomicroscopía" className="sm:col-span-2"><Textarea value={f.biomicroscopia} onChange={set('biomicroscopia')} /></Campo>
        <Campo label="Fondo de ojo" className="sm:col-span-2"><Textarea value={f.fondoDeOjo} onChange={set('fondoDeOjo')} /></Campo>
        <Campo label="Diagnóstico" className="sm:col-span-4"><Textarea value={f.diagnostico} onChange={set('diagnostico')} /></Campo>
        <Campo label="Plan de tratamiento" className="sm:col-span-4"><Textarea value={f.planTratamiento} onChange={set('planTratamiento')} /></Campo>

        <div className="flex justify-end gap-2 sm:col-span-4">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar consulta'}</Button>
        </div>
      </form>
    </Modal>
  );
}
