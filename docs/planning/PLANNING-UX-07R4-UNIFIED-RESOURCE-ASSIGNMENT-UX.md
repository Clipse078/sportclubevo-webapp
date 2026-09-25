# PLANNING-UX-07R4 — Unified resource assignment UX

> **Canonical platform doc:** [PLANNING-UX-07R5-CANONICAL-FACILITY-PLATFORM.md](./PLANNING-UX-07R5-CANONICAL-FACILITY-PLATFORM.md)

## Problem (UX-07R3 follow-up)

UX-07R3 corrected **occupancy semantics** (owner-visible occupied rooms, intentional sharing, occupied-but-selectable). Visual acceptance showed a **presentation** problem: tournament dressing-room UI repeated the **full** facility inventory under **every** participant (`Verfügbar` / `Belegt` blocks), which scales poorly and hides the operational questions planners actually ask.

## Product model

**Resource availability is global to the event time window.**  
**Assignment is subject-specific.**

Surfaces therefore render:

1. **Assignment rows** — one compact row per subject (team, Heim/Gast, training group) showing current allocation and `Zuweisen` / `Ändern`.
2. **One picker per subject** — opened on demand; shows the **single** canonical inventory with UX-07R3 occupancy lines (`Frei`, owner label, `Geteilt mit …`, current subject).

Optional: one **compact global occupancy** overview (`Belegung`) per section, rendered **once** (tournament dressing rooms in edit).

## Shared architecture

| Layer | Responsibility |
|--------|----------------|
| `PlanningResourceAssignment` | Compact subject + resource + action row |
| `PlanningResourceAssignmentList` | List container for rows |
| `PlanningResourcePicker` | Single inventory picker (`layout="default"`) |
| `PlanningSubjectDressingRoomAssignments` | Multi-subject dressing-room rows + pickers |
| `PlanningSingleResourceAssignment` | One subject / pitch or dressing room |
| `PlanningMatchDressingRoomAssignments` | Match Heim/Gast with `mergeMatchDressingRoomSideAvailability` |
| `resource-occupancy-presentation.ts` | Occupancy merge + `formatResourceOccupancyPrimaryLine` |
| Domain editors | Persistence, permissions, API calls, inheritance |

Normalized presentation only — **no** persistence model changes.

## Domain behavior

### Tournament (create, Saisonplaner, TournamentCenter)

- **Pitch/hall:** `PlanningSingleResourceAssignment` on `TournamentResourceAllocationEditor` / create resources section.
- **Dressing rooms:** `PlanningSubjectDressingRoomAssignments` in `TournamentParticipantDressingRoomPanel` (primary) and create resources section; participant expand no longer duplicates full inventories.
- **Crests:** `TournamentTeamLogo` (bare `ClubLogo`) on assignment rows.

### Match (create + edit)

- **Pitch/hall:** `PlanningSingleResourceAssignment`.
- **Garderoben:** `PlanningMatchDressingRoomAssignments` with in-event Heim/Gast merge for picker context.
- SFV / publication / code-based persistence unchanged.

### Training (create + session edit + series defaults)

- **Create:** `PlanningSingleResourceAssignment` for pitch and dressing room.
- **Session edit:** assignment row + `PlanningResourcePicker` in `TrainingSessionAllocationEditor`; series/session inheritance preserved.
- **Series defaults (R4A):** `TrainingAllocationEditor` on series record edit and `/training/series/[seriesId]/allocations` — compact current assignment, `Zuweisen` / `Ändern`, canonical `PlanningResourcePicker` (including OTHER via `kind="other"`). Legacy `FacilityResourceSelector` add flows removed from active routes.

#### Active route matrix (resource assignment)

| Domain | Route | CANONICAL_R4 |
|--------|-------|--------------|
| Training create | `/dashboard/training/new` | YES |
| Training session edit | `/dashboard/training/sessions/[sessionId]/edit` | YES |
| Training series defaults | `/dashboard/training/series/[seriesId]/edit`, `/dashboard/training/series/[seriesId]/allocations` | YES |
| Match create / edit | `/dashboard/matchcenter/new`, `/dashboard/matchcenter/[matchId]` | YES |
| Tournament create / Saisonplaner / TournamentCenter edit | `/dashboard/tournamentcenter/new`, planner tournament workspace, `/dashboard/tournamentcenter/[tournamentId]/edit` | YES |

See `PLANNING-UX-07R4A-TRAINING-LEGACY-CLOSURE.md` for forensics, migration proof, and deployment SHA.

**Latest verified deployment (R4A):** `0617ed767e74135e5414422ad45f9544a7802bdb` (Vercel Preview success).

## Occupancy / sharing (UX-07R3 preserved)

- Occupied ≠ disabled; picker remains selectable.
- Owner labels replace generic `Belegt` when known.
- Tenant-scoped availability queries; zero cross-tenant disclosure.

## Performance

- One `useFacilityAvailability` fetch per surface/time window.
- Tournament participant merges computed in memory (`buildTournamentParticipantDressingRoomAvailabilityByParticipant`); no per-row API loops.

## Accessibility & i18n

- Contextual action labels via `PlanningResources` namespace (DE/EN/FR/IT).
- Picker region labelled; `aria-pressed` on options (via compact selector).

## Regression protection

- UX-07R3 occupancy tests remain valid.
- SFV, publication, Wochenplan, and P0R1 sentinels unchanged by this phase.
