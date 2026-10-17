# SCE-TOURNAMENT-PLANNER-01H — Tournament Planung Workspace

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01H` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01G`](./SCE-TOURNAMENT-PLANNER-01G.md) — **CLOSED / MERGED** (PR **#867**) |
| **Status** | **CURRENT** |
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

## Package boundary

| Flag | Value |
| --- | --- |
| **SCHEMA_CHANGE** | **NO** |
| **MANUAL_SCHEDULE_DND_IMPLEMENTED** | **NO** |
| **RESULTS_ENGINE_IMPLEMENTED** | **NO** |
| **PUBLICATION_WORKFLOW_IMPLEMENTED** | **NO** |
