namespace OpticaVision.Api.Entities;

public class Paciente
{
    public long Id { get; set; }
    public string DocumentoIdentidad { get; set; } = null!;
    public string Nombres { get; set; } = null!;
    public string Apellidos { get; set; } = null!;
    public DateOnly FechaNacimiento { get; set; }
    public string? Sexo { get; set; }                      // M | F | O
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public string? Direccion { get; set; }
    public string? Ocupacion { get; set; }
    public bool Activo { get; set; } = true;
}

public class Profesional
{
    public long Id { get; set; }
    public string? UsuarioId { get; set; }
    public string Nombres { get; set; } = null!;
    public string Apellidos { get; set; } = null!;
    public string Tipo { get; set; } = null!;              // OFTALMOLOGO | OPTOMETRA
    public string? NumeroColegiado { get; set; }
    public string? Telefono { get; set; }
    public string? Email { get; set; }
    public bool Activo { get; set; } = true;
}

public class Cita
{
    public long Id { get; set; }
    public long PacienteId { get; set; }
    public Paciente Paciente { get; set; } = null!;
    public long ProfesionalId { get; set; }
    public Profesional Profesional { get; set; } = null!;
    public long SucursalId { get; set; }
    public DateTime Inicio { get; set; }
    public DateTime Fin { get; set; }
    public string Estado { get; set; } = "PROGRAMADA";
    public string? Motivo { get; set; }
    public string? CreadaPor { get; set; }
}

public class ExpedienteClinico
{
    public long Id { get; set; }
    public long PacienteId { get; set; }
    public Paciente Paciente { get; set; } = null!;
    public string Numero { get; set; } = null!;
    public string? AntecedentesPersonales { get; set; }
    public string? AntecedentesFamiliares { get; set; }
    public string? Alergias { get; set; }
    public string? MedicamentosActuales { get; set; }
    public bool UsaLentesPreviamente { get; set; }
    public string? Observaciones { get; set; }
}

public class Consulta
{
    public long Id { get; set; }
    public long ExpedienteId { get; set; }
    public long? CitaId { get; set; }
    public long ProfesionalId { get; set; }
    public DateTime Fecha { get; set; }
    public string? MotivoConsulta { get; set; }
    public string? Anamnesis { get; set; }
    public string? AvScOd { get; set; }
    public string? AvScOi { get; set; }
    public string? AvCcOd { get; set; }
    public string? AvCcOi { get; set; }
    public decimal? PioOd { get; set; }
    public decimal? PioOi { get; set; }
    public string? Biomicroscopia { get; set; }
    public string? FondoDeOjo { get; set; }
    public string? Diagnostico { get; set; }
    public string? CodigoCie10 { get; set; }
    public string? PlanTratamiento { get; set; }
}

public class Receta
{
    public long Id { get; set; }
    public string Numero { get; set; } = null!;
    public long ConsultaId { get; set; }
    public long PacienteId { get; set; }
    public long ProfesionalId { get; set; }
    public DateOnly FechaEmision { get; set; }
    public DateOnly? VigenteHasta { get; set; }
    public string? TipoLente { get; set; }                 // MONOFOCAL | BIFOCAL | PROGRESIVO | OCUPACIONAL | CONTACTO

    public decimal? OdEsfera { get; set; }
    public decimal? OdCilindro { get; set; }
    public short? OdEje { get; set; }
    public decimal? OdAdicion { get; set; }
    public decimal? OdPrisma { get; set; }
    public string? OdBasePrisma { get; set; }
    public decimal? OdDnp { get; set; }
    public decimal? OdAltura { get; set; }

    public decimal? OiEsfera { get; set; }
    public decimal? OiCilindro { get; set; }
    public short? OiEje { get; set; }
    public decimal? OiAdicion { get; set; }
    public decimal? OiPrisma { get; set; }
    public string? OiBasePrisma { get; set; }
    public decimal? OiDnp { get; set; }
    public decimal? OiAltura { get; set; }

    public decimal? DistanciaPupilar { get; set; }
    public string? Observaciones { get; set; }
}
