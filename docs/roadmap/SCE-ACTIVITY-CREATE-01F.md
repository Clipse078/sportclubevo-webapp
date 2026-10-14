# SCE-ACTIVITY-CREATE-01F — Tournament Adoption

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-ACTIVITY-CREATE-01F` |
| **Status** | **IMPLEMENTED** (branch `cursor/sce-activity-create-01f-tournament-adoption-713d`) |
| **Predecessor** | [`SCE-ACTIVITY-CREATE-01E`](./SCE-ACTIVITY-CREATE-01E.md) — Match Adoption (**CLOSED**) |

## Architecture

- **Canonical form:** `TournamentCreateForm` on `SceActivityComposer` (`page` | `overlay`)
- **Tabs (guided):** Teams · Termin · Ressourcen · Publikation · **Übersicht**
- **Drafts:** `TournamentComposerDraft` + `/api/tournament/composer/drafts|commit`
- **Governance:** `TOURNAMENT` type config, `activities.tournament.approve`, Freigaben section
- **Publish:** `create-tournament-from-composer.ts` → `orchestrateTournamentCreation` (Prisma deps)
- **Participants:** `SceClubTeamSelectorDialog` — external `CLUB_ONLY`, own team `TEAM_ONLY` (writable-teams)
- **Resources:** optional at create (HOME multi-pitch + per-participant dressing rooms preserved)

## Migration

- **`20261014130000_sce_activity_create_01f_tournament`** — `TournamentComposerDraft`, `tournamentDraftId` on governance revisions, permission seed

## Tests

- `lib/tournaments/__tests__/sce-activity-create-01f.test.ts`
