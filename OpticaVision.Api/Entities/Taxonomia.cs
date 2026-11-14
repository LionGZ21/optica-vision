namespace OpticaVision.Api.Entities;

public class Departamento
{
    public long Id { get; set; }
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public bool Activo { get; set; } = true;
    public List<Seccion> Secciones { get; set; } = [];
}

public class Seccion
{
    public long Id { get; set; }
    public long DepartamentoId { get; set; }
    public Departamento Departamento { get; set; } = null!;
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public bool Activo { get; set; } = true;
    public List<Familia> Familias { get; set; } = [];
}

public class Familia
{
    public long Id { get; set; }
    public long SeccionId { get; set; }
    public Seccion Seccion { get; set; } = null!;
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public bool Activo { get; set; } = true;
    public List<Subfamilia> Subfamilias { get; set; } = [];
}

public class Subfamilia
{
    public long Id { get; set; }
    public long FamiliaId { get; set; }
    public Familia Familia { get; set; } = null!;
    public string Codigo { get; set; } = null!;
    public string Nombre { get; set; } = null!;
    public bool Activo { get; set; } = true;
}
