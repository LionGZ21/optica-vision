namespace OpticaVision.Api.Controllers;

[Route("api/consignaciones")]
[Authorize(Roles = Grupos.Inventario)]
public class ConsignacionesController(AppDbContext db) : ApiControllerBase
{
    public record LineaConsignacionDto(long ArticuloId, decimal Cantidad, decimal CostoUnitario);
    public record CrearConsignacionDto(long ProveedorId, long BodegaId, string? Observacion, List<LineaConsignacionDto> Lineas);
    public record DevolverDto(decimal Cantidad);
    public record LineaLiquidacionDto(long DetalleId, decimal Cantidad);
    public record LiquidacionDto(List<LineaLiquidacionDto> Lineas);

    [HttpGet]
    public async Task<IActionResult> Listar(string? estado, long? proveedorId, int page = 1, int pageSize = 25)
    {
        var (p, size) = Pag(page, pageSize);
        var q = db.Consignaciones.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(estado)) q = q.Where(c => c.Estado == estado);
        if (proveedorId is not null) q = q.Where(c => c.ProveedorId == proveedorId);

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(c => c.Id).Skip((p - 1) * size).Take(size).Select(c => new
        {
            c.Id, c.Numero, c.Estado, c.Fecha, c.BodegaId,
            c.ProveedorId, Proveedor = c.Proveedor.RazonSocial,
            Lineas = c.Detalles.Count
        }).ToListAsync();
        return Ok(new { total, page = p, pageSize = size, items });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Obtener(long id)
    {
        var c = await db.Consignaciones.AsNoTracking().Where(x => x.Id == id).Select(x => new
        {
            x.Id, x.Numero, x.Estado, x.Fecha, x.Observacion, x.BodegaId,
            x.ProveedorId, Proveedor = x.Proveedor.RazonSocial,
            Detalles = x.Detalles.Select(d => new
            {
                d.Id, d.ArticuloId, Codigo = d.Articulo.Codigo, Articulo = d.Articulo.Nombre,
                d.CantidadRecibida, d.CantidadVendida, d.CantidadDevuelta,
                Pendiente = d.CantidadRecibida - d.CantidadVendida - d.CantidadDevuelta,
                d.CostoUnitario
            })
        }).FirstOrDefaultAsync();
        return c is null ? NotFound() : Ok(c);
    }

    [HttpPost]
    public async Task<IActionResult> Crear(CrearConsignacionDto dto)
    {
        if (dto.Lineas is null || dto.Lineas.Count == 0) return Falla("La consignación debe tener al menos un artículo.");
        if (dto.Lineas.Any(l => l.Cantidad <= 0 || l.CostoUnitario < 0)) return Falla("Cantidades y costos inválidos.");
        if (dto.Lineas.GroupBy(l => l.ArticuloId).Any(g => g.Count() > 1)) return Falla("Hay artículos repetidos.");

        var c = new Consignacion
        {
            ProveedorId = dto.ProveedorId,
            BodegaId = dto.BodegaId,
            Observacion = dto.Observacion,
            CreadoPor = UserId,
            Detalles = dto.Lineas.Select(l => new ConsignacionDetalle
            {
                ArticuloId = l.ArticuloId, CantidadRecibida = l.Cantidad, CostoUnitario = l.CostoUnitario
            }).ToList()
        };
        db.Consignaciones.Add(c);
        await db.SaveChangesAsync();
        return Creado(new { c.Id, c.Numero, c.Estado });
    }

    /// <summary>Recibe la mercadería: genera ENTRADA_CONSIGNACION en el Kardex.</summary>
    [HttpPost("{id:long}/recibir")]
    public async Task<IActionResult> Recibir(long id)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($"select fn_recibir_consignacion({id}::bigint, {UserId}::text)");
        return NoContent();
    }

    /// <summary>Devuelve al proveedor mercadería no vendida.</summary>
    [HttpPost("detalles/{detalleId:long}/devolver")]
    public async Task<IActionResult> Devolver(long detalleId, DevolverDto dto)
    {
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"select fn_devolver_consignacion({detalleId}::bigint, {dto.Cantidad}::numeric, {UserId}::text)");
        return NoContent();
    }

    /// <summary>Liquida lo vendido para pagar al proveedor (el trigger acumula cantidad_vendida y el total).</summary>
    [HttpPost("{id:long}/liquidaciones")]
    public async Task<IActionResult> Liquidar(long id, LiquidacionDto dto)
    {
        if (dto.Lineas is null || dto.Lineas.Count == 0) return Falla("Indique al menos una línea a liquidar.");
        if (dto.Lineas.Any(l => l.Cantidad <= 0)) return Falla("Las cantidades deben ser mayores que cero.");

        var c = await db.Consignaciones.Include(x => x.Detalles).FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound();
        if (c.Estado != "ABIERTA") return Conflict(new { mensaje = "Solo se liquidan consignaciones ABIERTAS." });

        var liq = new ConsignacionLiquidacion { ConsignacionId = id, CreadoPor = UserId };
        foreach (var l in dto.Lineas)
        {
            var det = c.Detalles.FirstOrDefault(d => d.Id == l.DetalleId);
            if (det is null) return Falla($"El detalle {l.DetalleId} no pertenece a esta consignación.");
            liq.Detalles.Add(new ConsignacionLiquidacionDetalle
            {
                DetalleId = det.Id, Cantidad = l.Cantidad, CostoUnitario = det.CostoUnitario
            });
        }

        db.Liquidaciones.Add(liq);
        await db.SaveChangesAsync();      // el CHECK impide liquidar más de lo recibido/pendiente

        var total = await db.Liquidaciones.AsNoTracking().Where(x => x.Id == liq.Id).Select(x => x.Total).FirstAsync();
        return Creado(new { liq.Id, liq.Numero, Total = total });
    }

    [HttpPost("{id:long}/cerrar")]
    public async Task<IActionResult> Cerrar(long id)
    {
        var c = await db.Consignaciones.Include(x => x.Detalles).FirstOrDefaultAsync(x => x.Id == id);
        if (c is null) return NotFound();
        if (c.Estado != "ABIERTA") return Conflict(new { mensaje = "Solo se cierran consignaciones ABIERTAS." });
        if (c.Detalles.Any(d => d.CantidadRecibida - d.CantidadVendida - d.CantidadDevuelta > 0))
            return Conflict(new { mensaje = "Aún hay mercadería pendiente: liquídela o devuélvala antes de cerrar." });
        c.Estado = "CERRADA";
        await db.SaveChangesAsync();
        return NoContent();
    }
}
