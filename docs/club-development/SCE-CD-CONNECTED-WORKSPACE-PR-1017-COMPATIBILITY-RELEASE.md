# PR #1017 — connected Vereinsentwicklung compatibility release (PO approval)

Shared STAGE already records:

- `20261120120000_sce_cd_connected_workspace`
- `20261120140000_sce_cd_connected_strategy_org_units`

This document is the **smallest separate application release** after that schema incident. It does not authorize further STAGE writes.

## Rollout order

1. Keep PR #1017 open until PO completes STAGE PR-preview UAT.
2. Deploy PR #1017 application to `sportclubevo-webapp-stage` with `APPLY_DATABASE_MIGRATIONS` **unset**.
3. Run read-only inventories: `npm run cd-connected:stage-migration-verify` and `npm run cd-connected:stage-reconciliation-outcome`.
4. PO manual UAT on the STAGE-backed PR preview URL (`readyPreviewOrigin` in the PO handoff ledger).
5. Acceptance seed and PO deep links remain on `sce_acceptance` only.

## Application scope

- **TARGET task list/detail reads** — task context registry, Vorhaben workspace filters, connected task table mappers.
- **Canonical club-wide strategy selection** — when a tenant has multiple `ClubStrategy` rows, select the oldest `scopeType=CLUB` row with `scopeOrgUnitId` null; UI title falls back to **Gesamtverein** when `title` is null.

## Verification (no STAGE writes)

| Step | Command |
|------|---------|
| Disposable migration replay | `TEST_DATABASE_URL=… npm run cd-connected:disposable-migration-verify` |
| Connected workflow integration | `TEST_DATABASE_URL=… npx vitest run lib/club-development/__tests__/sce-cd-connected-workflow.integration.test.ts` |
| STAGE health (read-only) | `npm run cd-connected:stage-migration-verify` |

Machine-readable handoff: `lib/club-development/sce-cd-connected-workspace-compatibility-release.ts`.