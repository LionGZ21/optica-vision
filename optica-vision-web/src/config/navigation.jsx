import { GRUPOS } from '../auth/roles.js';
import ArticulosPage from '../pages/inventario/ArticulosPage.jsx';
import CatalogosPage from '../pages/inventario/CatalogosPage.jsx';
import KardexPage from '../pages/inventario/KardexPage.jsx';
import ProveedoresPage from '../pages/inventario/ProveedoresPage.jsx';
import StockPage from '../pages/inventario/StockPage.jsx';
import TrasladosPage from '../pages/inventario/TrasladosPage.jsx';
import ConsignacionesPage from '../pages/inventario/ConsignacionesPage.jsx';
import ExpedientesPage from '../pages/clinica/ExpedientesPage.jsx';
import OrdenesLabPage from '../pages/laboratorio/OrdenesLabPage.jsx';
import AgendaPage from '../pages/clinica/AgendaPage.jsx';
import PacientesPage from '../pages/clinica/PacientesPage.jsx';
import VentaDetallePage from '../pages/ventas/VentaDetallePage.jsx';
import VentaNuevaPage from '../pages/ventas/VentaNuevaPage.jsx';
import VentasPage from '../pages/ventas/VentasPage.jsx';

// Menú lateral y rutas de la aplicación (una sola fuente de verdad).
// Los módulos sin "componente" muestran la pantalla temporal "Pendiente".
export const secciones = [
  {
    titulo: 'Inventario',
    items: [
      { to: '/inventario/articulos', etiqueta: 'Artículos', icono: 'box', roles: GRUPOS.consultaStock, componente: ArticulosPage,
        descripcion: 'Catálogo de artículos, taxonomía, proveedores, precios y equivalentes.' },
      { to: '/inventario/stock', etiqueta: 'Stock', icono: 'layers', roles: GRUPOS.consultaStock, componente: StockPage,
        descripcion: 'Existencias por bodega y artículos bajo el mínimo.' },
      { to: '/inventario/kardex', etiqueta: 'Kardex', icono: 'clipboard', roles: GRUPOS.inventario, componente: KardexPage,
        descripcion: 'Historial de movimientos de inventario y registro de entradas, salidas y ajustes.' },
      { to: '/inventario/catalogos', etiqueta: 'Catálogos', icono: 'tag', roles: GRUPOS.inventario, componente: CatalogosPage,
        descripcion: 'Taxonomía de artículos y marcas.' },
      { to: '/inventario/proveedores', etiqueta: 'Proveedores', icono: 'building', roles: GRUPOS.inventario, componente: ProveedoresPage,
        descripcion: 'Proveedores de mercadería y de consignación.' },
      { to: '/inventario/traslados', etiqueta: 'Traslados', icono: 'truck', roles: GRUPOS.inventario, componente: TrasladosPage,
        descripcion: 'Traslados entre sucursales mediante la bodega de tránsito.' },
      { to: '/inventario/consignaciones', etiqueta: 'Consignaciones', icono: 'inbox', roles: GRUPOS.inventario, componente: ConsignacionesPage,
        descripcion: 'Mercadería de proveedores en consignación: recepción, devolución y liquidación.' },
    ],
  },
  {
    titulo: 'Ventas',
    items: [
      { to: '/ventas', etiqueta: 'Facturación', icono: 'cart', roles: GRUPOS.ventas, componente: VentasPage,
        descripcion: 'Ventas, pagos y anulaciones.' },
    ],
  },
  {
    titulo: 'Clínica',
    items: [
      { to: '/clinica/agenda', etiqueta: 'Agenda médica', icono: 'calendar', roles: GRUPOS.agenda, componente: AgendaPage,
        descripcion: 'Citas de pacientes con oftalmólogos y optómetras.' },
      { to: '/clinica/pacientes', etiqueta: 'Pacientes', icono: 'users', roles: GRUPOS.pacientes, componente: PacientesPage,
        descripcion: 'Registro y búsqueda de pacientes.' },
      { to: '/clinica/expedientes', etiqueta: 'Expedientes', icono: 'clipboard', roles: GRUPOS.clinicos, componente: ExpedientesPage,
        descripcion: 'Historial clínico, consultas y recetas.' },
    ],
  },
  {
    titulo: 'Laboratorio',
    items: [
      { to: '/laboratorio/ordenes', etiqueta: 'Órdenes de trabajo', icono: 'flask', roles: GRUPOS.ordenesLab, componente: OrdenesLabPage,
        descripcion: 'Órdenes que enlazan la receta con el consumo de monturas y cristales.' },
    ],
  },
];

export const rutas = secciones.flatMap((s) => s.items);

// Rutas que no aparecen en el menú (pantallas internas).
export const rutasExtra = [
  { to: '/ventas/nueva', roles: GRUPOS.ventas, componente: VentaNuevaPage },
  { to: '/ventas/:id', roles: GRUPOS.ventas, componente: VentaDetallePage },
];
