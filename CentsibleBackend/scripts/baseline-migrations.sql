-- Run ONCE when dotnet ef database update fails with "Badges already exists"
-- (database was created without EF migration history).
--
-- Option A (recommended): from Centsible.Api folder:
--   dotnet run -- --migrate-only
--
-- Option B (manual psql):
--   psql -U postgres -d CentsibleDB -f baseline-migrations.sql
--   dotnet ef database update --project ..\Centsible.Infrastructure

CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" character varying(150) NOT NULL,
    "ProductVersion" character varying(32) NOT NULL,
    CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
);

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES
    ('20260313114813_InitialCreate', '10.0.5'),
    ('20260315171515_UI_Polish_Update', '10.0.5')
ON CONFLICT ("MigrationId") DO NOTHING;
