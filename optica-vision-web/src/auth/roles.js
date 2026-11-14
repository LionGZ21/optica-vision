// Debe coincidir con Auth/Roles.cs y Auth/Grupos.cs del backend.
export const ROLES = {
  Administrador: 'Administrador',
  Gerente: 'Gerente',
  Vendedor: 'Vendedor',
  Bodeguero: 'Bodeguero',
  Recepcionista: 'Recepcionista',
  Optometra: 'Optometra',
  Oftalmologo: 'Oftalmologo',
  TecnicoLaboratorio: 'TecnicoLaboratorio',
};

export const ETIQUETAS_ROL = {
  Administrador: 'Administrador',
  Gerente: 'Gerente',
  Vendedor: 'Vendedor',
  Bodeguero: 'Bodeguero',
  Recepcionista: 'Recepcionista',
  Optometra: 'Optómetra',
  Oftalmologo: 'Oftalmólogo',
  TecnicoLaboratorio: 'Técnico de laboratorio',
};

const direccion = [ROLES.Administrador, ROLES.Gerente];

export const GRUPOS = {
  direccion,
  inventario: [...direccion, ROLES.Bodeguero],
  consultaStock: [...direccion, ROLES.Bodeguero, ROLES.Vendedor, ROLES.TecnicoLaboratorio],
  ventas: [...direccion, ROLES.Vendedor],
  pacientes: [...direccion, ROLES.Recepcionista, ROLES.Optometra, ROLES.Oftalmologo, ROLES.Vendedor],
  agenda: [...direccion, ROLES.Recepcionista, ROLES.Optometra, ROLES.Oftalmologo],
  clinicos: [...direccion, ROLES.Optometra, ROLES.Oftalmologo],
  laboratorio: [...direccion, ROLES.TecnicoLaboratorio],
  ordenesLab: [...direccion, ROLES.TecnicoLaboratorio, ROLES.Vendedor],
};
