export const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const hoyISO = () => toISODate(new Date());

export const money = (n, moneda = 'NIO') => {
  const v = Number(n ?? 0).toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${moneda === 'USD' ? 'US$' : 'C$'} ${v}`;
};

export const num = (n) => Number(n ?? 0).toLocaleString('es-NI', { maximumFractionDigits: 3 });

export const fechaHora = (iso) =>
  iso ? new Date(iso).toLocaleString('es-NI', { dateStyle: 'short', timeStyle: 'short' }) : '';

export const hora = (iso) =>
  iso ? new Date(iso).toLocaleTimeString('es-NI', { hour: '2-digit', minute: '2-digit' }) : '';

/** Para fechas "YYYY-MM-DD" (DateOnly de la API): evita el desfase por zona horaria. */
export const fechaSolo = (s) => (s ? s.split('-').reverse().join('/') : '');

export const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

/** '' -> null; si no, Number(valor). Para campos numéricos opcionales de formularios. */
export const aNumero = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
