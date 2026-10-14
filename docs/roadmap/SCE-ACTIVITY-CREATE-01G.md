# SCE-ACTIVITY-CREATE-01G — Planning Surface Integration & Global Create Entry

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-ACTIVITY-CREATE-01G` |
| **Status** | **CLOSED / ACCEPTED** |
| **Branch** | `cursor/sce-activity-create-01g-global-create-integration` |
| **PR** | **#844** → `STAGE` — **MERGED** (see closure record below for merge SHA) |
| **Feature HEAD (approved implementation)** | `9e41e6c8d2a1b2c863026f8c142b9dc6b598efd8` |
| **STAGE baseline (pre-merge)** | `603eff2e6888c8103625a6db3c9eccb57ca84347` (post PR #843 / 01F) |
| **Predecessor** | [`SCE-ACTIVITY-CREATE-01F`](./SCE-ACTIVITY-CREATE-01F.md) — **CLOSED** |
| **Programme** | [`SCE-ACTIVITY-CREATE-01`](./SCE-ACTIVITY-CREATE-01.md) |
| **PO UAT** | **PASS** (PO-owned final approval of global **+ Erstellen** experience) |

## Product rule (accepted)

**ONE GLOBAL ACTIVITY-CREATE TRIGGER. SAME MENU. SAME PERMISSIONS. SAME COMPOSER FAMILY. EVERYWHERE.**

Canonical entry: **`+ Erstellen`**

Permission-aware options (unauthorized types are **not rendered**):

| Label | Permission |
| --- | --- |
| Training | `TRAININGS_MANAGE` |
| Spiel | `EVENTS_MANAGE` |
| Turnier | `EVENTS_MANAGE` |
| Veranstaltung | `EVENTS_MANAGE` |

The current page is **context** (origin handoff), not a restriction on which activity type may be created. Example: Matchcenter → Erstellen → Turnier remains supported.

## Architecture

| Symbol | Contract |
| --- | --- |
| **GLOBAL_ACTIVITY_CREATE_TRIGGER** | `SceActivityCreateMenu` / `SceActivityCreateTrigger` (`components/sce/activity-create/`) |
| **Menu config** | `SCE_ACTIVITY_CREATE_MENU_ENTRIES` — labels, `/new` fallbacks, semantic icon accents |
| **Permissions** | `resolveSceActivityCreatePermissions` / `resolveSceActivityCreatePermissionsFromFlags` — page-independent; repository-defined flags only |
| **Composer mapping** | Training → `TrainingCreateForm`; Match → `MatchCreateForm`; Tournament → `TournamentCreateForm`; Club Event → `VeranstaltungCreateForm` (overlay `containerMode="overlay"`) |
| **Origin / success** | `SceActivityCreateOriginContext` (`PLANNING_SURFACE`); overlay `successBehavior="stay"`; Wochenplaner reconciliation via `reconcilePlanningHub` + `/api/planning-hub/planner-revalidate` |
| **Fallback routes** | Canonical `/dashboard/*/new` full-page composers retained; sr-only page links from menu when overlay props are available |
| **Legacy prohibition** | Eligible surfaces must not ship parallel dedicated activity-create CTAs |

## Surfaces adopted (01G)

| Surface | Adoption |
| --- | --- |
| **Wochenplaner** | `WeekPlannerChrome` + `planner/week` server props via `buildSceActivityCreateMenuProps` |
| **Trainings** | Management header + quick-access rail |
| **Matchcenter** | Spiele management header + quick-access rail |
| **Tournamentcenter** | Management header + quick-access rail |
| **Veranstaltungen** | Management header + quick-access rail |
| **Planning Hub** | `PlanningHubCreateMenu` re-exports canonical `SceActivityCreateMenu` |
| **Dashboard (main)** | **Out of scope for 01G** — handled in **01J** per programme boundary |

## Responsive & accessibility

- Desktop/tablet: compact primary trigger + dropdown menu (`role="menu"`, `menuitem` rows with visible labels + semantic icons)
- Escape closes menu and restores focus to trigger
- Unauthorized types omitted (not merely disabled)

## Legacy trigger closure

| Check | Result |
| --- | --- |
| **ELIGIBLE_PARALLEL_ACTIVITY_CREATE_TRIGGERS** | **0** on eligible production surfaces (guardrail tests) |
| **`*ComposerCreateTrigger.tsx`** | Deprecated **re-exports** of `SceActivityCreateMenu` — retained for import compatibility; not used on eligible surfaces |
| **`TrainingCreateMenu.tsx`** | **Orphan** (no production imports) — deferred removal to **01N** to avoid scope expansion at closure |

## Design system & Toggle First (closure)

| Check | Result |
| --- | --- |
| **SCE_DESIGN_SYSTEM_COMPLIANCE** | **PASS** — canonical global menu, semantic activity icons, SCE menu surface, Composer overlays, responsive + a11y behavior |
| **PARALLEL_LEGACY_PATTERN** | **NO** on eligible production surfaces |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |
| **NEW_BINARY_CHECKBOXES (01G)** | **0** |

## Automated validation (closure)

| Item | Result |
| --- | --- |
| **Vitest (01A–01G activity-create regression suite)** | **24** files · **290** tests — **0** failures |
| **Prisma validate** | **PASS** |
| **Production build** | **PASS** — `NODE_OPTIONS='--max-old-space-size=8192' npm run build` |
| **Migration (01G)** | **NONE** |

## PO UAT (final)

| Result | **PASS** |
| --- | --- |
| **Cursor manual UAT** | **SKIPPED_PO_OWNED** |
| **Cursor screenshots** | **SKIPPED_PO_OWNED** |

## Safety

| Item | Value |
| --- | --- |
| **PROD** | **Not touched** |
| **Persistent test / UAT data (01G)** | **0** |

## Tests (reference)

- `lib/sce/activity-create/__tests__/sce-activity-create-01g.test.ts`
- `components/sce/activity-create/__tests__/SceActivityCreateMenu.test.tsx`
- Shared: `sce-activity-create-01a` through `01f` architecture + domain regression tests (see closure run)

## Roadmap transition

| Package | Status |
| --- | --- |
| **SCE-ACTIVITY-CREATE-01F** | **CLOSED** |
| **SCE-ACTIVITY-CREATE-01G** | **CLOSED** |
| **SCE-ACTIVITY-CREATE-01H** | **NEXT — NOT STARTED** — Core Planning Surfaces Adoption (builds on SCE Design System, Context Tabs, World Activity Cards, Activity Presentation Model, Activity Composer, global **+ Erstellen**, permissions, origin/success contracts) |
| **SCE-TOURNAMENT-PLANNER-01** | **PLANNED — NOT STARTED** |

## Merge record (filled post-merge)

| Field | Value |
| --- | --- |
| **Merge commit on STAGE** | _(see programme doc §01G closure)_ |
| **STAGE HEAD (post-merge)** | _(see programme doc §01G closure)_ |
