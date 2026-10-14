# SCE-ACTIVITY-CREATE-01E — Match Adoption

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-ACTIVITY-CREATE-01E` |
| **Status** | **OPEN** — 01E-R2 on branch `cursor/sce-activity-create-01e-match-adoption`; PO visual UAT pending after R2 |
| **Baseline** | STAGE after merge of PR #841 (`62d96645…`) |
| **Scope** | Adopt manual Match creation onto `SceActivityComposer` with overlay + page parity, drafts, governance, Wochenplaner overlay |

## Architecture

- **Canonical form:** `MatchCreateForm` (single workflow)
- **Composer:** `SceActivityComposer` with `containerMode` `overlay` | `page`
- **Tabs (01E-R1 guided order):** Teams · Termin · Ressourcen · Spielbetrieb · **Übersicht** (final review — not an opening placeholder)
- **Guided composer:** shared `guidedWorkflow` on `SceActivityCreateDefinition` — freely navigable steps, «Zurück» / «Weiter», primary create only on final review
- **Match Teams:** visual **Matchup Selector** (`MatchCreateMatchupSelector`) — HOME left / AWAY right, portal-safe opponent search
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

## 01E-R1 PO decisions (guided, product-wide)

- Guided Activity Composer is **canonical for all composer adopters** (Training, Match, Club Event); not Match-only
- Context Tabs remain the navigation primitive; workflow nav adds progress + footer guidance without a parallel wizard framework
- Free tab navigation preserved; «Weiter» validates the current step only; full validation on final submit
- Final canonical review label: **Übersicht** (Training/Club Event final tab key `pruefen` where legacy `?tab=uebersicht` must remain valid)
- Tournament **not** migrated early (01F boundary unchanged)

## 01E-R1 PO UAT

- **Result:** FAIL — blocking interaction regressions (Weiter, matchup/resources) + rejected browser-native combined datetime UX

## 01E-R2 corrections

- **Composer draft sync:** Match/Training/Club Event pass live `draft={buildPayload()}` so guided «Weiter» validates user input (fixes silent/stale validation)
- **Match matchup:** identity preview always rendered — team/opponent selection available on empty drafts
- **Guided validation:** field-level errors + visible composer banner; step completion requires domain validity (not tab visit order)
- **Canonical SCE date/time:** `SceActivityDateInput` / `SceActivityTimeInput` / `SceActivityDateTimeInput` — DD.MM.YYYY + HH:MM manual entry, optional calendar popover; adopted on Training, Match, Club Event schedule fields; Tournament create start/end (+ meeting time) only (**01F** composer/governance unchanged)

## Deferred

- Match validator pool admin UI (club-level) — mirror Club Event validator pool section in a follow-up if required
- 01F+ packages not started (Tournament full SCE composer adoption remains 01F)
