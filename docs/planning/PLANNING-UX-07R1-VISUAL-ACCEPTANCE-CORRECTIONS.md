# PLANNING-UX-07R1 — Visual acceptance corrections

Follow-up to PLANNING-UX-07 visual acceptance. Scope: publication create defaults, TournamentCenter resource completeness, duplicate participant removal, section spacing, Veranstaltung team selector clipping.

## Match publication create defaults

Canonical resolver: `lib/publishing/policy/match-publication-defaults.ts`

| Side | website | infoboard | wochenplan | homepage | team page |
|------|---------|-----------|------------|----------|-----------|
| HOME | ON | ON | ON | ON | ON |
| AWAY | ON | OFF | OFF | ON | ON |
| Unknown/neutral | ON | OFF | OFF | ON | ON |

Applied on manual/API create (`POST /api/events`, `MatchCreateForm`) and SFV **create** (`schedule-persistence` new Event). Existing persisted matches are not bulk-updated.

## Tournament publication create defaults

Canonical resolver: `lib/publishing/policy/tournament-publication-defaults.ts`

All five supported channels default **ON** at create (`POST /api/events`, `TournamentCreateForm` state aligned).

## HOME / AWAY applicability

Away matches keep Infoboard and Wochenplan off where the product treats them as home-facility channels. Other applicable channels default ON.

## SFV resync

`updateMatchRecord` continues to **never** overwrite stored publication fields. Explicit administrator choices survive resync.

## TournamentCenter resource ownership

Route: `/dashboard/tournamentcenter/[tournamentId]/edit`

**Ressourcen** section (HOME tournaments):

- **Spielfeld / Halle** — `TournamentResourceAllocationEditor` (canonical facility resource model + APIs).
- **Garderoben** — `TournamentParticipantDressingRoomPanel` maps one dressing-room selector per participating team (stable participant IDs, canonical allocation APIs).

Dressing-room UI is removed from expanded participant rows when resources are shown in **Ressourcen** (`hideDressingRoomAllocation`).

## Canonical participant section

Single team participant block: `turniere-canonical-participants-section` + `TournamentParticipantsEditor`.

Removed duplicate team presentation from `PlanningEditorParticipantsSection` on the edit route (RSVP **people** list only when present; `teams={[]}`).

## Section spacing

Tournament record primary column wraps operational sections in `space-y-6` (same rhythm family as MatchCenter sibling cards).

## Veranstaltung team selector

`ClubEventParticipationAudienceEditor` — removed `h-8` override on `fca-select`; uses `min-h-[2.375rem]` and vertical alignment so **Team auswählen** (DE/EN/FR/IT) is not clipped.

## Schema / migration

**SCHEMA_CHANGE = NO** · **MIGRATION = NO**

## Regression protections

Automated coverage: `planning-ux-07r1-visual-acceptance-corrections.test.ts`, updated match/tournament publication policy tests, TournamentCenter record workspace tests, UX-06 / P0R1 / SFV Wochenplan regression tests.
