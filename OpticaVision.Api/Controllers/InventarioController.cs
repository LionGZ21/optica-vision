namespace OpticaVision.Api.Controllers;

[Route("api/inventario")]
public class InventarioController(AppDbContext db) : ApiControllerBase
{
    static readonly HashSet<string> Entradas = ["ENTRADA", "DEVOLUCION_CLIENTE"];
    static readonly HashSet<string> Salidas = ["SALIDA", "DEFECTO", "DEVOLUCION_PROVEEDOR"];

    /// <summary>Movimiento manual. Cantidad siempre positiva, salvo AJUSTE (con signo).</summary>
    public record MovimientoDto(
        long ArticuloId, long BodegaId, string TipoMovimiento, decimal Cantidad,
        decimal? CostoUnitario, string? Observacion);

    [HttpGet("stock")]
    [Authorize(Roles = Grupos.ConsultaStock)]
    public async Task<IActionResult> Stock(long? articuloId, long? bodegaId, bool soloConExistencia = true, int page = 1, int pageSize = 50)
    {
        var (p, size) = Pag(page, pageSize);
        var q = db.Stocks.AsNoTracking().AsQueryable();
        if (articuloId is not null) q = q.Where(s => s.ArticuloId == articuloId);
        if (bodegaId is not null) q = q.Where(s => s.BodegaId == bodegaId);
        if (soloConExistencia) q = q.Where(s => s.Cantidad > 0);

        var total = await q.CountAsync();
        var items = await q.OrderBy(s => s.Articulo.Nombre).ThenBy(s => s.Bodega.Nombre)
            .Skip((p - 1) * size).Take(size)
            .Select(s => new
            {
                s.ArticuloId, Codigo = s.Articulo.Codigo, Articulo = s.Articulo.Nombre,
                s.BodegaId, Bodega = s.Bodega.Nombre, TipoBodega = s.Bodega.Tipo, s.Cantidad
            }).ToListAsync();
        return Ok(new { total, page = p, pageSize = size, items });
    }

    [HttpGet("stock/bajo-minimo")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> BajoMinimo()
    {
        var items = await db.Articulos.AsNoTracking()
            .Where(a => a.Activo && a.StockMinimo > 0)
            .Select(a => new
            {
                a.Id, a.Codigo, a.Nombre, a.StockMinimo,
                StockTotal = db.Stocks
                    .Where(s => s.ArticuloId == a.Id && s.Bodega.Tipo != "TRANSITO")
                    .Sum(s => (decimal?)s.Cantidad) ?? 0m
            })
            .Where(x => x.StockTotal < x.StockMinimo)
            .OrderBy(x => x.Nombre)
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("kardex")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> Kardex(
        long? articuloId, long? bodegaId, string? tipo, DateTimeOffset? desde, DateTimeOffset? hasta,
        int page = 1, int pageSize = 50)
    {
        var (p, size) = Pag(page, pageSize);
        var q = db.Movimientos.AsNoTracking().AsQueryable();
        if (articuloId is not null) q = q.Where(m => m.ArticuloId == articuloId);
        if (bodegaId is not null) q = q.Where(m => m.BodegaId == bodegaId);
        if (!string.IsNullOrWhiteSpace(tipo)) q = q.Where(m => m.TipoMovimiento == tipo);
        if (desde is not null) { var d = desde.Value.UtcDateTime; q = q.Where(m => m.Fecha >= d); }
        if (hasta is not null) { var h = hasta.Value.UtcDateTime; q = q.Where(m => m.Fecha <= h); }

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(m => m.Fecha).ThenByDescending(m => m.Id)
            .Skip((p - 1) * size).Take(size)
            .Select(m => new
            {
                m.Id, m.Fecha, m.TipoMovimiento, m.Cantidad, m.SaldoAnterior, m.SaldoNuevo, m.CostoUnitario,
                m.ArticuloId, Codigo = m.Articulo.Codigo, Articulo = m.Articulo.Nombre,
                m.BodegaId, Bodega = m.Bodega.Nombre,
                m.DocumentoTipo, m.DocumentoId, m.UsuarioId, m.Observacion
            }).ToListAsync();
        return Ok(new { total, page = p, pageSize = size, items });
    }

    [HttpPost("movimientos")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> RegistrarMovimiento(MovimientoDto dto)
    {
        decimal cantidad;
        if (Entradas.Contains(dto.TipoMovimiento))
        {
            if (dto.Cantidad <= 0) return Falla("La cantidad debe ser mayor que cero.");
            cantidad = dto.Cantidad;
        }
        else if (Salidas.Contains(dto.TipoMovimiento))
        {
            if (dto.Cantidad <= 0) return Falla("La cantidad debe ser mayor que cero.");
            cantidad = -dto.Cantidad;
        }
        else if (dto.TipoMovimiento == "AJUSTE")
        {
            if (dto.Cantidad == 0) return Falla("El ajuste no puede ser cero.");
            if (string.IsNullOrWhiteSpace(dto.Observacion)) return Falla("Todo ajuste requiere una observación.");
            cantidad = dto.Cantidad;     // con signo
        }
        else
        {
            return Falla("Tipo no permitido aquí. Manuales: ENTRADA, SALIDA, DEFECTO, DEVOLUCION_CLIENTE, DEVOLUCION_PROVEEDOR, AJUSTE. " +
                         "Ventas, traslados, consignaciones y laboratorio tienen sus propios flujos.");
        }

        var m = new MovimientoInventario
        {
            ArticuloId = dto.ArticuloId,
            BodegaId = dto.BodegaId,
            TipoMovimiento = dto.TipoMovimiento,
            Cantidad = cantidad,
            CostoUnitario = dto.CostoUnitario,
            Observacion = dto.Observacion,
            DocumentoTipo = "MANUAL",
            UsuarioId = UserId
        };
        db.Movimientos.Add(m);
        await db.SaveChangesAsync();          // el trigger valida reglas y que el stock no quede negativo
        await db.Entry(m).ReloadAsync();      // trae saldo_anterior / saldo_nuevo calculados por la base

        return Creado(new { m.Id, m.Fecha, m.TipoMovimiento, m.Cantidad, m.SaldoAnterior, m.SaldoNuevo });
    }
}
