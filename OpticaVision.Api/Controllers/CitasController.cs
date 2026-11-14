namespace OpticaVision.Api.Controllers;

[Route("api/citas")]
[Authorize(Roles = Grupos.Agenda)]
public class CitasController(AppDbContext db) : ApiControllerBase
{
    static readonly List<string> Estados = ["PROGRAMADA", "CONFIRMADA", "EN_ATENCION", "ATENDIDA", "CANCELADA", "NO_ASISTIO"];

    public record CrearCitaDto(
        long PacienteId, long ProfesionalId, long SucursalId,
        DateTimeOffset Inicio, int DuracionMin = 30, string? Motivo = null);
    public record ReprogramarDto(DateTimeOffset Inicio, int DuracionMin = 30);
    public record EstadoDto(string Estado);

    /// <summary>Agenda en un rango de fechas (por defecto: hoy + 7 días).</summary>
    [HttpGet]
    public async Task<IActionResult> Agenda(DateTimeOffset? desde, DateTimeOffset? hasta, long? profesionalId, long? sucursalId)
    {
        var d = (desde ?? new DateTimeOffset(DateTime.UtcNow.Date, TimeSpan.Zero)).UtcDateTime;
        var h = (hasta ?? new DateTimeOffset(d, TimeSpan.Zero).AddDays(7)).UtcDateTime;

        var q = db.Citas.AsNoTracking().Where(c => c.Inicio < h && c.Fin > d);
        if (profesionalId is not null) q = q.Where(c => c.ProfesionalId == profesionalId);
        if (sucursalId is not null) q = q.Where(c => c.SucursalId == sucursalId);

        var items = await q.OrderBy(c => c.Inicio).Select(c => new
        {
            c.Id, c.Inicio, c.Fin, c.Estado, c.Motivo, c.SucursalId,
            c.PacienteId, Paciente = c.Paciente.Nombres + " " + c.Paciente.Apellidos,
            c.ProfesionalId, Profesional = c.Profesional.Nombres + " " + c.Profesional.Apellidos
        }).ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Crear(CrearCitaDto dto)
    {
        if (dto.DuracionMin is < 5 or > 240) return Falla("La duración debe estar entre 5 y 240 minutos.");

        var prof = await db.Profesionales.AsNoTracking().FirstOrDefaultAsync(p => p.Id == dto.ProfesionalId && p.Activo);
        if (prof is null) return Falla("Profesional inexistente o inactivo.");
        if (!await db.Pacientes.AnyAsync(p => p.Id == dto.PacienteId && p.Activo)) return Falla("Paciente inexistente o inactivo.");

        var inicio = dto.Inicio.UtcDateTime;
        var c = new Cita
        {
            PacienteId = dto.PacienteId,
            ProfesionalId = dto.ProfesionalId,
            SucursalId = dto.SucursalId,
            Inicio = inicio,
            Fin = inicio.AddMinutes(dto.DuracionMin),
            Motivo = dto.Motivo,
            CreadaPor = UserId
        };
        db.Citas.Add(c);
        await db.SaveChangesAsync();      // si se traslapa con otra cita => 409 (restricción EXCLUDE)
        return Creado(new { c.Id, c.Inicio, c.Fin, c.Estado });
    }

    [HttpPut("{id:long}/reprogramar")]
    public async Task<IActionResult> Reprogramar(long id, ReprogramarDto dto)
    {
        if (dto.DuracionMin is < 5 or > 240) return Falla("La duración debe estar entre 5 y 240 minutos.");
        var c = await db.Citas.FindAsync(id);
        if (c is null) return NotFound();
        if (c.Estado is "ATENDIDA" or "CANCELADA" or "NO_ASISTIO")
            return Conflict(new { mensaje = $"No se puede reprogramar una cita {c.Estado}." });

        c.Inicio = dto.Inicio.UtcDateTime;
        c.Fin = c.Inicio.AddMinutes(dto.DuracionMin);
        c.Estado = "PROGRAMADA";
        await db.SaveChangesAsync();
        return Ok(new { c.Id, c.Inicio, c.Fin, c.Estado });
    }

    [HttpPut("{id:long}/estado")]
    public async Task<IActionResult> CambiarEstado(long id, EstadoDto dto)
    {
        if (!Estados.Contains(dto.Estado)) return Falla($"Estado inválido. Valores: {string.Join(", ", Estados)}.");
        var c = await db.Citas.FindAsync(id);
        if (c is null) return NotFound();
        c.Estado = dto.Estado;
        await db.SaveChangesAsync();
        return Ok(new { c.Id, c.Estado });
    }
}
