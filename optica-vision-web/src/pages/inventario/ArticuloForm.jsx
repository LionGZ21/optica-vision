import { useMemo, useState } from 'react';
import { http, mensajeError } from '../../api/http.js';
import Alert from '../../components/Alert.jsx';
import Button from '../../components/Button.jsx';
import { Campo, Input, Select, Textarea } from '../../components/Field.jsx';
import Modal from '../../components/Modal.jsx';

const TIPOS = [
  ['MONTURA', 'Montura'], ['LENTE_BLANCO', 'Lente en blanco'], ['LENTE_CONTACTO', 'Lente de contacto'],
  ['ACCESORIO', 'Accesorio'], ['SERVICIO', 'Servicio'], ['INSUMO', 'Insumo'], ['OTRO', 'Otro'],
];

/** Busca en el árbol a qué departamento/sección/familia pertenece una subfamilia. */
function ubicar(arbol, subfamiliaId) {
  if (!subfamiliaId) return {};
  for (const d of arbol)
    for (const s of d.secciones)
      for (const f of s.familias)
        if (f.subfamilias.some((x) => x.id === subfamiliaId))
          return { depId: String(d.id), secId: String(s.id), famId: String(f.id) };
  return {};
}

export default function ArticuloForm({ articulo, catalogos, onCerrar, onGuardado }) {
  const editando = Boolean(articulo?.id);
  const ubic = useMemo(() => ubicar(catalogos.arbol, articulo?.subfamiliaId), [catalogos, articulo]);

  const [f, setF] = useState(() => ({
    codigo: articulo?.codigo ?? '',
    nombre: articulo?.nombre ?? '',
    descripcion: articulo?.descripcion ?? '',
    depId: ubic.depId ?? '',
    secId: ubic.secId ?? '',
    famId: ubic.famId ?? '',
    subfamiliaId: articulo?.subfamiliaId ? String(articulo.subfamiliaId) : '',
    marcaId: articulo?.marcaId ? String(articulo.marcaId) : '',
    impuestoId: articulo?.impuestoId
      ? String(articulo.impuestoId)
      : String(catalogos.impuestos.find((i) => i.porcentaje > 0)?.id ?? ''),
    unidadBaseId: articulo?.unidadBaseId
      ? String(articulo.unidadBaseId)
      : String(catalogos.unidades.find((u) => u.codigo === 'UND')?.id ?? ''),
    tipoArticulo: articulo?.tipoArticulo ?? 'MONTURA',
    uso: articulo?.uso ?? 'VENTA',
    stockMinimo: articulo?.stockMinimo ?? 0,
    activo: articulo?.activo ?? true,
  }));
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const secciones = catalogos.arbol.find((d) => String(d.id) === f.depId)?.secciones ?? [];
  const familias = secciones.find((s) => String(s.id) === f.secId)?.familias ?? [];
  const subfamilias = familias.find((x) => String(x.id) === f.famId)?.subfamilias ?? [];

  async function guardar(e) {
    e.preventDefault();
    setError('');
    if (!f.subfamiliaId) {
      setError('Seleccione la taxonomía completa hasta la subfamilia.');
      return;
    }
    setGuardando(true);
    try {
      const body = {
        codigo: f.codigo.trim(),
        nombre: f.nombre.trim(),
        descripcion: f.descripcion || null,
        subfamiliaId: Number(f.subfamiliaId),
        marcaId: Number(f.marcaId),
        impuestoId: Number(f.impuestoId),
        unidadBaseId: Number(f.unidadBaseId),
        tipoArticulo: f.tipoArticulo,
        uso: f.uso,
        stockMinimo: Number(f.stockMinimo || 0),
        activo: f.activo,
      };
      if (editando) await http.put(`/api/articulos/${articulo.id}`, body);
      else await http.post('/api/articulos', body);
      onGuardado();
    } catch (err) {
      setError(mensajeError(err));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={editando ? `Editar artículo ${articulo.codigo}` : 'Nuevo artículo'} ancho="max-w-3xl" onCerrar={onCerrar}>
      <form onSubmit={guardar} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Alert>{error}</Alert></div>

        <Campo label="Código"><Input required maxLength={40} value={f.codigo} onChange={set('codigo')} disabled={editando} /></Campo>
        <Campo label="Nombre"><Input required maxLength={200} value={f.nombre} onChange={set('nombre')} /></Campo>
        <Campo label="Descripción" className="sm:col-span-2"><Textarea value={f.descripcion} onChange={set('descripcion')} /></Campo>

        <Campo label="Departamento">
          <Select value={f.depId} onChange={(e) => setF({ ...f, depId: e.target.value, secId: '', famId: '', subfamiliaId: '' })}>
            <option value="">— Seleccione —</option>
            {catalogos.arbol.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </Select>
        </Campo>
        <Campo label="Sección">
          <Select value={f.secId} onChange={(e) => setF({ ...f, secId: e.target.value, famId: '', subfamiliaId: '' })}>
            <option value="">— Seleccione —</option>
            {secciones.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        </Campo>
        <Campo label="Familia">
          <Select value={f.famId} onChange={(e) => setF({ ...f, famId: e.target.value, subfamiliaId: '' })}>
            <option value="">— Seleccione —</option>
            {familias.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </Select>
        </Campo>
        <Campo label="Subfamilia">
          <Select required value={f.subfamiliaId} onChange={set('subfamiliaId')}>
            <option value="">— Seleccione —</option>
            {subfamilias.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </Select>
        </Campo>

        <Campo label="Marca">
          <Select required value={f.marcaId} onChange={set('marcaId')}>
            <option value="">— Seleccione —</option>
            {catalogos.marcas.filter((m) => m.activa).map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </Select>
        </Campo>
        <Campo label="Impuesto">
          <Select required value={f.impuestoId} onChange={set('impuestoId')}>
            {catalogos.impuestos.map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.porcentaje}%)</option>)}
          </Select>
        </Campo>
        <Campo label="Unidad base">
          <Select required value={f.unidadBaseId} onChange={set('unidadBaseId')}>
            {catalogos.unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
          </Select>
        </Campo>
        <Campo label="Tipo de artículo">
          <Select value={f.tipoArticulo} onChange={set('tipoArticulo')}>
            {TIPOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </Select>
        </Campo>
        <Campo label="Uso">
          <Select value={f.uso} onChange={set('uso')}>
            <option value="VENTA">Venta</option>
            <option value="CONSUMO_INTERNO">Consumo interno</option>
          </Select>
        </Campo>
        <Campo label="Stock mínimo"><Input type="number" min="0" step="any" value={f.stockMinimo} onChange={set('stockMinimo')} /></Campo>
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
          <Button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar'}</Button>
        </div>
      </form>
    </Modal>
  );
}
