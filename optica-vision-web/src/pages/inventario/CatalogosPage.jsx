import { useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import Button from '../../components/Button.jsx';
import Card from '../../components/Card.jsx';
import { Campo, Input } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import Spinner from '../../components/Spinner.jsx';
import useFetch from '../../hooks/useFetch.js';

const RUTAS = { departamento: 'departamentos', seccion: 'secciones', familia: 'familias', subfamilia: 'subfamilias' };

function NodoModal({ nodo, onCerrar, onGuardado }) {
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    setError('');
    setGuardando(true);
    try {
      const body = { codigo, nombre };
      if (nodo.padreId) body.padreId = nodo.padreId;
      await http.post(`/api/taxonomia/${RUTAS[nodo.nivel]}`, body);
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Nueva ${nodo.nivel}${nodo.padre ? ` en "${nodo.padre}"` : ''}`} onCerrar={onCerrar}>
      <form onSubmit={guardar} className="space-y-4">
        <Alert>{error}</Alert>
        <Campo label="Código"><Input required maxLength={20} value={codigo} onChange={(e) => setCodigo(e.target.value)} /></Campo>
        <Campo label="Nombre"><Input required maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button type="submit" disabled={guardando}>Guardar</Button>
        </div>
      </form>
    </Modal>
  );
}

function Agregar({ onClick, texto }) {
  return (
    <button type="button" onClick={onClick} className="text-xs font-medium text-brand-700 hover:underline">
      + {texto}
    </button>
  );
}

export default function CatalogosPage() {
  const arbol = useFetch(() => http.get('/api/taxonomia/arbol').then((r) => r.data), []);
  const marcas = useFetch(() => http.get('/api/catalogos/marcas').then((r) => r.data), []);
  const [nodo, setNodo] = useState(null);
  const [marca, setMarca] = useState('');
  const [error, setError] = useState('');

  async function agregarMarca(e) {
    e.preventDefault();
    setError('');
    try {
      await http.post('/api/catalogos/marcas', { nombre: marca });
      setMarca('');
      marcas.reload();
    } catch (err) {
      setError(mensajeError(err));
    }
  }

  const recargar = () => { setNodo(null); arbol.reload(); };

  return (
    <>
      <PageHeader
        titulo="Catálogos"
        descripcion="Taxonomía de artículos (Departamento › Sección › Familia › Subfamilia) y marcas."
      />
      <Alert>{error}</Alert>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-brand-900">Taxonomía</h2>
            <Agregar texto="Departamento" onClick={() => setNodo({ nivel: 'departamento' })} />
          </div>
          {arbol.loading && <Spinner />}
          {arbol.error && <Alert>{arbol.error}</Alert>}
          <ul className="space-y-3 text-sm">
            {arbol.data?.map((d) => (
              <li key={d.id}>
                <div className="flex items-center gap-3">
                  <strong className="text-slate-800">{d.codigo} · {d.nombre}</strong>
                  <Agregar texto="Sección" onClick={() => setNodo({ nivel: 'seccion', padreId: d.id, padre: d.nombre })} />
                </div>
                <ul className="ml-5 mt-1 space-y-2 border-l border-slate-200 pl-4">
                  {d.secciones.map((s) => (
                    <li key={s.id}>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-700">{s.codigo} · {s.nombre}</span>
                        <Agregar texto="Familia" onClick={() => setNodo({ nivel: 'familia', padreId: s.id, padre: s.nombre })} />
                      </div>
                      <ul className="ml-5 mt-1 space-y-1 border-l border-slate-200 pl-4">
                        {s.familias.map((f) => (
                          <li key={f.id}>
                            <div className="flex items-center gap-3">
                              <span className="text-slate-700">{f.codigo} · {f.nombre}</span>
                              <Agregar texto="Subfamilia" onClick={() => setNodo({ nivel: 'subfamilia', padreId: f.id, padre: f.nombre })} />
                            </div>
                            <ul className="ml-5 mt-0.5 border-l border-slate-200 pl-4 text-slate-500">
                              {f.subfamilias.map((x) => <li key={x.id}>{x.codigo} · {x.nombre}</li>)}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-3 font-semibold text-brand-900">Marcas</h2>
          <form onSubmit={agregarMarca} className="mb-3 flex gap-2">
            <Input required placeholder="Nueva marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
            <Button type="submit">Agregar</Button>
          </form>
          {marcas.loading && <Spinner />}
          <ul className="divide-y divide-slate-100 text-sm">
            {marcas.data?.map((m) => <li key={m.id} className="py-1.5">{m.nombre}</li>)}
          </ul>
        </Card>
      </div>

      {nodo && <NodoModal nodo={nodo} onCerrar={() => setNodo(null)} onGuardado={recargar} />}
    </>
  );
}
