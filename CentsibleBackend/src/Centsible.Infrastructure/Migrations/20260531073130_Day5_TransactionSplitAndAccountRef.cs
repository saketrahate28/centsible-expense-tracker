using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Centsible.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Day5_TransactionSplitAndAccountRef : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Splits_Transactions_TransactionId",
                table: "Splits");

            migrationBuilder.AlterColumn<int>(
                name: "CategoryId",
                table: "Transactions",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<string>(
                name: "AccountReference",
                table: "Transactions",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "SplitId",
                table: "Transactions",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "Transactions",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_Transactions_SplitId",
                table: "Transactions",
                column: "SplitId");

            migrationBuilder.CreateIndex(
                name: "IX_Accounts_UserId_MaskedAccountNumber",
                table: "Accounts",
                columns: new[] { "UserId", "MaskedAccountNumber" });

            migrationBuilder.AddForeignKey(
                name: "FK_Splits_Transactions_TransactionId",
                table: "Splits",
                column: "TransactionId",
                principalTable: "Transactions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Transactions_Splits_SplitId",
                table: "Transactions",
                column: "SplitId",
                principalTable: "Splits",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Splits_Transactions_TransactionId",
                table: "Splits");

            migrationBuilder.DropForeignKey(
                name: "FK_Transactions_Splits_SplitId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Transactions_SplitId",
                table: "Transactions");

            migrationBuilder.DropIndex(
                name: "IX_Accounts_UserId_MaskedAccountNumber",
                table: "Accounts");

            migrationBuilder.DropColumn(
                name: "AccountReference",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "SplitId",
                table: "Transactions");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "Transactions");

            migrationBuilder.AlterColumn<int>(
                name: "CategoryId",
                table: "Transactions",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Splits_Transactions_TransactionId",
                table: "Splits",
                column: "TransactionId",
                principalTable: "Transactions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
