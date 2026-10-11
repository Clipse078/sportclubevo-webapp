# SCE-ACTIVITY-NAV-01 — Unified Activity Detail Navigation

**Status:** **CLOSED**  
**PO UAT:** **PASS** (final acceptance after R2.1)  
**Implementation PR:** **#824** → **STAGE**  
**Feature branch:** `cursor/sce-activity-nav-01-unified-activity-detail-navigation-e2fb`  
**Baseline:** `origin/STAGE` @ `7ec9e3695446bfdb8f996c29ff2b8b1224169ab0` (pre-merge; includes PR #822, #823)

## Purpose

Introduce one SCE activity-detail navigation pattern (Team Cockpit visual language) across Training, Match, Tournament, and Veranstaltung without duplicating four independent tab bars.

## PO Human UAT progression

| Round | Scope | Result |
|-------|--------|--------|
| **R1** | SCE Workspace Surface Standard; Match duplicate publication removal; Match redundant right rail removal; activity tab-scroll artifact correction; first activity workspace adoption (Training, Match, Tournament, Veranstaltung) | **PASS** |
| **R2** | Tournament **Aufgebot** tab introduced; **Aufgebot** separated from **Teilnahme** (Hauptteam squad vs participant teams) | **PASS** |
| **R2.1** | Tournament Hauptteam / header / Aufgebot consistency; participant ordering no longer determines displayed Hauptteam; stale `TeamSeason` safety when `Event.teamSeasonId` does not match `Event.teamId` | **PASS** |
| **Final** | **HUMAN_UAT = PASS** (Product Owner, STAGE preview) | **PASS** |

## Diagnosis summary

| Activity | List | Detail route | Primary shell |
|----------|------|--------------|---------------|
| Training | `/dashboard/training` | `/dashboard/training/sessions/[sessionId]/edit` | `TrainingSessionActivityTabShell` |
| Match | `/dashboard/matchcenter` | `/dashboard/matchcenter/[matchId]` | `SpieleMatchRecordWorkspace` + `SpieleMatchRecordTabPanels` |
| Tournament | `/dashboard/tournamentcenter` | `/dashboard/tournamentcenter/[tournamentId]/edit` | `TurniereTournamentRecordWorkspace` + `TurniereTournamentActivityTabShell` |
| Veranstaltung | `/dashboard/veranstaltungen` | `/dashboard/veranstaltungen/[eventId]/edit` (bare `[id]` redirects) | `VeranstaltungEditForm` + `ClubEventActivityTabShell` |

**Team reference:** `TeamCockpitNav` + `/dashboard/teams/[teamId]/*` path segments. Activities use **`?tab=`** on existing canonical detail URLs to avoid route explosion and preserve legacy links.

**Match semantics preserved:** Aufgebot = `MatchSquadSection`; Teilnahme = participation request + optional planning participant roster when integrated Aufgebot suppresses duplicate roster (`integrated-workspace.ts`).

## Final tab matrix (canonical)

| Tab | Training | Match | Tournament | Veranstaltung |
|-----|----------|-------|------------|---------------|
| Übersicht | ✓ | ✓ | ✓ | ✓ |
| Aufgebot | — | ✓ (when squad workspace available) | ✓ (when manageable Tournament Hauptteam squad context exists) | — |
| Teilnahme | ✓ | ✓ | ✓ | ✓ |
| Planung | ✓ | — | ✓ | ✓ |
| Spielbetrieb | — | ✓ | — | — |
| Kommunikation | ✓ | ✓ | ✓ | ✓ |
| Mehr | ✓ | ✓ | ✓ | ✓ |

No empty or fake tabs. **Aufgebot** appears only where a canonical squad context exists (Match squad workspace; Tournament Hauptteam activity squad).

### Training

Übersicht · Teilnahme · Planung · Kommunikation · Mehr

### Match

Übersicht · Aufgebot · Teilnahme · Spielbetrieb · Kommunikation · Mehr

### Tournament

Übersicht · Aufgebot · Teilnahme · Planung · Kommunikation · Mehr

### Veranstaltung

Übersicht · Teilnahme · Planung · Kommunikation · Mehr

## Tournament Aufgebot vs Teilnahme (canonical)

These are **independent** product concepts:

| Concept | Meaning |
|---------|---------|
| **Tournament Aufgebot** | Players selected for the **Tournament Hauptteam** (tenant squad for this tournament event) |
| **Tournament Teilnahme** | **Teams** participating in the tournament (internal + external), RSVP / participation configuration |

- **Aufgebot** — player selection for the tenant **Hauptteam** (`Event.teamId` / resolved `TeamSeason`, Teamseite / Wochenplan). Uses the same `MatchSquad` aggregate keyed by `Event.id` (type `TOURNAMENT`), via `/api/tournamentcenter/{id}/activity-squad`. Tab visible only when `resolveIntegratedTournamentSquadWorkspace` succeeds (`tournamentSquadAvailable`).
- **Teilnahme** — tournament **participant teams** (`TournamentParticipant`), unchanged.

Additional own-club teams listed only under Teilnahme do **not** receive separate tournament squads in NAV-01 scope (**one tournament → one primary Hauptteam → one primary Aufgebot**). Multi-Hauptteam squad support is **out of scope** for this closure.

## Tournament Hauptteam invariant (R2.1 — preserved)

```
DISPLAYED TOURNAMENT HAUPTTEAM
  = Event.teamId (Event.team)
  = TOURNAMENT AUFGEBOT TEAM
  = RESOLVED AUFGEBOT TEAMSEASON
  = PLAYER ROSTER SOURCE
```

| Surface | Source |
|---------|--------|
| Tournament record header team line | `Event.team` (Hauptteam) — **never** first/sorted `TournamentParticipant` |
| Tournament Aufgebot / activity-squad | `Event.teamId` + consistent `TeamSeason` for that team + `Event.seasonId` |
| Teilnahme | `TournamentParticipant` rows (unchanged) |

`TournamentParticipant` ordering or alphabetical participant lists must **not** influence primary Aufgebot or header identity. If `Event.teamSeasonId` is stale (points at another team’s season), Aufgebot resolution re-derives `TeamSeason` from `Event.teamId` + season — it must **not** expose another team’s Saison-Kader.

Multiple internal participant teams may exist under Teilnahme; they do not drive the primary Aufgebot.

## Match Squad invariants (unchanged by NAV-01)

| Rule | Status |
|------|--------|
| Availability ≠ Match/Tournament Aufgebot selection | Preserved |
| Selection ≠ Player Release | Preserved |
| Player Release ≠ Target Assignment | Preserved |
| NOT SELECTED ≠ RELEASED | Preserved |
| SELECTED ≠ NOT RELEASABLE | Preserved |
| Freigegeben ≠ Einsatzberechtigt | Preserved |
| Stammtrainer remains in control | Preserved |

Within **AUFGEBOTEN** and **WEITERE KADERSPIELER**, availability presentation order remains **Verfügbar → Unsicher → Offen → Nicht verfügbar** (see `MATCH_SQUAD_AVAILABILITY_SORTING-01`). Operational action semantics: **Aufbieten** → SCE primary/accent; **Entfernen** / **Freigeben** → neutral.

## SCE-UI-STANDARD-01 (first adoption)

NAV-01 delivered the first PO-accepted implementation of [`docs/design/SCE-WORKSPACE-SURFACE-STANDARD.md`](../design/SCE-WORKSPACE-SURFACE-STANDARD.md):

- Persistent identity, layered surfaces, icon-led recognition (destinations + functional groups, not every field)
- Functional grouping, progressive disclosure, responsive workspace grid, clear action hierarchy, accessibility
- Communication hub remains the visual benchmark; not a literal copy target

**First formal adopters:** Training, Match, Tournament, Veranstaltung activity detail workspaces.

**SCE-UI-ROLLOUT-01+:** **next committed programme** after Match Squad closure — universal context tabs and activity presentation; see [`docs/roadmap/SCE-UI-ROLLOUT-01.md`](../roadmap/SCE-UI-ROLLOUT-01.md).

## Shared architecture

- `lib/activity-navigation/` — types, URL helpers, configs, dirty guard, tab panels
- `components/admin/activity-navigation/ActivityDetailNavigation.tsx` — UI (aligned with `TeamCockpitNav`)
- `ActivityDetailNavigationBoundary` — Suspense + tab provider
- `ActivityTabPanel` — **keeps editors mounted** (`hidden`) to prevent tab-switch data loss
- `ActivityDirtyNavigationProvider` — `window.confirm` before leaving a tab when dirty (match/tournament/club event forms register dirty state)

## URL / legacy behavior

- Deep link: `/dashboard/matchcenter/{id}?tab=aufgebot`
- Missing/invalid `tab` → **Übersicht** (or first visible tab)
- Existing paths without query continue to work unchanged
- Responsive tab overflow uses scroll contract (`.sce-activity-nav-tablist`); dirty-state guard on tab change where forms register

## Dirty form strategy

- Match / Tournament: operational save dirty flags wired to navigation guard
- Veranstaltung: form field delta → guard
- Training: panels stay mounted; datetime form state preserved on tab switch

## Tests

- `lib/activity-navigation/__tests__/*`
- `components/admin/activity-navigation/__tests__/ActivityDetailNavigation.test.tsx`
- `lib/sce/workspace/__tests__/sce-activity-semantic-icons.test.ts`
- `lib/tournaments/__tests__/tournament-hauptteam-context.test.ts`
- `lib/match-squad/__tests__/tournament-squad-event-context.test.ts`
- Updated `planning-ux-07-canonical-operational-editor-parity.test.ts`
- Match / tournament record workspace NAV-01 sentinels

## Domain safety (closure)

| Check | Result |
|-------|--------|
| SCHEMA_CHANGE | **NO** |
| MIGRATION | **NO** |
| MANUAL_DDL | **NO** |
| PROD deploy | **NO** |

Tournament squad reuse remains bounded to accepted implementation (Hauptteam `MatchSquad` on TOURNAMENT `Event.id`); no change to Event / TrainingSession / ParticipationResponse / PlayerRelease / PlayerSquadMember / TeamSeason / TournamentParticipant domain semantics beyond presentation and navigation.

## Test data

Match Squad programme UAT fixtures **SCE Testspieler 01–06** were **removed** at **01F** parent closure (2026-10-11); `TEST_DATA_REMAINING = 0` on STAGE. No NAV-01-specific test data was ever created (`NAV_01_TEST_DATA_CREATED = 0`).

## Known baseline failures (unchanged at closure)

Compare signatures at merge time; **NEW_FAILURES must be 0**:

- `lib/matchcenter/__tests__/view-model.test.ts` — 10
- `lib/matchcenter/__tests__/management-view.test.ts` — 2

## Roadmap handoff

**NEXT:** `MATCH_SQUAD_PLAYER_AVAILABILITY-01D` — Cross-Team Discovery, Request & Approval (branch from **STAGE** after merge; not started in NAV-01 closure).

Then: **01E** Assignment & Communication → **01F** Operational Intelligence & Club UAT → Sponsor Commercial Workflows → Mobile App.

## Non-goals (confirmed)

Schema changes, 01D implementation, new Match Squad / availability / release semantics, multi-Hauptteam tournament squads, broad SCE-UI-ROLLOUT-01+, PROD deploy.
