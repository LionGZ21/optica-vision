namespace OpticaVision.Api.Controllers;

[Route("api")]
public class BodegasController(AppDbContext db) : ApiControllerBase
{
    static readonly string[] TiposSucursal = ["VENTA", "ALMACENAMIENTO"];
    static readonly string[] TiposBodega = ["VENTA", "ALMACEN", "TRANSITO"];

    public record SucursalDto(string Codigo, string Nombre, string Tipo, string? Direccion, string? Ciudad, string? Telefono, bool Activa = true);
    public record BodegaDto(long? SucursalId, string Codigo, string Nombre, string Tipo, string? PlacaVehiculo, bool Activa = true);

    // ---------------- Sucursales ----------------
    [HttpGet("sucursales")]
    public async Task<IActionResult> Sucursales() =>
        Ok(await db.Sucursales.AsNoTracking().OrderBy(s => s.Nombre).ToListAsync());

    [HttpPost("sucursales")]
    [Authorize(Roles = Grupos.Direccion)]
    public async Task<IActionResult> CrearSucursal(SucursalDto dto)
    {
        if (!TiposSucursal.Contains(dto.Tipo)) return Falla("Tipo de sucursal inválido (VENTA o ALMACENAMIENTO).");
        var s = new Sucursal
        {
            Codigo = dto.Codigo.Trim().ToUpperInvariant(), Nombre = dto.Nombre.Trim(), Tipo = dto.Tipo,
            Direccion = dto.Direccion, Ciudad = dto.Ciudad, Telefono = dto.Telefono, Activa = dto.Activa
        };
        db.Sucursales.Add(s);
        await db.SaveChangesAsync();
        return Creado(s);
    }

    [HttpPut("sucursales/{id:long}")]
    [Authorize(Roles = Grupos.Direccion)]
    public async Task<IActionResult> EditarSucursal(long id, SucursalDto dto)
    {
        var s = await db.Sucursales.FindAsync(id);
        if (s is null) return NotFound();
        s.Nombre = dto.Nombre.Trim(); s.Direccion = dto.Direccion; s.Ciudad = dto.Ciudad;
        s.Telefono = dto.Telefono; s.Activa = dto.Activa;
        await db.SaveChangesAsync();
        return Ok(s);
    }

    // ---------------- Bodegas ----------------
    [HttpGet("bodegas")]
    public async Task<IActionResult> Bodegas(string? tipo, long? sucursalId, bool? activa)
    {
        var q = db.Bodegas.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(tipo)) q = q.Where(b => b.Tipo == tipo);
        if (sucursalId is not null) q = q.Where(b => b.SucursalId == sucursalId);
        if (activa is not null) q = q.Where(b => b.Activa == activa);

        var items = await q.OrderBy(b => b.Nombre).Select(b => new
        {
            b.Id, b.Codigo, b.Nombre, b.Tipo, b.PlacaVehiculo, b.Activa, b.SucursalId,
            Sucursal = b.Sucursal != null ? b.Sucursal.Nombre : null
        }).ToListAsync();
        return Ok(items);
    }

    [HttpPost("bodegas")]
    [Authorize(Roles = Grupos.Direccion)]
    public async Task<IActionResult> CrearBodega(BodegaDto dto)
    {
        if (!TiposBodega.Contains(dto.Tipo)) return Falla("Tipo de bodega inválido (VENTA, ALMACEN o TRANSITO).");
        if (dto.Tipo == "TRANSITO" && dto.SucursalId is not null) return Falla("La bodega de tránsito no pertenece a una sucursal.");
        if (dto.Tipo != "TRANSITO" && dto.SucursalId is null) return Falla("Las bodegas de venta y almacén requieren sucursal.");

        var b = new Bodega
        {
            SucursalId = dto.SucursalId, Codigo = dto.Codigo.Trim().ToUpperInvariant(), Nombre = dto.Nombre.Trim(),
            Tipo = dto.Tipo, PlacaVehiculo = dto.PlacaVehiculo, Activa = dto.Activa
        };
        db.Bodegas.Add(b);
        await db.SaveChangesAsync();
        return Creado(new { b.Id, b.Codigo, b.Nombre, b.Tipo });
    }

    [HttpPut("bodegas/{id:long}")]
    [Authorize(Roles = Grupos.Direccion)]
    public async Task<IActionResult> EditarBodega(long id, BodegaDto dto)
    {
        var b = await db.Bodegas.FindAsync(id);
        if (b is null) return NotFound();
        b.Nombre = dto.Nombre.Trim(); b.PlacaVehiculo = dto.PlacaVehiculo; b.Activa = dto.Activa;
        await db.SaveChangesAsync();
        return Ok(new { b.Id, b.Codigo, b.Nombre, b.Tipo, b.Activa });
    }
}
