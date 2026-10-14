# SCE-ACTIVITY-CREATE-01G — Planning Surface Integration & Global Create Entry

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01G` |
| **Status** | **IN_PROGRESS** (implementation on branch `cursor/sce-activity-create-01g-global-create-integration`) |
| **Predecessor** | [`SCE-ACTIVITY-CREATE-01F`](./SCE-ACTIVITY-CREATE-01F.md) — **CLOSED** |
| **Programme** | [`SCE-ACTIVITY-CREATE-01`](./SCE-ACTIVITY-CREATE-01.md) |

## Product rule

Every eligible activity/planning surface uses the same global **`+ Erstellen`** entry point, offering all activity types the current user is permitted to create:

- Training
- Spiel
- Turnier
- Veranstaltung

Page context informs origin handoff; it does **not** restrict which types appear (except canonical domain permissions).

## Architecture

| Symbol | Contract |
|--------|----------|
| **GLOBAL_ACTIVITY_CREATE_TRIGGER** | `SceActivityCreateMenu` / `SceActivityCreateTrigger` (`components/sce/activity-create/`) |
| **Menu config** | `SCE_ACTIVITY_CREATE_MENU_ENTRIES` — labels, `/new` fallbacks, semantic icon accents |
| **Permissions** | `resolveSceActivityCreatePermissions` / `resolveSceActivityCreatePermissionsFromFlags` — `TRAININGS_MANAGE` → Training; `EVENTS_MANAGE` → Spiel, Turnier, Veranstaltung |
| **Composer mapping** | Training → `TrainingCreateForm`; Match → `MatchCreateForm`; Tournament → `TournamentCreateForm`; Club Event → `VeranstaltungCreateForm` (overlay mode) |
| **Origin / success** | `SceActivityCreateOriginContext` (`PLANNING_SURFACE`); overlay `successBehavior="stay"`; Wochenplaner uses `reconcilePlanningHub` + `/api/planning-hub/planner-revalidate` |
| **Fallback routes** | Canonical `/dashboard/*/new` full-page composers remain; sr-only links from menu when overlay props are available |
| **Legacy prohibition** | Eligible surfaces must not ship parallel dedicated activity-create CTAs (`*ComposerCreateTrigger` deprecated) |

## Surfaces adopted (01G)

- Wochenplaner / Planning Hub chrome (`WeekPlannerChrome`)
- Trainings management
- Matchcenter (Spiele)
- Tournamentcenter
- Veranstaltungen
- Dashboard quick-access rails (same menu, `presentation="quick-access"` where applicable)

## Responsive & accessibility

- Desktop/tablet: compact primary trigger + dropdown menu (`role="menu"`, `menuitem` rows with visible labels + semantic icons)
- Escape closes menu and restores focus to trigger
- Unauthorized types are omitted (not merely disabled)

## Manual UAT

PO-owned visual UAT — Cursor does not perform manual UAT for 01G.

## Next

- **01H** — Core planning surfaces adoption (`SCE-UI-ROLLOUT-01H`)
- **NOT** SCE-TOURNAMENT-PLANNER-01
