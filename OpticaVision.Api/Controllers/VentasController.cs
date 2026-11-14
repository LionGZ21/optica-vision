namespace OpticaVision.Api.Controllers;

[Route("api/ventas")]
[Authorize(Roles = Grupos.Ventas)]
public class VentasController(AppDbContext db) : ApiControllerBase
{
    static readonly List<string> Metodos = ["EFECTIVO", "TARJETA", "TRANSFERENCIA", "CHEQUE", "OTRO"];

    public record LineaVentaDto(long ArticuloId, long? UnidadMedidaId, decimal Cantidad, decimal Descuento = 0);
    public record CrearVentaDto(
        long SucursalId, long BodegaId, long? PacienteId, string? ClienteNombre, string? ClienteIdentificacion,
        long? ListaPrecioId, string? Observaciones, List<LineaVentaDto> Lineas);
    public record PagoDto(string Metodo, decimal Monto, string? Referencia);

    [HttpGet]
    public async Task<IActionResult> Listar(string? estado, long? sucursalId, DateTimeOffset? desde, DateTimeOffset? hasta, int page = 1, int pageSize = 25)
    {
        var (p, size) = Pag(page, pageSize);
        var q = db.Ventas.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(estado)) q = q.Where(v => v.Estado == estado);
        if (sucursalId is not null) q = q.Where(v => v.SucursalId == sucursalId);
        if (desde is not null) { var d = desde.Value.UtcDateTime; q = q.Where(v => v.Fecha >= d); }
        if (hasta is not null) { var h = hasta.Value.UtcDateTime; q = q.Where(v => v.Fecha <= h); }

        var total = await q.CountAsync();
        var items = await q.OrderByDescending(v => v.Id).Skip((p - 1) * size).Take(size).Select(v => new
        {
            v.Id, v.Numero, v.Fecha, v.Estado, v.Total, v.Moneda, v.SucursalId, v.PacienteId,
            Cliente = v.Paciente != null ? v.Paciente.Nombres + " " + v.Paciente.Apellidos : v.ClienteNombre
        }).ToListAsync();
        return Ok(new { total, page = p, pageSize = size, items });
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Obtener(long id)
    {
        var v = await db.Ventas.AsNoTracking().Where(x => x.Id == id).Select(x => new
        {
            x.Id, x.Numero, x.Fecha, x.Estado, x.Moneda, x.SucursalId, x.BodegaId, x.ListaPrecioId,
            x.PacienteId, x.ClienteNombre, x.ClienteIdentificacion, x.Observaciones,
            x.Subtotal, x.Descuento, x.Impuesto, x.Total,
            Detalles = x.Detalles.Select(d => new
            {
                d.Id, d.ArticuloId, Codigo = d.Articulo.Codigo, Articulo = d.Articulo.Nombre, d.UnidadMedidaId,
                d.Cantidad, d.PrecioUnitario, d.Descuento, d.PorcentajeImpuesto, d.Subtotal, d.Impuesto, d.Total
            }),
            Pagos = x.Pagos.Select(pg => new { pg.Id, pg.Metodo, pg.Monto, pg.Referencia, pg.Fecha })
        }).FirstOrDefaultAsync();
        return v is null ? NotFound() : Ok(v);
    }

