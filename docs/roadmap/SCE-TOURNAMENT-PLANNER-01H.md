# SCE-TOURNAMENT-PLANNER-01H — Tournament Planung Workspace

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01H` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01G`](./SCE-TOURNAMENT-PLANNER-01G.md) — **CLOSED / MERGED** (PR **#867**) |
| **Status** | **CURRENT** — PO UAT (01H-R4 creator timing simplification + R3 Planung schedule output) |
| **Next** | **01I** — Manual adjustment + DnD + conflict validation |

## Product purpose

01H exposes the existing Tournament Planner engine through the canonical **Turnier → Planung** workspace:

- pitch × time board (TIME ↓ × TOURNAMENT PITCH →)
- Smart Timing summary (01F1)
- feasibility / optimiser status (01D / 01F2)
- automatic generation + partial regeneration (01G)
- lock UX (01G persistence)
- responsive mobile timeline (shared view model)

**No parallel planner engine.** UI consumes `lib/tournament-scheduling/*` services only.

## Information architecture

| Zone | Content |
| --- | --- |
| Header / commands | Generate / regenerate actions, timing headline |
| Status | Feasibility UX + Smart Timing lines |
| Board | Primary pitch × time grid |
| Diagnostics | Actionable conflicts / lock issues |
| Secondary | Existing tenant-hosted resource allocation (FacilityResource) remains below planner |

## View model

`TournamentPlanungViewModel` — built server-side via `loadTournamentPlanungViewModel` + pure `buildTournamentPlanungViewModel`.

Centralises presentation rules (participant labels, qualification placeholders, lock copy, regeneration summaries).

## Data contract

| Endpoint | Role |
| --- | --- |
| `GET /api/tournaments/[id]/planung` | Single composed payload |
| `POST .../planung/generate` | Initial optimiser run + assignment sync |
| `POST .../planung/regenerate` | 01G partial regeneration + sync |
| `POST .../planung/lock` | 01G lock dimension mutations |

Server page bootstraps the same loader for SSR on `/dashboard/tournamentcenter/[id]/edit?tab=planung`.

## Ownership

`TOURNAMENT_PLANNER_SCOPE = TENANT_ORGANISED_TOURNAMENTS_ONLY`

`resolveTournamentPlannerOwnership` / `canTenantPlanTournament` — unknown fails closed; AWAY hides editable workspace (no disabled fake planner).

## Responsive

- Desktop (`lg+`): scrollable pitch × time board
- Mobile: chronological timeline from `mobileTimeline` (same model)

## Accessibility

Fixture/break cells expose `accessibleLabel` including participants, time, pitch, lock state.

## Performance observations

Board rendering is linear in fixtures + breaks; no new virtualisation framework in 01H. Engine guard remains `FEASIBILITY_MAX_FIXTURES = 120`.

## 01I handoff

Manual drag & drop and move validation belong to **01I** — not implemented in 01H.

## 01H-R1 — Tournament Creator → Planner configuration

PO UAT finding: Planung workspace existed but the canonical **Tournament Activity Composer** did not collect planner inputs.

**Creator IA (HOME):** Teams → Turnierformat → Termin → Spielfelder → Spielplan → Ressourcen → Publikation → Übersicht. AWAY keeps the legacy five-step surface (no planner steps).

**Persistence boundary:** Composer commit persists participants/resources as before, then `persistTournamentPlannerFromComposer` writes competition configuration, generates fixtures (01E engines), TournamentPitch, breaks, and a WORKING schedule version with timing — **no automatic optimiser run** (Planung CTA **✨ Spielplan automatisch erstellen** remains the schedule assignment boundary).

**Schema (01H-R1):** `TournamentCompetitionConfiguration` stores `fixtureHomeAwayRelevance`, `roundRobinMeetingsPerOpponent`, `automaticGroupCount`, `knockoutQualifiersPerGroup`.

**Legacy HOME:** Planung shows actionable **Turnierplanung einrichten** when pitches or fixtures are missing.

**AWAY:** No planner in composer; Planung tab shows organiser-managed informational copy (no broken planner chrome).

## 01H-R2 — Smart Tournament Creator UX + simple break model

PO UAT (01H-R1): planner fields existed but felt like a generic form; Smart Timing was not prominent; breaks were over-engineered; Spieldauer defaulted to **120** when `defaultTournamentDurationMinutes` was incorrectly mapped to `matchDurationMinutes` in `TournamentCreateForm`.

**Smart Timing (Spielplan step):** Prominent **✨ SCE Smart Timing** panel (above timing inputs) reuses **01F1** only (`assessTournamentTiming` / backward recommendation when a fixed end exists). **Empfehlung übernehmen** writes **Spieldauer** and **Wechselzeit** only (no Creator-facing minimum-team-rest). Live feasibility surface uses engine `feasibilityStatus` (text + glyph, not color-only). Specific missing-input hints replace the generic sentence.

**Creator timing inputs (01H-R4):** **Spieldauer**, **Wechselzeit**, and explicit **Pausen & Sperrzeiten** only. `minRestMinutes` remains an internal 01D/01F engine field (default from feasibility constants) but is not exposed or recommended in the Creator. **Wechselzeit** (transition between slots) and **MINIMUM_TEAM_REST** (participant recovery hard constraint) stay distinct domain concepts.

**Breaks:** Composer UX is **Beginn (time) + Dauer (Min.)** on the tournament start date; end is derived; default scope **ALL_PITCHES**. **Nur bestimmte Felder sperren** reveals advanced multi-select pitch chips (no new binary checkboxes). Persistence maps to existing `TournamentBreak` start/end/scope — **SCHEMA_CHANGE = NO** for R2.

**Boundary unchanged:** Creator does not run the full optimiser; Planung **✨ Spielplan automatisch erstellen** remains the WHEN/WHICH-pitch boundary.

| Marker | Value |
| --- | --- |
| **TOURNAMENT_PLANNER_01H_R2_READY_FOR_PO_UAT** | **YES** |
| **TOURNAMENT_PLANNER_01H_R3_READY_FOR_PO_UAT** | **YES** (await PO visual UAT) |
| **SMART_TIMING_ENGINE_REUSED** | **YES** |
| **PARALLEL_CREATOR_TIMING_CALCULATOR_CREATED** | **NO** |
| **SCHEMA_CHANGE (R2)** | **NO** |

## 01H-R3 — Concrete Planung schedule (operational min-rest UX superseded by R4)

PO UAT (01H-R2): Planung needed readable **WHO / WHEN / WHICH TOURNAMENT PITCH** after **✨ Spielplan automatisch erstellen**.

**Planung schedule presentation:** `TournamentPlanungViewModel.scheduleSections` groups assigned `TournamentFixtureAssignment` rows by structural round (`Runde n`, `Gruppe A · Runde n`, knockout labels). Breaks render as `TournamentBreak` entries (`Pause · time · Alle Felder` / selected pitch labels). Desktop list + mobile timeline share the same sections; pitch × time board unchanged for 01G locks.

**Note:** R3 briefly added Creator-facing operational minimum-rest recommendation; **01H-R4 removes that UX** per PO decision (see below).

| Marker | Value |
| --- | --- |
| **CONCRETE_PLANUNG_ASSIGNMENTS_VISIBLE** | **YES** |
| **SCHEMA_CHANGE (R3)** | **NO** |

## 01H-R4 — Remove Creator-facing minimum team rest

PO decision: **Mindestpause pro Team** is redundant in the Tournament Creator workflow. Users configure **Spieldauer**, **Wechselzeit**, and explicit pauses; Smart Timing recommends match duration + transition + predicted end/reserve only.

| Marker | Value |
| --- | --- |
| **MINIMUM_TEAM_REST_VISIBLE_IN_CREATOR** | **NO** |
| **MINIMUM_TEAM_REST_RECOMMENDED_IN_CREATOR** | **NO** |
| **INTERNAL_MINIMUM_REST_ENGINE_CONTRACT_PRESERVED** | **YES** (`TournamentScheduleVersion.minRestMinutes` + 01D hard constraint unchanged) |
| **TOURNAMENT_PLANNER_01H_R4_READY_FOR_PO_UAT** | **YES** (await PO visual UAT) |
| **SCHEMA_CHANGE (R4)** | **NO** |

## Package boundary

| Flag | Value |
| --- | --- |
| **SCHEMA_CHANGE** | **YES** (01H-R1 migration `20261017140000_sce_tournament_planner_01h_r1_composer_generation_prefs`) |
| **MANUAL_SCHEDULE_DND_IMPLEMENTED** | **NO** |
| **RESULTS_ENGINE_IMPLEMENTED** | **NO** |
| **PUBLICATION_WORKFLOW_IMPLEMENTED** | **NO** |
