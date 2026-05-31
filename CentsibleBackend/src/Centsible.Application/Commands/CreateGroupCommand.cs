using MediatR;

namespace Centsible.Application.Commands;

public class CreateGroupCommand : IRequest<Guid>
{
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? CoverImage { get; set; }
}
