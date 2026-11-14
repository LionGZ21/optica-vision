namespace OpticaVision.Api.Auth;

/// <summary>Combinaciones de roles para [Authorize(Roles = ...)].</summary>
public static class Grupos
{
    public const string Direccion = Roles.Administrador + "," + Roles.Gerente;
    public const string Inventario = Direccion + "," + Roles.Bodeguero;
    public const string ConsultaStock = Inventario + "," + Roles.Vendedor + "," + Roles.TecnicoLaboratorio;
    public const string Ventas = Direccion + "," + Roles.Vendedor;
    public const string Pacientes = Direccion + "," + Roles.Recepcionista + "," + Roles.Optometra + "," + Roles.Oftalmologo + "," + Roles.Vendedor;
    public const string Agenda = Direccion + "," + Roles.Recepcionista + "," + Roles.Optometra + "," + Roles.Oftalmologo;
    public const string Clinicos = Direccion + "," + Roles.Optometra + "," + Roles.Oftalmologo;
    public const string LecturaRecetas = Clinicos + "," + Roles.Vendedor + "," + Roles.TecnicoLaboratorio;
    public const string Laboratorio = Direccion + "," + Roles.TecnicoLaboratorio;
    public const string OrdenesLab = Laboratorio + "," + Roles.Vendedor;
}
