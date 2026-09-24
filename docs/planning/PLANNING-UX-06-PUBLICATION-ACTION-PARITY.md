# PLANNING-UX-06 — Publication + action + participant UI parity

## Forensic matrix (active surfaces)

| Domain | Route / shell | Publication data | Publication UI | Right rail | Task action | Participants |
|--------|---------------|------------------|----------------|------------|-------------|--------------|
| Training (series create) | `TrainingSeriesCreateForm` | TeamSeason (`trainingWebsiteVisible`, `infoboardVisible`) | `TrainingRecordPublicationSection` in `PlanningPublicationPanel` | Yes (`PlanningEditorOperationalWorkspace`) | Pre-persist notices | Pre-persist |
| Training (session edit) | `training/sessions/[id]/edit` | TeamSeason | Same | Yes (secondary column) | `ContextRelatedTasksPanel` | Roster panel |
| Match (create) | `MatchCreateForm` | Event publication fields | `MatchPublicationToggles` | Yes | Pre-persist | Pre-persist |
| Match (edit) | `SpieleMatchRecordWorkspace` | Event visibility | `MatchPublicationToggles` in right rail | Yes | Context menu + related panel | Injected section |
| Tournament | `TurniereTournamentRecordWorkspace` / create form | Event fields | `TournamentPublicationToggles` | Yes | Context menu + related panel | Editor + list |
| Veranstaltung | `VeranstaltungEditForm` / create | Event fields (no infoboard) | `VeranstaltungAusspielungFields` | Yes | Header + related panel | Audience editor |

Legacy / deferred: Saisonplanner marketing cards remain informational only; no legacy planning editor routes reintroduced.

## Root causes

### Missing match publication (active edit)

Publication toggles lived inside `MatchcenterDetailOperational` as bespoke switches and were easy to miss in the record layout; Wochenplan/Homepage/Teamseite were not wired on the match PATCH path even though create used full channel sets.

**Fix:** Canonical `MatchPublicationToggles` + `PlanningPublicationPanel` in `SpieleMatchRecordWorkspace` context rail; `suppressPublicationUI` on operational core; extended `PATCH /api/matchcenter/[matchId]` for `homepageVisible`, `wochenplanVisible`, `teamPageVisible`.

### Double plus on “+ Aufgabe”

`ContextualTaskCreateTrigger` (`button` / `toolbar` variants) renders a Lucide `Plus` icon **and** callers passed `label="+ Aufgabe"`.

**Fix:** Canonical label `PlanningEditor.operational.work.createTask` → `"Aufgabe"` (EN/FR/IT equivalents); icon-only plus in trigger.

### Veranstaltung team selector copy

Hard-coded `— Team wählen —` in `ClubEventParticipationAudienceEditor`.

**Fix:** `Veranstaltungen.editor.fields.teamSelectPlaceholder` (DE/EN/FR/IT).

## Shared publication architecture

- **`PlanningPublicationPanel`** — heading *Publikation*, intro *Steuere, wo dieser Eintrag veröffentlicht wird.*
- **`PlanningEditorPublicationControls`** — channel rows (domain-specific channel lists in `lib/planning/planning-publication-channels.ts`)
- **`PlanningEditorOperationalWorkspace`** — primary + secondary column grid (`lg` breakpoint)
- **`PlanningEditorRecordShell`** — main + context rail (`PLANNING_EDITOR_MAIN_RAIL_GRID` now `lg`, not ultra-wide-only)

Domain wrappers: `MatchPublicationToggles`, `TournamentPublicationToggles`, `VeranstaltungAusspielungFields`, `TrainingRecordPublicationSection` (team-season scope).

## Supported channels (by domain)

| Channel | Match | Tournament | Veranstaltung | Training |
|---------|-------|------------|---------------|----------|
| Website | ✓ | ✓ | ✓ | TeamSeason website |
| Infoboard | ✓ (away disabled) | ✓ | — (operational auto) | TeamSeason infoboard |
| Homepage | ✓ | ✓ | ✓ | — |
| Wochenplan | ✓ | ✓ | ✓ | — |
| Teamseite | ✓ | ✓ | — | — |

## Layout contract

- **Desktop:** primary column = operational editor, participation, resources, work, collaboration; secondary rail = publication (+ existing status/context cards on match/tournament records).
- **Narrow:** single column; rail stacks in document order; no separate mobile business logic.

## Authorization

Unchanged: match `canEditPlanningRecord`, events `events.manage`, training team publication `teams.manage`, task create via contextual eligibility. UI disable/hide only reflects existing rules.

## SFV / Wochenplan

No SFV sync code changes. Match create defaults remain via `resolveMatchPublicationDefaultsForCreate` (HOME vs AWAY). Explicit publication state continues to persist via Event fields; resync policies untouched.

## Regression sentinels

- `lib/planning/__tests__/planning-ux-06-publication-action-parity.test.ts`
- Extended `planning-integration-p0r1-active-route-sentinels.test.ts`
- Updated `planning-ux-05-operational.test.ts` (match publication rail)

## Deferred

- Requirement row “+ Anforderung” parity (separate trigger semantics).
- Mobile-specific layout pass (explicitly out of scope).

## Database

`SCHEMA_CHANGE=NO` — UI/composition + PATCH allowlist only.
