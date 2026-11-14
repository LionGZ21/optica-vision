import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Textarea } from '../../components/Field.jsx';
import PacientePicker from '../../components/PacientePicker.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Spinner from '../../components/Spinner.jsx';
import useFetch from '../../hooks/useFetch.js';
import { fechaHora, fechaSolo } from '../../utils/format.js';
import ConsultaModal from './ConsultaModal.jsx';
import { RecetaNuevaModal, RecetaVerModal } from './RecetaModales.jsx';

function Antecedentes({ exp, onGuardado }) {
  const [f, setF] = useState({
    antecedentesPersonales: exp.antecedentesPersonales ?? '',
    antecedentesFamiliares: exp.antecedentesFamiliares ?? '',
    alergias: exp.alergias ?? '',
    medicamentosActuales: exp.medicamentosActuales ?? '',
    usaLentesPreviamente: exp.usaLentesPreviamente,
    observaciones: exp.observaciones ?? '',
  });
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const nulo = (v) => (v === '' ? null : v);

  async function guardar(e) {
    e.preventDefault();
    setError(''); setOk('');
    try {
      await http.put(`/api/expedientes/${exp.id}`, {
        antecedentesPersonales: nulo(f.antecedentesPersonales),
        antecedentesFamiliares: nulo(f.antecedentesFamiliares),
        alergias: nulo(f.alergias),
        medicamentosActuales: nulo(f.medicamentosActuales),
        usaLentesPreviamente: f.usaLentesPreviamente,
        observaciones: nulo(f.observaciones),
      });
      setOk('Antecedentes guardados.');
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  return (
    <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2"><Alert>{error}</Alert><Alert tipo="ok">{ok}</Alert></div>
      <Campo label="Antecedentes personales"><Textarea value={f.antecedentesPersonales} onChange={set('antecedentesPersonales')} /></Campo>
      <Campo label="Antecedentes familiares"><Textarea value={f.antecedentesFamiliares} onChange={set('antecedentesFamiliares')} /></Campo>
      <Campo label="Alergias"><Textarea value={f.alergias} onChange={set('alergias')} /></Campo>
      <Campo label="Medicamentos actuales"><Textarea value={f.medicamentosActuales} onChange={set('medicamentosActuales')} /></Campo>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={f.usaLentesPreviamente} onChange={(e) => setF({ ...f, usaLentesPreviamente: e.target.checked })} />
        Usa lentes previamente
      </label>
      <div className="flex justify-end sm:col-span-2"><Button type="submit" variant="secondary">Guardar antecedentes</Button></div>
    </form>
  );
}

export default function ExpedientesPage() {
  const [paciente, setPaciente] = useState(null);
  const [consultaModal, setConsultaModal] = useState(false);
  const [recetaNueva, setRecetaNueva] = useState(null);   // consultaId
  const [recetaVer, setRecetaVer] = useState(null);       // recetaId

  const exp = useFetch(
    () => (paciente ? http.get(`/api/expedientes/paciente/${paciente.id}`).then((r) => r.data) : Promise.resolve(null)),
    [paciente?.id],
  );
  const e = exp.data?.expediente;

  return (
    <>
      <PageHeader titulo="Expedientes clínicos" descripcion="Historial clínico, consultas y recetas de cada paciente. Información confidencial." />
      <Card className="mb-6">
        <span className="mb-1 block text-sm font-medium text-slate-700">Paciente</span>
        <PacientePicker valor={paciente} onSelect={setPaciente} />
      </Card>

      {!paciente && <p className="text-sm text-slate-500">Busque un paciente para ver su expediente.</p>}
      {paciente && exp.loading && <Spinner />}
      <Alert>{exp.error}</Alert>

      {e && (
        <div className="space-y-6">
          <Card>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-brand-900">{e.paciente.nombres} {e.paciente.apellidos}</h2>
                <p className="text-sm text-slate-500">
                  Expediente {e.numero} · Doc. {e.paciente.documentoIdentidad} · Nac. {fechaSolo(e.paciente.fechaNacimiento)}
                </p>
              </div>
            </div>
            <Antecedentes key={e.id} exp={e} onGuardado={exp.reload} />
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-brand-900">Consultas</h2>
              <Button onClick={() => setConsultaModal(true)}>Nueva consulta</Button>
            </div>
            {exp.data.consultas.length === 0 && <p className="text-sm text-slate-500">Este paciente aún no tiene consultas.</p>}
            <div className="space-y-3">
              {exp.data.consultas.map((c) => (
                <div key={c.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{fechaHora(c.fecha)}</p>
                      {c.motivoConsulta && <p className="text-sm text-slate-600">Motivo: {c.motivoConsulta}</p>}
                    </div>
                    <Button variant="secondary" onClick={() => setRecetaNueva(c.id)}>Nueva receta</Button>
                  </div>
                  <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm text-slate-600 sm:grid-cols-3">
                    {(c.avScOd || c.avScOi) && <div>AV s/c: OD {c.avScOd ?? '—'} · OI {c.avScOi ?? '—'}</div>}
                    {(c.avCcOd || c.avCcOi) && <div>AV c/c: OD {c.avCcOd ?? '—'} · OI {c.avCcOi ?? '—'}</div>}
                    {(c.pioOd != null || c.pioOi != null) && <div>PIO: OD {c.pioOd ?? '—'} · OI {c.pioOi ?? '—'}</div>}
                  </dl>
                  {c.diagnostico && <p className="mt-2 text-sm"><span className="text-slate-500">Diagnóstico:</span> {c.diagnostico}{c.codigoCie10 ? ` (${c.codigoCie10})` : ''}</p>}
                  {c.recetas.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.recetas.map((r) => (
                        <button key={r.id} type="button" onClick={() => setRecetaVer(r.id)}
                          className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100">
                          Receta {r.numero} · {fechaSolo(r.fechaEmision)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {consultaModal && e && (
        <ConsultaModal expedienteId={e.id} onCerrar={() => setConsultaModal(false)} onGuardado={() => { setConsultaModal(false); exp.reload(); }} />
      )}
      {recetaNueva && <RecetaNuevaModal consultaId={recetaNueva} onCerrar={() => setRecetaNueva(null)} onGuardado={() => { setRecetaNueva(null); exp.reload(); }} />}
      {recetaVer && <RecetaVerModal id={recetaVer} onCerrar={() => setRecetaVer(null)} />}
    </>
  );
}
