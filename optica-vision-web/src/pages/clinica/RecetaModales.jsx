import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import Button from '../../components/Button.jsx';
import { Campo, Input, Select, Textarea } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import Spinner from '../../components/Spinner.jsx';
import T from '../../components/tabla.js';
import useFetch from '../../hooks/useFetch.js';
import { aNumero, fechaSolo } from '../../utils/format.js';

const MEDIDAS = [
  ['Esfera', 'Esfera', '0.25'], ['Cilindro', 'Cilindro', '0.25'], ['Eje', 'Eje', '1'], ['Adicion', 'Adición', '0.25'],
  ['Prisma', 'Prisma', '0.25'], ['BasePrisma', 'Base prisma', null], ['Dnp', 'DNP', '0.5'], ['Altura', 'Altura', '0.5'],
];
const LADOS = [['od', 'Ojo derecho (OD)'], ['oi', 'Ojo izquierdo (OI)']];
const TIPOS = [['', '—'], ['MONOFOCAL', 'Monofocal'], ['BIFOCAL', 'Bifocal'], ['PROGRESIVO', 'Progresivo'], ['OCUPACIONAL', 'Ocupacional'], ['CONTACTO', 'Lente de contacto']];

export function RecetaNuevaModal({ consultaId, onCerrar, onGuardado }) {
  const [f, setF] = useState({ tipoLente: '', vigenteHasta: '', distanciaPupilar: '', observaciones: '' });
  const [m, setM] = useState({});       // medidas: odEsfera, oiCilindro...
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const body = {
        consultaId,
        tipoLente: f.tipoLente || null,
        vigenteHasta: f.vigenteHasta || null,
        distanciaPupilar: aNumero(f.distanciaPupilar),
        observaciones: f.observaciones || null,
      };
      for (const [lado] of LADOS) {
        for (const [clave, , paso] of MEDIDAS) {
          const k = `${lado}${clave}`;
          body[k] = paso === null ? (m[k] || null) : aNumero(m[k] ?? '');
        }
      }
      await http.post('/api/recetas', body);
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Nueva receta / graduación" ancho="max-w-3xl" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-5">
        <Alert>{error}</Alert>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo label="Tipo de lente"><Select value={f.tipoLente} onChange={(e) => setF({ ...f, tipoLente: e.target.value })}>{TIPOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</Select></Campo>
          <Campo label="Vigente hasta"><Input type="date" value={f.vigenteHasta} onChange={(e) => setF({ ...f, vigenteHasta: e.target.value })} /></Campo>
          <Campo label="Distancia pupilar (mm)"><Input type="number" step="0.5" value={f.distanciaPupilar} onChange={(e) => setF({ ...f, distanciaPupilar: e.target.value })} /></Campo>
        </div>

        {LADOS.map(([lado, titulo]) => (
          <fieldset key={lado} className="rounded-lg border border-slate-200 p-3">
            <legend className="px-2 text-sm font-semibold text-brand-900">{titulo}</legend>
            <div className="grid gap-3 sm:grid-cols-4">
              {MEDIDAS.map(([clave, etiqueta, paso]) => {
                const k = `${lado}${clave}`;
                return (
                  <Campo key={k} label={etiqueta}>
                    <Input
                      type={paso === null ? 'text' : 'number'}
                      step={paso ?? undefined}
                      value={m[k] ?? ''}
                      onChange={(e) => setM({ ...m, [k]: e.target.value })}
                    />
                  </Campo>
                );
              })}
            </div>
          </fieldset>
        ))}
        <p className="text-xs text-slate-500">Si hay cilindro, el eje (0–180°) es obligatorio.</p>

        <Campo label="Observaciones"><Textarea value={f.observaciones} onChange={(e) => setF({ ...f, observaciones: e.target.value })} /></Campo>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>Guardar receta</Button>
        </div>
      </form>
    </Modal>
  );
}

const fmt = (v) => (v === null || v === undefined || v === '' ? '—' : v);

export function RecetaVerModal({ id, onCerrar }) {
  const det = useFetch(() => http.get(`/api/recetas/${id}`).then((r) => r.data), [id]);
  const r = det.data;
  return (
    <Modal titulo={r ? `Receta ${r.numero}` : 'Receta'} ancho="max-w-3xl" onCerrar={onCerrar}>
      {det.loading && <Spinner />}
      <Alert>{det.error}</Alert>
      {r && (
        <>
          <p className="mb-4 text-sm text-slate-600">
            Emitida: {fechaSolo(r.fechaEmision)}
            {r.vigenteHasta && ` · Vigente hasta: ${fechaSolo(r.vigenteHasta)}`}
            {r.tipoLente && ` · ${r.tipoLente}`}
          </p>
          <table className={T.tabla}>
            <thead><tr>
              <th className={T.th}>Ojo</th>
              {MEDIDAS.map(([k, e]) => <th key={k} className={T.thR}>{e}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {LADOS.map(([lado, titulo]) => (
                <tr key={lado}>
                  <td className={`${T.td} font-medium`}>{lado.toUpperCase()}</td>
                  {MEDIDAS.map(([k]) => {
                    const clave = `${lado}${k}`;
                    return <td key={k} className={T.tdR}>{fmt(r[clave])}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {r.distanciaPupilar != null && <p className="mt-3 text-sm">Distancia pupilar: {r.distanciaPupilar} mm</p>}
          {r.observaciones && <p className="mt-3 text-sm text-slate-600">{r.observaciones}</p>}
        </>
      )}
    </Modal>
  );
}

export { LADOS };
