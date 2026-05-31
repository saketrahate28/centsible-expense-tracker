using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Centsible.Infrastructure.Migrations;

/// <inheritdoc />
public partial class SyncSmsMerchantAndDedup : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "Age" integer;
            ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "City" text;
            ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ExpectedBankAccountsCount" integer NOT NULL DEFAULT 1;
            ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "IsOnboarded" boolean NOT NULL DEFAULT false;
            """);

        migrationBuilder.Sql("""
            DROP INDEX IF EXISTS "IX_Transactions_UserId";
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "Age", table: "Users");
        migrationBuilder.DropColumn(name: "City", table: "Users");
        migrationBuilder.DropColumn(name: "ExpectedBankAccountsCount", table: "Users");
        migrationBuilder.DropColumn(name: "IsOnboarded", table: "Users");

        migrationBuilder.CreateIndex(
            name: "IX_Transactions_UserId",
            table: "Transactions",
            column: "UserId");
    }
}
