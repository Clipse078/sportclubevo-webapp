# PLANNING-UX-07 — Canonical operational editor parity

## Pre-change parity matrix (summary)

| Area | Header | Core | Resources | Publication rail | Participation | Tasks/Req | Collaboration | Status rail |
|------|--------|------|-----------|------------------|---------------|-----------|---------------|-------------|
| Match (Spiele record) | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_CANONICAL |
| Training session edit | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_DOMAIN_SPECIFIC (session allocations) | PRESENT_DOMAIN_SPECIFIC (TeamSeason) | PRESENT_CANONICAL (rail RSVP) | PRESENT_CANONICAL (series context) | PRESENT_CANONICAL (session target) | PRESENT_DOMAIN_SPECIFIC (series line) |
| TournamentCenter | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_CANONICAL (pitch + per-team Garderoben in Turniercenter) | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_CANONICAL | PRESENT_CANONICAL |
| Saisonplaner tournament | PRESENT_DOMAIN_SPECIFIC | PRESENT_DOMAIN_SPECIFIC | PRESENT_CANONICAL (shared allocation editors; see UX-07R2) | LEGACY_DUPLICATE → `PlanningPublicationPanel` | PRESENT_CANONICAL (rail) | **MISSING → restored** | **MISSING → restored** | NOT_APPLICABLE |
| Veranstaltung | PRESENT_CANONICAL | PRESENT_CANONICAL | NOT_APPLICABLE | PRESENT_CANONICAL | PRESENT_CANONICAL (split primary/rail) | PRESENT_CANONICAL | PRESENT_CANONICAL | NOT_APPLICABLE |

## Match reference architecture

`/dashboard/matchcenter/[matchId]` (`SpieleMatchRecordWorkspace`) remains the protected reference:

- Primary: operational core (resources, preparation, participation detail, work, collaboration)
- Rail: `PlanningPublicationPanel` + status/context
- No regression to SFV publication or resource selection

## Shared workspace composition

Reuse (no `*V2` shells):

- `PlanningEditorOperationalWorkspace` — primary + sticky rail (`lg`)
- `PlanningPublicationPanel` — publication shell (+ optional `showIntro`)
- `PlanningEditorWorkSection` / `PlanningEditorCollaborationSection`
- Contextual tasks/requirements panels

## Training publication ownership

Training session publication is **TeamSeason-scoped** (`trainingWebsiteVisible`, `infoboardVisible` on `TeamSeason`).

- **Website:** editable here only with `teams.manage`; persists via team-season PATCH; labelled with `PlanningPublicationInheritanceBadge` (team season scope).
- **Infoboard:** effective read-only state + link to team settings (no session-local switch).
- Panel intro suppressed; scope copy via `PlanningEditor.operational.publication.trainingIntro`.

## Training layout correction

Session edit now uses a single `PlanningEditorOperationalWorkspace`:

- **Primary:** date/time → resources → participant roster → tasks/requirements → collaboration
- **Rail:** publication → participation RSVP/deadline controls

Resources are no longer a full-width block below a detached two-column header.

## TournamentCenter vs Saisonplaner

Both edit the **same canonical Event/Tournament id** (`Event.id` === `Tournament.id`).

- **Turniercenter:** full operational editor (Spielfeld/Halle + per-team Garderoben under **Ressourcen**, canonical team **Teilnehmer** editor, save lifecycle).
- **Saisonplaner edit:** season-planner form + **canonical operational sections** (shared **Ressourcen** and **Teilnehmer** editors, participation config in the rail, tasks, requirements, collaboration). Both surfaces edit the **same** tournament allocation and participant persistence — see `PLANNING-UX-07R2-TOURNAMENT-PARTICIPANT-RESOURCE-PARITY.md`.

## Saisonplaner operational wiring

`PlannerTournamentOperationalSections` (server) mounted from `planner/edit/[eventId]` when `type === TOURNAMENT`.

## Veranstaltung composition

`VeranstaltungEditForm` accepts `operationalPrimarySections` and `operationalRailSections` so Grunddaten + work + collaboration share the operational grid; RSVP controls sit in the rail under publication.

## Tasks / requirements / collaboration

Canonical `PlanningEditorWorkSection` and `PlanningEditorCollaborationSection` across surfaces. Task create label remains single-plus (`Aufgabe` + icon).

## Responsive behaviour

Uses existing `PLANNING_EDITOR_PRIMARY_WORKSPACE_GRID_CLASS` tokens; stacks to one column below `lg`.

## Authorization

No new fetches or gates; existing permissions for events, trainings, teams, tasks, and collaboration unchanged.

## SFV protection

Resync continues to preserve explicit persisted publication flags. Create-default policy updates are documented in `PLANNING-UX-07R1-VISUAL-ACCEPTANCE-CORRECTIONS.md`.

## Deferred / not applicable

- Requirement “+ Anforderung” trigger parity unchanged from UX-06 deferral.

## Resource occupancy (UX-07R3)

Training, Match, and Tournament allocation surfaces share the **PLANNING-UX-07R3** occupancy presentation contract (`docs/planning/PLANNING-UX-07R3-SHARED-RESOURCE-OCCUPANCY.md`): owner labels instead of false `Frei`, shared dressing rooms remain selectable.

## Database

No schema or migration changes.
