using System.Data.Common;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace OpticaVision.Api.Data;

/// <summary>
/// Cada vez que EF abre una conexión, publica el usuario actual en la variable de sesión
/// "app.usuario" de PostgreSQL. Los triggers de auditoría la leen (auditoria_log, historial de OT).
/// </summary>
public class AuditUserConnectionInterceptor(IHttpContextAccessor accessor) : DbConnectionInterceptor
{
    public override void ConnectionOpened(DbConnection connection, ConnectionEndEventData eventData)
    {
        using var cmd = Build(connection);
        cmd.ExecuteNonQuery();
    }

    public override async Task ConnectionOpenedAsync(
        DbConnection connection, ConnectionEndEventData eventData, CancellationToken cancellationToken = default)
    {
        await using var cmd = Build(connection);
        await cmd.ExecuteNonQueryAsync(cancellationToken);
    }

    private DbCommand Build(DbConnection connection)
    {
        var uid = accessor.HttpContext?.User.FindFirst("sub")?.Value ?? string.Empty;
        var cmd = connection.CreateCommand();
        cmd.CommandText = "select set_config('app.usuario', @u, false)";
        var p = cmd.CreateParameter();
        p.ParameterName = "u";
        p.Value = uid;
        cmd.Parameters.Add(p);
        return cmd;
    }
}
