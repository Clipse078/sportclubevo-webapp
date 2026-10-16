# SCE-TOURNAMENT-PLANNER-01 — Smart Tournament Generator + Scheduler

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01` |
| **Status** | **IN PROGRESS — 01E2 Smart Mix (current); 01E1 CLOSED / MERGED (PR #859); 01D CLOSED / MERGED (PR #857); 01C CLOSED / MERGED (PR #855)** |
| **Predecessor** | [`SCE-ACTIVITY-CREATE-01F`](./SCE-ACTIVITY-CREATE-01F.md) — Tournament Adoption |
| **01A (architecture)** | [`SCE-TOURNAMENT-PLANNER-01A`](./SCE-TOURNAMENT-PLANNER-01A.md) — **CLOSED / PO APPROVED / MERGED** |
| **01B (persistence)** | [`SCE-TOURNAMENT-PLANNER-01B`](./SCE-TOURNAMENT-PLANNER-01B.md) — fixture + schedule version foundation |
| **01C (round robin MVP)** | [`SCE-TOURNAMENT-PLANNER-01C`](./SCE-TOURNAMENT-PLANNER-01C.md) — **CLOSED / MERGED** — deterministic single round-robin (WHO, MVP) |
| **01D (feasibility)** | [`SCE-TOURNAMENT-PLANNER-01D`](./SCE-TOURNAMENT-PLANNER-01D.md) — **CLOSED / MERGED** — feasibility + hard-constraint validator (CAN IT FIT?) + **01D-R2 smart generator alignment** |
| **01E1 (generator foundation + repeated RR)** | [`SCE-TOURNAMENT-PLANNER-01E1`](./SCE-TOURNAMENT-PLANNER-01E1.md) — **CLOSED / MERGED** — Smart Generator foundation, tenant-organised guard, repeated round robin |
| **01E2 (Smart Mix)** | [`SCE-TOURNAMENT-PLANNER-01E2`](./SCE-TOURNAMENT-PLANNER-01E2.md) — **CURRENT** — deterministic Smart Mix (`targetMatchesPerParticipant`) |
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
> Schedule optimisation (01F) determines **WHEN** and **WHICH logical pitch**.

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
| **Optimised schedule** | Assignments on logical pitches (01F+) |
| **Manual adjustments / locks** | 01G+ |
| **Publication** | 01K |

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
| **SMART_MIX** | Balanced opponent mix from `targetMatchesPerParticipant` — **implemented in 01E2** |

**CURRENT_ROUND_ROBIN_MEETINGS_PER_OPPONENT = 1** (default when omitted). **PRODUCT = 1:n** — **implemented in 01E1**. **ROUND_ROBIN_EXTENSION_REQUIRED = NO** (01E1 delivered).

## Tournament Planner ownership (01E1)

**TOURNAMENT_PLANNER_SCOPE = TENANT_ORGANISED_TOURNAMENTS_ONLY**

Eligibility resolver: **`canTenantPlanTournament`** — authoritative field **`Event.homeAway`** (`HOME` = tenant organises, `AWAY` = external). Not physical venue. Away tournaments remain valid for tenant participation workflows; fixture generation is hard-rejected with **`TOURNAMENT_PLANNER_NOT_OWNED_BY_TENANT`**.

Smart Mix decides **WHO** (01E+); 01D decides **CAN IT FIT**; 01F decides **WHEN + PITCH**.

## Participant identity (01D-R2)

`TournamentParticipant` ≠ SCE `Team`. Same canonical `teamId` may appear on **multiple** rows with distinct tournament `displayName` values (`SAME_SOURCE_TEAM_MULTIPLE_PARTICIPANTS = YES`). Manual participants (`manualLabel`) and external clubs remain supported.

## Home / away

**HOME_AWAY_RELEVANT = ON/OFF** (future generation setting). Default for neutral youth tournaments: **OFF**. Fixture `sideA`/`sideB` stay neutral unless explicitly enabled — do not infer from side labels alone.

## Qualification / knockout (future)

**FUTURE_KNOCKOUT_QUALIFICATION_MODEL_DEFINED = YES** — fixture sides may later reference `QUALIFICATION_REFERENCE` (group position, winner/loser of fixture) without nullable participant ids without integrity design. Group+KO requires canonical **ranking rules** output before qualification resolution.

## Generation pipeline (binding)

`TournamentParticipants → CompetitionStructure → TournamentPhases → 01E SmartGenerator → TournamentFixtures → 01D Feasibility → 01F ScheduleOptimiser → TournamentFixtureAssignments → ManualAdjustments/Locks → PartialRegeneration → Publication`

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

## Recommended package sequence (01D-R3 — dependency-correct)

**`ROADMAP_RESEQUENCING_RECOMMENDED = YES`** (supersedes the R2 table that listed future 01J/01K *before* delivered 01D)

**Foundation and delivered packages are not renumbered.** Package numbers communicate dependency order from the **current** codebase state (01A–01D implemented). The **logical pipeline** (participants → structure → fixtures → feasibility → optimiser → …) is binding; **delivery order** may close generic feasibility (01D) before every future generator exists, because 01D is generator-agnostic.

| Order | Package | Status / focus |
| --- | --- | --- |
| 1 | **01A** | Architecture — **CLOSED** |
| 2 | **01B** | Persistence + fixture / schedule-version foundation — **CLOSED** |
| 3 | **01C** | Deterministic single round-robin generator (WHO, MVP) — **CLOSED / MERGED** |
| 4 | **01D** | Feasibility + hard constraints (CAN IT FIT?) + TournamentPitch/break model — **CLOSED / MERGED** |
| 5 | **01E1** | Smart generator foundation + repeated round robin — **CLOSED / MERGED** (PR **#859**) |
| 5b | **01E2** | Smart Mix generator |
| 5c | **01E3** | Groups + knockout |
| 6 | **01F** | Automatic schedule optimiser (WHEN + logical pitch; generator-agnostic) |
| 7 | **01G** | Locks + partial regeneration |
| 8 | **01H** | Tournament Planung workspace / visual pitch × time planner |
| 9 | **01I** | Manual adjustment / DnD / conflict validation |
| 10 | **01J** | Results + rankings + qualification progression |
| 11 | **01K** | Publication + sharing |
| 12 | **01L** | Responsive / accessibility / polish |
| 13 | **01M** | Integrity / performance / technical-limit requalification / closure |

If **01E Smart Generator** is too large for one package, split without renumbering delivered work, e.g. **01E1** generation foundation + repeated RR, **01E2** Smart Mix, **01E3** groups + knockout — or equivalent repository-compliant sub-keys.

**01D can close before 01E** when feasibility consumes any valid concrete `TournamentFixture` set (no round-robin provenance), uses `TournamentPitch` + breaks, and documents extension for unresolved qualification fixtures.

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
