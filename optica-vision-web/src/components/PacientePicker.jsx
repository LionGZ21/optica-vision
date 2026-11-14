import { useEffect, useState } from 'react';
import { http } from '../api/http.js';
import { inputCls } from './Field.jsx';

/** Buscador de pacientes. valor = paciente elegido (o null). onSelect(paciente|null). */
export default function PacientePicker({ valor, onSelect, placeholder = 'Buscar paciente por nombre o documento…' }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setItems([]);
      return undefined;
    }
    const id = setTimeout(async () => {
      try {
        const { data } = await http.get('/api/pacientes', { params: { q: q.trim(), activo: true, pageSize: 8 } });
        setItems(data.items);
        setAbierto(true);
      } catch {
        setItems([]);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  if (valor) {
    return (
      <div className="flex items-center justify-between rounded-lg bg-brand-50 px-3 py-2 text-sm ring-1 ring-brand-200">
        <span>
          <strong className="text-brand-900">{valor.nombres} {valor.apellidos}</strong>
          <span className="ml-2 text-slate-500">{valor.documentoIdentidad}</span>
        </span>
        <button type="button" className="text-slate-500 hover:text-slate-800" onClick={() => onSelect(null)} aria-label="Quitar">×</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        className={inputCls}
        value={q}
        placeholder={placeholder}
        onChange={(e) => setQ(e.target.value)}
        onBlur={() => setAbierto(false)}
      />
      {abierto && items.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white shadow-lg ring-1 ring-slate-200">
          {items.map((p) => (
            <li
              key={p.id}
              onMouseDown={() => { onSelect(p); setQ(''); setItems([]); setAbierto(false); }}
              className="cursor-pointer border-b border-slate-100 px-3 py-2 text-sm last:border-0 hover:bg-brand-50"
            >
              <span className="font-medium text-slate-800">{p.nombres} {p.apellidos}</span>
              <span className="ml-2 text-xs text-slate-500">{p.documentoIdentidad}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
