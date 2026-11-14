import { http } from './http.js';

/** Catálogos que usan varias pantallas (artículos, ventas...). */
export async function cargarCatalogos() {
  const [arbol, marcas, impuestos, unidades, listas] = await Promise.all([
    http.get('/api/taxonomia/arbol'),
    http.get('/api/catalogos/marcas'),
    http.get('/api/catalogos/impuestos'),
    http.get('/api/catalogos/unidades'),
    http.get('/api/catalogos/listas-precio'),
  ]);
  return {
    arbol: arbol.data,
    marcas: marcas.data,
    impuestos: impuestos.data,
    unidades: unidades.data,
    listas: listas.data,
  };
}
