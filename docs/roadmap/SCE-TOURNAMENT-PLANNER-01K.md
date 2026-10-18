# SCE-TOURNAMENT-PLANNER-01K — Spielplan output + sharing

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01K` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01J`](./SCE-TOURNAMENT-PLANNER-01J.md) — **CLOSED / ACCEPTED / MERGED** (PR **#870**) |
| **Status** | **CURRENT** — Spielplan output (master + team), print, PDF, publication/sharing |
| **Next** | [`SCE-TOURNAMENT-PLANNER-01L`](./SCE-TOURNAMENT-PLANNER-01.md) — Responsive + Accessibility + Polish (**NOT STARTED**) |

## Product goal (scope correction)

**Primary output:** a practical, high-quality **Spielplan** for tournament day — not a completed tournament with a winner.

**CONFIGURE → PARTICIPANTS → PITCHES → TIMING / BREAKS → GENERATE FIXTURES → OPTIMISE → REVIEW → SPIELPLAN → PRINT / PDF / SHARE**

| Flag | Value |
| --- | --- |
| **LIVE_RESULTS_REQUIRED_FOR_01K_SUCCESS** | **NO** |
| **RANKINGS_REQUIRED_FOR_01K_SUCCESS** | **NO** |
| **WINNER_REQUIRED_FOR_01K_SUCCESS** | **NO** |

01J results, standings, and qualification progression remain **optional advanced sporting capabilities** and are surfaced when data exists — they do not define 01K completion.

## Canonical Spielplan projection

| Function | Role |
| --- | --- |
| `buildTournamentSpielplanViewModel` | Pure map from Planung cells + pitches + breaks → master matrix + mobile slots + per-participant team plans |
| `buildTournamentSpielplanFromPlanung` | Adapter from Planung workspace / snapshot |
| `loadTournamentSpielplanViewModel` | Presentation-only loader (no feasibility / Smart Timing / optimiser) |

**Source of truth:** `TournamentFixture`, `TournamentFixtureAssignment`, `TournamentPitch`, `TournamentBreak`, `TournamentParticipant`. Optional `TournamentFixtureResult` enriches display only.

**Not persisted:** master or team Spielplan copies in Postgres.

## Deliverables

| Deliverable | Status |
| --- | --- |
| Master Spielplan (time × TournamentPitch matrix) | Planung **Spielplan** mode + public page |
| Team-specific Spielplan (derived, not persisted) | Planung + public team selector |
| Team highlight on master matrix | Planung + public |
| Print master / team | `/tournaments/[id]/spielplan/print/...` |
| PDF master / team | `GET /api/tournaments/[id]/planung/spielplan/pdf` |
| Share stable public link | Existing 01K publication panel + public route |

Document family (print/PDF presentation):

- `SceTournamentSpielplanDocument`
- `SceTournamentTeamSpielplanDocument`

## Publication model (retained from initial 01K)

Publication continues to use canonical `Event` channel flags (`websiteVisible`, `homepageVisible`, `wochenplanVisible`, `teamPageVisible`, `infoboardVisible`). The initial public tournament API/page remains **supporting infrastructure** for sharing the Spielplan.

| Function | Role |
| --- | --- |
| `loadPublicTournamentViewModel` | Server loader — canonical DB, no optimiser/feasibility |
| `buildPublicTournamentViewModel` | Pure map → `PublicTournamentViewModel` + embedded `spielplan` |

## Public surfaces

| Surface | Route |
| --- | --- |
| **Public API** | `GET /api/public/[tenant]/website/tournaments/[tournamentId]` |
| **Public page** | `/public/[tenant]/turniere/[tournamentId]` |
| **Stable link** | Event id in path |

Public hierarchy: **identity → Spielplan → team plan → (optional) standings**.

## Authorization

Unchanged from initial 01K: published read without login; publish/unpublish HOME + `EVENTS_MANAGE`; cross-tenant fail closed.

## Schema

**SCHEMA_CHANGE = NO** — Spielplan is projection-only.

## Package boundary

**01L_IMPLEMENTED = NO**  
**01M_IMPLEMENTED = NO**

## Verification (automated)

- `lib/tournaments/spielplan/__tests__/*`
- `lib/tournaments/public/__tests__/*`
- Print document structure tests under `components/sce/tournament/__tests__/`
