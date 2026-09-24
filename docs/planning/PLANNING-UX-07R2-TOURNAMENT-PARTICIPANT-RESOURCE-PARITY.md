# PLANNING-UX-07R2 — Tournament participant and resource parity (Saisonplaner)

## Visual acceptance finding (UX-07R1)

UX-07R1 removed the wrong tournament participant surface from Saisonplaner. The simplified read-only block (`PlanningEditorParticipantsSection` + `PlanningParticipantsList` with `AdminAvatar` team rows) remained active, while the operational `TournamentParticipantsEditor` was only guaranteed on TournamentCenter.

## Wrong representation removed

- **Removed from Saisonplaner:** `PlanningParticipantsList` / `loadTournamentPlanningParticipants` team presentation (read-only TEAMS list with circular avatar treatment).
- **Not restored as duplicate:** no second “Teilnehmer” heading; RSVP people lists on TournamentCenter edit remain separate (`turniere-edit-rsvp-participants-section`) where applicable.

## Canonical participant representation restored

- **Section:** `turniere-canonical-participants-section` (Saisonplaner primary column).
- **Component:** `TournamentParticipantsEditor` via `PlannerTournamentCanonicalWorkspace`.
- **Crest contract:** `TournamentTeamLogo` → `ClubLogo` with `bare` (no circular pill / avatar bubble on club crests).
- **Display name:** primary label + team identity subtitle on each row.

## Resource allocation ownership

| Concern | Saisonplaner | TournamentCenter |
|--------|--------------|-------------------|
| Spielfeld / Halle | `TournamentResourceAllocationEditor` | same |
| Garderoben (per team) | `TournamentParticipantDressingRoomPanel` + inline hide in Teilnehmer when hosted | same split (`hideDressingRoomAllocation`) |
| Persistence | Existing tournament resource + participant allocation APIs | same |

Bridge link to Turniercenter remains **optional** secondary navigation (`planner-tournament-open-turniercenter`); it is not required to allocate facilities.

## Shared persistence

No second model. Reuses:

- `TournamentParticipantAllocation` domain rules
- `/api/tournaments/[id]/participants` and resource allocation routes used by TournamentCenter
- Client editors: `TournamentResourceAllocationEditor`, `TournamentParticipantDressingRoomPanel`, `TournamentParticipantsEditor`

## Layout (Saisonplaner tournament)

**Primary:** Details (form) → Ressourcen → Teilnehmer → Aufgaben & Anforderungen → Zusammenarbeit  
**Rail:** Publikation → Teilnahme (RSVP config) → delete (when permitted)

Implemented via `PlannerTournamentOperationalSections` + `PlannerTournamentOperationalRail` and `PlannerEntryEditForm.operationalRailExtensions`.

## Authorization and multi-tenancy

Unchanged gates: tenant-scoped `getTournament` / facility queries; mutations only when `canManage` (events / wochenplan manage). Read-only actors see allocation state without write controls. No tenant-specific IDs in code paths.

## Publication / SFV

UX-07R1 publication create defaults and SFV preservation unchanged in this slice.

## Database

`SCHEMA_CHANGE = NO`, `MIGRATION = NO`, no STAGE/production writes.

## Regression coverage

`lib/planning/__tests__/planning-ux-07r2-tournament-participant-resource-parity.test.ts` plus existing UX-07 / UX-07R1 / UX-06 sentinel suites.
