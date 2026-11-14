namespace OpticaVision.Api.Controllers;

[Route("api/taxonomia")]
public class TaxonomiaController(AppDbContext db) : ApiControllerBase
{
    public record NodoDto(string Codigo, string Nombre, bool Activo = true);
    public record NodoHijoDto(long PadreId, string Codigo, string Nombre, bool Activo = true);

    /// <summary>Árbol completo: Departamento > Sección > Familia > Subfamilia.</summary>
    [HttpGet("arbol")]
    public async Task<IActionResult> Arbol()
    {
        var data = await db.Departamentos.AsNoTracking().OrderBy(d => d.Nombre).Select(d => new
        {
            d.Id, d.Codigo, d.Nombre, d.Activo,
            Secciones = d.Secciones.OrderBy(s => s.Nombre).Select(s => new
            {
                s.Id, s.Codigo, s.Nombre, s.Activo,
                Familias = s.Familias.OrderBy(f => f.Nombre).Select(f => new
                {
                    f.Id, f.Codigo, f.Nombre, f.Activo,
                    Subfamilias = f.Subfamilias.OrderBy(x => x.Nombre)
                        .Select(x => new { x.Id, x.Codigo, x.Nombre, x.Activo })
                })
            })
        }).ToListAsync();
        return Ok(data);
    }

    [HttpPost("departamentos")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> CrearDepartamento(NodoDto dto)
    {
        var e = new Departamento { Codigo = dto.Codigo.Trim().ToUpperInvariant(), Nombre = dto.Nombre.Trim(), Activo = dto.Activo };
        db.Departamentos.Add(e);
        await db.SaveChangesAsync();
        return Creado(new { e.Id, e.Codigo, e.Nombre });
    }

    [HttpPost("secciones")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> CrearSeccion(NodoHijoDto dto)
    {
        var e = new Seccion { DepartamentoId = dto.PadreId, Codigo = dto.Codigo.Trim().ToUpperInvariant(), Nombre = dto.Nombre.Trim(), Activo = dto.Activo };
        db.Secciones.Add(e);
        await db.SaveChangesAsync();
        return Creado(new { e.Id, e.Codigo, e.Nombre });
    }

    [HttpPost("familias")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> CrearFamilia(NodoHijoDto dto)
    {
        var e = new Familia { SeccionId = dto.PadreId, Codigo = dto.Codigo.Trim().ToUpperInvariant(), Nombre = dto.Nombre.Trim(), Activo = dto.Activo };
        db.Familias.Add(e);
        await db.SaveChangesAsync();
        return Creado(new { e.Id, e.Codigo, e.Nombre });
    }

    [HttpPost("subfamilias")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> CrearSubfamilia(NodoHijoDto dto)
    {
        var e = new Subfamilia { FamiliaId = dto.PadreId, Codigo = dto.Codigo.Trim().ToUpperInvariant(), Nombre = dto.Nombre.Trim(), Activo = dto.Activo };
        db.Subfamilias.Add(e);
        await db.SaveChangesAsync();
        return Creado(new { e.Id, e.Codigo, e.Nombre });
    }
}
