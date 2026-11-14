namespace OpticaVision.Api.Controllers;

[Route("api/articulos")]
public class ArticulosController(AppDbContext db) : ApiControllerBase
{
    static readonly string[] Tipos = ["MONTURA", "LENTE_BLANCO", "LENTE_CONTACTO", "ACCESORIO", "SERVICIO", "INSUMO", "OTRO"];
    static readonly string[] Usos = ["VENTA", "CONSUMO_INTERNO"];

    public record ArticuloDto(
        string Codigo, string Nombre, string? Descripcion,
        long SubfamiliaId, long MarcaId, long ImpuestoId, long UnidadBaseId,
        string TipoArticulo, string Uso, decimal StockMinimo, bool Activo = true);

    public record ArticuloProveedorDto(
        long ProveedorId, long UnidadMedidaId, decimal PrecioCosto,
        string? CodigoProveedor, string? Moneda, bool EsPrincipal, bool Activo = true);

    public record ArticuloPrecioDto(long ListaPrecioId, long UnidadMedidaId, decimal Precio, bool Activo = true);

    // ---------------- Consulta ----------------
    [HttpGet]
    public async Task<IActionResult> Listar(string? q, long? subfamiliaId, bool? activo, string? uso, int page = 1, int pageSize = 25)
    {
        var (p, size) = Pag(page, pageSize);
        var query = db.Articulos.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(q))
        {
            var like = $"%{q.Trim()}%";
            query = query.Where(a => EF.Functions.ILike(a.Nombre, like) || EF.Functions.ILike(a.Codigo, like));
        }
        if (subfamiliaId is not null) query = query.Where(a => a.SubfamiliaId == subfamiliaId);
        if (activo is not null) query = query.Where(a => a.Activo == activo);
        if (!string.IsNullOrWhiteSpace(uso)) query = query.Where(a => a.Uso == uso);

        var total = await query.CountAsync();
        var items = await query.OrderBy(a => a.Nombre).Skip((p - 1) * size).Take(size).Select(a => new
        {
            a.Id, a.Codigo, a.Nombre, a.Activo, a.Uso, a.TipoArticulo, a.StockMinimo,
            Marca = a.Marca.Nombre,
            Impuesto = a.Impuesto.Nombre,
            ImpuestoPorcentaje = a.Impuesto.Porcentaje,
            Departamento = a.Subfamilia.Familia.Seccion.Departamento.Nombre,
            Seccion = a.Subfamilia.Familia.Seccion.Nombre,
            Familia = a.Subfamilia.Familia.Nombre,
            Subfamilia = a.Subfamilia.Nombre,
            StockTotal = db.Stocks
                .Where(s => s.ArticuloId == a.Id && s.Bodega.Tipo != "TRANSITO")
                .Sum(s => (decimal?)s.Cantidad) ?? 0m
        }).ToListAsync();

        return Ok(new { total, page = p, pageSize = size, items });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Obtener(long id)
    {
        var a = await db.Articulos.AsNoTracking().Where(x => x.Id == id).Select(x => new
        {
            x.Id, x.Codigo, x.Nombre, x.Descripcion, x.Activo, x.Uso, x.TipoArticulo, x.StockMinimo,
            x.SubfamiliaId, x.MarcaId, x.ImpuestoId, x.UnidadBaseId,
            Marca = x.Marca.Nombre,
            Impuesto = x.Impuesto.Nombre,
            ImpuestoPorcentaje = x.Impuesto.Porcentaje,
            UnidadBase = x.UnidadBase.Codigo,
            Taxonomia = x.Subfamilia.Familia.Seccion.Departamento.Nombre + " > " +
                        x.Subfamilia.Familia.Seccion.Nombre + " > " +
                        x.Subfamilia.Familia.Nombre + " > " + x.Subfamilia.Nombre
        }).FirstOrDefaultAsync();
        if (a is null) return NotFound();

        var proveedores = await db.ArticuloProveedores.AsNoTracking().Where(p => p.ArticuloId == id)
            .Select(p => new
            {
                p.Id, p.ProveedorId, Proveedor = p.Proveedor.RazonSocial,
                p.UnidadMedidaId, Unidad = p.UnidadMedida.Codigo,
                p.CodigoProveedor, p.PrecioCosto, p.Moneda, p.EsPrincipal, p.Activo
            }).ToListAsync();

        var precios = await db.ArticuloPrecios.AsNoTracking().Where(p => p.ArticuloId == id)
            .Select(p => new
            {
                p.Id, p.ListaPrecioId, Lista = p.ListaPrecio.Nombre,
                p.UnidadMedidaId, Unidad = p.UnidadMedida.Codigo, p.Precio, p.Activo
            }).ToListAsync();

        var stock = await db.Stocks.AsNoTracking().Where(s => s.ArticuloId == id)
            .Select(s => new { s.BodegaId, Bodega = s.Bodega.Nombre, TipoBodega = s.Bodega.Tipo, s.Cantidad })
            .ToListAsync();

        return Ok(new { articulo = a, proveedores, precios, stock });
    }

