# PLANNING-UX-07R7 — Five-domain visual consistency & resource UX

UI-only package on top of R6 facility allocation. No schema, migration, or publication default changes.

## Shared planning visual hierarchy

- **Primary column:** core data, schedule, resources, participants, work/collaboration.
- **Right rail:** `PlanningPublicationPanel` first where the domain supports publication, then domain status/context.
- **Resource sections:** section title (or numbered step) establishes resource type; the assignment row shows **current value or empty state + action**, not a repeated type label.

## Resource assignment presentation

Shared components:

- `PlanningSingleResourceAssignment` / `PlanningResourceAssignment` — compact row
- `PlanningResourcePicker` — opens on **Zuweisen** / **Ändern** only
- `showSubjectLabel={false}` when a parent heading already names the resource type (Training create steps 4–5, Match/Tournament pitch blocks, Veranstaltung subsections)

Canonical actions (via `PlanningResources`):

- Unassigned → **Zuweisen**
- Assigned → **Ändern**

## Resource icon contract

- Resolver: `resolveFacilityResourceVisualKind` (re-exported from `lib/planning/planning-facility-resource-visual.ts`)
- Tile: `PlanningResourceSemanticIconTile` in `FacilityResourceIdentity.tsx`
- `FULL_PITCH` / `HALF_PITCH` / indoor hall → green pitch/hall glyph
- `DRESSING_ROOM` → blue dressing-room glyph
- `OTHER` → neutral grid glyph
- Icons derive from **FacilityResource type/facility type**, never display names.

## Publication rail contract

Match, Tournament, Veranstaltung create/edit, Training session edit, and **Training series edit** use `PlanningPublicationPanel` in the right rail.

## Training TeamSeason publication ownership

Training series/session workspaces render publication in the rail, but toggles still POST to `/api/teams/:teamId/team-seasons/:teamSeasonId/publication` via `TrainingRecordPublicationSection` (TeamSeason-scoped Website + Infoboard).

## Match domain differences

- HOME: pitch + Heim/Gast Garderoben via `PlanningMatchDressingRoomAssignments`
- AWAY: publication channel restrictions unchanged

## Tournament participant-resource differences

- One pitch/hall block + `PlanningSubjectDressingRoomAssignments` per participant (Saisonplaner and TournamentCenter share components)

## Veranstaltung generic resource behavior

- Sportfläche, Garderobe, **Weitere Ressourcen (OTHER)** via shared facility allocation APIs (R6/R6R2 preserved)

## Veranstaltung Grunddaten root cause / fix

**Root cause:** `fca-select` on create used `h-8` while global `.fca-select` applies vertical padding (~10px each side), clipping Saison/Kategorie text.

**Fix:** use standard `fca-select text-sm` without fixed height on Grunddaten selects.

## Preserved occupancy semantics

Frei / current / occupied owner label / shared — occupied resources remain selectable in `PlanningResourcePicker` (informational occupancy only).

## Preserved multi-tenant architecture

`FacilityResource.id` remains canonical; no tenant-specific allowlists or football-only engine logic.
