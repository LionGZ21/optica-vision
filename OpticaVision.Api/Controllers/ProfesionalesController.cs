namespace OpticaVision.Api.Controllers;

[Route("api/profesionales")]
public class ProfesionalesController(AppDbContext db) : ApiControllerBase
{
    public record ProfesionalDto(
        string Nombres, string Apellidos, string Tipo, string? NumeroColegiado,
        string? Telefono, string? Email, string? UsuarioId, bool Activo = true);

    [HttpGet]
    [Authorize(Roles = Grupos.Agenda)]
    public async Task<IActionResult> Listar(string? tipo, bool? activo)
    {
        var q = db.Profesionales.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(tipo)) q = q.Where(p => p.Tipo == tipo);
        if (activo is not null) q = q.Where(p => p.Activo == activo);
        return Ok(await q.OrderBy(p => p.Apellidos).ThenBy(p => p.Nombres).ToListAsync());
    }

    [HttpPost]
    [Authorize(Roles = Grupos.Direccion)]
    public async Task<IActionResult> Crear(ProfesionalDto dto)
    {
        if (dto.Tipo is not ("OFTALMOLOGO" or "OPTOMETRA")) return Falla("Tipo inválido (OFTALMOLOGO u OPTOMETRA).");
        var p = new Profesional();
        Aplicar(p, dto);
        db.Profesionales.Add(p);
        await db.SaveChangesAsync();
        return Creado(p);
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = Grupos.Direccion)]
    public async Task<IActionResult> Editar(long id, ProfesionalDto dto)
    {
        if (dto.Tipo is not ("OFTALMOLOGO" or "OPTOMETRA")) return Falla("Tipo inválido (OFTALMOLOGO u OPTOMETRA).");
        var p = await db.Profesionales.FindAsync(id);
        if (p is null) return NotFound();
        Aplicar(p, dto);
        await db.SaveChangesAsync();
        return Ok(p);
    }

    private static void Aplicar(Profesional p, ProfesionalDto d)
    {
        p.Nombres = d.Nombres.Trim();
        p.Apellidos = d.Apellidos.Trim();
        p.Tipo = d.Tipo;
        p.NumeroColegiado = string.IsNullOrWhiteSpace(d.NumeroColegiado) ? null : d.NumeroColegiado.Trim();
        p.Telefono = d.Telefono;
        p.Email = d.Email;
        p.UsuarioId = string.IsNullOrWhiteSpace(d.UsuarioId) ? null : d.UsuarioId;
        p.Activo = d.Activo;
    }
}
