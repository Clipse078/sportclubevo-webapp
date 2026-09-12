# Deployment Runtime Contract

Engineering reference for the current SportClubEvo deployment architecture.

## Environment contract

- A normal Vercel Preview is classified as `preview`, even when `APP_ENV=stage`
  is configured. Preview classification prevents STAGE privileges from being
  inferred from `APP_ENV`.
- Normal Preview deployments may intentionally use the configured persistent
  STAGE database. This is supported architecture, not a preflight violation.
- When Preview uses that STAGE database, `SCE_BILLING_ENCRYPTION_KEY` must be
  configured in the Preview Vercel environment scope with the same value as STAGE
  Production. Without it, `BillingBankAccount` decryption fails and native invoice
  PDF / delivery attachment generation returns HTTP 503
  (`Bankverbindung konnte nicht gelesen werden.`).
- STAGE is persistent and non-disposable. Preview, development, testing,
  bootstrap, seed, migration, validation, and environment setup processes must
  preserve its data.
- Acceptance is isolated. When database reference hosts are configured,
  preflight rejects Acceptance targeting STAGE, STAGE targeting Acceptance,
  Production targeting Acceptance, and Acceptance targeting a non-Acceptance
  host.
- Production and Acceptance configuration or data must not be changed while
  preparing or validating a normal Preview deployment.

## Deployment identity and diagnostics

`GET /api/health/diag` always returns a public, non-secret identity subset so it
remains useful when login is unavailable:

- deployment commit SHA/ref and environment labels;
- database hostname and a deterministic host/database-name fingerprint;
- booleans indicating whether database and auth configuration are present; and
- identity validation status and violations.

It never returns connection strings, secrets, passwords, password hashes,
tokens, user records, memberships, or auth configuration values. Deployment
ID/URL, database connectivity, runtime warnings, and runtime errors are added
only for callers authorized with `users.manage`.

## Deployment preflight

`npm run deployment:preflight` performs read-only, fail-closed checks before a
build:

- required deployed auth/database configuration is present;
- `DATABASE_URL` is a structurally valid PostgreSQL URL and is not loopback in
  a deployed context;
- deployed runtime classification is known; and
- configured Acceptance/STAGE database isolation references are respected.

Plain Preview classification is authoritative over `APP_ENV`; therefore an
`APP_ENV=stage` value on Preview does not grant STAGE runtime privileges and is
not rejected. Preview targeting the configured persistent STAGE database is
also intentionally allowed.

## Protected persistent authentication

`it@fcallschwil.ch` is protected persistent authentication data. Normal
development, deployment, Preview creation, migration, seed, bootstrap, testing,
debugging, validation, and environment setup must never change its password or
`passwordHash`.

Automated existing-user password writes are blocked by
`lib/server/protected-auth-guard.ts`. A password hash may be written for a
genuine new-user creation. An existing protected password may change only
through an explicitly authorized intentional credential-change/recovery path.
Such a path must use the established audit mechanism and must not include
passwords or hashes in audit data.

Current mutation-path rules:

- `prisma/seed.ts` does not write `User.passwordHash`.
- `prisma/bootstrap-admin.ts` creates/updates
  `admin@fcallschwil.ch`; its hash is create-only.
- `scripts/rperm-03b-bootstrap-admin-separation.ts` applies the protected guard
  before account creation and before either optional existing-user password
  update. The protected FC Allschwil account can be created only when genuinely
  absent; its existing hash cannot be reset by this bootstrap.
- Existing intentional application password-change/recovery paths use the
  established audit mechanisms. No new reset product path is introduced here.

## Local environment exclusion

`.vercelignore` excludes `.env.local` and related local environment files from
Vercel uploads. This is preventive hardening against local environment leakage
and configuration contamination.

It is not the proven cause of the September 8 credential incident. That
incident proved only that the stored bcrypt hash for `it@fcallschwil.ch` did not
match the password being entered. The historical code or process that changed
the hash remains unproven.
