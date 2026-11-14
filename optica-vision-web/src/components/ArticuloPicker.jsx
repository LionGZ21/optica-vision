import { useEffect, useState } from 'react';
import { http } from '../api/http.js';
import { inputCls } from './Field.jsx';
import { num } from '../utils/format.js';

/** Buscador de artículos por código o nombre. Llama onSelect(articulo) al elegir uno. */
export default function ArticuloPicker({ onSelect, soloVenta = false, placeholder = 'Buscar artículo por código o nombre…' }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return undefined;
    }
    const id = setTimeout(async () => {
      setCargando(true);
      try {
        const { data } = await http.get('/api/articulos', {
          params: { q: q.trim(), activo: true, uso: soloVenta ? 'VENTA' : undefined, pageSize: 8 },
        });
        setItems(data.items);
        setAbierto(true);
      } catch {
        setItems([]);
      } finally {
        setCargando(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q, soloVenta]);

  function elegir(a) {
    onSelect(a);
    setQ('');
    setItems([]);
    setAbierto(false);
  }

  return (
    <div className="relative">
      <input
        className={inputCls}
        value={q}
        placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => items.length > 0 && setAbierto(true)}
        onBlur={() => setAbierto(false)}
      />
      {cargando && <span className="absolute right-3 top-2.5 text-xs text-slate-400">Buscando…</span>}
      {abierto && items.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg bg-white shadow-lg ring-1 ring-slate-200">
          {items.map((a) => (
            <li
              key={a.id}
              onMouseDown={() => elegir(a)}
              className="cursor-pointer border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-brand-50"
            >
              <span className="font-medium text-slate-800">{a.codigo}</span> · {a.nombre}
              <span className="block text-xs text-slate-500">
                {a.marca} · Stock: {num(a.stockTotal)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
