using System.Security.Claims;

namespace OpticaVision.Api.Common;

[ApiController]
[Authorize]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>Id del usuario autenticado (claim "sub" de Identity).</summary>
    protected string UserId => User.FindFirstValue("sub") ?? string.Empty;

    protected static (int Page, int Size) Pag(int page, int size) =>
        (Math.Max(page, 1), Math.Clamp(size, 1, 200));

    protected BadRequestObjectResult Falla(string mensaje) => BadRequest(new { mensaje });

    protected ObjectResult Creado(object valor) => StatusCode(StatusCodes.Status201Created, valor);
}
