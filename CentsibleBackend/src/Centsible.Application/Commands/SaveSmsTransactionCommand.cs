using Centsible.Application.DTOs;
using MediatR;

namespace Centsible.Application.Commands;

public class SaveSmsTransactionCommand : IRequest<Guid>
{
    public Guid UserId { get; set; }
    public Guid AccountId { get; set; }
    public SmsTransactionDto SmsData { get; set; } = new();
}
