namespace OpticaVision.Api.Entities;

public class Venta
{
    public long Id { get; set; }
    public string Numero { get; set; } = null!;
    public long SucursalId { get; set; }
    public long BodegaId { get; set; }
    public long? PacienteId { get; set; }
    public Paciente? Paciente { get; set; }
    public string? ClienteNombre { get; set; }
    public string? ClienteIdentificacion { get; set; }
    public long ListaPrecioId { get; set; }
    public string Estado { get; set; } = "BORRADOR";       // BORRADOR | CONFIRMADA | ANULADA
    public string Moneda { get; set; } = "NIO";
    public decimal Subtotal { get; set; }
    public decimal Descuento { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }
    public string? VendedorId { get; set; }
    public string? Observaciones { get; set; }
    public DateTime Fecha { get; set; }
    public List<VentaDetalle> Detalles { get; set; } = [];
    public List<Pago> Pagos { get; set; } = [];
}

public class VentaDetalle
{
    public long Id { get; set; }
    public long VentaId { get; set; }
    public long ArticuloId { get; set; }
    public Articulo Articulo { get; set; } = null!;
    public long UnidadMedidaId { get; set; }
    public decimal Cantidad { get; set; }
    public decimal PrecioUnitario { get; set; }
    public decimal Descuento { get; set; }
    public decimal PorcentajeImpuesto { get; set; }
    public decimal Subtotal { get; set; }
    public decimal Impuesto { get; set; }
    public decimal Total { get; set; }
}

public class Pago
{
    public long Id { get; set; }
    public long VentaId { get; set; }
    public string Metodo { get; set; } = null!;
    public decimal Monto { get; set; }
    public string? Referencia { get; set; }
    public DateTime Fecha { get; set; }
}
