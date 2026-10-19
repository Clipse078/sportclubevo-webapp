# SCE-TOURNAMENT-PLANNER-02 — Advanced Tournament Programme Generation

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-02` |
| **Predecessor** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) — **CLOSED / ACCEPTED / MERGED** (01M PR **#873**) |
| **Status** | **IN PROGRESS** — **02A** / **02B** merged; **02C** open |
| **ADR** | [`ADR-015`](./05-architecture-decisions.md#adr-015--tournament-programme-architecture-and-generic-playing-format) |
| **Contracts** | `lib/tournament-scheduling/tournament-programme-architecture.ts` |

## Product goal

Tournament Planner **01** delivered deterministic **fixture generation**, **feasibility**, **schedule optimisation**, **manual planning**, and **Spielplan outputs** for tenant-organised tournaments.

Tournament Planner **02** evolves SCE from fixture + schedule optimisation toward **advanced tournament programme generation**:

> SCE does **not** merely generate fixtures.  
> SCE generates a **complete, fair, and practically usable tournament programme**.

Long-term canonical pipeline:

**PARTICIPANTS → PLAYING FORMATS → PLAYING UNITS → ROUNDS → ASSIGNMENTS → PITCHES / STATIONS → TIMING → SPIELPLAN**

## Relationship to Tournament Planner 01 (evolution, not replacement)

| 01 capability | 02 stance |
| --- | --- |
| `TournamentParticipant` | **Retained** — tournament-level identity |
| `TournamentPitch` | **Retained** — logical, tournament-owned scheduler grid |
| `TournamentFixture` | **Retained** — WHO for match rows |
| `TournamentPhase` | **Retained** |
| Generators (RR, Smart Mix, Groups, KO) | **Retained** |
| Feasibility engine (01D) | **Retained** |
| Schedule optimiser (01F) | **Retained** |
| Locks / partial regeneration (01G) | **Retained** |
| Canonical schedule + Spielplan outputs (01H–01K) | **Retained** |
| Results / rankings / progression (01J) | **Retained** |

02 adds **contracts and engines** for playing formats, playing units, rotation programmes, stations, in-round phases, and programme-level fairness — **without** forking schedule truth.

| Flag | Value |
| --- | --- |
| **TP01_EVOLUTION_NOT_REPLACEMENT** | **YES** |
| **ONE_CANONICAL_PROGRAMME** | **YES** |
| **TEAM_SPIELPLAN_DERIVED** | **YES** |
| **PARALLEL_SCHEDULE_TRUTH_CREATED** | **NO** |

## Package map (02A–02H)

| Package | Scope |
| --- | --- |
| **02A** | Programme architecture & format model — **this slice** ([doc](./SCE-TOURNAMENT-PLANNER-02A.md)) |
| **02B** | Playing formats & tournament pitches — optional pitch format, persistence, Creator/Planung/output adoption ([doc](./SCE-TOURNAMENT-PLANNER-02B.md)) (**CLOSED / ACCEPTED / MERGED**, PR **#875**) |
| **02C** | Participant playing units — Spielteams, capacity rules ([doc](./SCE-TOURNAMENT-PLANNER-02C.md)) (**OPEN**) |
| **02D** | Rotation generator (first-class format) |
| **02E** | Stations & alternative activities |
| **02F** | Advanced timing & in-round phases |
| **02G** | Fair programme optimiser |
| **02H** | Spielplan UX, outputs & final hardening |

Do **not** implement packages beyond the opened slice (currently **02C**; **02D+** remain closed).

## Generic engine vs federation presets

Swiss youth-football reference material (E/FF12 rotation, 3v3/6v6 field layouts) is **UAT / research input**, not the core domain model.

| Layer | Responsibility |
| --- | --- |
| **Generic programme engine** | User-defined `playersPerSide`, logical pitches, units, rounds, assignments |
| **Optional future presets** | Country/federation templates (e.g. “E/FF12 Rotation”) **above** the engine |

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
| **02C_STATUS** | **OPEN** ([02C doc](./SCE-TOURNAMENT-PLANNER-02C.md)) |
| **02C_STARTED** | **YES** |
| **NEXT_PACKAGE** | **02D** — Rotation Generator (**NOT STARTED**) |
