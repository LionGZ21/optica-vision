namespace OpticaVision.Api.Controllers;

[Route("api/recetas")]
public class RecetasController(AppDbContext db) : ApiControllerBase
{
    static readonly List<string> TiposLente = ["MONOFOCAL", "BIFOCAL", "PROGRESIVO", "OCUPACIONAL", "CONTACTO"];

    public record RecetaDto(
        long ConsultaId, string? TipoLente, DateOnly? VigenteHasta,
        decimal? OdEsfera, decimal? OdCilindro, short? OdEje, decimal? OdAdicion, decimal? OdPrisma, string? OdBasePrisma, decimal? OdDnp, decimal? OdAltura,
        decimal? OiEsfera, decimal? OiCilindro, short? OiEje, decimal? OiAdicion, decimal? OiPrisma, string? OiBasePrisma, decimal? OiDnp, decimal? OiAltura,
        decimal? DistanciaPupilar, string? Observaciones);

    [HttpGet("{id:long}")]
    [Authorize(Roles = Grupos.LecturaRecetas)]
    public async Task<IActionResult> Obtener(long id)
    {
        var r = await db.Recetas.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
        return r is null ? NotFound() : Ok(r);
    }

    [HttpGet]
    [Authorize(Roles = Grupos.LecturaRecetas)]
    public async Task<IActionResult> PorPaciente(long pacienteId) =>
        Ok(await db.Recetas.AsNoTracking().Where(r => r.PacienteId == pacienteId)
            .OrderByDescending(r => r.FechaEmision).ThenByDescending(r => r.Id).ToListAsync());

    [HttpPost]
    [Authorize(Roles = Grupos.Clinicos)]
    public async Task<IActionResult> Crear(RecetaDto dto)
    {
        if (dto.TipoLente is not null && !TiposLente.Contains(dto.TipoLente))
            return Falla($"Tipo de lente inválido. Valores: {string.Join(", ", TiposLente)}.");
        if ((dto.OdCilindro ?? 0) != 0 && dto.OdEje is null) return Falla("Ojo derecho: si hay cilindro, el eje es obligatorio.");
        if ((dto.OiCilindro ?? 0) != 0 && dto.OiEje is null) return Falla("Ojo izquierdo: si hay cilindro, el eje es obligatorio.");

        // Paciente y profesional se derivan de la consulta (evita inconsistencias)
        var datos = await db.Consultas.AsNoTracking().Where(c => c.Id == dto.ConsultaId).Select(c => new
        {
            c.ProfesionalId,
            PacienteId = db.Expedientes.Where(e => e.Id == c.ExpedienteId).Select(e => e.PacienteId).FirstOrDefault()
        }).FirstOrDefaultAsync();
        if (datos is null) return Falla("La consulta indicada no existe.");

        var r = new Receta
        {
            ConsultaId = dto.ConsultaId,
            PacienteId = datos.PacienteId,
            ProfesionalId = datos.ProfesionalId,
            VigenteHasta = dto.VigenteHasta,
            TipoLente = dto.TipoLente,
            OdEsfera = dto.OdEsfera, OdCilindro = dto.OdCilindro, OdEje = dto.OdEje, OdAdicion = dto.OdAdicion,
            OdPrisma = dto.OdPrisma, OdBasePrisma = dto.OdBasePrisma, OdDnp = dto.OdDnp, OdAltura = dto.OdAltura,
            OiEsfera = dto.OiEsfera, OiCilindro = dto.OiCilindro, OiEje = dto.OiEje, OiAdicion = dto.OiAdicion,
            OiPrisma = dto.OiPrisma, OiBasePrisma = dto.OiBasePrisma, OiDnp = dto.OiDnp, OiAltura = dto.OiAltura,
            DistanciaPupilar = dto.DistanciaPupilar,
            Observaciones = dto.Observaciones
        };
        db.Recetas.Add(r);
        await db.SaveChangesAsync();
        return Creado(new { r.Id, r.Numero, r.FechaEmision });
    }
}
