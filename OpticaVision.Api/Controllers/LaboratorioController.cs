namespace OpticaVision.Api.Controllers;

[Route("api/laboratorio")]
public class LaboratorioController(AppDbContext db) : ApiControllerBase
{
    static readonly List<string> Roles_ = ["MONTURA", "LENTE_OD", "LENTE_OI", "INSUMO"];

    // Flujo permitido. EN_PROCESO se alcanza solo al consumir inventario (POST .../consumir).
    static readonly Dictionary<string, string[]> Transiciones = new()
    {
        ["PENDIENTE"] = ["CANCELADA"],
        ["EN_PROCESO"] = ["CONTROL_CALIDAD"],
        ["CONTROL_CALIDAD"] = ["LISTA", "EN_PROCESO"],
        ["LISTA"] = ["ENTREGADA"]
    };

    public record LineaOrdenDto(long ArticuloId, string Rol, decimal Cantidad = 1);
    public record CrearOrdenDto(
        long RecetaId, long SucursalId, long BodegaConsumoId, long? VentaId,
        string? Tratamientos, DateOnly? FechaPromesa, string? Observaciones, List<LineaOrdenDto> Detalles);
    public record EstadoDto(string Estado);

    [HttpGet("ordenes")]
    [Authorize(Roles = Grupos.OrdenesLab)]
    public async Task<IActionResult> Listar(string? estado, long? sucursalId, int page = 1, int pageSize = 25)
    {
        var (p, size) = Pag(page, pageSize);
        var q = db.OrdenesLab.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(estado)) q = q.Where(o => o.Estado == estado);
        if (sucursalId is not null) q = q.Where(o => o.SucursalId == sucursalId);

        var total = await q.CountAsync();
        var items = await q.OrderBy(o => o.FechaPromesa).ThenBy(o => o.Id).Skip((p - 1) * size).Take(size).Select(o => new
        {
            o.Id, o.Numero, o.Estado, o.FechaPromesa, o.SucursalId, o.RecetaId, o.VentaId,
            o.PacienteId, Paciente = o.Paciente.Nombres + " " + o.Paciente.Apellidos
        }).ToListAsync();
        return Ok(new { total, page = p, pageSize = size, items });
    }

    [HttpGet("ordenes/{id:long}")]
    [Authorize(Roles = Grupos.OrdenesLab)]
    public async Task<IActionResult> Obtener(long id)
    {
        var o = await db.OrdenesLab.AsNoTracking().Where(x => x.Id == id).Select(x => new
        {
            x.Id, x.Numero, x.Estado, x.Tratamientos, x.Observaciones, x.FechaPromesa,
            x.FechaInicio, x.FechaFin, x.FechaEntrega, x.RecetaId, x.VentaId, x.SucursalId, x.BodegaConsumoId, x.TecnicoId,
            x.PacienteId, Paciente = x.Paciente.Nombres + " " + x.Paciente.Apellidos,
            Detalles = x.Detalles.Select(d => new
            {
                d.Id, d.ArticuloId, Codigo = d.Articulo.Codigo, Articulo = d.Articulo.Nombre,
                d.Rol, d.Cantidad, d.Consumido, d.MovimientoId
            })
        }).FirstOrDefaultAsync();
        return o is null ? NotFound() : Ok(o);
    }

    /// <summary>Crea la orden a partir de una receta e indica la montura y los cristales en blanco a consumir.</summary>
    [HttpPost("ordenes")]
    [Authorize(Roles = Grupos.OrdenesLab)]
    public async Task<IActionResult> Crear(CrearOrdenDto dto)
    {
        if (dto.Detalles is null || dto.Detalles.Count == 0) return Falla("La orden debe indicar al menos un artículo (montura o lentes).");
        if (dto.Detalles.Any(d => d.Cantidad <= 0 || !Roles_.Contains(d.Rol)))
            return Falla($"Línea inválida. Roles permitidos: {string.Join(", ", Roles_)}; cantidad > 0.");

        var pacienteId = await db.Recetas.AsNoTracking().Where(r => r.Id == dto.RecetaId)
            .Select(r => (long?)r.PacienteId).FirstOrDefaultAsync();
        if (pacienteId is null) return Falla("La receta indicada no existe.");

        var bodega = await db.Bodegas.AsNoTracking().FirstOrDefaultAsync(b => b.Id == dto.BodegaConsumoId && b.Activa);
        if (bodega is null || bodega.Tipo == "TRANSITO") return Falla("La bodega de consumo es inválida (no puede ser de tránsito).");

        var o = new OrdenTrabajoLab
        {
            RecetaId = dto.RecetaId,
            PacienteId = pacienteId.Value,
            SucursalId = dto.SucursalId,
            BodegaConsumoId = dto.BodegaConsumoId,
            VentaId = dto.VentaId,
            Tratamientos = dto.Tratamientos,
            FechaPromesa = dto.FechaPromesa,
            Observaciones = dto.Observaciones,
            CreadoPor = UserId,
            Detalles = dto.Detalles.Select(d => new OrdenTrabajoLabDetalle
            {
                ArticuloId = d.ArticuloId, Rol = d.Rol, Cantidad = d.Cantidad
            }).ToList()
        };
        db.OrdenesLab.Add(o);
        await db.SaveChangesAsync();
        return Creado(new { o.Id, o.Numero, o.Estado });
    }

    /// <summary>Descuenta del inventario la montura y los cristales (CONSUMO_LABORATORIO) y pasa a EN_PROCESO.</summary>
    [HttpPost("ordenes/{id:long}/consumir")]
    [Authorize(Roles = Grupos.Laboratorio)]
    public async Task<IActionResult> Consumir(long id)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($"select fn_consumir_orden_lab({id}::bigint, {UserId}::text)");
        return NoContent();
    }

    [HttpPut("ordenes/{id:long}/estado")]
    [Authorize(Roles = Grupos.Laboratorio)]
    public async Task<IActionResult> CambiarEstado(long id, EstadoDto dto)
    {
        var o = await db.OrdenesLab.FindAsync(id);
        if (o is null) return NotFound();

        if (!Transiciones.TryGetValue(o.Estado, out var permitidos) || !permitidos.Contains(dto.Estado))
            return Conflict(new { mensaje = $"No se puede pasar de {o.Estado} a {dto.Estado}." });

        o.Estado = dto.Estado;
        if (dto.Estado == "CONTROL_CALIDAD") o.TecnicoId = UserId;
        if (dto.Estado == "LISTA") o.FechaFin = DateTime.UtcNow;
        if (dto.Estado == "ENTREGADA") o.FechaEntrega = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return Ok(new { o.Id, o.Estado });
    }
}
