# PKG-03 — `tasks.delete` provisioning proposal (approval required)

## Registry status (code)

| Location | `tasks.delete` present? |
|----------|-------------------------|
| `lib/permissions/permissions.ts` (`TASKS_DELETE`) | **Yes** |
| `lib/permissions/task-permission-reconciliation.ts` (`TASK_PERMISSION_DEFS`) | **No** — operational CRUD keys only (delete via dedicated sync) |
| `prisma/seed.ts` | **Yes** (PKG-03 gap closure) |
| `lib/roles/permission-metadata.ts` | **Yes** (labels added in PKG-03 gap closure) |
| Reconciliation helper | `lib/permissions/tasks-delete-permission-reconciliation.ts` (dry-run default) |
| CLI sync | `scripts/sync-tasks-delete-permission.ts` |
| STAGE narrow proposal | `scripts/pkg-03-tasks-delete-stage-reconcile.ts` (fc-allschwil administrator roles only) |

Deletion APIs use `hasTenantDeletionAuthority` with `PERMISSIONS.TASKS_DELETE`, matching `initiatives.delete` for phase delete.

## Proposed role-data change (do **not** apply without PO approval)

1. **Permission row** (mirror seed shape for other `*.delete` keys):
   - `key`: `tasks.delete`
   - `name`: `Permanently delete tasks`
   - `module`: `TASKS`, `scope`: `TENANT`, `grantableByAdmin`: `true`

2. **Bootstrap grants** (idempotent reconciliation only — same as `workspace.delete`):
   - Platform `super_admin` → `tasks.delete`
   - Each materialized tenant Club Admin role (`club_admin__<tenantKey>`) → `tasks.delete`

3. **Future seed alignment** (separate commit after approval):
   - Append the permission row to `prisma/seed.ts` alongside existing `tasks.*` keys.
   - Extend `TASK_PERMISSION_DEFS` only if product wants tasks.delete in the standard task sync script (optional; delete keys are often separate reconciliation scripts).

4. **Explicit non-goals**
   - Do **not** auto-grant `tasks.delete` to every `tasks.manage` holder (`tasks.manage` ≠ delete — see `DEN-01` pattern for `teams.delete`).
   - Do **not** run reconciliation against STAGE/PROD from this package.

## Read-only STAGE verification

Run locally against STAGE Neon (read-only):

```bash
DATABASE_URL='…' npx tsx scripts/audit/tasks-delete-stage-readonly-audit.ts
```

Reports whether the `Permission` row exists and which tenant Club Admin roles already hold `tasks.delete`.