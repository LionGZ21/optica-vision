import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';

// Pantalla temporal de cada módulo. La Fase 5 la reemplaza por la pantalla real.
export default function Pendiente({ titulo, descripcion }) {
  return (
    <>
      <PageHeader titulo={titulo} descripcion={descripcion} />
      <Card className="text-center">
        <p className="py-10 text-slate-500">
          Esta pantalla se construirá en la <strong className="text-brand-700">Fase 5</strong>.
          La ruta, el menú y los permisos por rol ya están configurados.
        </p>
      </Card>
    </>
  );
}
