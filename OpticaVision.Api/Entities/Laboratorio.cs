namespace OpticaVision.Api.Entities;

public class OrdenTrabajoLab
{
    public long Id { get; set; }
    public string Numero { get; set; } = null!;
    public long RecetaId { get; set; }
    public long PacienteId { get; set; }
    public Paciente Paciente { get; set; } = null!;
    public long SucursalId { get; set; }
    public long BodegaConsumoId { get; set; }
    public long? VentaId { get; set; }
    public string Estado { get; set; } = "PENDIENTE";
    public string? Tratamientos { get; set; }
    public string? TecnicoId { get; set; }
    public DateOnly? FechaPromesa { get; set; }
    public DateTime? FechaInicio { get; set; }
    public DateTime? FechaFin { get; set; }
    public DateTime? FechaEntrega { get; set; }
    public string? Observaciones { get; set; }
    public string? CreadoPor { get; set; }
    public List<OrdenTrabajoLabDetalle> Detalles { get; set; } = [];
}

public class OrdenTrabajoLabDetalle
{
    public long Id { get; set; }
    public long OrdenId { get; set; }
    public long ArticuloId { get; set; }
    public Articulo Articulo { get; set; } = null!;
    public string Rol { get; set; } = null!;               // MONTURA | LENTE_OD | LENTE_OI | INSUMO
    public decimal Cantidad { get; set; } = 1;
    public bool Consumido { get; set; }
    public long? MovimientoId { get; set; }
}
