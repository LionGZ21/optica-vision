using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using OpticaVision.Api.Models;

namespace OpticaVision.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser>(options)
{
    // Taxonomía y catálogos
    public DbSet<Departamento> Departamentos => Set<Departamento>();
    public DbSet<Seccion> Secciones => Set<Seccion>();
    public DbSet<Familia> Familias => Set<Familia>();
    public DbSet<Subfamilia> Subfamilias => Set<Subfamilia>();
    public DbSet<Marca> Marcas => Set<Marca>();
    public DbSet<Impuesto> Impuestos => Set<Impuesto>();
    public DbSet<UnidadMedida> Unidades => Set<UnidadMedida>();
    public DbSet<Sucursal> Sucursales => Set<Sucursal>();
    public DbSet<Bodega> Bodegas => Set<Bodega>();
    public DbSet<ListaPrecio> ListasPrecio => Set<ListaPrecio>();
    public DbSet<Proveedor> Proveedores => Set<Proveedor>();

    // Artículos
    public DbSet<Articulo> Articulos => Set<Articulo>();
    public DbSet<ArticuloEquivalente> ArticuloEquivalentes => Set<ArticuloEquivalente>();
    public DbSet<ArticuloProveedor> ArticuloProveedores => Set<ArticuloProveedor>();
    public DbSet<ArticuloPrecio> ArticuloPrecios => Set<ArticuloPrecio>();
    public DbSet<HistorialPrecio> HistorialPrecios => Set<HistorialPrecio>();

    // Inventario
    public DbSet<Stock> Stocks => Set<Stock>();
    public DbSet<MovimientoInventario> Movimientos => Set<MovimientoInventario>();
    public DbSet<Traslado> Traslados => Set<Traslado>();
    public DbSet<TrasladoDetalle> TrasladoDetalles => Set<TrasladoDetalle>();
    public DbSet<Consignacion> Consignaciones => Set<Consignacion>();
    public DbSet<ConsignacionDetalle> ConsignacionDetalles => Set<ConsignacionDetalle>();
    public DbSet<ConsignacionLiquidacion> Liquidaciones => Set<ConsignacionLiquidacion>();
    public DbSet<ConsignacionLiquidacionDetalle> LiquidacionDetalles => Set<ConsignacionLiquidacionDetalle>();

    // Clínica
    public DbSet<Paciente> Pacientes => Set<Paciente>();
    public DbSet<Profesional> Profesionales => Set<Profesional>();
    public DbSet<Cita> Citas => Set<Cita>();
    public DbSet<ExpedienteClinico> Expedientes => Set<ExpedienteClinico>();
    public DbSet<Consulta> Consultas => Set<Consulta>();
    public DbSet<Receta> Recetas => Set<Receta>();

    // Ventas y laboratorio
    public DbSet<Venta> Ventas => Set<Venta>();
    public DbSet<VentaDetalle> VentaDetalles => Set<VentaDetalle>();
    public DbSet<Pago> Pagos => Set<Pago>();
    public DbSet<OrdenTrabajoLab> OrdenesLab => Set<OrdenTrabajoLab>();
    public DbSet<OrdenTrabajoLabDetalle> OrdenLabDetalles => Set<OrdenTrabajoLabDetalle>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // ---------- Identity ----------
        b.Entity<ApplicationUser>().ToTable("usuario");
        b.Entity<IdentityRole>().ToTable("rol");
        b.Entity<IdentityUserRole<string>>().ToTable("usuario_rol");
        b.Entity<IdentityUserClaim<string>>().ToTable("usuario_claim");
        b.Entity<IdentityUserLogin<string>>().ToTable("usuario_login");
        b.Entity<IdentityRoleClaim<string>>().ToTable("rol_claim");
        b.Entity<IdentityUserToken<string>>().ToTable("usuario_token");

        // ---------- Llaves compuestas y relaciones no convencionales ----------
        b.Entity<Stock>().HasKey(s => new { s.BodegaId, s.ArticuloId });
        b.Entity<ArticuloEquivalente>().HasKey(e => new { e.ArticuloId, e.EquivalenteId });
        b.Entity<OrdenTrabajoLab>().HasMany(o => o.Detalles).WithOne().HasForeignKey(d => d.OrdenId);
        b.Entity<ConsignacionLiquidacion>().HasMany(l => l.Detalles).WithOne().HasForeignKey(d => d.LiquidacionId);

        // ---------- Columnas con DEFAULT en la base de datos ----------
        // Si el valor en C# es el valor por defecto del tipo, EF omite la columna y PostgreSQL usa su DEFAULT.
        b.Entity<MovimientoInventario>().Property(x => x.Fecha).HasDefaultValueSql("now()");
        b.Entity<Traslado>().Property(x => x.FechaCreacion).HasDefaultValueSql("now()");
        b.Entity<Consulta>().Property(x => x.Fecha).HasDefaultValueSql("now()");
        b.Entity<Venta>().Property(x => x.Fecha).HasDefaultValueSql("now()");
        b.Entity<Pago>().Property(x => x.Fecha).HasDefaultValueSql("now()");
        b.Entity<Receta>().Property(x => x.FechaEmision).HasDefaultValueSql("current_date");
        b.Entity<Consignacion>().Property(x => x.Fecha).HasDefaultValueSql("current_date");
        b.Entity<ConsignacionLiquidacion>().Property(x => x.Fecha).HasDefaultValueSql("current_date");

        // Números de documento (TR-0000001, FV-..., etc.) generados por secuencias de PostgreSQL
        b.Entity<Traslado>().Property(x => x.Numero).HasDefaultValueSql("''");
        b.Entity<Consignacion>().Property(x => x.Numero).HasDefaultValueSql("''");
        b.Entity<ConsignacionLiquidacion>().Property(x => x.Numero).HasDefaultValueSql("''");
        b.Entity<ExpedienteClinico>().Property(x => x.Numero).HasDefaultValueSql("''");
        b.Entity<Receta>().Property(x => x.Numero).HasDefaultValueSql("''");
        b.Entity<Venta>().Property(x => x.Numero).HasDefaultValueSql("''");
        b.Entity<OrdenTrabajoLab>().Property(x => x.Numero).HasDefaultValueSql("''");

        // ---------- Tablas de negocio: ya existen (Fase 1). EF no debe migrarlas. ----------
        var ns = typeof(Departamento).Namespace;
        foreach (var et in b.Model.GetEntityTypes().Where(e => e.ClrType.Namespace == ns))
        {
            et.SetTableName(ToSnake(et.ClrType.Name));
            et.SetIsTableExcludedFromMigrations(true);
        }
    }

    private static string ToSnake(string name) =>
        Regex.Replace(name, "(?<!^)([A-Z])", "_$1").ToLowerInvariant();
}
