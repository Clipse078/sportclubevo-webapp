# SCE-DS2-CLEANUP-01 — Design system foundation cleanup

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-CLEANUP-01` |
| **Predecessor** | `SCE-DS2-06` |
| **Successor** | `SCE-DS2-07` |
| **Target branch** | `STAGE` |

## Objective

Remove verified dead code, consolidate duplicate styling governance, and document the canonical DS2-07 architecture **without** performing the full authenticated route migration.

## Implemented in this package (A / B)

| Item | Outcome |
| --- | --- |
| `DashboardPattern` / `SettingsPattern` | **Removed** (no production imports) |
| `ScePageTabs` alias | **Removed** — use `SceContextTabs` |
| `MotionIcon` public barrel export | **Removed** — `AnimatedNavIcon` is canonical |
| Visual archetype smoke | Tabs/chips use White Edition CSS variables |
| `StatusIndicator` | Maps to `--sce-color-status-*` |
| White Edition danger/info | Darker status hues on tinted fills (WCAG AA) |
| Contrast pairs | Extended error, info, badge, neutral pairs |

Ledger: `lib/design-system/sce-ds2-cleanup-01-audit.ts`

## Canonical architecture for DS2-07

### Page headers and breadcrumbs

1. **`PageShell`** — outer authenticated canvas (width mode, gutters). Always retained when a route participates in the admin shell.
2. **`SceWorkspaceChrome`** — workspace composition slot: optional breadcrumbs → `SceWorkspaceHeader` → optional context tabs → content (`data-sce-workspace-chrome`).
3. **`SceBreadcrumbs` / `PageBreadcrumbs`** — wayfinding for deep hierarchies (Finance, teams, finance sub-ledgers).

**Target stack:** `PageShell` → pattern (`ListPagePattern` / `DetailPagePattern` / `FormPagePattern`) or direct `SceWorkspaceChrome` → domain content.

### Workspace chrome

- **Reference:** `/dashboard/finance` and finance sub-routes (`FinanceWorkspaceTabs`).
- **Partial routes (51):** typically `PageShell` + legacy `PageHeader` — migrate chrome header + tabs without rewriting business logic.
- **`SceWorkspaceSurface`:** padding rhythm inside chrome; adopt when tab panels need bounded module canvas.

### List / detail page patterns

- **`ListPagePattern`** / **`DetailPagePattern`** — compose `SceWorkspaceChrome` + toolbar/table slots.
- **Mandatory DS2-06 routes** already on patterns or chrome; expand pattern adoption via shared-component improvements (filters, KPI strip) in DS2-07.

### Finance-aligned context tabs

- **Canonical:** `SceContextTabs` + domain config modules (`buildTeamCockpitTabNavigationConfig`, finance workspace tab builders).
- **Anti-pattern:** bespoke `border-b-2` tab rows (`FinanzenTabNav`, drawer tab shells) — migrate behind module owners.

### Inline editors

- **Foundation:** `SceInlineEditor`, `SceExpandablePanel` under `components/sce/page/` (unwired — DS2-07 wires first consumers).
- **Operational today:** contextual `Sheet` + `contextualPanel` (Wochenplaner editor reference).

### Contextual panels vs dialogs

| Surface | When | Primitive |
| --- | --- | --- |
| Contextual side panel | In-context edit, preserve list/calendar context | `Sheet` + `contextualPanel` + `globals.css` viewport rules |
| Modal dialog | Focused create/confirm, destructive confirm, compact pickers | `Dialog` → `SceModalOverlay` |
| Retain modal | Composer / planning hubs per inventory | `sce-ds2-06-modal-migration-inventory.ts` |

## Deferred to DS2-07 (C / D)

- 121 **legacy** + 51 **partial** authenticated routes (`sce-ds2-06-route-inventory.ts`)
- Emerald / raw Tailwind status sweeps (~361 `emerald-*` hits)
- `FinanzenTabNav` → `SceContextTabs`
- `RegistrationDrawerTabShell` (LEGACY-TABS-002)
- Duplicate autofill CSS chains (`.fca-input` vs `.sce-login-input`)
- Dashboard/settings archetype patterns (reintroduce on `SceWorkspaceChrome`)

## Verification

```bash
npm run test:design-system
npm run build
npx eslint <touched-files>
```

Automated tests: `lib/design-system/__tests__/sce-ds2-cleanup-01-foundation.test.ts`, existing DS2-06 suite.

Regenerate route inventory only when route files change: `node scripts/sce-ds2-06-route-inventory-scan.mjs`
