# PLANNING-UX-07R4A — Training legacy resource selector closure

## Forensics summary

| Question | Answer |
|----------|--------|
| **Component** | `TrainingAllocationEditor` (`components/admin/training/TrainingAllocationEditor.tsx`) |
| **Reachable?** | **Yes** — active admin routes |
| **Routes** | `/dashboard/training/series/[seriesId]/edit` (workspace layout), `/dashboard/training/series/[seriesId]/allocations` (standalone layout) |
| **Prior residual** | Standalone layout and “Weitere Ressourcen” add flows used `FacilityResourceSelector` while series edit workspace used `PlanningResourcePicker` for pitch/dressing only |
| **Classification** | Active user-facing series-default resource assignment (not dead code) |
| **Action** | **Migrated** to canonical R4: current assignment primary, `Zuweisen` / `Ändern`, `PlanningResourcePicker` for all groups including OTHER (`kind="other"`) |

## Migration notes

- Standalone allocations page now shares the same `SeriesResourceAssignmentBody` as the series record workspace.
- `CompactOperationalResourceKind` extended with `"other"` for ancillary resources.
- `FacilityResourceSelector` remains in the codebase for type exports and non–resource-assignment surfaces; **no active training create/edit allocation add flow** mounts it after R4A.

## Deployment gate (pre-push baseline)

- Feature HEAD at closure start: `08f32642f9fabc9782a7c466482424a214782bde` (Vercel Preview **success** verified via GitHub deployment `6647808844`).
- Post-migration HEAD: recorded in PR #708 after push.

## Active resource-assignment route matrix (R4A)

| Surface | Route | Active component | Assignment UI | Picker | Occupancy | CANONICAL_R4 |
|---------|-------|------------------|---------------|--------|-----------|--------------|
| Training create | `/dashboard/training/new` | `TrainingSeriesCreateForm` | `PlanningSingleResourceAssignment` | `PlanningResourcePicker` | `useFacilityAvailability` (initial occurrence) | YES |
| Training session edit | `/dashboard/training/sessions/[sessionId]/edit` | `TrainingSessionAllocationEditor` | Row + picker | `PlanningResourcePicker` | `useFacilityAvailability` | YES |
| Training series defaults | `/dashboard/training/series/[seriesId]/edit` | `TrainingAllocationEditor` (`layout="workspace"`) | Compact primary + `Zuweisen`/`Ändern` | `PlanningResourcePicker` | Series defaults (no recurring window) | YES |
| Training series allocations | `/dashboard/training/series/[seriesId]/allocations` | `TrainingAllocationEditor` (standalone header) | Same body as series edit | `PlanningResourcePicker` | Series defaults | YES |
| Match create | `/dashboard/matchcenter/new` | `MatchCreateForm` | `PlanningSingleResourceAssignment` + `PlanningMatchDressingRoomAssignments` | `PlanningResourcePicker` | `useFacilityAvailability` | YES |
| Match edit | `/dashboard/matchcenter/[matchId]` | `MatchcenterDetailOperational` | Same shared components | `PlanningResourcePicker` | `mergeMatchDressingRoomSideAvailability` | YES |
| Tournament create | `/dashboard/tournamentcenter/new` | `TournamentCreateForm` | Shared planning assignments | `PlanningResourcePicker` | `useFacilityAvailability` | YES |
| Tournament Saisonplaner edit | Planner tournament workspace | `PlannerTournamentCanonicalWorkspace` → `TournamentParticipantDressingRoomPanel` | `PlanningSubjectDressingRoomAssignments` | `PlanningResourcePicker` | Tournament participant merge | YES |
| TournamentCenter edit | `/dashboard/tournamentcenter/[tournamentId]/edit` | `TurniereTournamentRecordWorkspace` | Same panel + pitch editor | `PlanningResourcePicker` | Shared tournament occupancy | YES |

**Result:** all active create/edit resource-assignment routes = **CANONICAL_R4 YES**.
