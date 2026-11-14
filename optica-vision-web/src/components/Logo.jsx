import Icon from './Icon.jsx';

export default function Logo({ claro = false }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${claro ? 'bg-white/15 text-white' : 'bg-brand-600 text-white'}`}>
        <Icon name="eye" className="h-5 w-5" />
      </span>
      <span className={`text-lg font-semibold tracking-tight ${claro ? 'text-white' : 'text-brand-900'}`}>
        Óptica Visión
      </span>
    </div>
  );
}
