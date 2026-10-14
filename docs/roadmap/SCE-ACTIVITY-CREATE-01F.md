# SCE-ACTIVITY-CREATE-01F — Tournament Adoption

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-ACTIVITY-CREATE-01F` |
| **Status** | **OPEN** — R3 Tournament Lobby + 1:n own teams (PO UAT pending) |
| **Predecessor** | [`SCE-ACTIVITY-CREATE-01E`](./SCE-ACTIVITY-CREATE-01E.md) — Match Adoption (**CLOSED**) |

## Architecture

- **Canonical form:** `TournamentCreateForm` on `SceActivityComposer` (`page` | `overlay`)
- **Tabs (guided):** Teams · Termin · Ressourcen · Publikation · **Übersicht**
- **Drafts:** `TournamentComposerDraft` + `/api/tournament/composer/drafts|commit`
- **Governance:** `TOURNAMENT` type config, `activities.tournament.approve`, Freigaben section
- **Publish:** `create-tournament-from-composer.ts` → `orchestrateTournamentCreation` (Prisma deps)
- **Participants:** `SceClubTeamSelectorDialog` — external `CLUB_ONLY`, own team `TEAM_ONLY` (writable-teams); **1:n tenant teams** via `SceTournamentParticipantLobby`
- **Resources:** optional at create (HOME multi-pitch + per-participant dressing rooms preserved)
- **Successor (planned):** [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) — Smart Tournament Scheduling (**NOT STARTED**)

## Migration

- **`20261014130000_sce_activity_create_01f_tournament`** — `TournamentComposerDraft`, `tournamentDraftId` on governance revisions, permission seed

## Tests

- `lib/tournaments/__tests__/sce-activity-create-01f.test.ts`
