# SCE-TOURNAMENT-PLANNER-01K — Publication + Sharing

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01K` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01J`](./SCE-TOURNAMENT-PLANNER-01J.md) — **CLOSED / ACCEPTED / MERGED** (PR **#870**) |
| **Status** | **CURRENT** — publication layer + public projection + sharing |
| **Next** | [`SCE-TOURNAMENT-PLANNER-01L`](./SCE-TOURNAMENT-PLANNER-01.md) — Responsive + Accessibility + Polish (**NOT STARTED**) |

## Product goal

**ONE TOURNAMENT · ONE CANONICAL STATE · MULTIPLE PRESENTATIONS**

Internal planner state remains canonical on `Event` (type=`TOURNAMENT`) and Tournament Planner persistence. Public website consumers receive a **permission-aware projection** — not a second tournament dataset.

## Publication model (reuse)

Publication continues to use canonical `Event` channel flags:

- `websiteVisible` — gates public website list **and** tournament detail API/page
- `homepageVisible`, `wochenplanVisible`, `teamPageVisible`, `infoboardVisible` — existing SCE channel semantics (Composer / Turnier record **Publikation** step)

**NOT_PUBLISHED** for website detail ≡ `websiteVisible=false` (or failing review/status policy). No parallel `TournamentPublication` table.

## Public projection

| Function | Role |
| --- | --- |
| `loadPublicTournamentViewModel` | Server loader — canonical DB, no optimiser/feasibility |
| `buildPublicTournamentViewModel` | Pure map from `PlanungDomainSnapshot` → `PublicTournamentViewModel` |

Standings: `calculateTournamentGroupStandings()` via `buildPlanungGroupStandings`.  
Results: canonical `TournamentFixtureResult` (01J).  
Qualification placeholders: shared Planung qualification display rules.

## Public surfaces

| Surface | Route |
| --- | --- |
| **Public API** | `GET /api/public/[tenant]/website/tournaments/[tournamentId]` |
| **Public page** | `/public/[tenant]/turniere/[tournamentId]` |
| **Stable link** | Event id in path — unchanged across schedule/result edits |

## Sharing

Planung **Publikation** panel (`TournamentPlanungPublicationPanel`) shows channel toggles (canonical switches) + copy-link (+ Web Share when available).

## Authorization

| Action | Rule |
| --- | --- |
| Public read | Published (`websiteVisible` + policy + review stage) — no login |
| Publish/unpublish | `EVENTS_MANAGE` + `resolveTournamentPublicationManagement` (HOME only; AWAY/unknown fail closed) |
| Cross-tenant | Fail closed (404) |

## Concurrency

Publication PATCH accepts optional `expectedEventUpdatedAt` (Event `updatedAt` ms). Mismatch → `409 TOURNAMENT_PUBLICATION_STALE`.

## Cache / freshness

- Publication toggles → existing `resolveTournamentPublicationCacheDomains`
- Live results / manual schedule moves → `notifyPublicTournamentLiveDataChanged` (`TOURNAMENTS` + `WEEKPLAN` tags)
- Public detail response: `Cache-Control: public, s-maxage=30, stale-while-revalidate=60`

## Schema

**SCHEMA_CHANGE = NO** — reuse Event publication fields.

## Package boundary

**01L_IMPLEMENTED = NO** — responsive/a11y polish programme remains next.  
**01M_IMPLEMENTED = NO**

## Verification (automated)

Security, projection, live-update, and regression tests under:

- `lib/tournaments/public/__tests__/*`
- `app/api/public/[tenant]/website/tournaments/[tournamentId]/__tests__/*`
- `lib/tournaments/__tests__/tournament-planner-01k-roadmap.test.ts`

Manual visual UAT: **PO-owned** (skipped by Cursor cloud agent).
