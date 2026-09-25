# PLANNING-UX-07R8 — Wochenplaner canonical planning UX

## Previous active Wochenplaner surfaces

From `/dashboard/planner/week`:

| Surface | Trigger | Primitive (before) |
| --- | --- | --- |
| `WeekplannerPlanningSheet` | Bearbeiten on standard plan activity | `Sheet` + `VisualResourceAvailabilityPicker` |
| `WeekplannerOperationalPlanningSheet` | Bearbeiten on alternative plan activity | `Sheet` + visual pickers |
| `WeekplannerAllocationOverrideEditor` | Day/resource inline override | Always-open `PlanningResourcePicker` |
| `WeekplannerPlanCreateDialog` | Plan bar | `Dialog` |
| `WeekplannerPlanBar` publish/delete | Plan bar | `Dialog` |
| `AggregatedActivityInspectionDialog` | Cluster click / simultaneous activities | `SceModalOverlay` |
| `PlanningHubConflictSheet` | Conflict chip | `Sheet` |

## Canonical modal / dialog family

- Center dialogs: `Dialog` → `SceModalOverlay` + SCE header/body/footer tokens.
- Right sheets: `Sheet` → same overlay lifecycle (`useSceModalDialog`, portalled backdrop blur).
- Conflict cluster: `AggregatedActivityInspectionDialog` on `SceModalOverlay`.

## Canonical resource picker contract

`WeekplannerPlanningResourceSection`:

1. Section heading (Spielfeld / Halle, Garderobe, …)
2. Current assignment row with `PlanningResourceSemanticIconTile` + name, or empty copy
3. `Zuweisen` / `Ändern` → `PlanningResourcePicker` → `CompactOperationalResourceSelector`
4. Single availability engine: `useFacilityAvailability` / `GET /api/facilities/availability`

## Recommendations

Free-resource recommendations (`recommendFreeFacilityResourceIds`) are passed as `recommendedResourceIds` to the compact picker. UI shows a compact **Empfohlen** badge and sort-first ordering — not a separate card gallery.

## CURRENT resource behavior

Availability queries pass activity exclusions (`excludeTrainingSessionId`, `excludeEventId`, `excludeWeekplannerActivity*`). Occupancy presentation uses shared `resource-occupancy-presentation` (`CURRENT`, `SHARED`, `OCCUPIED`, `FREE`).

## Weekplanner plan / override semantics (unchanged)

- **Standard plan**: canonical DB state; `WeekplannerPlanningSheet` mutates canonical entities.
- **Alternative plan**: sparse `WeekplannerPlanAllocation` overrides; `WeekplannerOperationalPlanningSheet`.
- **Active vs draft**: existing plan bar + API isolation preserved.

## Cross-domain relationship

Same assignment language as Training, Match, Tournament, and Veranstaltung: semantic icon, name, occupancy line, Zuweisen/Ändern, shared picker.

## Intentional differences

- Wochenplaner keeps right-side **Sheet** geometry for week context.
- Match operational surfaces may still key availability by legacy **resource code** while displaying canonical compact picker rows.
