import Button from './Button.jsx';

export default function Pagination({ page, pageSize, total, onChange }) {
  const paginas = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
      <span>
        Página {page} de {paginas} · {total} registros
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</Button>
        <Button variant="secondary" disabled={page >= paginas} onClick={() => onChange(page + 1)}>Siguiente</Button>
      </div>
    </div>
  );
}
