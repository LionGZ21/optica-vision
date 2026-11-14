import { Link } from 'react-router-dom';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function NoAutorizado() {
  return (
    <>
      <PageHeader titulo="Acceso restringido" />
      <Card>
        <p className="text-slate-600">Su rol no tiene permiso para ver esta sección.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
          Volver al inicio
        </Link>
      </Card>
    </>
  );
}
