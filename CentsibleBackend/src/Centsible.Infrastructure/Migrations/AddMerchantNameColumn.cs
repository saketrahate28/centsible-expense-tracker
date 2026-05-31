using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Centsible.Infrastructure.Migrations;

/// <inheritdoc />
public partial class AddMerchantNameColumn : Migration
{
    /// <inheritdoc />
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "Transactions" ADD COLUMN IF NOT EXISTS "MerchantName" text;
            """);
    }

    /// <inheritdoc />
    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            ALTER TABLE "Transactions" DROP COLUMN IF EXISTS "MerchantName";
            """);
    }
}
