import { Link } from 'react-router-dom';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';

export default function NotFound() {
  return (
    <>
      <PageHeader titulo="Página no encontrada" />
      <Card>
        <p className="text-slate-600">La dirección que busca no existe.</p>
        <Link to="/" className="mt-4 inline-block text-sm font-medium text-brand-700 hover:underline">
          Volver al inicio
        </Link>
      </Card>
    </>
  );
}
