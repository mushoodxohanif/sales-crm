-- AlterTable
ALTER TABLE "IntegrationClient" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;

-- Built-in public OAuth client for Losono (PKCE; no client secret required)
INSERT INTO "IntegrationClient" ("id", "clientId", "clientSecret", "name", "redirectUris", "isPublic")
VALUES (
  'losono-integration-client',
  'losono',
  '',
  'Losono',
  '[]'::jsonb,
  true
)
ON CONFLICT ("clientId") DO UPDATE SET
  "name" = EXCLUDED."name",
  "clientSecret" = EXCLUDED."clientSecret",
  "redirectUris" = EXCLUDED."redirectUris",
  "isPublic" = EXCLUDED."isPublic";
