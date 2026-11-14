namespace OpticaVision.Api.Controllers;

[Route("api/expedientes")]
[Authorize(Roles = Grupos.Clinicos)]
public class ExpedientesController(AppDbContext db) : ApiControllerBase
{
    public record ExpedienteDto(
        string? AntecedentesPersonales, string? AntecedentesFamiliares, string? Alergias,
        string? MedicamentosActuales, bool UsaLentesPreviamente, string? Observaciones);

    public record ConsultaDto(
        long? ProfesionalId, long? CitaId, string? MotivoConsulta, string? Anamnesis,
        string? AvScOd, string? AvScOi, string? AvCcOd, string? AvCcOi,
        decimal? PioOd, decimal? PioOi, string? Biomicroscopia, string? FondoDeOjo,
        string? Diagnostico, string? CodigoCie10, string? PlanTratamiento);

    /// <summary>Expediente + historial de consultas (con sus recetas) de un paciente.</summary>
    [HttpGet("paciente/{pacienteId:long}")]
    public async Task<IActionResult> PorPaciente(long pacienteId)
    {
        var exp = await db.Expedientes.AsNoTracking().Where(e => e.PacienteId == pacienteId).Select(e => new
        {
            e.Id, e.Numero, e.AntecedentesPersonales, e.AntecedentesFamiliares, e.Alergias,
            e.MedicamentosActuales, e.UsaLentesPreviamente, e.Observaciones,
            Paciente = new
            {
                e.Paciente.Id, e.Paciente.DocumentoIdentidad, e.Paciente.Nombres,
                e.Paciente.Apellidos, e.Paciente.FechaNacimiento, e.Paciente.Sexo
            }
        }).FirstOrDefaultAsync();
        if (exp is null) return NotFound(new { mensaje = "El paciente no tiene expediente." });

        var consultas = await db.Consultas.AsNoTracking().Where(c => c.ExpedienteId == exp.Id)
            .OrderByDescending(c => c.Fecha).Select(c => new
            {
                c.Id, c.Fecha, c.ProfesionalId, c.MotivoConsulta, c.Diagnostico, c.CodigoCie10,
                c.AvScOd, c.AvScOi, c.AvCcOd, c.AvCcOi, c.PioOd, c.PioOi,
                Recetas = db.Recetas.Where(r => r.ConsultaId == c.Id)
                    .Select(r => new { r.Id, r.Numero, r.FechaEmision }).ToList()
            }).ToListAsync();

        return Ok(new { expediente = exp, consultas });
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Editar(long id, ExpedienteDto dto)
    {
        var e = await db.Expedientes.FindAsync(id);
        if (e is null) return NotFound();
        e.AntecedentesPersonales = dto.AntecedentesPersonales;
        e.AntecedentesFamiliares = dto.AntecedentesFamiliares;
        e.Alergias = dto.Alergias;
        e.MedicamentosActuales = dto.MedicamentosActuales;
        e.UsaLentesPreviamente = dto.UsaLentesPreviamente;
        e.Observaciones = dto.Observaciones;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("consultas/{id:long}")]
    public async Task<IActionResult> ObtenerConsulta(long id)
    {
        var c = await db.Consultas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return c is null ? NotFound() : Ok(c);
    }

    /// <summary>Registra una consulta. Si viene de una cita, la marca como ATENDIDA.</summary>
    [HttpPost("{expedienteId:long}/consultas")]
    public async Task<IActionResult> CrearConsulta(long expedienteId, ConsultaDto dto)
    {
        if (!await db.Expedientes.AnyAsync(e => e.Id == expedienteId)) return NotFound();

        var profesionalId = dto.ProfesionalId
            ?? await db.Profesionales.Where(p => p.UsuarioId == UserId).Select(p => (long?)p.Id).FirstOrDefaultAsync();
        if (profesionalId is null)
            return Falla("No se pudo determinar el profesional: indique profesionalId o vincule su usuario a un profesional.");

        var c = new Consulta
        {
            ExpedienteId = expedienteId,
            CitaId = dto.CitaId,
            ProfesionalId = profesionalId.Value,
            MotivoConsulta = dto.MotivoConsulta,
            Anamnesis = dto.Anamnesis,
            AvScOd = dto.AvScOd, AvScOi = dto.AvScOi, AvCcOd = dto.AvCcOd, AvCcOi = dto.AvCcOi,
            PioOd = dto.PioOd, PioOi = dto.PioOi,
            Biomicroscopia = dto.Biomicroscopia,
            FondoDeOjo = dto.FondoDeOjo,
            Diagnostico = dto.Diagnostico,
            CodigoCie10 = dto.CodigoCie10,
            PlanTratamiento = dto.PlanTratamiento
        };
        db.Consultas.Add(c);

        if (dto.CitaId is not null)
        {
            var cita = await db.Citas.FindAsync(dto.CitaId.Value);
            if (cita is not null) cita.Estado = "ATENDIDA";
        }

        await db.SaveChangesAsync();
        return Creado(new { c.Id, c.Fecha });
    }
}
