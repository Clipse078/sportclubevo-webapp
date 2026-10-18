# SCE-TOURNAMENT-PLANNER-01L — Responsive + Accessibility + Polish

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01L` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01K`](./SCE-TOURNAMENT-PLANNER-01K.md) — **CLOSED / ACCEPTED / MERGED** (PR **#871**) |
| **Status** | **IMPLEMENTED — PO UAT PENDING** |

## Product goal

01L is **not** a feature package. It refines the accepted Tournament Planner for:

**WORLD-CLASS · PREMIUM · MINIMAL · RESPONSIVE · ACCESSIBLE · TOUCH-FRIENDLY · KEYBOARD-FRIENDLY**

**THE ENGINE CAN BE COMPLEX. THE USER EXPERIENCE MUST BE SIMPLE.**

**THE TOURNAMENT PLANNER'S PRIMARY OUTPUT IS A USABLE SPIELPLAN.**

| Flag | Value |
| --- | --- |
| **SCHEMA_CHANGE** | **NO** |
| **NEW_OPTIMIZER_CALLS_FROM_PRESENTATION** | **0** |
| **DUPLICATE_SCHEDULE_ENGINE** | **NO** |
| **SPORT_SPECIFIC_FORMAT_REQUIREMENT_ADDED** | **NO** |

## Scope (presentation / interaction only)

| Area | 01L intent |
| --- | --- |
| Master Spielplan | Round hierarchy on desktop/tablet; chronological mobile timeline; canonical Pause amber semantic |
| Feld- und Zeitplan | Desktop matrix + horizontal scroll on tablet; mobile timeline fallback (no squeezed matrix) |
| Creator | SceActivityComposer responsive polish; no domain logic changes |
| Accessibility | Keyboard paths, visible focus, concise labels, restrained live announcements, manual move without DnD |
| Pause (R7.7A) | Preserve accepted design — explicit text, amber semantic, **COLOR_ONLY_SEMANTICS = NO** |

## Strict no-drift boundary

No new formats, generators, ranking logic, publication models, TournamentPitch semantics, or database changes.

## Deliverables (01L)

| Deliverable | Notes |
| --- | --- |
| `sce-tournament-interactive-a11y.ts` | Shared focus, touch targets, select/action link tokens |
| Spielplan mobile timeline | Canonical Pause presentation; pitch-blocked labels |
| Public + Planung responsive alignment | `lg` master / mobile split (one schedule, two compositions) |
| Planung board + mobile | Focus rings; spielplan break layout on mobile list |
| Live update copy | «Spielplan wird aktualisiert …» + concise completion announcement |
| Automated contract tests | Roadmap + a11y/responsive source assertions |

## Next

**01M** — not started (per programme table in parent doc).
