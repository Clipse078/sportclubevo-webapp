-- PR #1017 — allow multiple club-wide (Gesamtverein-scoped) ClubStrategy rows per tenant.
-- Preserves legacy rows; drops singleton partial unique index from connected workspace migration.

DROP INDEX IF EXISTS "ClubStrategy_tenant_club_scope_key";