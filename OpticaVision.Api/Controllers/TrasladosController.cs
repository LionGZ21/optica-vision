namespace OpticaVision.Api.Controllers;

[Route("api/traslados")]
[Authorize(Roles = Grupos.Inventario)]
public class TrasladosController(AppDbContext db) : ApiControllerBase
{
    public record LineaDto(long ArticuloId, decimal Cantidad);
    public record CrearTrasladoDto(
        long BodegaOrigenId, long BodegaTransitoId, long BodegaDestinoId,
        string? Observacion, List<LineaDto> Lineas);

    [HttpGet]
    public async Task<IActionResult> Listar(string? estado, int page = 1, int pageSize = 25)
    {
        var (p, size) = Pag(page, pageSize);
        var q = db.Traslados.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(estado)) q = q.Where(t => t.Estado == estado);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(t => t.Id).Skip((p - 1) * size).Take(size).Select(t => new
        {
            t.Id, t.Numero, t.Estado, t.FechaCreacion, t.FechaDespacho, t.FechaRecepcion,
            t.BodegaOrigenId, t.BodegaTransitoId, t.BodegaDestinoId,
            Lineas = t.Detalles.Count
        }).ToListAsync();
        return Ok(new { total, page = p, pageSize = size, items });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Obtener(long id)
    {
        var t = await db.Traslados.AsNoTracking().Where(x => x.Id == id).Select(x => new
        {
            x.Id, x.Numero, x.Estado, x.Observacion,
            x.BodegaOrigenId, x.BodegaTransitoId, x.BodegaDestinoId,
            x.CreadoPor, x.DespachadoPor, x.RecibidoPor,
            x.FechaCreacion, x.FechaDespacho, x.FechaRecepcion,
            Detalles = x.Detalles.Select(d => new { d.Id, d.ArticuloId, Codigo = d.Articulo.Codigo, Articulo = d.Articulo.Nombre, d.Cantidad })
        }).FirstOrDefaultAsync();
        return t is null ? NotFound() : Ok(t);
    }

    [HttpPost]
    public async Task<IActionResult> Crear(CrearTrasladoDto dto)
    {
        if (dto.Lineas is null || dto.Lineas.Count == 0) return Falla("El traslado debe tener al menos un artículo.");
        if (dto.Lineas.Any(l => l.Cantidad <= 0)) return Falla("Todas las cantidades deben ser mayores que cero.");
        if (dto.Lineas.GroupBy(l => l.ArticuloId).Any(g => g.Count() > 1)) return Falla("Hay artículos repetidos en el traslado.");

        var t = new Traslado
        {
            BodegaOrigenId = dto.BodegaOrigenId,
            BodegaTransitoId = dto.BodegaTransitoId,
            BodegaDestinoId = dto.BodegaDestinoId,
            Observacion = dto.Observacion,
            CreadoPor = UserId,
            Detalles = dto.Lineas.Select(l => new TrasladoDetalle { ArticuloId = l.ArticuloId, Cantidad = l.Cantidad }).ToList()
        };
        db.Traslados.Add(t);
        await db.SaveChangesAsync();      // el trigger valida origen/destino/tránsito
        return Creado(new { t.Id, t.Numero, t.Estado });
    }

    /// <summary>Origen → Bodega de Tránsito (descuenta del origen, entra al camión).</summary>
    [HttpPost("{id:long}/despachar")]
    public async Task<IActionResult> Despachar(long id)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($"select fn_despachar_traslado({id}::bigint, {UserId}::text)");
        return NoContent();
    }

    /// <summary>Bodega de Tránsito → Destino.</summary>
    [HttpPost("{id:long}/recibir")]
    public async Task<IActionResult> Recibir(long id)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($"select fn_recibir_traslado({id}::bigint, {UserId}::text)");
        return NoContent();
    }

    [HttpPost("{id:long}/cancelar")]
    public async Task<IActionResult> Cancelar(long id)
    {
        var t = await db.Traslados.FindAsync(id);
        if (t is null) return NotFound();
        if (t.Estado != "BORRADOR") return Conflict(new { mensaje = "Solo se puede cancelar un traslado en BORRADOR." });
        t.Estado = "CANCELADO";
        await db.SaveChangesAsync();
        return NoContent();
    }
}
