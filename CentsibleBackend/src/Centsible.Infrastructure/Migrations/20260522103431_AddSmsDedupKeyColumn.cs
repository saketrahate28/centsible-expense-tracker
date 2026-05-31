using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Centsible.Infrastructure.Migrations;

/// <inheritdoc />
public partial class AddSmsDedupKeyColumn : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "SmsDedupKey" text;
            """);

        migrationBuilder.Sql("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Transactions_UserId_SmsDedupKey"
            ON "Transactions" ("UserId", "SmsDedupKey")
            WHERE "SmsDedupKey" IS NOT NULL;
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(
            name: "IX_Transactions_UserId_SmsDedupKey",
            table: "Transactions");

        migrationBuilder.DropColumn(
            name: "SmsDedupKey",
            table: "Transactions");
    }
}
