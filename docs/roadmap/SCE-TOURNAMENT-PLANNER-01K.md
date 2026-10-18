# SCE-TOURNAMENT-PLANNER-01K — Spielplan output + sharing

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01K` |
| **Parent** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01J`](./SCE-TOURNAMENT-PLANNER-01J.md) — **CLOSED / ACCEPTED / MERGED** (PR **#870**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#871**, PO UAT **PASS**, merge to **STAGE**) |
| **Next** | [`SCE-TOURNAMENT-PLANNER-01L`](./SCE-TOURNAMENT-PLANNER-01L.md) — **CLOSED / ACCEPTED / MERGED** (PR **#872**); [`SCE-TOURNAMENT-PLANNER-01M`](./SCE-TOURNAMENT-PLANNER-01M.md) — **NOT STARTED** |

## Product goal (scope correction)

**Primary output:** a practical, high-quality **Spielplan** for tournament day — not a completed tournament with a winner.

**THE TOURNAMENT PLANNER'S PRIMARY OUTPUT IS A USABLE SPIELPLAN.**

**ONE CANONICAL TOURNAMENT SCHEDULE.** Multiple outputs from the same schedule: **Planung → Master Spielplan → Team Spielplan → Print / PDF / Share.**

**CONFIGURE → PARTICIPANTS → TOURNAMENT PITCHES → TIMING / BREAKS → GENERATE FIXTURES → OPTIMISE WHEN + WHERE → REVIEW / MANUALLY ADJUST → SPIELPLAN → PRINT / PDF / SHARE**

| Flag | Value |
| --- | --- |
| **LIVE_RESULTS_REQUIRED_FOR_01K_SUCCESS** | **NO** |
| **RANKINGS_REQUIRED_FOR_01K_SUCCESS** | **NO** |
| **WINNER_REQUIRED_FOR_01K_SUCCESS** | **NO** |

01J results, standings, and qualification progression remain **optional advanced sporting capabilities** and are surfaced when data exists — they do not define 01K completion.

## Permanent SCE UX ground rule

**WORLD-CLASS DESIGN · PREMIUM EXPERIENCE · MINIMAL UX**

- Complexity stays behind the interface; calm information hierarchy; minimal cognitive load
- Essential decisions only; one obvious primary action where appropriate; progressive disclosure
- No engineering terminology in normal UX; no unnecessary settings or duplication
- **Premium** means clarity, restraint, and consistency — not decoration

**THE ENGINE CAN BE COMPLEX. THE USER EXPERIENCE MUST BE SIMPLE.**

## TournamentPitch neutrality (permanent)

**TournamentPitch** is **sport-neutral** and **country-neutral** — a tournament-local logical field/station identity (e.g. Feld 1, Feld 2). It remains distinct from **FacilityResource**.

**FORMAT_AWARE_TOURNAMENT_PITCH_GENERIC_REQUIREMENT = NO** — no intrinsic generic requirement for 3v3, 4v4, Kleinfeld/Grossfeld, goal types, or Swiss/sport-specific pitch formats. Optional templates may add sport/country behaviour only when explicitly required (Tournament Planner 02 deferred).

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

## 01K-R4 — Simplified organiser UX (CURRENT)

**Principle:** The scheduling engine can be complex; the normal organiser experience must stay simple.

**Workflow:** Tell SCE about the tournament → SCE creates the Spielplan → organiser reviews / adjusts.

Technical diagnostics (feasibility codes, witness schedules, optimiser vocabulary, minimum-rest math) stay in logs, structured diagnostics, and tests — **not** in the default Creator / Planung UI.

### Planung — three states (pre-generation)

| State | When | Primary action |
| --- | --- | --- |
| **READY** | Canonical feasibility allows generation | ✨ Spielplan erstellen |
| **AUTO_FIX** | Infeasible but Smart Timing has a concrete timing pair | Empfehlung übernehmen |
| **STRUCTURAL_CHANGE** | No safe timing-only fix | Turnier bearbeiten (+ optional contextual links) |

One canonical feasibility presentation per viewport — no duplicate red blocks, header diagnostics, or toasts repeating the full explanation.

Smart Timing / feasibility / apply-recommendation reuse the existing 01F1 / 01D engines (no parallel logic, **SCHEMA_CHANGE = NO**).

Creator Spielplan step uses the same assistant pattern via `buildComposerPlanningAssistantUx` (shared Smart Timing truth).

**01K-R4 status:** **CLOSED / ACCEPTED / MERGED** (PR **#871**, PO UAT **PASS**).

## 01K-R5 — World-Class Spielplan Visual Presentation

**Principle:** The Spielplan is the primary tournament output for organisers and the public. Interactive surfaces use one SCE fixture-card family (time, TournamentPitch, crests, explicit **VS**, participants) grouped by competition round — not a spreadsheet matrix on desktop.

| Topic | Decision |
| --- | --- |
| Master / Team Spielplan | Shared `SceTournamentFixtureCard` visual language |
| Club identity | Authoritative crest resolution + restrained fallback (no fake logos; real crests not in generic avatar bubbles) |
| Round grouping | Derived from canonical Planung `scheduleSections` / Spielplan `presentationItems` |
| Print / PDF | Purpose-built compact matrix documents may remain for paper efficiency |
| PDF refinement | **Backlog** — not a 01K closure blocker |
| Email sharing | **Backlog** — not a 01K closure blocker |

**01K-R5 status:** **CLOSED / ACCEPTED / MERGED** (PR **#871**, PO visual UAT **PASS**).

## 01K-R6 — Final Planung + Spielplan Visual Alignment

**Principle:** One tournament fixture visual family with multiple densities — **STANDARD** for Spielplan output, **COMPACT** for operational Planung — sharing crest, participant identity, and explicit **VS** composition. Planung DnD, locks, manual move, and conflict semantics are unchanged.

| Surface | Component | Role |
| --- | --- | --- |
| Spielplan (Master / Team / public) | `SceTournamentFixtureCard` | Organiser-facing schedule output |
| Planung list + mobile timeline + board cells | `SceTournamentFixtureCompactMatchup` | Interactive scheduling (list overview + pitch/time board) |
| Shared primitives | `SceTournamentFixtureIdentity` (`SceTournamentFixtureParticipant`, `SceTournamentFixtureVs`) | Crest + name + VS without parallel card families |

Planung keeps round-grouped overview **and** desktop pitch/time board (DnD); both use the compact fixture language with clear section hierarchy.

**Backlog (unchanged):** PDF refinement; direct Spielplan email sharing — not 01K closure blockers.

**01K-R6 status:** **CLOSED / ACCEPTED / MERGED** (PR **#871**, PO visual UAT **PASS**).

## 01K-R7 — Unified Spielplan + planning edit mode

**Principle:** **ONE TOURNAMENT SCHEDULE. ONE PRIMARY SPIELPLAN EXPERIENCE. TWO INTERACTION MODES: VIEW + EDIT.**

| Topic | Decision |
| --- | --- |
| Default Planung route (`?tab=planung`) | Canonical **Spielplan** presentation (R6 visual language) |
| Inner navigation | **Removed** — no Planung \| Spielplan toggle |
| Redundant planning list | **Removed** — no separate “Übersicht nach Runden” operational fixture list |
| Edit entry | **Spielplan bearbeiten** → same workspace, same schedule |
| Edit content | Pitch × time board (DnD), locks, manual move, conflicts, partial regeneration |
| Output actions | Master/team Spielplan, highlight, print, PDF, share — **view mode only** |
| URL (optional) | `?tab=planung&mode=edit` for deep link; refresh without `mode` defaults to view |
| Persistence | **No** DB field for edit mode; **SCHEMA_CHANGE = NO** |

Planning is an operation **on** the Spielplan, not a second schedule representation. Domain architecture (fixtures, assignments, optimiser, feasibility) is unchanged.

**01K-R7 status:** **CLOSED / ACCEPTED / MERGED** (PR **#871**, PO UAT **PASS**).

## 01K-R7.1 — Spielplan bearbeiten: operational schedule settings

**Principle:** **ONE PRIMARY SPIELPLAN EXPERIENCE** — **VIEW** = consume/output/share; **EDIT** = operational schedule configuration + manual schedule editing.

| Topic | Decision |
| --- | --- |
| **Spielplan-Einstellungen** (edit mode, above Feld- und Zeitplan) | **Spieldauer**, **Wechselzeit**, **Pausen & Sperrzeiten** (add/edit/delete) |
| Configuration source | Canonical **WORKING** schedule version timing + **TournamentBreak** — no parallel draft model |
| Timing change behaviour | Persist config → reassess feasibility/consistency → **no silent regeneration** |
| Invalid assignments | Simple DE copy + explicit **[Spielplan neu berechnen]** (canonical partial regeneration) |
| Valid assignments | Calm confirmation when useful — no internal feasibility dashboard |
| Manual editing | Feld- und Zeitplan unchanged (DnD, manual move, locks, conflicts) |
| Publication | **Outside edit mode** — canonical **Publizieren** / publication surfaces only |
| Advanced break scope | Default **Alle Felder**; optional **Nur bestimmte Felder sperren** via SCE **toggle** + pitch multi-select |

**01K-R7.1 status:** **CLOSED / ACCEPTED / MERGED** (PR **#871**, PO UAT **PASS**).

## 01K-R7.5 — Home/Away topology + break timezone

Correct canonical home/away round-robin (4 teams → 6 fixtures OFF, 12 fixtures ON), break local-time inheritance from tournament date, and live reconciliation after topology changes.

**01K-R7.5 status:** merged at `5146c5ebc7e6668f6a76dddc578874ef919b38b7` on branch `cursor/sce-tournament-planner-01k-publication-sharing` (PR **#871**).

## 01K-R7.6 — World-class Spielplan UX + final product polish

**Permanent ground rule:** **WORLD-CLASS DESIGN · PREMIUM EXPERIENCE · MINIMAL UX.** Engine complexity stays behind the interface — no optimiser/feasibility/revision vocabulary in normal organiser flows.

| Principle | Decision |
| --- | --- |
| Primary outcome | **Spielplan** — usable without results/rankings/winner |
| Information architecture | **Round × field** master schedule; team plans derived from the same canonical schedule |
| Breaks | **Schedule structure, not fixtures** — visible on board, master Spielplan, team context, print/PDF |
| View vs edit | View = Spielplan + highlight + print/PDF/share; Edit = Einstellungen + Pausen + Feld-/Zeitplan |
| Home/Away UX | Toggle + short copy: *Jede Paarung wird als Hin- und Rückspiel ausgetragen.* — auto reconcile, no manual apply |
| Live editing | Spieldauer / Wechselzeit / Home/Away / break CRUD → serial latest-intent mutations; subtle *Spielplan wird aktualisiert …* only |
| Infeasible edit | One calm block + optional Smart Timing **Empfehlung übernehmen**; otherwise structural hint (more time or pitch) |
| Team highlight | Filter/focus master Spielplan — related fixtures fade, highlighted fixture keeps crests around **VS** |
| TournamentPitch UI | Neutral logical columns (`Feld 1`, `Feld 2`, …); optional display-only hints must stay **sport-neutral** and **country-neutral** — no intrinsic pitch formats in schema (**Planner 02 templates deferred**) |

**Explicitly NOT in R7.6 / 01K:** Tournament Planner 02 templates, Rotation format, playing formats, participant playing units, template-driven Smart Generation.

## 01K-R7.7 — PO UAT correctness (Home/Away + breaks)

Fix real end-to-end failures on existing tournaments: stale round-robin topology when `fixtureHomeAwayRelevance` is ON but first-leg fixtures remain, and break visibility across Planung board, master Spielplan, team/mobile/print/PDF projections.

| Invariant | Decision |
| --- | --- |
| Home/Away | 4 participants → OFF: 6 fixtures / 3 rounds; ON: 12 fixtures / 6 rounds; reconcile topology on explicit organiser mutations when persisted intent mismatches canonical count |
| Breaks | Schedule structure (not fixtures); ALL_PITCHES full-width band; must not depend on fixture collision / time gap alone |
| TournamentPitch | **Sport-neutral · country-neutral** — no roadmap requirement for format-aware generic pitches |
| Tests | Integration regression reproduces legacy persisted state + view-model/presentation layers (not pure generator-only claims) |

**01K-R7.7 status:** **CLOSED / ACCEPTED / MERGED** at `d6ee7a47370eecb834bbd8feb1ac60ef153dc154` (PR **#871**, functional PO UAT **PASS**).

## 01K-R7.7A — Canonical Pause visual semantic

PO-accepted amber Pause treatment on normal Spielplan and full-width Pause on Feld- und Zeitplan; Pause remains schedule structure (**BREAK_IS_FIXTURE = NO**), affects scheduling, and resumes after the break.

**01K-R7.7A status:** **CLOSED / ACCEPTED / MERGED** at `a4a36464604e99cb4100d4689e44a71260f0477e` (PR **#871**, Pause visual PO UAT **PASS**).

**01K-R7.6 status:** **CLOSED / ACCEPTED / MERGED** (PR **#871**, PO UAT **PASS**).

## Final accepted scope (closure)

| Capability | Status |
| --- | --- |
| Spielplan-first product outcome | **ACCEPTED** |
| Master Spielplan + team context + canonical match presentation | **ACCEPTED** |
| Team highlight, print master/team, PDF master/team, share/public Spielplan | **ACCEPTED** |
| Pause / Sperrzeit as explicit schedule structure + canonical Pause semantic | **ACCEPTED** |
| Home/Away double-leg correctness + live operational editing | **ACCEPTED** |
| One canonical schedule; sport/country-neutral TournamentPitch | **ACCEPTED** |

**Next package:** [`01L`](./SCE-TOURNAMENT-PLANNER-01.md) — Responsive + Accessibility + Polish (**NOT STARTED**; deliberately narrow — no new formats, Rotation, template engine, or sport-specific TournamentPitch semantics). **Tournament Planner 02** remains later research.

## Verification (automated)

- `lib/tournaments/spielplan/__tests__/*`
- `lib/tournaments/public/__tests__/*`
- `lib/tournaments/planung/__tests__/planung-r7-6-world-class-spielplan-ux.test.ts`
- Print document structure tests under `components/sce/tournament/__tests__/`
