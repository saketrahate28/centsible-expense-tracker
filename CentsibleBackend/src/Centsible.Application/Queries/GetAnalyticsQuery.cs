using Centsible.Application.DTOs;
using MediatR;

namespace Centsible.Application.Queries;

public class GetAnalyticsQuery : IRequest<AnalyticsDto>
{
    public Guid UserId { get; set; }
    public string Timeframe { get; set; } = "Month"; // Week, Month, Year
}
