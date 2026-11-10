# SCE-DS2-07A — Core workspace migration

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-07A` |
| **Predecessor** | `SCE-DS2-CLEANUP-01` |
| **Successor** | `SCE-DS2-07B` (remaining DS2-07 backlog) |
| **Target branch** | `STAGE` |

## Objective

Migrate the first high-priority **user-visible** authenticated pages to canonical Design System 2.0 workspace chrome, using `/dashboard/finance` as the visual reference. Redirect aliases stay as redirects — they are not visual surfaces.

## Redirect audit

| Alias | Renders UI? | Behaviour | Destination | Destination architecture |
| --- | --- | --- | --- | --- |
| `/dashboard/finance/income_statement` | No | Immediate `redirect` | `/dashboard/finance/reports` | Canonical (`SceWorkspaceChrome` + `FinanceWorkspaceTabs`); `REPORTING` capability + finance workspace context |
| `/dashboard/finance/reports` | Yes | Management P&L workspace | — | Canonical (pre-existing) |
| `/dashboard/teams/new` | No | Immediate `redirect` | `/dashboard/teams/register` | Canonical after this package (`SceWorkspaceChrome` in `TeamRegistrationWizard`); `TEAMS_MANAGE` |
| `/dashboard/teams/register` | Yes | Team registration wizard | — | Canonical |

Alias `layout.tsx` files must not wrap redirects in `PageShell` / `SceWorkspaceChrome`. That chrome never paints and must not be counted as a migrated page.

## Routes (P0)

| Route | Kind | Approach |
| --- | --- | --- |
| `/dashboard/finance/income_statement` | Redirect alias — not a visual surface | Preserve redirect to `/dashboard/finance/reports`; no alias layout chrome |
| `/dashboard/finance/reports` | Destination (pre-existing canonical) | Unchanged — already Finance-aligned |
| `/dashboard/persons/new` | Renderable | `PageShell` + `PersonForm` (`FormPagePattern` / chrome inside client form) |
| `/dashboard/persons/[id]/edit` | Renderable | Same as new person |
| `/dashboard/teams/new` | Redirect alias — not a visual surface | Preserve redirect to `/dashboard/teams/register`; no alias layout chrome |
| `/dashboard/teams/register` | Renderable destination | `PageShell` + `TeamRegistrationWizard` with `SceWorkspaceChrome`; `TEAMS_MANAGE` unchanged |
| `/dashboard/vereine/new` | Renderable | `PageShell` + `SceWorkspaceChrome`; `ClubForm` composer (no `FormPagePattern` on page — DS-10R3 governance) |

## Inventory accuracy (57 → 65, then corrected)

Authenticated discovery baseline remains **229** routes.

The first DS2-07A inventory regeneration reported **65 canonical** (from STAGE **57**) because:

| Change | Count | Visual surface? |
| --- | --- | --- |
| P0 renderable pages (`persons/new`, `persons/[id]/edit`, `vereine/new`) | +3 | Yes — architecture + this package |
| Redirect aliases wrapped in unused layout chrome (`income_statement`, `teams/new`) | +2 | **No** — classification error; reverted |
| `FormPagePattern` now composes `SceWorkspaceChrome` (`vereine/[clubId]/edit`, `vereine/[clubId]/teams/new`, `vereine/teams/[teamId]/edit`) | +3 | Architecture yes; **not** PO visual verification in this package |
| Destination `/dashboard/teams/register` | +1 | Yes — actual create flow |

Corrected canonical count after redirect integrity: **64**. Redirect aliases stay `legacy` with action `redirect alias → <destination> (not a visual surface)`.

This package does **not** introduce the full DS2-07B route coverage registry. Scanner architecture ≠ authenticated browser verification.

## Shared architecture

- **`FormPagePattern`** now composes `SceWorkspaceChrome` (aligned with `ListPagePattern` / `DetailPagePattern`).
- Route inventory scanner treats `FormPagePattern` as a canonical architecture marker.
- Immediate-redirect pages are classified from **page source only**. Layout chrome cannot promote an alias to canonical.

## Verification

```bash
npm run test:design-system
npm run build
node scripts/sce-ds2-06-route-inventory-scan.mjs
npx eslint <touched-files>
```

Automated: `lib/design-system/__tests__/sce-ds2-07a-core-workspace-migration.test.ts`

Authenticated browser coverage for this R1 pass: **none** (no manual UAT). Static governance, inventory regeneration, targeted tests, lint, and build only.

## Remaining DS2-07 backlog

All other `legacy` / `partial` entries in `sce-ds2-06-route-inventory.ts` with non-`none` / non-`redirect alias` actions — continue in DS2-07B+.
