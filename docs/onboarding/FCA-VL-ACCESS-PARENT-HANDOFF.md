# FCA VL access — parent PR #1001 handoff (accurate)

## Git

| Field | Value |
| --- | --- |
| Branch | `cursor/vl-access-people-workspace` |
| Final SHA | `75ada941790b09c71916aeca6027d70ed29e38f5` |
| PR | https://github.com/Clipse078/sportclubevo-webapp/pull/1001 |

## Ready application URL (commit-bound)

| Environment | URL |
| --- | --- |
| Vercel Preview (Ready on this SHA) | https://sportclubevo-webapp-stage-4yxdxbj93-mds-projects-462da62c.vercel.app |
| Canonical STAGE (PO acceptance) | https://fcallschwil.sportclubevo.com |

Do **not** use `fc-allschwil-webapp-stage.vercel.app` for this handoff.

## Patrick-equivalent access verification

Patrick (`patrick.scotton@fcallschwil.ch`) is verified through:

1. **Actor resolution** — `userHasVereinsleitungWorkspaceAccess(userId, tenantId)` (materialised tenant role with `canAccessVereinsleitung`, not Club-Admin flag alone).
2. **Effective permissions** — all keys in `FCA_VEREINSLEITUNG_STRATEGIC_PERMISSION_KEYS` via `createEffectivePermissionResolver`.
3. **Restricted meeting visibility** — tenant role with `canAttendVereinsleitungMeetings: true` (VL Sitzungen participation gate).

Read-only diagnosis: `npx tsx scripts/fca-vl-access-readonly-diagnosis.ts` (no mutations).

## Präsident (Pilot) role scope (not broadened)

| Aspect | Scope |
| --- | --- |
| Template | `PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE` / `pilot_praesident` |
| Tenant | `fc-allschwil` only (`PILOT_TENANT_KEY`) |
| Who inherits | Only users explicitly assigned this **tenant-scoped** role (confirmed roster: Patrick only) |
| Role row mutations | Idempotent permission + flag sync on the **FC Allschwil tenant role row** — not platform roles, not other tenants |
| VL invitations package | Uses separate **Vereinsleitung (Pilot) — Mitwirkung** preset — does **not** clone Präsident |

## Reconciliation

Applied via `scripts/sync-fca-vl-access-reconciliation.ts` with `APPLY_FCA_VL_ACCESS_RECONCILIATION=true` on authorised STAGE only. Child invitation package does **not** re-run Patrick reconciliation.