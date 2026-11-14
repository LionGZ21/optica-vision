export default function Spinner({ className = 'h-5 w-5' }) {
  return (
    <span
      role="status"
      aria-label="Cargando"
      className={`inline-block animate-spin rounded-full border-2 border-brand-200 border-t-brand-600 ${className}`}
    />
  );
}
