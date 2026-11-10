# SCE-DS2-07A — Core workspace migration

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-07A` |
| **Predecessor** | `SCE-DS2-CLEANUP-01` |
| **Successor** | `SCE-DS2-07B` (remaining DS2-07 backlog) |
| **Target branch** | `STAGE` |

## Objective

Migrate the first five high-priority authenticated routes to canonical Design System 2.0 workspace chrome, using `/dashboard/finance` as the visual reference.

## Routes (P0)

| Route | Approach |
| --- | --- |
| `/dashboard/finance/income_statement` | Preserve redirect to `/dashboard/finance/reports`; alias layout adds `PageShell` + `SceWorkspaceChrome` |
| `/dashboard/persons/new` | `PageShell` + `PersonForm` (`FormPagePattern` / chrome inside client form) |
| `/dashboard/persons/[id]/edit` | Same as new person |
| `/dashboard/teams/new` | Preserve redirect to `/dashboard/teams/register`; alias layout adds chrome |
| `/dashboard/vereine/new` | `PageShell` + `SceWorkspaceChrome`; `ClubForm` composer (no `FormPagePattern` on page — DS-10R3 governance) |

## Shared architecture

- **`FormPagePattern`** now composes `SceWorkspaceChrome` (aligned with `ListPagePattern` / `DetailPagePattern`).
- Route inventory scanner treats `FormPagePattern` as a canonical architecture marker.

## Verification

```bash
npm run test:design-system
npm run build
node scripts/sce-ds2-06-route-inventory-scan.mjs
npx eslint <touched-files>
```

Automated: `lib/design-system/__tests__/sce-ds2-07a-core-workspace-migration.test.ts`

## Remaining DS2-07 backlog

All other `legacy` / `partial` entries in `sce-ds2-06-route-inventory.ts` with non-`none` actions — continue in DS2-07B+.
