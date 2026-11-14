import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import Badge, { tonoEstado } from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import { Campo, Input, Select } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PacientePicker from '../../components/PacientePicker.jsx';
import { fechaHora, hoyISO, toISODate } from '../../utils/format.js';

const aISO = (fecha, hora) => new Date(`${fecha}T${hora}`).toISOString();
const ESTADOS = [
  ['CONFIRMADA', 'Confirmar'], ['EN_ATENCION', 'En atención'], ['ATENDIDA', 'Atendida'],
  ['NO_ASISTIO', 'No asistió'], ['CANCELADA', 'Cancelar cita'],
];

export function CitaNuevaModal({ fecha, profesionales, sucursales, profesionalId, sucursalId, onCerrar, onGuardado }) {
  const [paciente, setPaciente] = useState(null);
  const [f, setF] = useState({
    profesionalId: profesionalId || '',
    sucursalId: sucursalId || String(sucursales[0]?.id ?? ''),
    fecha: fecha || hoyISO(),
    hora: '09:00',
    duracionMin: 30,
    motivo: '',
  });
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (!paciente) { setError('Seleccione el paciente.'); return; }
    setGuardando(true);
    try {
      await http.post('/api/citas', {
        pacienteId: paciente.id,
        profesionalId: Number(f.profesionalId),
        sucursalId: Number(f.sucursalId),
        inicio: aISO(f.fecha, f.hora),
        duracionMin: Number(f.duracionMin),
        motivo: f.motivo || null,
      });
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nueva cita" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <Alert>{error}</Alert>
        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">Paciente</span>
          <PacientePicker valor={paciente} onSelect={setPaciente} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Campo label="Profesional">
            <Select required value={f.profesionalId} onChange={set('profesionalId')}>
              <option value="">— Seleccione —</option>
              {profesionales.filter((p) => p.activo).map((p) => (
                <option key={p.id} value={p.id}>{p.nombres} {p.apellidos} ({p.tipo === 'OFTALMOLOGO' ? 'Oftalmólogo' : 'Optómetra'})</option>
              ))}
            </Select>
          </Campo>
          <Campo label="Sucursal">
            <Select required value={f.sucursalId} onChange={set('sucursalId')}>
              {sucursales.filter((s) => s.activa).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </Select>
          </Campo>
          <Campo label="Fecha"><Input required type="date" value={f.fecha} onChange={set('fecha')} /></Campo>
          <Campo label="Hora"><Input required type="time" step="300" value={f.hora} onChange={set('hora')} /></Campo>
          <Campo label="Duración (minutos)"><Input required type="number" min="5" max="240" step="5" value={f.duracionMin} onChange={set('duracionMin')} /></Campo>
          <Campo label="Motivo"><Input value={f.motivo} onChange={set('motivo')} /></Campo>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>{guardando ? 'Agendando…' : 'Agendar cita'}</Button>
        </div>
      </form>
    </Modal>
  );
}

export function CitaDetalleModal({ cita, onCerrar, onCambio }) {
  const inicio = new Date(cita.inicio);
  const [fecha, setFecha] = useState(toISODate(inicio));
  const [hora, setHora] = useState(`${String(inicio.getHours()).padStart(2, '0')}:${String(inicio.getMinutes()).padStart(2, '0')}`);
  const [dur, setDur] = useState(Math.round((new Date(cita.fin) - inicio) / 60000));
  const [error, setError] = useState('');
  const [trabajando, setTrabajando] = useState(false);

  async function ejecutar(fn) {
    setError('');
    setTrabajando(true);
    try {
      await fn();
      onCambio();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setTrabajando(false);
    }
  }

  const cerrada = ['ATENDIDA', 'CANCELADA', 'NO_ASISTIO'].includes(cita.estado);

  return (
    <Modal titulo="Cita" onCerrar={onCerrar}>
      <Alert>{error}</Alert>
      <dl className="space-y-1 text-sm">
        <div><dt className="inline text-slate-500">Paciente: </dt><dd className="inline font-medium">{cita.paciente}</dd></div>
        <div><dt className="inline text-slate-500">Profesional: </dt><dd className="inline">{cita.profesional}</dd></div>
        <div><dt className="inline text-slate-500">Horario: </dt><dd className="inline">{fechaHora(cita.inicio)} – {fechaHora(cita.fin)}</dd></div>
        {cita.motivo && <div><dt className="inline text-slate-500">Motivo: </dt><dd className="inline">{cita.motivo}</dd></div>}
        <div><Badge tono={tonoEstado(cita.estado)}>{cita.estado.replace('_', ' ')}</Badge></div>
      </dl>

      {!cerrada && (
        <>
          <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Cambiar estado</h3>
          <div className="flex flex-wrap gap-2">
            {ESTADOS.filter(([v]) => v !== cita.estado).map(([v, t]) => (
              <Button key={v} variant={v === 'CANCELADA' ? 'secondary' : 'primary'} disabled={trabajando}
                onClick={() => ejecutar(() => http.put(`/api/citas/${cita.id}/estado`, { estado: v }))}>{t}</Button>
            ))}
          </div>

          <h3 className="mb-2 mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">Reprogramar</h3>
          <div className="grid items-end gap-3 sm:grid-cols-4">
            <Campo label="Fecha"><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
            <Campo label="Hora"><Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></Campo>
            <Campo label="Minutos"><Input type="number" min="5" max="240" step="5" value={dur} onChange={(e) => setDur(e.target.value)} /></Campo>
            <Button variant="secondary" disabled={trabajando}
              onClick={() => ejecutar(() => http.put(`/api/citas/${cita.id}/reprogramar`, { inicio: aISO(fecha, hora), duracionMin: Number(dur) }))}>
              Reprogramar
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
