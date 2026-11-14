namespace OpticaVision.Api.Entities;

public class Marca
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public bool Activa { get; set; } = true;
}

public class Impuesto
{
    public long Id { get; set; }
    public string Nombre { get; set; } = null!;
    public decimal Porcentaje { get; set; }
    public bool Activo { get; set; } = true;
}

public class UnidadMedida
{
    public long Id { get; set; }
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public decimal FactorBase { get; set; } = 1;
    public bool Activa { get; set; } = true;
}

public class Sucursal
{
    public long Id { get; set; }
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public string Tipo { get; set; } = "VENTA";            // VENTA | ALMACENAMIENTO
    public string? Direccion { get; set; }
    public string? Ciudad { get; set; }
    public string? Telefono { get; set; }
    public bool Activa { get; set; } = true;
}

public class Bodega
{
    public long Id { get; set; }
    public long? SucursalId { get; set; }
    public Sucursal? Sucursal { get; set; }
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public string Tipo { get; set; } = null!;              // VENTA | ALMACEN | TRANSITO
    public string? PlacaVehiculo { get; set; }
    public bool Activa { get; set; } = true;
}

public class ListaPrecio
{
    public long Id { get; set; }
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public string Moneda { get; set; } = "NIO";
    public bool EsPredeterminada { get; set; }
    public bool Activa { get; set; } = true;
}

public class Proveedor
{
    public long Id { get; set; }
    public string Codigo { get; set; } = null!;
    public string RazonSocial { get; set; } = null!;
    public string? Ruc { get; set; }
    public string? Contacto { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string? Direccion { get; set; }
    public int DiasCredito { get; set; }
    public bool Activo { get; set; } = true;
}
