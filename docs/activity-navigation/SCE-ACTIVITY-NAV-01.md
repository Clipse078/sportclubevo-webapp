# SCE-ACTIVITY-NAV-01 — Unified Activity Detail Navigation

**Status:** IN PROGRESS (implementation on STAGE branch; awaiting PO Human UAT)  
**Baseline:** `origin/STAGE` @ `7ec9e3695446bfdb8f996c29ff2b8b1224169ab0` (includes PR #822, #823)

## Purpose

Introduce one SCE activity-detail navigation pattern (Team Cockpit visual language) across Training, Match, Tournament, and Veranstaltung without duplicating four independent tab bars.

## Diagnosis summary

| Activity | List | Detail route | Primary shell |
|----------|------|--------------|---------------|
| Training | `/dashboard/training` | `/dashboard/training/sessions/[sessionId]/edit` | `TrainingSessionActivityTabShell` |
| Match | `/dashboard/matchcenter` | `/dashboard/matchcenter/[matchId]` | `SpieleMatchRecordWorkspace` + `SpieleMatchRecordTabPanels` |
| Tournament | `/dashboard/tournamentcenter` | `/dashboard/tournamentcenter/[tournamentId]/edit` | `TurniereTournamentRecordWorkspace` + `TurniereTournamentActivityTabShell` |
| Veranstaltung | `/dashboard/veranstaltungen` | `/dashboard/veranstaltungen/[eventId]/edit` (bare `[id]` redirects) | `VeranstaltungEditForm` + `ClubEventActivityTabShell` |

**Team reference:** `TeamCockpitNav` + `/dashboard/teams/[teamId]/*` path segments. Activities use **`?tab=`** on existing canonical detail URLs to avoid route explosion and preserve legacy links.

**Match semantics preserved:** Aufgebot = `MatchSquadSection`; Teilnahme = participation request + optional planning participant roster when integrated Aufgebot suppresses duplicate roster (`integrated-workspace.ts`).

**Tournament:** No fake Match Squad / Kader-Aufgebot tab — team participants + RSVP remain under Teilnahme.

## Final tab matrix

| Tab | Training | Match | Tournament | Veranstaltung |
|-----|----------|-------|------------|---------------|
| Übersicht | ✓ | ✓ | ✓ | ✓ |
| Aufgebot | — | ✓ (when squad workspace available) | — | — |
| Teilnahme | ✓ | ✓ | ✓ | ✓ |
| Planung | ✓ | — | ✓ | ✓ |
| Spielbetrieb | — | ✓ | — | — |
| Kommunikation | ✓ | ✓ | ✓ | ✓ |
| Mehr | ✓ | ✓ | ✓ | ✓ |

**Mehr** holds lower-frequency surfaces (publication, technical metadata, match tasks/requirements).

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

## Dirty form strategy

- Match / Tournament: operational save dirty flags wired to navigation guard
- Veranstaltung: form field delta → guard
- Training: panels stay mounted; datetime form state preserved on tab switch

## Tests

- `lib/activity-navigation/__tests__/*`
- `components/admin/activity-navigation/__tests__/ActivityDetailNavigation.test.tsx`
- Updated `planning-ux-07-canonical-operational-editor-parity.test.ts`

## Known baseline failures (unchanged)

- `lib/matchcenter/__tests__/view-model.test.ts` — 10
- `lib/matchcenter/__tests__/management-view.test.ts` — 2

## PO Human UAT (STAGE preview)

Use tenant-scoped records already available to the PO account:

| Family | Route pattern |
|--------|----------------|
| Training | `/dashboard/training/sessions/{sessionId}/edit?tab=teilnahme` |
| Match | `/dashboard/matchcenter/{eventId}?tab=aufgebot` |
| Tournament | `/dashboard/tournamentcenter/{tournamentId}/edit?tab=teilnahme` |
| Veranstaltung | `/dashboard/veranstaltungen/{eventId}/edit?tab=planung` |

Verify: tabs, active state, refresh/back, Match Squad sorting/colors, Player Release entry points, responsive overflow/Mehr, no silent data loss on tab change.

## Non-goals

Schema changes, 01D, new Match Squad / availability / release semantics, PROD deploy.
