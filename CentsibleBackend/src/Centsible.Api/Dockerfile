# ============================================
# Centsible API — Multi-stage Docker Build
# ============================================

# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project files first for better layer caching
COPY Centsible.Domain/Centsible.Domain.csproj Centsible.Domain/
COPY Centsible.Application/Centsible.Application.csproj Centsible.Application/
COPY Centsible.Infrastructure/Centsible.Infrastructure.csproj Centsible.Infrastructure/
COPY Centsible.Api/Centsible.Api.csproj Centsible.Api/

# Restore dependencies
RUN dotnet restore Centsible.Api/Centsible.Api.csproj

# Copy all source code
COPY . .

# Build and publish release
RUN dotnet publish Centsible.Api/Centsible.Api.csproj -c Release -o /app/publish --no-restore

# Stage 2: Runtime (smaller image)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# Create non-root user for security
RUN groupadd -r centsible && useradd -r -g centsible centsible

COPY --from=build /app/publish .

# Expose port
EXPOSE 8080

# Set environment variables
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Run as non-root user
USER centsible

ENTRYPOINT ["dotnet", "Centsible.Api.dll"]
