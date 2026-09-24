# INTEGRATION-FINAL-01 — Controlled merge #707 + 05R1 migration

**Date:** 2026-09-24  
**Repo:** Clipse078/sportclubevo-webapp  
**Task:** INTEGRATION-FINAL-01

## Preflight (verified)

| Field | Value |
|-------|--------|
| Branch | `cursor/planning-ux-05r2-visual-refinement` |
| Source HEAD | `be999345a3826c99a2a4c2af4c0917c127bb66fb` |
| Pre-merge `origin/STAGE` | `a49190300247ca766160ab402c8b6dc96596b4be` |
| PR #707 | OPEN → merged to `STAGE` |
| PR #706 | OPEN → closed without merge |
| Pre-merge CI (#707) | Vercel SUCCESS |

## Merge

| Field | Value |
|-------|--------|
| PR #707 merge commit | `a4889fdde4fbd907c4ad9db63bdfad91b719bbdc` |
| Post-merge `origin/STAGE` | `a4889fdde4fbd907c4ad9db63bdfad91b719bbdc` |
| Source HEAD contained in STAGE | YES |

## PLANNING-UX-05R1 migration

| Field | Value |
|-------|--------|
| Migration | `20260924153000_planning_ux_05r1_operational_parity` |
| Repo SHA256 | `f8d1dd8d278a5d137471c316899524e2cc9ad914a97bc234227e48d24c5c7200` |
| STAGE host fragment | `ep-wispy-hall-aso93dy6` |
| STAGE database | `neondb` |
| STAGE fingerprint | `acd3b37682911890` |

**Pre-merge ledger (read-only):** migration already applied on STAGE (classification **B** — not the P0R1-expected **A**). Ledger: `finished_at=2026-09-24T15:48:53.330Z`, checksum match, `rolled_back_at=null`, objects present.

**Controlled deploy (post-merge):** `APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled` → **No pending migrations to apply** (idempotent; no duplicate apply).

## STAGE deployment

| Field | Value |
|-------|--------|
| STAGE SHA | `a4889fdde4fbd907c4ad9db63bdfad91b719bbdc` |
| Vercel (STAGE project) | SUCCESS on merge commit |

## PR #706 retirement

Closed without merge; superseded by #707. Closure comment references merge commit `a4889fdde4fbd907c4ad9db63bdfad91b719bbdc`.

## Final integration status

- Personal dashboard + Planning UX reconciliation + 05R2 + 05R1 schema/API/UI + requirement links + route sentinels on `STAGE`.
- Production database: untouched.
- Historical `_prisma_migrations` checksum drift elsewhere: not repaired (documented only).

## Verification (this task)

- Integration vitest gate: 116 tests (pre-merge), post-merge contract subset on `STAGE`: PASS.
- `npx prisma validate`, `prisma generate`, `tsc -p tsconfig.build.json --noEmit`, `APPLY_DATABASE_MIGRATIONS=false npm run build`: PASS.
