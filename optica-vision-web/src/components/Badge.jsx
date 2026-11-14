const TONOS = {
  verde: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  rojo: 'bg-red-50 text-red-700 ring-red-200',
  ambar: 'bg-amber-50 text-amber-700 ring-amber-200',
  azul: 'bg-brand-50 text-brand-700 ring-brand-200',
  gris: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const POR_ESTADO = {
  BORRADOR: 'gris', CONFIRMADA: 'verde', ANULADA: 'rojo',
  PROGRAMADA: 'azul', EN_ATENCION: 'ambar', ATENDIDA: 'verde', CANCELADA: 'rojo', NO_ASISTIO: 'ambar',
  EN_TRANSITO: 'ambar', RECIBIDO: 'verde', CANCELADO: 'rojo', ABIERTA: 'azul', CERRADA: 'gris',
  PENDIENTE: 'gris', EN_PROCESO: 'ambar', CONTROL_CALIDAD: 'azul', LISTA: 'verde', ENTREGADA: 'verde',
};

export const tonoEstado = (estado) => POR_ESTADO[estado] ?? 'gris';

export default function Badge({ tono = 'gris', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${TONOS[tono]}`}>
      {children}
    </span>
  );
}
