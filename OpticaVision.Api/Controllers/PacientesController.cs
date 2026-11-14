namespace OpticaVision.Api.Controllers;

[Route("api/pacientes")]
public class PacientesController(AppDbContext db) : ApiControllerBase
{
    public record PacienteDto(
        string DocumentoIdentidad, string Nombres, string Apellidos, DateOnly FechaNacimiento,
        string? Sexo, string? Telefono, string? Email, string? Direccion, string? Ocupacion, bool Activo = true);

    [HttpGet]
    [Authorize(Roles = Grupos.Pacientes)]
    public async Task<IActionResult> Listar(string? q, bool? activo, int page = 1, int pageSize = 25)
    {
        var (p, size) = Pag(page, pageSize);
        var query = db.Pacientes.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var like = $"%{q.Trim()}%";
            query = query.Where(x => EF.Functions.ILike(x.Nombres, like) || EF.Functions.ILike(x.Apellidos, like)
                                     || EF.Functions.ILike(x.DocumentoIdentidad, like));
        }
        if (activo is not null) query = query.Where(x => x.Activo == activo);

        var total = await query.CountAsync();
        var items = await query.OrderBy(x => x.Apellidos).ThenBy(x => x.Nombres)
            .Skip((p - 1) * size).Take(size).ToListAsync();
        return Ok(new { total, page = p, pageSize = size, items });
    }

    [HttpGet("{id:long}")]
    [Authorize(Roles = Grupos.Pacientes)]
    public async Task<IActionResult> Obtener(long id)
    {
        var x = await db.Pacientes.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
        return x is null ? NotFound() : Ok(x);
    }

    /// <summary>Crea el paciente y su expediente clínico en una sola transacción.</summary>
    [HttpPost]
    [Authorize(Roles = Grupos.Agenda)]
    public async Task<IActionResult> Crear(PacienteDto dto)
    {
        var error = Validar(dto);
        if (error is not null) return Falla(error);

        var p = new Paciente { DocumentoIdentidad = dto.DocumentoIdentidad.Trim() };
        Aplicar(p, dto);
        db.Pacientes.Add(p);
        db.Expedientes.Add(new ExpedienteClinico { Paciente = p });
        await db.SaveChangesAsync();
        return Creado(new { p.Id, p.DocumentoIdentidad, p.Nombres, p.Apellidos });
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = Grupos.Agenda)]
    public async Task<IActionResult> Editar(long id, PacienteDto dto)
    {
        var error = Validar(dto);
        if (error is not null) return Falla(error);

        var p = await db.Pacientes.FindAsync(id);
        if (p is null) return NotFound();
        p.DocumentoIdentidad = dto.DocumentoIdentidad.Trim();
        Aplicar(p, dto);
        await db.SaveChangesAsync();
        return Ok(p);
    }

    private static string? Validar(PacienteDto d)
    {
        if (string.IsNullOrWhiteSpace(d.DocumentoIdentidad)) return "El documento de identidad es obligatorio.";
        if (string.IsNullOrWhiteSpace(d.Nombres) || string.IsNullOrWhiteSpace(d.Apellidos)) return "Nombres y apellidos son obligatorios.";
        if (d.FechaNacimiento > DateOnly.FromDateTime(DateTime.UtcNow)) return "La fecha de nacimiento no puede ser futura.";
        if (d.Sexo is not null && d.Sexo is not ("M" or "F" or "O")) return "Sexo inválido (M, F u O).";
        return null;
    }

    private static void Aplicar(Paciente p, PacienteDto d)
    {
        p.Nombres = d.Nombres.Trim();
        p.Apellidos = d.Apellidos.Trim();
        p.FechaNacimiento = d.FechaNacimiento;
        p.Sexo = d.Sexo;
        p.Telefono = d.Telefono;
        p.Email = d.Email;
        p.Direccion = d.Direccion;
        p.Ocupacion = d.Ocupacion;
        p.Activo = d.Activo;
    }
}
