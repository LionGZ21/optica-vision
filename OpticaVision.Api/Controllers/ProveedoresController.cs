namespace OpticaVision.Api.Controllers;

[Route("api/proveedores")]
public class ProveedoresController(AppDbContext db) : ApiControllerBase
{
    public record ProveedorDto(
        string Codigo, string RazonSocial, string? Ruc, string? Contacto,
        string? Telefono, string? Email, string? Direccion, int DiasCredito = 0, bool Activo = true);

    [HttpGet]
    public async Task<IActionResult> Listar(string? q, bool? activo)
    {
        var query = db.Proveedores.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var like = $"%{q.Trim()}%";
            query = query.Where(p => EF.Functions.ILike(p.RazonSocial, like) || EF.Functions.ILike(p.Codigo, like));
        }
        if (activo is not null) query = query.Where(p => p.Activo == activo);
        return Ok(await query.OrderBy(p => p.RazonSocial).ToListAsync());
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Obtener(long id)
    {
        var p = await db.Proveedores.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return p is null ? NotFound() : Ok(p);
    }

    [HttpPost]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> Crear(ProveedorDto dto)
    {
        var p = new Proveedor();
        Aplicar(p, dto);
        p.Codigo = dto.Codigo.Trim().ToUpperInvariant();
        db.Proveedores.Add(p);
        await db.SaveChangesAsync();
        return Creado(p);
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> Editar(long id, ProveedorDto dto)
    {
        var p = await db.Proveedores.FindAsync(id);
        if (p is null) return NotFound();
        Aplicar(p, dto);
        await db.SaveChangesAsync();
        return Ok(p);
    }

    private static void Aplicar(Proveedor p, ProveedorDto d)
    {
        p.RazonSocial = d.RazonSocial.Trim();
        p.Ruc = string.IsNullOrWhiteSpace(d.Ruc) ? null : d.Ruc.Trim();
        p.Contacto = d.Contacto; p.Telefono = d.Telefono; p.Email = d.Email; p.Direccion = d.Direccion;
        p.DiasCredito = Math.Max(0, d.DiasCredito);
        p.Activo = d.Activo;
    }
}
