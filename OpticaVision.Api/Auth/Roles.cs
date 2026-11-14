namespace OpticaVision.Api.Auth;

public static class Roles
{
    public const string Administrador = "Administrador";
    public const string Gerente = "Gerente";
    public const string Vendedor = "Vendedor";
    public const string Bodeguero = "Bodeguero";
    public const string Recepcionista = "Recepcionista";
    public const string Optometra = "Optometra";
    public const string Oftalmologo = "Oftalmologo";
    public const string TecnicoLaboratorio = "TecnicoLaboratorio";

    public static readonly string[] Todos =
    [
        Administrador, Gerente, Vendedor, Bodeguero,
        Recepcionista, Optometra, Oftalmologo, TecnicoLaboratorio
    ];
}
