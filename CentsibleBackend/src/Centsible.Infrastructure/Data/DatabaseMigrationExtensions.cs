using System.Data;
using Microsoft.EntityFrameworkCore;

namespace Centsible.Infrastructure.Data;

public static class DatabaseMigrationExtensions
{
    public static void ApplyMigrationsSafe(this AppDbContext context)
    {
        if (!context.Database.CanConnect())
        {
            Console.WriteLine("⚠️  Cannot connect to database — skipping migrations.");
            return;
        }

        var applied = context.Database.GetAppliedMigrations().ToList();

        if (!applied.Any() && TableUsersExists(context))
        {
            Console.WriteLine("📦 Baselining migration history for existing database...");
            BaselineInitialMigrations(context);
        }

        var pending = context.Database.GetPendingMigrations().ToList();
        if (pending.Count > 0)
        {
            context.Database.Migrate();
            Console.WriteLine($"✅ Applied migrations: {string.Join(", ", pending)}");
        }
        else
        {
            Console.WriteLine("✅ Database schema is up to date.");
        }
    }

    private static bool TableUsersExists(AppDbContext context)
    {
        try
        {
            var connection = context.Database.GetDbConnection();
            if (connection.State != ConnectionState.Open)
                connection.Open();

            using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Users')";
            return Convert.ToBoolean(command.ExecuteScalar());
        }
        catch
        {
            return false;
        }
    }

    private static void BaselineInitialMigrations(AppDbContext context)
    {
        context.Database.ExecuteSqlRaw("""
            CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                "MigrationId" character varying(150) NOT NULL,
                "ProductVersion" character varying(32) NOT NULL,
                CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
            );
            """);

        foreach (var id in new[] { "20260313114813_InitialCreate", "20260315171515_UI_Polish_Update" })
        {
            context.Database.ExecuteSqlRaw(
                """
                INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                VALUES ({0}, '10.0.5')
                ON CONFLICT ("MigrationId") DO NOTHING;
                """,
                id);
        }
    }
}
