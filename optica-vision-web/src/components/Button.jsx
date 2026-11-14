const VARIANTES = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500 disabled:bg-brand-300',
  secondary: 'bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 focus:ring-brand-500',
  ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-brand-500',
};

export default function Button({ variant = 'primary', className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed ${VARIANTES[variant]} ${className}`}
      {...props}
    />
  );
}
