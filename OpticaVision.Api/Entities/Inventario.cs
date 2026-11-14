namespace OpticaVision.Api.Entities;

public class Stock
{
    public long BodegaId { get; set; }
    public Bodega Bodega { get; set; } = null!;
    public long ArticuloId { get; set; }
    public Articulo Articulo { get; set; } = null!;
    public decimal Cantidad { get; set; }
}

/// <summary>Kardex. Inmutable: solo se inserta (el trigger calcula los saldos).</summary>
public class MovimientoInventario
{
    public long Id { get; set; }
    public DateTime Fecha { get; set; }
    public long ArticuloId { get; set; }
    public Articulo Articulo { get; set; } = null!;
    public long BodegaId { get; set; }
    public Bodega Bodega { get; set; } = null!;
    public string TipoMovimiento { get; set; } = null!;
    public decimal Cantidad { get; set; }                  // (+) entra, (-) sale
    public decimal SaldoAnterior { get; set; }
    public decimal SaldoNuevo { get; set; }
    public decimal? CostoUnitario { get; set; }
    public string? DocumentoTipo { get; set; }
    public long? DocumentoId { get; set; }
    public string? UsuarioId { get; set; }
    public string? Observacion { get; set; }
}

public class Traslado
{
    public long Id { get; set; }
    public string Numero { get; set; } = null!;
    public long BodegaOrigenId { get; set; }
    public long BodegaTransitoId { get; set; }
    public long BodegaDestinoId { get; set; }
    public string Estado { get; set; } = "BORRADOR";
    public string? Observacion { get; set; }
    public string? CreadoPor { get; set; }
    public string? DespachadoPor { get; set; }
    public string? RecibidoPor { get; set; }
    public DateTime FechaCreacion { get; set; }
    public DateTime? FechaDespacho { get; set; }
    public DateTime? FechaRecepcion { get; set; }
    public List<TrasladoDetalle> Detalles { get; set; } = [];
}

public class TrasladoDetalle
{
    public long Id { get; set; }
    public long TrasladoId { get; set; }
    public long ArticuloId { get; set; }
    public Articulo Articulo { get; set; } = null!;
    public decimal Cantidad { get; set; }
}

public class Consignacion
{
    public long Id { get; set; }
    public string Numero { get; set; } = null!;
    public long ProveedorId { get; set; }
    public Proveedor Proveedor { get; set; } = null!;
    public long BodegaId { get; set; }
    public string Estado { get; set; } = "BORRADOR";       // BORRADOR | ABIERTA | CERRADA | ANULADA
    public DateOnly Fecha { get; set; }
    public string? Observacion { get; set; }
    public string? CreadoPor { get; set; }
    public List<ConsignacionDetalle> Detalles { get; set; } = [];
}

public class ConsignacionDetalle
{
    public long Id { get; set; }
    public long ConsignacionId { get; set; }
    public long ArticuloId { get; set; }
    public Articulo Articulo { get; set; } = null!;
    public decimal CantidadRecibida { get; set; }
    public decimal CantidadVendida { get; set; }
    public decimal CantidadDevuelta { get; set; }
    public decimal CostoUnitario { get; set; }
}

public class ConsignacionLiquidacion
{
    public long Id { get; set; }
    public string Numero { get; set; } = null!;
    public long ConsignacionId { get; set; }
    public DateOnly Fecha { get; set; }
    public decimal Total { get; set; }
    public string Estado { get; set; } = "PENDIENTE";
    public string? CreadoPor { get; set; }
    public List<ConsignacionLiquidacionDetalle> Detalles { get; set; } = [];
}

public class ConsignacionLiquidacionDetalle
{
    public long Id { get; set; }
    public long LiquidacionId { get; set; }
    public long DetalleId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal CostoUnitario { get; set; }
}
