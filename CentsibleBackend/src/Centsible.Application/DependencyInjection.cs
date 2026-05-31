using System.Reflection;
using Centsible.Application.Interfaces;
using Centsible.Application.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Centsible.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly()));
        
        services.AddScoped<ICategoryPredictionService, CategoryPredictionService>();

        return services;
    }
}
