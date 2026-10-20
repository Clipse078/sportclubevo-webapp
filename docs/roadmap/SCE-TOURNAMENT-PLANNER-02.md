# SCE-TOURNAMENT-PLANNER-02 — Advanced Tournament Programme Generation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02` |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) — **CLOSED / ACCEPTED / MERGED** (01M PR **#873**) |
| **Status** | **IN PROGRESS** — **02A** / **02B** / **02C** / **02D** **CLOSED / ACCEPTED / MERGED**; **02E** next |
| **ADR** | [`ADR-015`](./05-architecture-decisions.md#adr-015--tournament-programme-architecture-and-generic-playing-format) |
| **Contracts** | `lib/tournament-scheduling/tournament-programme-architecture.ts` |

## Product goal

Tournament Planner **01** delivered deterministic **fixture generation**, **feasibility**, **schedule optimisation**, **manual planning**, and **Spielplan outputs** for tenant-organised tournaments.

Tournament Planner **02** completes the **operational path** from selected participating teams to a ready **Spielplan**, using the generic engine built in **02A–02C** and **predefined Spielplan templates** (starting in **02D**):

> User selects participating teams → SCE counts participants → SCE loads the corresponding **predefined Spielplan template** → SCE uses the template’s **Felder** count and round/field structure → SCE maps real teams to template positions → SCE applies tournament start time / existing timing capabilities → **Spielplan ready**.

Do **not** expand TP02 into a large generic optimisation platform. The remaining delivery is **template-driven instant generation** plus **Spielplan UX / outputs / hardening** (**02E**).

Conceptual pipeline (useful for architecture; not every abstraction must be fully generic before TP02 closes):

**PARTICIPANTS → PLAYING FORMATS → PLAYING UNITS → ROUNDS → ASSIGNMENTS → PITCHES → TIMING → SPIELPLAN**

**Stations**, **in-round phases**, and a **fair programme optimiser** are **not** required packages for TP02 delivery (see removed scope below).

## Relationship to Tournament Planner 01 (evolution, not replacement)

| 01 capability | 02 stance |
| --- | --- |
| `TournamentParticipant` | **Retained** — tournament-level identity |
| `TournamentPitch` | **Retained** — logical, tournament-owned scheduler grid |
| `TournamentFixture` | **Retained** — WHO for match rows |
| `TournamentPhase` | **Retained** |
| Generators (RR, Smart Mix, Groups, KO) | **Retained** — available as **fallback** where no approved predefined template exists |
| Feasibility engine (01D) | **Retained** |
| Schedule optimiser (01F) | **Retained** — timing on canonical schedule; templates do not create parallel schedule truth |
| Locks / partial regeneration (01G) | **Retained** |
| Canonical schedule + Spielplan outputs (01H–01K) | **Retained** |
| Results / rankings / progression (01J) | **Retained** — **no expansion** in 02C R1 |

02 adds **contracts and engines** for playing formats, playing units, and **predefined programme templates** — **without** forking schedule truth.

| Flag | Value |
| --- | --- |
| **TP01_EVOLUTION_NOT_REPLACEMENT** | **YES** |
| **ONE_CANONICAL_PROGRAMME** | **YES** |
| **TEAM_SPIELPLAN_DERIVED** | **YES** |
| **PARALLEL_SCHEDULE_TRUTH_CREATED** | **NO** |
| **TEMPLATE_DRIVEN_GENERATION** | **YES** (02D+) |
| **GENERIC_ROTATION_GENERATOR_REQUIRED** | **NO** |

## Package map (02A–02E)

| Package | Scope |
| --- | --- |
| **02A** | Programme architecture & format model — **CLOSED / ACCEPTED / MERGED** ([doc](./SCE-TOURNAMENT-PLANNER-02A.md)) |
| **02B** | Playing formats & tournament pitches — optional pitch format, persistence, Creator/Planung/output adoption ([doc](./SCE-TOURNAMENT-PLANNER-02B.md)) (**CLOSED / ACCEPTED / MERGED**, PR **#875**) |
| **02C** | Participant playing units — Spielteams, capacity rules ([doc](./SCE-TOURNAMENT-PLANNER-02C.md)) (**CLOSED / ACCEPTED / MERGED**, PR **#876**) |
| **02D** | **Predefined Spielplan templates & instant generation** — ([doc](./SCE-TOURNAMENT-PLANNER-02D.md)) (**CLOSED / ACCEPTED / MERGED**, PR **#877**) |
| **02E** | **Spielplan UX, outputs & final hardening** — final TP02 package before closure (**NEXT**, **NOT STARTED**) |

**TP02 closes after 02E** acceptance/merge.

Do **not** implement packages beyond the opened slice (**02E** next; **02E** remains closed until opened).

### Removed from required TP02 delivery (not postponed)

These are **no longer** in the active TP02 roadmap:

| Former id | Former scope | Status |
| --- | --- | --- |
| ~~02D~~ | Generic **rotation generator** | **Removed** — rotation programmes via **predefined templates** where reference Spielpläne define them |
| ~~02E~~ | Stations & alternative activities | **Removed** |
| ~~02F~~ | Advanced timing & in-round phases | **Removed** (reuse existing TP01 timing; no new schedule truth) |
| ~~02G~~ | Fair programme optimiser | **Removed** |

## Predefined templates (02D direction)

Reference Spielpläne are the authoritative inspiration for curated templates. A template is a **complete structure**, not merely opponent lists:

- participant count
- template positions (A, B, C, …)
- number of **Felder**
- rounds, pairings, pairing → Feld assignment, ordering, breaks where defined
- `PlayingFormat` per Feld where defined
- `TournamentParticipantUnit` references (e.g. A1, A2) where split Spielteams are required

| Rule | Value |
| --- | --- |
| **PARTICIPANT_COUNT_SELECTS_TEMPLATE** | **YES** |
| **TEMPLATE_DEFINES_FIELD_COUNT** | **YES** — do not ask the optimiser to invent Felder count when the template already defines structure |
| **INITIAL_CURATED_RANGE** | **4–16** teams (where approved templates exist) |
| **ARBITRARY_PRODUCT_PARTICIPANT_MAX** | **NONE** — architecture must allow 17, 18, 20, 24, … templates later without engine redesign |
| **SILENT_TEMPLATE_INVENTION** | **NO** — if no approved template exists, do not claim a predefined programme |

Swiss youth-football reference material remains **UAT / research input** for template authoring, not hard-coded core enums.

| Layer | Responsibility |
| --- | --- |
| **Generic contracts (02A–02C)** | Participants, formats, units, canonical schedule |
| **Predefined templates (02D)** | Curated programme structures per participant count |
| **Optional future presets** | Additional federation/country catalogues **above** templates |

Core domain must **not** introduce types such as `SFV_E_FORMAT`, `FF12_ROTATION`, or hard-coded `THREE_V_THREE` enums.

## Primary output (unchanged)

**SPIELPLAN** remains the product outcome. One canonical programme on `TournamentScheduleVersion` feeds:

Planung → Master-Spielplan → Team-Spielplan → Print → PDF → Public / Share

Team-Spielplan is a **derived view** — never a separately persisted schedule.

## Programme status

| Flag | Value |
| --- | --- |
| **TOURNAMENT_PLANNER_02_STARTED** | **YES** (02A) |
| **02A_STATUS** | **CLOSED / ACCEPTED / MERGED** (PR **#874**, [02A doc](./SCE-TOURNAMENT-PLANNER-02A.md)) |
| **02B_STATUS** | **CLOSED / ACCEPTED / MERGED** (PR **#875**, [02B doc](./SCE-TOURNAMENT-PLANNER-02B.md)) |
| **02C_STATUS** | **CLOSED / ACCEPTED / MERGED** (PR **#876**, [02C doc](./SCE-TOURNAMENT-PLANNER-02C.md)) |
| **02D_STATUS** | **CLOSED / ACCEPTED / MERGED** (PO UAT **PASS**, PR **#877**, [02D doc](./SCE-TOURNAMENT-PLANNER-02D.md)) |
| **NEXT_PACKAGE** | **02E** — Spielplan UX, Outputs & Final Hardening (**NOT STARTED**) |
| **FINAL_PACKAGE** | **02E** — Spielplan UX, Outputs & Final Hardening (**NOT STARTED**) |
| **TP02_CLOSES_AFTER_02E** | **YES** |
| **REMAINING_REQUIRED_TP02_PACKAGES** | **02E** |
