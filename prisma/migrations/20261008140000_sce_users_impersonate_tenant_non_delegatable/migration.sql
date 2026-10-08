-- PEOPLE-ACCESS-IMPERSONATION-01R8 — tenant impersonation is privileged, not delegatable to custom roles

UPDATE "Permission"
SET
  "grantableByAdmin" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "key" = 'users.impersonate_tenant';
