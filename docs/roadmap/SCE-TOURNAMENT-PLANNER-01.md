# SCE-TOURNAMENT-PLANNER-01 — Smart Tournament Scheduling

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01` |
| **Status** | **IN PROGRESS — 01D feasibility engine; 01C CLOSED / MERGED (PR #855)** |
| **Predecessor** | [`SCE-ACTIVITY-CREATE-01F`](./SCE-ACTIVITY-CREATE-01F.md) — Tournament Adoption |
| **01A (architecture)** | [`SCE-TOURNAMENT-PLANNER-01A`](./SCE-TOURNAMENT-PLANNER-01A.md) — **CLOSED / PO APPROVED / MERGED** |
| **01B (persistence)** | [`SCE-TOURNAMENT-PLANNER-01B`](./SCE-TOURNAMENT-PLANNER-01B.md) — fixture + schedule version foundation |
| **01C (round robin)** | [`SCE-TOURNAMENT-PLANNER-01C`](./SCE-TOURNAMENT-PLANNER-01C.md) — **CLOSED / MERGED** — deterministic fixture generation (WHO) |
| **01D (feasibility)** | [`SCE-TOURNAMENT-PLANNER-01D`](./SCE-TOURNAMENT-PLANNER-01D.md) — feasibility + hard-constraint validator (CAN IT FIT?) |
| **ADR** | [`ADR-014`](./05-architecture-decisions.md#adr-014--tournament-fixture-vs-schedule-separation-and-deterministic-scheduling-engine) |

## Architecture principle

> Fixture generation determines **WHO** plays whom.  
> Schedule optimisation determines **WHEN** and **WHERE**.

Future schedule generation must use deterministic constraint and optimisation logic — not LLM-invented fixtures.

## Product cardinality (canonical)

| Concept | Cardinality |
| --- | --- |
| **Tournament participants** | **2:n** |
| **Tournament Pitches** (logical scheduler grid) | **1:n** per tournament |
| **Tournament breaks / blocked periods** | **0:n** per tournament |

**Tournament Pitch ≠ FacilityResource.** Physical SCE resources (e.g. Kunstrasen 2) are allocated via `TournamentResourceAllocation`; the scheduler uses tournament-owned logical pitches (e.g. Feld 1…8). MVP engine guards (e.g. 16 participants) are **implementation safety limits**, not product maximums.

## Hard constraints (future)

- A participant cannot play two fixtures simultaneously
- A logical tournament pitch cannot host simultaneous fixtures
- Tournament window + tournament-owned breaks
- Match duration and changeover time
- Configurable minimum rest between matches for a team
- Competition-stage dependencies (groups → placement → knockout)
- Physical facility availability remains upstream of the scheduler grid

## Optimisation targets (future)

- Rest fairness across participants
- Avoid consecutive matches for the same team where possible
- Minimise excessive idle time
- Pitch distribution and pitch switching fairness
- First/last slot fairness
- Compact overall tournament duration
- Soft penalties for manual preference violations

## Product placement (accepted — engine/UI roadmap)

**`SEPARATE_TOP_LEVEL_TOURNAMENT_SCHEDULING_MODULE = NO`**

Scheduling UX lives inside the Tournament domain only:

1. **Tournament Creator (`SceActivityComposer`)** — progressive adoption of scheduling rules at creation time (`TOURNAMENT_CREATOR_ADOPTION_REQUIRED` assessed per package).
2. **Tournament context → Planung** — canonical workspace for fixture overview, feasibility, optimiser output, pitch × time planner, locks/regeneration, manual edits, conflicts, and publication (`TOURNAMENT_PLANUNG_ADOPTION_REQUIRED` assessed per package).

Do not introduce parallel top-level “Smart Tournament Scheduling” navigation.

## Sequenced packages (01D–01I)

| Package | Focus | Layer |
| --- | --- | --- |
| **01D** | Feasibility + hard-constraint validator | ENGINE / DOMAIN |
| **01E** | Automatic schedule optimiser | ENGINE / DOMAIN |
| **01F** | Locks + regeneration + schedule diff | ENGINE / DOMAIN foundation |
| **01G** | Visual pitch × time planner | First major **Planung** UI |
| **01H** | Manual editing + DnD + conflict UX | **Planung** |
| **01I** | Approval + publication + sharing | **Planung** / publication |

Creator integration is **not** deferred until after 01I; each package records creator vs Planung adoption flags.

## Future planner UX (01G+ — under Planung)

- Feasibility assistant before generation
- Generate smart schedule
- Visual pitch/time planner
- Drag/drop adjustments with validation
- Fixture locks and regenerate-unlocked-remainder
- Versioned schedule drafts and publication

## Future sharing contract (TEILEN)

First-class sharing for published schedules:

- **Per E-Mail senden** — external clubs without SCE account
- **PDF herunterladen** — branded SCE artifact (not browser print only)
- **Link kopieren** — public/live schedule
- **Drucken**

Expected PDF / public content:

- Tournament identity, date/time, venue, organiser
- Participants
- Schedule by pitch/time and optional by team
- QR code to public/live schedule

## 01F foundation requirements (R3)

Tournament creation must keep:

- Stable participant identity (`localId` in composer; persisted participant ids after commit) for future fixture references
- Multiple tenant teams as distinct participants (no single-own-team assumption)
- External clubs stable and distinguishable
- Organiser separate from participant and hosting semantics
- Resource/dressing-room assignment per participant — not single-team-only
- No Match HOME/AWAY semantics on tournament participants

Do **not** add fixture/schedule tables in 01F — only forward-compatible participant architecture.
