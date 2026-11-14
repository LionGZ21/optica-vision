const TONOS = {
  error: 'bg-red-50 text-red-700 ring-red-200',
  ok: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  aviso: 'bg-amber-50 text-amber-800 ring-amber-200',
};

export default function Alert({ tipo = 'error', children }) {
  if (!children) return null;
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={`mb-4 rounded-lg px-3 py-2 text-sm ring-1 ${TONOS[tipo]}`}>
      {children}
    </div>
  );
}
