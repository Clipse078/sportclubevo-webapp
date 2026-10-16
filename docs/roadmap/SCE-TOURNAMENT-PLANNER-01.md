# SCE-TOURNAMENT-PLANNER-01 — Smart Tournament Scheduling

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01` |
| **Status** | **IN PROGRESS — 01A ready for PO review** |
| **Predecessor** | [`SCE-ACTIVITY-CREATE-01F`](./SCE-ACTIVITY-CREATE-01F.md) — Tournament Adoption |
| **01A (architecture)** | [`SCE-TOURNAMENT-PLANNER-01A`](./SCE-TOURNAMENT-PLANNER-01A.md) — **ARCHITECTURE_READY_FOR_PO_REVIEW** |
| **ADR** | [`ADR-014`](./05-architecture-decisions.md#adr-014--tournament-fixture-vs-schedule-separation-and-deterministic-scheduling-engine) |

## Architecture principle

> Fixture generation determines **WHO** plays whom.  
> Schedule optimisation determines **WHEN** and **WHERE**.

Future schedule generation must use deterministic constraint and optimisation logic — not LLM-invented fixtures.

## Hard constraints (future)

- A participant cannot play two fixtures simultaneously
- A pitch/hall cannot host simultaneous fixtures
- Resource availability windows
- Tournament time window (start/end)
- Match duration and changeover time
- Configurable minimum rest between matches for a team
- Competition-stage dependencies (groups → placement → knockout)

## Optimisation targets (future)

- Rest fairness across participants
- Avoid consecutive matches for the same team where possible
- Minimise excessive idle time
- Pitch distribution and pitch switching fairness
- First/last slot fairness
- Compact overall tournament duration
- Soft penalties for manual preference violations

## Future planner UX (not in 01F)

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
