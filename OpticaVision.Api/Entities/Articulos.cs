namespace OpticaVision.Api.Entities;

public class Articulo
{
    public long Id { get; set; }
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public string? Descripcion { get; set; }
    public long SubfamiliaId { get; set; }
    public Subfamilia Subfamilia { get; set; } = null!;
    public long MarcaId { get; set; }
    public Marca Marca { get; set; } = null!;
    public long ImpuestoId { get; set; }
    public Impuesto Impuesto { get; set; } = null!;
    public long UnidadBaseId { get; set; }
    public UnidadMedida UnidadBase { get; set; } = null!;
    public string TipoArticulo { get; set; } = "OTRO";
    public string Uso { get; set; } = "VENTA";             // VENTA | CONSUMO_INTERNO
    public bool Activo { get; set; } = true;
    public decimal StockMinimo { get; set; }
    public string? CreatedBy { get; set; }
}

public class ArticuloEquivalente
{
    public long ArticuloId { get; set; }                   // siempre el menor de los dos ids
    public long EquivalenteId { get; set; }                // siempre el mayor
    public string? Nota { get; set; }
}

public class ArticuloProveedor
{
    public long Id { get; set; }
    public long ArticuloId { get; set; }
    public long ProveedorId { get; set; }
    public Proveedor Proveedor { get; set; } = null!;
    public long UnidadMedidaId { get; set; }
    public UnidadMedida UnidadMedida { get; set; } = null!;
    public string? CodigoProveedor { get; set; }
    public decimal PrecioCosto { get; set; }
    public string Moneda { get; set; } = "NIO";
    public bool EsPrincipal { get; set; }
    public bool Activo { get; set; } = true;
    public string? ModificadoPor { get; set; }
}

public class ArticuloPrecio
{
    public long Id { get; set; }
    public long ListaPrecioId { get; set; }
    public ListaPrecio ListaPrecio { get; set; } = null!;
    public long ArticuloId { get; set; }
    public long UnidadMedidaId { get; set; }
    public UnidadMedida UnidadMedida { get; set; } = null!;
    public decimal Precio { get; set; }
    public bool Activo { get; set; } = true;
    public string? ModificadoPor { get; set; }
}

/// <summary>Solo lectura: lo llenan los triggers de la base de datos.</summary>
public class HistorialPrecio
{
    public long Id { get; set; }
    public string TipoPrecio { get; set; } = null!;
    public long ArticuloId { get; set; }
    public long? ListaPrecioId { get; set; }
    public long? ProveedorId { get; set; }
    public long? UnidadMedidaId { get; set; }
    public decimal? PrecioAnterior { get; set; }
    public decimal PrecioNuevo { get; set; }
    public string Operacion { get; set; } = null!;
    public string? UsuarioId { get; set; }
    public DateTime Fecha { get; set; }
}