    // ---------------- Alta y edición ----------------
    [HttpPost]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> Crear(ArticuloDto dto)
    {
        var error = Validar(dto);
        if (error is not null) return Falla(error);

        var a = new Articulo { Codigo = dto.Codigo.Trim().ToUpperInvariant(), CreatedBy = UserId };
        Aplicar(a, dto);
        db.Articulos.Add(a);
        await db.SaveChangesAsync();
        return Creado(new { a.Id, a.Codigo, a.Nombre });
    }

    [HttpPut("{id:long}")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> Editar(long id, ArticuloDto dto)
    {
        var error = Validar(dto);
        if (error is not null) return Falla(error);

        var a = await db.Articulos.FindAsync(id);
        if (a is null) return NotFound();
        Aplicar(a, dto);
        a.Activo = dto.Activo;
        await db.SaveChangesAsync();
        return Ok(new { a.Id, a.Codigo, a.Nombre, a.Activo });
    }

    // ---------------- Proveedores del artículo (precio de costo por unidad/docena...) ----------------
    [HttpPut("{id:long}/proveedores")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> UpsertProveedor(long id, ArticuloProveedorDto dto)
    {
        if (dto.PrecioCosto < 0) return Falla("El precio de costo no puede ser negativo.");
        if (!await db.Articulos.AnyAsync(a => a.Id == id)) return NotFound();

        var ap = await db.ArticuloProveedores.FirstOrDefaultAsync(x =>
            x.ArticuloId == id && x.ProveedorId == dto.ProveedorId && x.UnidadMedidaId == dto.UnidadMedidaId);
        if (ap is null)
        {
            ap = new ArticuloProveedor { ArticuloId = id, ProveedorId = dto.ProveedorId, UnidadMedidaId = dto.UnidadMedidaId };
            db.ArticuloProveedores.Add(ap);
        }
        ap.PrecioCosto = dto.PrecioCosto;
        ap.CodigoProveedor = dto.CodigoProveedor;
        ap.Moneda = string.IsNullOrWhiteSpace(dto.Moneda) ? "NIO" : dto.Moneda.Trim().ToUpperInvariant();
        ap.EsPrincipal = dto.EsPrincipal;
        ap.Activo = dto.Activo;
        ap.ModificadoPor = UserId;     // el trigger registra el cambio en historial_precio
        await db.SaveChangesAsync();
        return Ok(new { ap.Id });
    }

    // ---------------- Precios de venta por lista ----------------
    [HttpPut("{id:long}/precios")]
    [Authorize(Roles = Grupos.Direccion)]
    public async Task<IActionResult> UpsertPrecio(long id, ArticuloPrecioDto dto)
    {
        if (dto.Precio < 0) return Falla("El precio no puede ser negativo.");
        if (!await db.Articulos.AnyAsync(a => a.Id == id)) return NotFound();

        var ap = await db.ArticuloPrecios.FirstOrDefaultAsync(x =>
            x.ArticuloId == id && x.ListaPrecioId == dto.ListaPrecioId && x.UnidadMedidaId == dto.UnidadMedidaId);
        if (ap is null)
        {
            ap = new ArticuloPrecio { ArticuloId = id, ListaPrecioId = dto.ListaPrecioId, UnidadMedidaId = dto.UnidadMedidaId };
            db.ArticuloPrecios.Add(ap);
        }
        ap.Precio = dto.Precio;
        ap.Activo = dto.Activo;
        ap.ModificadoPor = UserId;     // el trigger registra el cambio en historial_precio
        await db.SaveChangesAsync();
        return Ok(new { ap.Id });
    }

    [HttpGet("{id:long}/historial-precios")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> HistorialPrecios(long id) =>
        Ok(await db.HistorialPrecios.AsNoTracking().Where(h => h.ArticuloId == id)
            .OrderByDescending(h => h.Fecha).Take(200).ToListAsync());

    // ---------------- Equivalentes ----------------
    [HttpGet("{id:long}/equivalentes")]
    public async Task<IActionResult> Equivalentes(long id)
    {
        var ids = await db.ArticuloEquivalentes
            .Where(e => e.ArticuloId == id || e.EquivalenteId == id)
            .Select(e => e.ArticuloId == id ? e.EquivalenteId : e.ArticuloId)
            .ToListAsync();

        var items = await db.Articulos.AsNoTracking().Where(a => ids.Contains(a.Id)).Select(a => new
        {
            a.Id, a.Codigo, a.Nombre, a.Activo,
            StockTotal = db.Stocks
                .Where(s => s.ArticuloId == a.Id && s.Bodega.Tipo != "TRANSITO")
                .Sum(s => (decimal?)s.Cantidad) ?? 0m
        }).ToListAsync();
        return Ok(items);
    }

    [HttpPost("{id:long}/equivalentes/{otroId:long}")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> AgregarEquivalente(long id, long otroId)
    {
        if (id == otroId) return Falla("Un artículo no puede ser equivalente de sí mismo.");
        var (a, b) = id < otroId ? (id, otroId) : (otroId, id);
        if (!await db.ArticuloEquivalentes.AnyAsync(e => e.ArticuloId == a && e.EquivalenteId == b))
        {
            db.ArticuloEquivalentes.Add(new ArticuloEquivalente { ArticuloId = a, EquivalenteId = b });
            await db.SaveChangesAsync();
        }
        return NoContent();
    }

    [HttpDelete("{id:long}/equivalentes/{otroId:long}")]
    [Authorize(Roles = Grupos.Inventario)]
    public async Task<IActionResult> QuitarEquivalente(long id, long otroId)
    {
        var (a, b) = id < otroId ? (id, otroId) : (otroId, id);
        await db.ArticuloEquivalentes.Where(e => e.ArticuloId == a && e.EquivalenteId == b).ExecuteDeleteAsync();
        return NoContent();
    }

    // ---------------- Helpers ----------------
    private static string? Validar(ArticuloDto d)
    {
        if (string.IsNullOrWhiteSpace(d.Codigo)) return "El código es obligatorio.";
        if (string.IsNullOrWhiteSpace(d.Nombre)) return "El nombre es obligatorio.";
        if (!Tipos.Contains(d.TipoArticulo)) return $"Tipo de artículo inválido. Valores: {string.Join(", ", Tipos)}.";
        if (!Usos.Contains(d.Uso)) return "Uso inválido (VENTA o CONSUMO_INTERNO).";
        if (d.StockMinimo < 0) return "El stock mínimo no puede ser negativo.";
        return null;
    }

    private static void Aplicar(Articulo a, ArticuloDto d)
    {
        a.Nombre = d.Nombre.Trim();
        a.Descripcion = d.Descripcion;
        a.SubfamiliaId = d.SubfamiliaId;
        a.MarcaId = d.MarcaId;
        a.ImpuestoId = d.ImpuestoId;
        a.UnidadBaseId = d.UnidadBaseId;
        a.TipoArticulo = d.TipoArticulo;
        a.Uso = d.Uso;
        a.StockMinimo = d.StockMinimo;
    }
}
