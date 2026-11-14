using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using OpticaVision.Api.Models;
using OpticaVision.Api.Services;

namespace OpticaVision.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(
    UserManager<ApplicationUser> users,
    SignInManager<ApplicationUser> signIn,
    ITokenService tokens) : ControllerBase
{
    public record LoginRequest(string Email, string Password);
    public record LoginResponse(string Token, string Email, string NombreCompleto, IList<string> Roles);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login(LoginRequest req)
    {
        var user = await users.FindByEmailAsync(req.Email);
        if (user is null || !user.Activo)
            return Unauthorized(new { mensaje = "Credenciales inválidas." });

        var result = await signIn.CheckPasswordSignInAsync(user, req.Password, lockoutOnFailure: true);
        if (result.IsLockedOut)
            return StatusCode(429, new { mensaje = "Cuenta bloqueada temporalmente por intentos fallidos." });
        if (!result.Succeeded)
            return Unauthorized(new { mensaje = "Credenciales inválidas." });

        var roles = await users.GetRolesAsync(user);
        return new LoginResponse(tokens.CreateToken(user, roles), user.Email!, user.NombreCompleto, roles);
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me() => Ok(new
    {
        id = User.FindFirstValue("sub"),
        nombre = User.Identity?.Name,
        roles = User.FindAll("role").Select(c => c.Value)
    });
}
