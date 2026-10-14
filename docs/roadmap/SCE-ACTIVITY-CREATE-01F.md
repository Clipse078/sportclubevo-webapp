# SCE-ACTIVITY-CREATE-01F — Tournament Adoption

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-ACTIVITY-CREATE-01F` |
| **Status** | **CLOSED / ACCEPTED** |
| **Branch** | `cursor/sce-activity-create-01f-tournament-adoption-713d` |
| **PR** | **#843** → `STAGE` |
| **Feature HEAD (pre-merge)** | `c2f5f934ada529150578f049d796bf02e31dbcdd` |
| **STAGE baseline (package start)** | `6ad4710b538be528ae4d135e0a9b2350629d9895` (post PR #842 / 01E) |
| **PO UAT** | **PASS** (R1–R6; PO-owned final visual/manual UAT) |
| **Next package** | **SCE-ACTIVITY-CREATE-01G** — Planning Surface Integration (**NOT_STARTED**) |
| **Follow-up (planned)** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) — Smart Tournament Scheduling (**PLANNED — NOT STARTED**) |
| **Predecessor** | [`SCE-ACTIVITY-CREATE-01E`](./SCE-ACTIVITY-CREATE-01E.md) — Match Adoption (**CLOSED**) |

## Architecture

- **Canonical form:** `TournamentCreateForm` on `SceActivityComposer` (`page` | `overlay`)
- **Tabs (guided):** Teams · Termin · Ressourcen · Publikation · **Übersicht**
- **Guided composer:** shared `guidedWorkflow` — free tab navigation; «Zurück» / «Weiter»; primary create only on **Übersicht**; canonical **reviewed + valid** step semantics (inherited from 01E-R6)
- **Contextual create:** Wochenplaner / Tournamentcenter / planning hub overlay triggers; canonical `/dashboard/tournamentcenter/new` page fallback
- **Drafts:** `TournamentComposerDraft` + `/api/tournament/composer/drafts|commit`
- **Governance:** `TOURNAMENT` type config, `activities.tournament.approve`, Freigaben section, person governance workspace
- **Publish:** `create-tournament-from-composer.ts` → `orchestrateTournamentCreation` (Prisma deps)
- **Resources:** optional at create (HOME multi-pitch + per-participant dressing rooms); conflict/availability integration when assigned
- **Publication:** composer publication step + effective publication authority from governance

## Participants

| Kind | Selector | Cardinality |
| --- | --- | --- |
| Own SCE teams | `TEAM_ONLY` | **0:n** |
| External clubs | `CLUB_ONLY` | **0:n** (no `CLUB_THEN_TEAM`) |
| Manual participants | free-text | supported |

Multiple tenant teams remain first-class distinct participants (`localId` stable for future Tournament Planner references). Hosting / organiser identity is separate from participant identity — no Match HOME/AWAY participant semantics.

## Organiser / hosting

| Mode | Contract |
| --- | --- |
| **HOME** | Tenant club is authoritative organiser; non-editable; tenant crest/identity displayed |
| **AWAY** | External organiser required for valid creation/commit; incomplete drafts allowed; external organiser selectable via `CLUB_ONLY` picker |

AWAY location label: **Austragungsort** (no user-facing architecture terminology).

## Participant presentation (one identity, multiple densities)

| Step | Density |
| --- | --- |
| **Teams** | HERO / console-style tournament lobby (`SceTournamentParticipantTile`) |
| **Ressourcen** | COMPACT crest rows (`SceTournamentResourceParticipantCrest`) |
| **Übersicht** | REVIEW lobby lineup (shared `buildTournamentLobbyParticipantIdentities`) |

Real club crests: transparent PNG/SVG, no avatar circles, no artificial crest backgrounds, aspect ratio preserved.

## Smart date / time (shared canonical)

Compact keyboard entry (Training · Match · Tournament · Club Event):

| Input | Normalized |
| --- | --- |
| `17102026` | `17.10.2026` |
| `171026` | `17.10.2026` |
| `930` | `09:30` |
| `0930` | `09:30` |

## Revision history (R1–R6)

| Slice | Summary |
| --- | --- |
| **01F-R1** | Compact activity date/time normalization; Termin integration |
| **01F-R2** | Canonical `CLUB_ONLY` external participants; 01E guardrail alignment |
| **01F-R3** | Tournament participant lobby; 1:n own teams; review upgrade; `SCE-TOURNAMENT-PLANNER-01` roadmap registration |
| **01F-R4** | HOME tenant organiser; participant sections; overlay layering; `/new` + composer adoption |
| **01F-R5** | AWAY organiser validation; external club integrity; lobby polish; Austragungsort copy |
| **01F-R6** | Canonical crests on Ressourcen dressing rows; shared lobby identity projection |

**PO UAT:** **PASS** for R1–R6 (final closure).

## Migration

- **`20261014130000_sce_activity_create_01f_tournament`** — `TournamentComposerDraft`, `tournamentDraftId` on governance revisions, `activities.tournament.approve` permission seed

## Design system & Toggle First (closure)

| Check | Result |
| --- | --- |
| **SCE_DESIGN_SYSTEM_COMPLIANCE** | **PASS** — `SceActivityComposer`, `SceContextTabs`, canonical date/time, resource assignment, `SceClubTeamSelectorDialog`, tournament lobby/resource/review identity, overlay layering |
| **PARALLEL_LEGACY_PATTERN** | **NO** |
| **BINARY_CONTROL_COMPLIANCE** | **PASS** |
| **NEW_BINARY_CHECKBOXES (Tournament create paths)** | **0** |
| **CANONICAL_TOGGLES_USED** | `SwitchToggle` in `PersonTournamentGovernanceSection` |
| **MULTI_SELECTION_PATTERN** | Participant add menu (team / club / manual); weekday/recurrence patterns unchanged on other domains |

## Automated validation (closure)

| Item | Result |
| --- | --- |
| **Vitest (01A–01F regression suite)** | **30** files · **320** tests — **0** failures |
| **Prisma validate** | **PASS** |
| **Production build** | **PASS** — `NODE_OPTIONS='--max-old-space-size=8192' npm run build` |

## PO UAT (final)

| Result | **PASS** |
| --- | --- |
| **Cursor manual UAT** | **SKIPPED** (PO-owned) |
| **Cursor screenshots** | **SKIPPED** (PO-owned) |

## Safety

| Item | Value |
| --- | --- |
| **PROD** | **Not touched** |
| **Persistent test data** | **0** |

## Tests (reference)

- `lib/tournaments/__tests__/sce-activity-create-01f.test.ts`
- `lib/tournaments/__tests__/sce-activity-create-01f-r3.test.ts`
- `lib/tournaments/__tests__/sce-activity-create-01f-r4.test.ts`
- `lib/tournaments/__tests__/sce-activity-create-01f-r5.test.ts`
- `lib/tournaments/__tests__/sce-activity-create-01f-r6.test.ts`
- Shared: 01A–01E architecture + regression tests (see closure run)

## Roadmap transition

| Package | Status |
| --- | --- |
| **SCE-ACTIVITY-CREATE-01F** | **CLOSED** |
| **SCE-TOURNAMENT-PLANNER-01** | **PLANNED — NOT STARTED** (fixture vs schedule principle documented; no 01F implementation) |
| **SCE-ACTIVITY-CREATE-01G** | **CLOSED** (PR **#844** — global **+ Erstellen** integration) |
| **SCE-ACTIVITY-CREATE-01H** | **NEXT — NOT STARTED** — Core Planning Surfaces Adoption |
