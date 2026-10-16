# SCE-TOURNAMENT-PLANNER-01 — Smart Tournament Generator + Scheduler

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01` |
| **Status** | **IN PROGRESS — 01D (feasibility + R2 architecture); 01C CLOSED / MERGED (PR #855)** |
| **Predecessor** | [`SCE-ACTIVITY-CREATE-01F`](./SCE-ACTIVITY-CREATE-01F.md) — Tournament Adoption |
| **01A (architecture)** | [`SCE-TOURNAMENT-PLANNER-01A`](./SCE-TOURNAMENT-PLANNER-01A.md) — **CLOSED / PO APPROVED / MERGED** |
| **01B (persistence)** | [`SCE-TOURNAMENT-PLANNER-01B`](./SCE-TOURNAMENT-PLANNER-01B.md) — fixture + schedule version foundation |
| **01C (round robin MVP)** | [`SCE-TOURNAMENT-PLANNER-01C`](./SCE-TOURNAMENT-PLANNER-01C.md) — **CLOSED / MERGED** — deterministic single round-robin (WHO, MVP) |
| **01D (feasibility)** | [`SCE-TOURNAMENT-PLANNER-01D`](./SCE-TOURNAMENT-PLANNER-01D.md) — feasibility + hard-constraint validator (CAN IT FIT?) + **01D-R2 smart generator alignment** |
| **ADR** | [`ADR-014`](./05-architecture-decisions.md#adr-014--tournament-fixture-vs-schedule-separation-and-deterministic-scheduling-engine) |

## Product vision (canonical)

**`SMART_TOURNAMENT_GENERATOR = CANONICAL`**

Primary user journey:

**CONFIGURE → SCE GENERATES → REVIEW → MANUALLY ADJUST IF DESIRED → LOCK → REGENERATE UNLOCKED PARTS → PUBLISH**

| Flag | Value |
| --- | --- |
| **AUTOMATIC_GENERATION_IS_PRIMARY** | **YES** |
| **MANUAL_ADJUSTMENT_IS_SUPPORTED** | **YES** |

Users must **not** normally construct groups, pairings, fixtures, brackets, pitch assignments, or kickoff times by hand. SCE performs deterministic, explainable, constraint-safe generation — **no LLM** for fixtures or scheduling.

Contracts: `lib/tournament-scheduling/smart-generator-architecture.ts`.

## Architecture principle

> Fixture generation determines **WHO** plays whom.  
> Feasibility (01D) determines **CAN IT FIT?**  
> Schedule optimisation (01E) determines **WHEN** and **WHICH logical pitch**.

## Canonical tournament model

| Layer | Responsibility |
| --- | --- |
| **Tournament** (`Event`, type=TOURNAMENT) | Container + window + publication |
| **Participants** | `TournamentParticipant` — tournament-local identity |
| **Competition structure** | Modes + phases (see below) |
| **Phases** | `stageKey` today; durable `TournamentPhase` deferred until Group+KO package |
| **Generation strategy** | Round Robin / Smart Mix / future bracket engines |
| **Fixtures** | `TournamentFixture` — WHO |
| **Tournament Pitches** | Logical scheduler grid (1:n, tournament-owned) |
| **Scheduling rules** | Versioned on `TournamentScheduleVersion` |
| **Breaks** | `TournamentBreak` 0:n |
| **Feasibility** | Pure engine (01D) |
| **Optimised schedule** | Assignments on logical pitches (01E+) |
| **Manual adjustments / locks** | 01F+ |
| **Publication** | 01I |

## Product cardinality (canonical)

| Concept | Cardinality |
| --- | --- |
| **PARTICIPANT_PRODUCT_CARDINALITY** | **2:n** |
| **TOURNAMENT_PITCH_CARDINALITY** | **1:n** per tournament |
| **TOURNAMENT_BREAK_CARDINALITY** | **0:n** per tournament |
| **TOURNAMENT_PHASE_CARDINALITY** | **1:n** per tournament |

**Tournament Pitch ≠ FacilityResource.** MVP engine guards (e.g. 16 participants in 01C/01D) are **implementation safety limits**, not product maximums (`PARTICIPANT_LIMIT_IS_PRODUCT_RULE = NO`).

## Competition modes (user-facing)

**COMPETITION_MODES =** `GROUP_MIX_ONLY` \| `KNOCKOUT_ONLY` \| `GROUP_PLUS_KNOCKOUT`

One engine family — phases carry format semantics; not three unrelated tournament engines.

## Group / mix generation strategies

**GROUP_MIX_GENERATORS =** `ROUND_ROBIN` \| `SMART_MIX`

| Strategy | Meaning |
| --- | --- |
| **ROUND_ROBIN** | Every participant meets every other participant per configured encounter count |
| **SMART_MIX** | Balanced subset from `targetMatchesPerParticipant` and constraints (future package) |

**CURRENT_ROUND_ROBIN_MEETINGS_PER_OPPONENT = 1** (01C MVP). **PRODUCT = 1:n**. **ROUND_ROBIN_EXTENSION_REQUIRED = YES**.

Smart Mix decides **WHO**; 01D decides **CAN IT FIT**; 01E decides **WHEN + PITCH**.

## Participant identity (01D-R2)

`TournamentParticipant` ≠ SCE `Team`. Same canonical `teamId` may appear on **multiple** rows with distinct tournament `displayName` values (`SAME_SOURCE_TEAM_MULTIPLE_PARTICIPANTS = YES`). Manual participants (`manualLabel`) and external clubs remain supported.

## Home / away

**HOME_AWAY_RELEVANT = ON/OFF** (future generation setting). Default for neutral youth tournaments: **OFF**. Fixture `sideA`/`sideB` stay neutral unless explicitly enabled — do not infer from side labels alone.

## Qualification / knockout (future)

**FUTURE_KNOCKOUT_QUALIFICATION_MODEL_DEFINED = YES** — fixture sides may later reference `QUALIFICATION_REFERENCE` (group position, winner/loser of fixture) without nullable participant ids without integrity design. Group+KO requires canonical **ranking rules** output before qualification resolution.

## Generation pipeline (binding)

`TournamentParticipants → CompetitionStructure → TournamentPhases → FixtureGenerator → TournamentFixtures → 01D Feasibility → 01E ScheduleOptimiser → TournamentFixtureAssignments → ManualAdjustments/Locks → PartialRegeneration → Publication`

## “Almost AI” UX (deterministic)

Product copy examples: *Turnier automatisch erstellen*, *Neu generieren*, *Nur freie Spiele neu planen*. Intelligence = deterministic generation + optimisation — not LLM branding.

## Creator adoption (future)

Flow: **TEAMS / PARTICIPANTS → FORMAT → SCHEDULING → PUBLICATION → REVIEW** (tabs may refine). Must capture participants, tournament-local names, competition structure, generation strategy, Home/Away, Tournament Pitches, durations, transition, min rest, window, 0:n breaks — then SCE generates. **Not implemented in 01D-R2 UI.**

## Hard constraints (future)

- Participant / pitch exclusivity, window, breaks, duration, transition, min rest
- **Knockout dependency:** dependent fixture cannot start before prerequisites complete (+ rest)
- **Phase boundaries:** Group+KO default **sequential** (group completes → standings → knockout)
- Physical facility availability upstream of logical pitch grid

## Optimisation targets (future)

Rest fairness, consecutive-match avoidance, idle time, pitch distribution, slot fairness, compact duration, soft preference penalties.

## Product placement (accepted)

**`SEPARATE_TOP_LEVEL_TOURNAMENT_SCHEDULING_MODULE = NO`**

1. **Tournament Creator** — progressive scheduling adoption.
2. **Tournament → Planung** — feasibility, optimiser, planner, locks, edits, publication.

## Recommended package sequence (01D-R2 resequencing)

**`ROADMAP_RESEQUENCING_RECOMMENDED = YES`**

| Order | Package | Focus |
| --- | --- | --- |
| 1 | **01C-EXT / 01J** (new) | Smart Mix, repeated RR, auto grouping, knockout bracket generation |
| 2 | **01K** (new) | Standings + ranking rules + qualification resolution |
| 3 | **01D** | Feasibility (in progress) |
| 4 | **01E** | Schedule optimiser |
| 5 | **01F** | Locks + partial regeneration |
| 6 | **01G** | Visual pitch × time planner |
| 7 | **01H** | Manual editing + DnD |
| 8 | **01I** | Approval + publication + sharing |

Labels 01E–01I remain for optimiser→publication; **insert 01J/01K (or equivalent) before 01E** for full smart generator scope. Do not treat 01C single-RR as the only product format.

## Future planner UX (01G+)

Feasibility assistant, generate smart schedule, visual planner, DnD, locks, regenerate unlocked, versioned drafts.

## Future sharing (TEILEN)

First-class sharing for published schedules:

- **Per E-Mail senden** — external clubs without SCE account
- **PDF herunterladen** — branded SCE artifact (not browser print only)
- **Link kopieren** — public/live schedule
- **Drucken**

Expected PDF / public content: tournament identity, venue, participants, schedule by pitch/time, QR to live view.

## 01F foundation requirements (R3)

Stable participant ids, multi-team participation, external clubs, organiser separation, dressing-room allocations, no Match HOME/AWAY on participants.

## Participant limit requalification

Before smart generator goes user-facing: requalify/remove arbitrary 16-participant MVP guard based on measured engine performance (**PARTICIPANT_LIMIT_REQUALIFICATION_RECORDED = YES**).
