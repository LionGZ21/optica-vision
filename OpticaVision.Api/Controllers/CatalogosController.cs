namespace OpticaVision.Api.Controllers;

[Route("api/catalogos")]
public class CatalogosController(AppDbContext db) : ApiControllerBase
{
    public record MarcaDto(string Nombre, bool Activa = true);
    public record ImpuestoDto(string Nombre, decimal Porcentaje, bool Activo = true);
    public record ListaPrecioDto(string Codigo, string Nombre, string? Moneda, bool EsPredeterminada, bool Activa = true);

    // ---------------- Marcas ----------------
    [HttpGet("marcas")]
    public async Task<IActionResult> Marcas(bool? activa)
    {
        var q = db.Marcas.AsNoTracking().AsQueryable();
        if (activa is not null) q = q.Where(m => m.Activa == activa);
        return Ok(await q.OrderBy(m => m.Nombre).ToListAsync());
    }

    [HttpPost("marcas")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> CrearMarca(MarcaDto dto)
    {
        var m = new Marca { Nombre = dto.Nombre.Trim(), Activa = dto.Activa };
        db.Marcas.Add(m);
        await db.SaveChangesAsync();
        return Creado(m);
    }

    [HttpPut("marcas/{id:long}")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> EditarMarca(long id, MarcaDto dto)
    {
        var m = await db.Marcas.FindAsync(id);
        if (m is null) return NotFound();
        m.Nombre = dto.Nombre.Trim();
        m.Activa = dto.Activa;
        await db.SaveChangesAsync();
        return Ok(m);
    }

    // ---------------- Impuestos ----------------
    [HttpGet("impuestos")]
    public async Task<IActionResult> Impuestos() =>
        Ok(await db.Impuestos.AsNoTracking().OrderBy(i => i.Porcentaje).ToListAsync());

    [HttpPost("impuestos")]
    [Authorize(Roles = Grupos.Direccion)]
    public async Task<IActionResult> CrearImpuesto(ImpuestoDto dto)
    {
        if (dto.Porcentaje is < 0 or > 100) return Falla("El porcentaje debe estar entre 0 y 100.");
        var i = new Impuesto { Nombre = dto.Nombre.Trim(), Porcentaje = dto.Porcentaje, Activo = dto.Activo };
        db.Impuestos.Add(i);
        await db.SaveChangesAsync();
        return Creado(i);
    }

    // ---------------- Unidades de medida ----------------
    [HttpGet("unidades")]
    public async Task<IActionResult> Unidades() =>
        Ok(await db.Unidades.AsNoTracking().OrderBy(u => u.FactorBase).ToListAsync());

    // ---------------- Listas de precio ----------------
    [HttpGet("listas-precio")]
    public async Task<IActionResult> ListasPrecio() =>
        Ok(await db.ListasPrecio.AsNoTracking().OrderBy(l => l.Nombre).ToListAsync());

    [HttpPost("listas-precio")]
    [Authorize(Roles = Grupos.Direccion)]
    public async Task<IActionResult> CrearLista(ListaPrecioDto dto)
    {
        await using var tx = await db.Database.BeginTransactionAsync();
        if (dto.EsPredeterminada)
            await db.ListasPrecio.Where(l => l.EsPredeterminada)
                .ExecuteUpdateAsync(s => s.SetProperty(l => l.EsPredeterminada, false));

        var l = new ListaPrecio
        {
            Codigo = dto.Codigo.Trim().ToUpperInvariant(),
            Nombre = dto.Nombre.Trim(),
            Moneda = string.IsNullOrWhiteSpace(dto.Moneda) ? "NIO" : dto.Moneda.Trim().ToUpperInvariant(),
            EsPredeterminada = dto.EsPredeterminada,
            Activa = dto.Activa
        };
        db.ListasPrecio.Add(l);
        await db.SaveChangesAsync();
        await tx.CommitAsync();
        return Creado(l);
    }
}
