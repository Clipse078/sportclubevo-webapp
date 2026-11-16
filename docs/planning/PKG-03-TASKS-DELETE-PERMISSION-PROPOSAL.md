# PKG-03 — `tasks.delete` permission (code + STAGE role data)

## Registry status (code)

| Location | `tasks.delete` present? |
|----------|-------------------------|
| `lib/permissions/permissions.ts` (`TASKS_DELETE`) | **Yes** |
| `lib/permissions/task-permission-reconciliation.ts` (`TASK_PERMISSION_DEFS`) | **No** — operational CRUD keys only (delete via dedicated sync) |
| `prisma/seed.ts` | **Yes** (PKG-03 gap closure) |
| `lib/roles/permission-metadata.ts` | **Yes** (labels added in PKG-03 gap closure) |
| Reconciliation helper | `lib/permissions/tasks-delete-permission-reconciliation.ts` (dry-run default) |
| CLI sync | `scripts/sync-tasks-delete-permission.ts` |
| STAGE narrow reconcile (historical) | `scripts/pkg-03-tasks-delete-stage-reconcile.ts` (fc-allschwil administrator roles only) |

Deletion APIs use `hasTenantDeletionAuthority` with `PERMISSIONS.TASKS_DELETE`, matching `initiatives.delete` for phase delete.

## STAGE role-data status (designated database)

| Field | Value |
|-------|--------|
| Environment | `STAGE` (`SCE_DATA_ENVIRONMENT=STAGE`) |
| Canonical fingerprint | `acd3b37682911890` |
| Host fragment | `ep-wispy-hall-aso93dy6` |
| **Provisioning** | **Already applied and verified** on designated STAGE (narrow reconcile: `super_admin` + `club_admin__fc-allschwil`) — **do not re-run** provisioning scripts without an explicit new operator request. |
| Production | **Separate** database and fingerprint — untouched by STAGE reconcile; no production promotion implied here. |

Read-only verification (no writes):

```bash
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  DATABASE_URL='…' npx tsx scripts/audit/tasks-delete-stage-readonly-audit.ts
```

## Code-only changes for other environments (not STAGE re-provision)

1. **Permission row** (mirror seed shape for other `*.delete` keys):
   - `key`: `tasks.delete`
   - `name`: `Permanently delete tasks`
   - `module`: `TASKS`, `scope`: `TENANT`, `grantableByAdmin`: `true`

2. **Bootstrap grants** (idempotent reconciliation only — same as `workspace.delete`):
   - Platform `super_admin` → `tasks.delete`
   - Each materialized tenant Club Admin role (`club_admin__<tenantKey>`) → `tasks.delete`

3. **Future seed alignment** (separate commit when expanding beyond STAGE PO tenant):
   - Permission row already in `prisma/seed.ts`.
   - Extend `TASK_PERMISSION_DEFS` only if product wants tasks.delete in the standard task sync script (optional; delete keys are often separate reconciliation scripts).

4. **Explicit non-goals**
   - Do **not** auto-grant `tasks.delete` to every `tasks.manage` holder (`tasks.manage` ≠ delete — see `DEN-01` pattern for `teams.delete`).
   - Do **not** re-run STAGE narrow reconcile or full permission sync against designated STAGE (`acd3b37682911890`) from delivery audits — data is already aligned.