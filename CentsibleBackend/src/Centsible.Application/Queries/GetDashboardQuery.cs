using Centsible.Application.DTOs;
using MediatR;

namespace Centsible.Application.Queries;

public class GetDashboardQuery : IRequest<DashboardDto>
{
    public Guid UserId { get; set; }
}
