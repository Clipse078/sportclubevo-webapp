# SCE-ACTIVITY-CREATE-01E — Match Adoption

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-ACTIVITY-CREATE-01E` |
| **Status** | **CLOSED / MERGED** |
| **Branch** | `cursor/sce-activity-create-01e-match-adoption` |
| **PR** | **#842** → `STAGE` — **MERGED** |
| **STAGE baseline (package start)** | `62d96645d8abc923067a512871b69ebc8dbb971a` (post PR #841) |
| **STAGE at feature branch point** | `9064374eced0b3e862dd7320679ce00c2e08e498` (docs-only drift after #841; no 01E conflict) |
| **Feature HEAD (pre-merge)** | `2f14d838e5cc60479763ed9cf3bead1f9fcf0cd3` (+ closure commit on branch) |
| **Next package** | [`SCE-ACTIVITY-CREATE-01F`](./SCE-ACTIVITY-CREATE-01.md) — Tournament Adoption (**NOT_STARTED**) |

## Architecture

- **Canonical form:** `MatchCreateForm` (single workflow)
- **Composer:** `SceActivityComposer` with `containerMode` `overlay` | `page`
- **Tabs (guided order):** Teams · Termin · Ressourcen · Spielbetrieb · **Übersicht** (final review)
- **Guided composer:** shared `guidedWorkflow` on `SceActivityCreateDefinition` — freely navigable steps, «Zurück» / «Weiter», primary create only on final review
- **Match Teams:** visual **Matchup Selector** (`MatchCreateMatchupSelector`) — HOME left / AWAY right, canonical club/team selector
- **Contextual create:** Wochenplaner `+ Erstellen → Spiel` opens overlay; Matchcenter quick access opens same form overlay
- **Fallback:** `/dashboard/matchcenter/new` page mode unchanged route, same form
- **Drafts:** `MatchComposerDraft` + `/api/match/composer/drafts|commit`
- **Governance:** shared SCE activity governance (`MATCH` type config, validator pool, `activities.match.approve`)
- **Freigaben:** `/dashboard/veranstaltungen/freigaben` — Spiele section
- **Provider safety:** Composer commit path is **MANUAL** `source: "MANUAL"` only; SFV/imported matches untouched

## HOME / AWAY & location

- Identity preview uses `MatchClubPair` — HOME always left, AWAY always right
- AWAY location strings persisted verbatim (`resolveMatchComposerPersistedLocation`); no tenant facility assignment on AWAY
- Authoritative external/provider location suffixes (e.g. `… Sissach - 2`) preserved

## Resource optionality (01E-R5)

- Match HOME may commit with **zero** pitch/hall and dressing-room assignments (draft, direct publish, approval submission)
- When resources **are** assigned, availability/conflict behavior and canonical facility identities remain active

## Opponent selection (01E-R5)

- External opponent = **`CLUB_ONLY`** — Verein pick completes opponent selection; `opponentExternalClubId` authoritative; `opponentName` display/override compatibility
- Own team = **`TEAM_ONLY`**

## Guided step state semantics (01E-R6)

| State | Meaning |
| --- | --- |
| **UNVISITED** | Neutral / not reviewed |
| **CURRENT** | Active step |
| **COMPLETED** | **Reviewed + valid** (not merely optional or currently valid) |
| **ERROR** | Validation-triggered invalid |

**Mandatory principle (all adopters, including 01F Tournament):** step completion represents reviewed and valid, not merely currently valid. `OPTIONAL ≠ COMPLETED`, `VALID ≠ COMPLETED`.

## Migration

- **`20261014120000_sce_activity_create_01e_match`** — `MatchComposerDraft`, `matchDraftId` on governance revisions, `activities.match.approve` permission seed
- **No** R4/R5/R6 migrations

## PO UAT (final — R6)

| Result | **PASS** |
| --- | --- |
| **Training initial** | Team **CURRENT**; Termin, Wiederholung, Ressourcen, Übersicht **UNVISITED**; no premature checkmarks |
| **Match initial** | Teams **CURRENT**; Termin, Ressourcen, Spielbetrieb, Übersicht **UNVISITED**; no premature checkmarks |
| **Cursor manual UAT** | **SKIPPED** (PO-owned) |

## Revision history (R1–R6)

| Slice | Summary |
| --- | --- |
| **01E-R1** | Guided composer on Context Tabs; five Match tabs incl. Übersicht; product-wide guided pattern |
| **01E-R2** | Live draft sync; canonical SCE date/time; field-level validation |
| **01E-R3** | `SceClubTeamSelectorDialog`; browse-first club grid; elevated selector layering |
| **01E-R4** | Selector layout/crest/scrolling/search spacing; overlay layering; date/time responsive contracts |
| **01E-R5** | **CLUB_ONLY** opponent; optional Match resources; architecture docs |
| **01E-R6** | Canonical guided **reviewed + valid** completion semantics; Training/Match/Club Event alignment |

Prior R1–R5 PO decisions and fixes retained.

## Design system & Toggle First (closure)

| Check | Result |
| --- | --- |
| **SCE_DESIGN_SYSTEM_COMPLIANCE** | **PASS** — `SceActivityComposer`, `SceContextTabs`, canonical date/time, resource assignment, matchup identity, club/team selector, overlay layering |
| **PARALLEL_PATTERN_INTRODUCED** | **NO** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |
| **NEW_BINARY_CHECKBOXES (Match/Training/Club Event create paths)** | **0** |
| **CANONICAL_TOGGLES_USED** | Training recurrence (`SwitchToggle` in `TrainingCreateForm`); Club Event recurrence/schedule (`SwitchThumb`); Match governance workspace (`SwitchToggle` in `PersonMatchGovernanceSection`) |

## Automated validation (closure)

- Vitest closure suite: **32** files, **235** tests — **0** failures
- Prisma: **valid**
- Production build: **`NODE_OPTIONS='--max-old-space-size=8192' npm run build`** — **PASS**

## Safety

| Item | Value |
| --- | --- |
| **PROD** | **Not touched** |
| **Persistent test data** | **0** |

## Tests (reference)

- `lib/matchcenter/__tests__/sce-activity-create-01e.test.ts`
- `lib/matchcenter/__tests__/sce-activity-create-01e-r5.test.ts`
- `lib/sce/activity-composer/__tests__/sce-activity-create-01e-r6.test.tsx`
- `lib/matchcenter/__tests__/match-location-integrity.test.ts`
- `components/admin/matchcenter/__tests__/MatchCreate*.test.*`
- Shared: 01B/01C/01D architecture + regression tests (see closure run)

## Deferred

- Match validator pool admin UI (club-level) — follow-up if required
- **01F** Tournament full SCE composer adoption — **NOT_STARTED** (inherits guided semantics + design system from this package)
