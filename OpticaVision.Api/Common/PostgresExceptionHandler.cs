using Microsoft.AspNetCore.Diagnostics;
using Npgsql;

namespace OpticaVision.Api.Common;

/// <summary>
/// Traduce los errores de PostgreSQL (triggers, CHECK, UNIQUE, EXCLUDE...) a respuestas HTTP claras.
/// Ej.: "Stock insuficiente" (trigger del Kardex) => 409 con el mensaje original.
/// </summary>
public class PostgresExceptionHandler(ILogger<PostgresExceptionHandler> log) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var pg = ex as PostgresException ?? ex.InnerException as PostgresException;
        if (pg is null) return false;

        (int Status, string Titulo, string Mensaje)? r = pg.SqlState switch
        {
            "23514" => (409, "Regla de negocio", pg.MessageText),
            "P0001" => (409, "Regla de negocio", pg.MessageText),
            "23505" => (409, "Registro duplicado", "Ya existe un registro con ese valor único (código, número o documento)."),
            "23503" => (409, "Referencia inválida", "El registro hace referencia a otro que no existe o que está en uso."),
            "23P01" => (409, "Conflicto de horario", "El profesional ya tiene una cita en ese horario."),
            "23502" => (400, "Dato obligatorio", "Falta un dato obligatorio."),
            "22001" => (400, "Dato demasiado largo", "Un texto excede la longitud permitida."),
            _ => null
        };

        if (r is null) return false;

        log.LogWarning(ex, "Error de PostgreSQL {SqlState}: {Mensaje}", pg.SqlState, pg.MessageText);
        ctx.Response.StatusCode = r.Value.Status;
        await ctx.Response.WriteAsJsonAsync(new { titulo = r.Value.Titulo, mensaje = r.Value.Mensaje }, ct);
        return true;
    }
}
