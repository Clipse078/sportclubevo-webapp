# SCE-ACTIVITY-CREATE-01E — Match Adoption

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-ACTIVITY-CREATE-01E` |
| **Status** | **OPEN** — implementation on branch `cursor/sce-activity-create-01e-match-adoption`; PO UAT pending |
| **Baseline** | STAGE after merge of PR #841 (`62d96645…`) |
| **Scope** | Adopt manual Match creation onto `SceActivityComposer` with overlay + page parity, drafts, governance, Wochenplaner overlay |

## Architecture

- **Canonical form:** `MatchCreateForm` (single workflow)
- **Composer:** `SceActivityComposer` with `containerMode` `overlay` | `page`
- **Tabs:** Übersicht · Teams · Termin · Ressourcen · Spielbetrieb (no fake Publikation tab — Ausspielung lives under Spielbetrieb)
- **Contextual create:** Wochenplaner `+ Erstellen → Spiel` opens overlay; Matchcenter quick access opens same form overlay
- **Fallback:** `/dashboard/matchcenter/new` page mode unchanged route, same form
- **Drafts:** `MatchComposerDraft` + `/api/match/composer/drafts|commit`
- **Governance:** shared SCE activity governance (`MATCH` type config, validator pool, `activities.match.approve`)
- **Freigaben:** `/dashboard/veranstaltungen/freigaben` — Spiele section
- **Provider safety:** Composer commit path is **MANUAL** `source: "MANUAL"` only; SFV/imported matches untouched

## HOME / AWAY & location

- Identity preview uses `MatchClubPair` — HOME always left, AWAY always right
- AWAY location strings persisted verbatim (`resolveMatchComposerPersistedLocation`); no tenant facility assignment on AWAY

## Tests

- `lib/matchcenter/__tests__/sce-activity-create-01e.test.ts`
- `lib/matchcenter/__tests__/match-location-integrity.test.ts`
- Updated `MatchCreateForm` component tests

## Migration

- `20261014120000_sce_activity_create_01e_match` — `MatchComposerDraft`, `matchDraftId` on governance revisions, `activities.match.approve` permission seed

## Deferred

- Match validator pool admin UI (club-level) — mirror Club Event validator pool section in a follow-up if required
- 01F+ packages not started
