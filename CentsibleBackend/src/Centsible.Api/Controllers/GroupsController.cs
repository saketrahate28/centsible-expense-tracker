using Centsible.Application.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace Centsible.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GroupsController : ControllerBase
{
    private readonly IMediator _mediator;

    public GroupsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private Guid GetCurrentUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (claim != null && Guid.TryParse(claim, out var userId))
            return userId;

        return Guid.Parse("00000000-0000-0000-0000-000000000001");
    }

    [HttpPost]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupCommand command)
    {
        try
        {
            command.UserId = GetCurrentUserId();
            var groupId = await _mediator.Send(command);
            return Ok(new { id = groupId });
        }
        catch (Exception ex) when (ex.Message.Contains("FREE_LIMIT_REACHED"))
        {
            return BadRequest(new { code = "FREE_LIMIT_REACHED", message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