    /// <summary>
    /// Crea la venta en BORRADOR. Los precios e impuestos los calcula el servidor (lista de precios + impuesto
    /// del artículo); el cliente nunca envía precios. Los precios de lista no incluyen impuesto.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Crear(CrearVentaDto dto)
    {
        if (dto.Lineas is null || dto.Lineas.Count == 0) return Falla("La venta debe tener al menos una línea.");
        if (dto.Lineas.Any(l => l.Cantidad <= 0 || l.Descuento < 0)) return Falla("Cantidades o descuentos inválidos.");

        var bodega = await db.Bodegas.AsNoTracking().FirstOrDefaultAsync(b => b.Id == dto.BodegaId && b.Activa);
        if (bodega is null || bodega.Tipo != "VENTA" || bodega.SucursalId != dto.SucursalId)
            return Falla("La bodega debe ser de tipo VENTA y pertenecer a la sucursal indicada.");

        var listaId = dto.ListaPrecioId
            ?? await db.ListasPrecio.Where(l => l.EsPredeterminada && l.Activa).Select(l => (long?)l.Id).FirstOrDefaultAsync();
        if (listaId is null) return Falla("No hay lista de precios predeterminada.");
        var lista = await db.ListasPrecio.AsNoTracking().FirstOrDefaultAsync(l => l.Id == listaId && l.Activa);
        if (lista is null) return Falla("Lista de precios inexistente o inactiva.");

        var ids = dto.Lineas.Select(l => l.ArticuloId).Distinct().ToList();
        var articulos = await db.Articulos.AsNoTracking().Include(a => a.Impuesto)
            .Where(a => ids.Contains(a.Id)).ToDictionaryAsync(a => a.Id);
        var precios = await db.ArticuloPrecios.AsNoTracking()
            .Where(p => p.ListaPrecioId == listaId && p.Activo && ids.Contains(p.ArticuloId)).ToListAsync();

        var venta = new Venta
        {
            SucursalId = dto.SucursalId, BodegaId = dto.BodegaId, PacienteId = dto.PacienteId,
            ClienteNombre = dto.ClienteNombre, ClienteIdentificacion = dto.ClienteIdentificacion,
            ListaPrecioId = listaId.Value, Moneda = lista.Moneda, VendedorId = UserId, Observaciones = dto.Observaciones
        };

        foreach (var l in dto.Lineas)
        {
            if (!articulos.TryGetValue(l.ArticuloId, out var art)) return Falla($"El artículo {l.ArticuloId} no existe.");
            if (!art.Activo) return Falla($"El artículo {art.Codigo} está inactivo.");
            if (art.Uso != "VENTA") return Falla($"El artículo {art.Codigo} es de consumo interno y no se vende.");

            var unidadId = l.UnidadMedidaId ?? art.UnidadBaseId;
            var precio = precios.FirstOrDefault(p => p.ArticuloId == art.Id && p.UnidadMedidaId == unidadId);
            if (precio is null) return Falla($"El artículo {art.Codigo} no tiene precio en la lista '{lista.Nombre}' para esa unidad.");

            var bruto = Math.Round(l.Cantidad * precio.Precio, 2, MidpointRounding.AwayFromZero);
            if (l.Descuento > bruto) return Falla($"El descuento de {art.Codigo} supera el valor de la línea.");

            var subtotal = bruto - l.Descuento;
            var impuesto = Math.Round(subtotal * art.Impuesto.Porcentaje / 100m, 2, MidpointRounding.AwayFromZero);

            venta.Detalles.Add(new VentaDetalle
            {
                ArticuloId = art.Id, UnidadMedidaId = unidadId, Cantidad = l.Cantidad,
                PrecioUnitario = precio.Precio, Descuento = l.Descuento,
                PorcentajeImpuesto = art.Impuesto.Porcentaje,
                Subtotal = subtotal, Impuesto = impuesto, Total = subtotal + impuesto
            });
        }

        venta.Descuento = venta.Detalles.Sum(d => d.Descuento);
        venta.Subtotal = venta.Detalles.Sum(d => d.Subtotal);
        venta.Impuesto = venta.Detalles.Sum(d => d.Impuesto);
        venta.Total = venta.Subtotal + venta.Impuesto;

        db.Ventas.Add(venta);
        await db.SaveChangesAsync();
        return Creado(new { venta.Id, venta.Numero, venta.Subtotal, venta.Impuesto, venta.Total });
    }

    /// <summary>Confirma la venta: descuenta stock vía Kardex (409 si no hay existencias suficientes).</summary>
    [HttpPost("{id:long}/confirmar")]
    public async Task<IActionResult> Confirmar(long id)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($"select fn_confirmar_venta({id}::bigint, {UserId}::text)");
        return NoContent();
    }

    [HttpPost("{id:long}/pagos")]
    public async Task<IActionResult> AgregarPago(long id, PagoDto dto)
    {
        if (!Metodos.Contains(dto.Metodo)) return Falla($"Método inválido. Valores: {string.Join(", ", Metodos)}.");
        if (dto.Monto <= 0) return Falla("El monto debe ser mayor que cero.");

        var v = await db.Ventas.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new { x.Estado, x.Total, Pagado = x.Pagos.Sum(p => (decimal?)p.Monto) ?? 0m })
            .FirstOrDefaultAsync();
        if (v is null) return NotFound();
        if (v.Estado == "ANULADA") return Conflict(new { mensaje = "La venta está anulada." });
        if (v.Pagado + dto.Monto > v.Total) return Falla($"El pago excede el saldo pendiente ({v.Total - v.Pagado:N2}).");

        var pago = new Pago { VentaId = id, Metodo = dto.Metodo, Monto = dto.Monto, Referencia = dto.Referencia };
        db.Pagos.Add(pago);
        await db.SaveChangesAsync();
        return Creado(new { pago.Id, Saldo = v.Total - v.Pagado - dto.Monto });
    }

    /// <summary>BORRADOR: se anula directo. CONFIRMADA: solo Administrador/Gerente; devuelve el stock al Kardex.</summary>
    [HttpPost("{id:long}/anular")]
    public async Task<IActionResult> Anular(long id)
    {
        var v = await db.Ventas.Include(x => x.Detalles).FirstOrDefaultAsync(x => x.Id == id);
        if (v is null) return NotFound();
        if (v.Estado == "ANULADA") return Conflict(new { mensaje = "La venta ya está anulada." });

        if (v.Estado == "CONFIRMADA")
        {
            if (!User.IsInRole(Roles.Administrador) && !User.IsInRole(Roles.Gerente)) return Forbid();

            var factores = await db.Unidades.AsNoTracking().ToDictionaryAsync(u => u.Id, u => u.FactorBase);
            foreach (var d in v.Detalles)
            {
                db.Movimientos.Add(new MovimientoInventario
                {
                    ArticuloId = d.ArticuloId,
                    BodegaId = v.BodegaId,
                    TipoMovimiento = "DEVOLUCION_CLIENTE",
                    Cantidad = d.Cantidad * factores[d.UnidadMedidaId],
                    DocumentoTipo = "VENTA",
                    DocumentoId = v.Id,
                    UsuarioId = UserId,
                    Observacion = $"Anulación de {v.Numero}"
                });
            }
        }

        v.Estado = "ANULADA";
        await db.SaveChangesAsync();
        return NoContent();
    }
}
