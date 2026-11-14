import { useEffect } from 'react';

export default function Modal({ abierto = true, titulo, onCerrar, ancho = 'max-w-lg', children }) {
  useEffect(() => {
    if (!abierto) return undefined;
    const alTeclear = (e) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 sm:p-8"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
    >
      <div className={`w-full ${ancho} rounded-xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-brand-900">{titulo}</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
