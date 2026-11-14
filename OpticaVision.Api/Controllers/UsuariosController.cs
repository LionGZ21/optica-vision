using Microsoft.AspNetCore.Identity;
using OpticaVision.Api.Models;

namespace OpticaVision.Api.Controllers;

[Route("api/[controller]")]
[Authorize(Roles = Grupos.Direccion)]
public class UsuariosController(
    UserManager<ApplicationUser> userManager,
    AppDbContext db) : ApiControllerBase
{
    public record CrearUsuarioDto(
        [Required, EmailAddress] string Email,
        [Required] string Password,
        [Required] string NombreCompleto,
        [Required] string Rol,
        long? ProfesionalId = null);

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var usuarios = await db.Users
            .Select(u => new { u.Id, u.Email, u.NombreCompleto, u.Activo })
            .ToListAsync();
        return Ok(usuarios);
    }

    [HttpPost]
    public async Task<IActionResult> Crear(CrearUsuarioDto dto)
    {
        if (!Roles.Todos.Contains(dto.Rol))
            return Falla($"Rol inválido. Opciones: {string.Join(", ", Roles.Todos)}");

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            EmailConfirmed = true,
            NombreCompleto = dto.NombreCompleto
        };

        var res = await userManager.CreateAsync(user, dto.Password);
        if (!res.Succeeded)
            return Falla(string.Join("; ", res.Errors.Select(e => e.Description)));

        await userManager.AddToRoleAsync(user, dto.Rol);

        if (dto.ProfesionalId.HasValue)
        {
            var prof = await db.Profesionales.FindAsync(dto.ProfesionalId.Value);
            if (prof is not null)
            {
                prof.UsuarioId = user.Id;
                await db.SaveChangesAsync();
            }
        }

        return Creado(new { user.Id, user.Email, user.NombreCompleto, dto.Rol, dto.ProfesionalId });
    }
}