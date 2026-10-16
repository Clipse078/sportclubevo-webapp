# SCE-TOURNAMENT-PLANNER-01A — Research, Domain Architecture & Scheduling Engine Contract

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-TOURNAMENT-PLANNER-01A` |
| **Programme** | [`SCE-TOURNAMENT-PLANNER-01`](./SCE-TOURNAMENT-PLANNER-01.md) |
| **Status** | **CLOSED — PO APPROVED / MERGED TO STAGE** |
| **Predecessor** | [`SCE-ACTIVITY-CREATE-01F`](./SCE-ACTIVITY-CREATE-01F.md) — Tournament Adoption (**CLOSED**) |
| **Branch** | `cursor/sce-tournament-planner-01a-architecture` |
| **STAGE baseline (known ancestor)** | `795560e86d8f7c26711560d3bb2368a6de03889d` |
| **ADR** | [`ADR-014`](./05-architecture-decisions.md#adr-014--tournament-fixture-vs-schedule-separation-and-deterministic-scheduling-engine) |
| **Next package** | **01B** — Persistence + Fixture Foundation (**NOT_STARTED**) |

## Preflight

| Check | Result |
| --- | --- |
| `LOCAL_STAGE_HEAD` (after FF) | `795560e86d8f7c26711560d3bb2368a6de03889d` |
| `ORIGIN_STAGE_HEAD` | `795560e86d8f7c26711560d3bb2368a6de03889d` |
| `KNOWN_BASELINE_ANCESTOR` | **YES** |
| STAGE delta beyond baseline | **4 commits** — navigation / IA test contract only (`lib/nav/*`, `SCE-NAV-IA-V2-01` matrix, `SCE-ACTIVITY-CREATE-01J` doc note). **Compatible** with this architecture slice. |
| Feature branch | `cursor/sce-tournament-planner-01a-architecture` |
| Product code in 01A | **Documentation + ADR only** |
| `SCHEMA_CHANGE` | **NO** |
| `NEW_MIGRATION` | **NO** |

---

## 1. Core principle

> **Fixture generation** determines **WHO** plays whom.  
> **Schedule optimisation** determines **WHEN** and **WHERE**.

The scheduling engine is **deterministic**, **testable**, **explainable**, and **constraint-driven**. **No LLM / model calls** inside the engine.

---

## 2. Existing Tournament domain audit

### 2.1 Canonical root and lifecycle

| Stage | Implementation |
| --- | --- |
| **CREATE** | `TournamentCreateForm` on `SceActivityComposer`; `create-tournament-from-composer.ts` → `orchestrateTournamentCreation`; legacy `POST /api/events`; composer drafts `TournamentComposerDraft` + `/api/tournament/composer/drafts\|commit` |
| **PERSIST** | `Event` (`type=TOURNAMENT`) + `TournamentParticipant` + `TournamentResourceAllocation` + `TournamentParticipantAllocation` |
| **LOAD** | `lib/tournaments/tournament-service.ts`, `queries.ts`, management/record workspaces |
| **DISPLAY** | `SceTournamentCard`, Tournament Center list/record, Wochenplaner tournament items, Programme Engine |
| **EDIT** | `/dashboard/tournamentcenter/[id]/edit`, participant/resource API routes |
| **PROGRAMME** | `lib/programme-engine/load-programme-sources.ts` → `listTournaments` + `resolveSceTournamentPresentation` |
| **CALENDAR** | Programme calendar + personal agenda markers (`TOURNAMENT` kind) |
| **PUBLICATION** | Event visibility flags (`websiteVisible`, `infoboardVisible`, `homepageVisible`, `wochenplanVisible`, `teamPageVisible`); governance `reviewStage`; `tournament-public-cache-notification` |

There is **no** separate top-level `Tournament` Prisma model — by design (TOURNAMENTCENTER-01 / 01B).

### 2.2 Explicit model report

| Concept | Canonical implementation |
| --- | --- |
| **TOURNAMENT_ROOT_MODEL** | `Event` where `type = TOURNAMENT` (`prisma/schema.prisma`) |
| **TOURNAMENT_PARTICIPANT_MODEL** | `TournamentParticipant` → `Team` \| `ExternalClub` (+ `displayName`) \| historical `ExternalTeam` \| `manualLabel` |
| **TOURNAMENT_FIXTURE_MODEL** | **NOT_IMPLEMENTED** — no persisted intra-tournament fixture / pairing rows; `competitionLabel` is free-text format hint only |
| **TOURNAMENT_RESOURCE_MODEL** | `TournamentResourceAllocation` (tournament-level pitch/hall) + `TournamentParticipantAllocation` (per-participant dressing room) → `FacilityResource` |
| **TOURNAMENT_PUBLICATION_MODEL** | `Event` publication booleans + activity governance (`reviewStage`, `SceActivityGovernanceRevision`, `activities.tournament.approve`) — **not** a dedicated schedule publication entity |
| **TOURNAMENT_PERMISSION_MODEL** | Reuses platform permissions: `EVENTS_*`, `activities.tournament.approve`, `tournaments.delete`, planning `wochenplan.manage`, publication flags; **no** tournament-schedule-specific permissions yet |
| **TOURNAMENT_PROGRAMME_BOUNDARY** | Programme loads **whole tournaments** as activities (`ProgrammeActivityKind.TOURNAMENT`); no fixture-level programme rows |
| **TOURNAMENT_CARD_BOUNDARY** | `SceTournamentCard` + canonical `SceTournamentPresentationModel` adapters — tournament **container** identity, not per-fixture cards |

### 2.3 Participants (CREATE-01F)

- **Own teams:** `teamId`, 0:n distinct rows per tournament (`@@unique([eventId, teamId])`).
- **External clubs:** `externalClubId` + optional `displayName` (Anzeigename); same club may appear multiple times.
- **Manual:** `manualLabel` when no canonical club/team yet.
- **Organiser:** `organizerExternalClubId` / `organizerName` on Event — separate from participants; **not** Match HOME/AWAY participant semantics.
- **HOME/AWAY:** `Event.homeAway` — hosting semantics for FCA facility obligation (`operational-state.ts`), not fixture sides.

### 2.4 Venue, resources, dressing rooms

- Tournament **window:** `Event.startAt` / `Event.endAt` (single operational interval today).
- **Pitches:** `TournamentResourceAllocation.facilityResourceId` (canonical); legacy `Event.pitchCode` not written for new tournaments.
- **Dressing rooms:** per-participant via `TournamentParticipantAllocation` — **operational**, not match-slot optimised in MVP scheduler.
- **Duration default:** tenant `FacilityPlanningDefaults.defaultTournamentDurationMinutes` (Zeitstandards) — referenced in create UX, not yet per-fixture.

### 2.5 Lobby / cards

- Composer lobby: `SceTournamentParticipantLobby`, `SceTournamentParticipantTile`, `SceTournamentResourceParticipantCrest`.
- Canonical list/detail: `SceTournamentCard` (HERO / STANDARD / COMPACT / MICRO densities).

### 2.6 APIs / actions

- `app/api/tournaments/[tournamentId]/*` — CRUD-ish surface for participants, resource allocations, dressing allocations, participation-request.
- Composer: `/api/tournament/composer/*`.
- Event creation still via `/api/events` for core Event row.

### 2.7 External / SFV

- Tournament domain is **tenant-managed**; SFV sync targets **league Match fixtures**, not tournament intra-fixtures.
- `fixtures.*` permissions refer to **Spielbetrieb / league fixture** publication — **not** tournament schedule entities.

---

## 3. Existing planning / resource infrastructure audit

### 3.1 Reusable primitives

| Category | Reusable primitives |
| --- | --- |
| **REUSABLE_RESOURCE_PRIMITIVES** | `FacilityResource` + `Facility`; `TournamentResourceAllocation`; `getActiveFacilityResources*`; `lib/facilities/availability-service.ts` (cross-domain occupancy); `resource-occupancy-window.ts`; `facilityResourcesShareConflictCapacity` / pitch capacity groups |
| **REUSABLE_TIME_PRIMITIVES** | `lib/events/tenant-local-datetime.ts` (`resolveTenantEventTimezone`); ISO instants on Event; tenant `timezone`; smart date/time normalization from activity create |
| **REUSABLE_CONFLICT_PRIMITIVES** | `lib/weekplanner/conflict-detection.ts` (`detectPairwiseWeekplannerConflicts`, occupancy windows); `lib/facilities/allocation-rules.ts#timeRangesOverlap`; planning-hub cross-domain tests (Training · Match · Tournament · Veranstaltung) |
| **REUSABLE_DND_PRIMITIVES** | Planning Hub / Kalender: `SchedulerDraftChange`, `evaluateManipulationConflicts`, `applyStandardPlanSchedulerDraft` (`lib/planning-hub/scheduler-*`); Wochenplaner resource grid geometry — **conceptual reuse** for future pitch×time planner, not tournament-fixture-specific yet |
| **REUSABLE_PERMISSION_PRIMITIVES** | `requirePermission` / `requireAnyPermission`; activity governance effective permissions; team-scoped planning authorization policy |

### 3.2 Locking / versioning today

- **Activity-level:** governance drafts (`TournamentComposerDraft`), `reviewStage`, `SceActivityGovernanceRevision`.
- **Planner-level:** scheduler **draft preview** (in-memory) before commit — **not** schedule version persistence.
- **No** fixture assignment locks in schema.

Tournament Planner must **not** duplicate facility truth; schedule assignments reference **`facilityResourceId`** and respect availability + occupancy engines.

---

## 4. Product domain separation (frozen)

| Concept | Responsibility |
| --- | --- |
| **TOURNAMENT** | Identity container (`Event` TOURNAMENT) |
| **PARTICIPANT** | Entrant identity (`TournamentParticipant`) |
| **FIXTURE** | Who plays whom (stable fixture id, round/stage metadata) |
| **SCHEDULE ASSIGNMENT** | When + where for one fixture (`startAt`, `endAt`, pitch resource) |
| **RESOURCE ALLOCATION** | Authoritative SCE reservation (may extend beyond match slot for dressing rooms) |
| **PUBLICATION** | Approved schedule version exposed to channels |

**Invariants:**

- Fixture **may exist** without schedule assignment.
- Schedule assignment **may change** without changing fixture identity (pairing / fixture id).
- **Do not** collapse into one generic Activity scheduling model.
- **Do not** add Generic Activity DB model or `/api/activity` scheduling endpoint.
- **Do not** duplicate `Facility` / `FacilityResource`.

---

## 5. Tournament format model

### 5.1 Current product support

- **No** encoded format enum in persistence.
- `competitionLabel` is display-only (e.g. "Junioren-Turnier", "Round Robin" free text).
- **No** automatic fixture generation or knockout tree.

### 5.2 Extensible internal architecture

Separate responsibilities:

| Layer | Role |
| --- | --- |
| **FORMAT** | Declares structure: participant count rules, stages, rounds, bye policy, progression graph |
| **FIXTURE_GENERATION** | Pure function: format + participants → ordered `FixtureDefinition[]` |
| **SCHEDULING** | Pure function: fixtures + resources + window + constraints → assignments |

Supported format **families** (implementation phased):

| Format | MVP engine package | Notes |
| --- | --- | --- |
| **ROUND_ROBIN** | **01C** | Single round first; double round via format flag later |
| **GROUP_STAGE** | **01C+** | Groups as parallel round-robin sub-formats |
| **KNOCKOUT** | **After 01C** | Bracket rounds; feeder from groups deferred |
| **GROUP_STAGE_PLUS_KNOCKOUT** | Deferred | Requires stage handoff + progression ids on fixtures |
| **PLACEMENT_MATCHES** | Deferred | Extra fixtures after main bracket |
| **CUSTOM_FIXTURES** | Deferred | Manual fixture list + validation only |

Format registry pattern (future code):

```typescript
type TournamentFormatId = "ROUND_ROBIN" | "GROUP_STAGE" | "KNOCKOUT" | /* ... */;

interface TournamentFormatDefinition {
  id: TournamentFormatId;
  generateFixtures(input: FixtureGenerationInput): FixtureDefinition[];
  estimateFixtureCount(input: FixtureGenerationInput): number;
}
```

---

## 6. Fixture generation contract

### 6.1 API shape (pure engine)

```typescript
function generateTournamentFixtures(input: FixtureGenerationInput): FixtureGenerationResult;

interface FixtureGenerationInput {
  format: TournamentFormatSpec;
  participants: FixtureParticipantRef[]; // stable ids from TournamentParticipant.id
  /** Deterministic ordering seed — default: sort by participant displayOrder then id */
  ordering?: FixtureOrderingPolicy;
}

interface FixtureDefinition {
  fixtureId: string; // stable across schedule regenerations once persisted
  stageId: string;
  roundIndex: number;
  slotIndexInRound: number;
  sideA: FixtureParticipantRef;
  sideB: FixtureParticipantRef;
  bye?: FixtureParticipantRef; // odd-count round-robin
  metadata?: Record<string, string | number | boolean>;
}

interface FixtureGenerationResult {
  status: "SUCCESS" | "INVALID_INPUT";
  fixtures: FixtureDefinition[];
  diagnostics: EngineDiagnostic[];
}
```

### 6.2 Identity rules

- **`fixtureId`** assigned at **first persistence** (01B) — schedule regeneration **must not** re-key fixtures.
- Regenerating **fixtures** (format change) is a **distinct user action** from regenerating **schedule**; may deprecate old fixture rows explicitly — never silent deletion (see H12).

### 6.3 Round-robin (deterministic)

- **Even n:** classic circle / rotation method (fix one participant, rotate others).
- **Odd n:** synthetic bye participant; one bye per round; bye does not consume pitch time in scheduling.
- **Ordering:** stable sort of input participants before rotation.
- **Single round** in MVP; **double round** = second leg with swapped home/away sides on **same fixture id** or leg index — decision in 01B (recommend `legIndex` on assignment, not duplicate fixture rows).

### 6.4 Deferred to later packages

- Knockout bracket seeding algorithms.
- Custom fixture import.
- SFV import of external fixtures.

**Implementation home (planned):** `lib/tournament-scheduling/fixtures/` pure module (no Prisma).

---

## 7. Scheduling engine contract

### 7.1 API shape (pure engine)

```typescript
function scheduleTournament(input: ScheduleTournamentInput): TournamentScheduleResult;

function regenerateTournamentSchedule(input: RegenerateScheduleInput): TournamentScheduleResult;

function analyseTournamentFeasibility(input: FeasibilityInput): FeasibilityReport;

function validateManualAssignmentMove(input: ValidateMoveInput): ValidationResult;
```

### 7.2 Input (conceptual)

- `tournamentRef` (id, timezone, operating window)
- `fixtures[]` with stable ids
- `participants[]` (rest profile, eligibility)
- `pitches[]` (`facilityResourceId`, availability overlays)
- `matchDurationMinutes`, `transitionMinutes`, `minRestMinutes`
- `lockedAssignments[]`
- `existingAssignments[]` (for stability / regeneration)
- `hardConstraints`, `softObjectiveProfile`
- `tenantTimeZone` (IANA)

External occupancy for H10 supplied as **read-only intervals** by application layer (`availability-service` aggregates) — not fetched inside engine.

### 7.3 Output

```typescript
type TournamentScheduleResult =
  | {
      status: "SUCCESS";
      assignments: ScheduleAssignment[];
      unscheduledFixtureIds: string[];
      metrics: ScheduleMetrics;
      fairness: FairnessMetrics;
      warnings: EngineDiagnostic[];
      explanations: EngineExplanation[];
      algorithm: AlgorithmTrace;
    }
  | {
      status: "INFEASIBLE";
      violations: ConstraintViolation[];
      diagnostics: EngineDiagnostic[];
      suggestions: FeasibilitySuggestion[];
      partialAssignments?: ScheduleAssignment[];
    };

interface ScheduleAssignment {
  fixtureId: string;
  pitchResourceId: string;
  startAt: string; // ISO UTC instant
  endAt: string;
  lockState: "NONE" | "FULL" | "TIME" | "PITCH";
}
```

Never return `null` or generic failure without structured violations.

---

## 8. Hard constraints

| Id | Constraint | MVP | Notes |
| --- | --- | --- | --- |
| **H1** | Each fixture scheduled **at most once** (or explicitly unscheduled) | **YES** | Unscheduled list in output |
| **H2** | No pitch overlap | **YES** | Uses occupancy window incl. transition |
| **H3** | No participant overlap | **YES** | Both sides of fixture |
| **H4** | Minimum rest between matches per participant | **YES** | Configurable minutes |
| **H5** | Inside tournament operating window | **YES** | Tenant-local civil bounds |
| **H6** | Eligible / available pitches only | **YES** | Active resource + input eligibility |
| **H7** | Locked assignments immutable on regeneration | **YES** | FULL lock MVP; TIME/PITCH schema-ready |
| **H8** | Fixture identity / pairing intact | **YES** | Scheduler never swaps opponents |
| **H9** | Match duration fits slot | **YES** | Slot = duration + transition policy |
| **H10** | No conflict with authoritative SCE allocations | **YES** | Injected external intervals |
| **H11** | Tenant timezone / civil time | **YES** | Engine uses instants; UI converts |
| **H12** | No silent fixture drop for feasibility | **YES** | INFEASIBLE or explicit unscheduled |

**Deferred hard constraints:** stage dependency (group → KO), dressing-room simultaneous capacity, multi-day windows with per-day sub-windows.

**Rule:** HARD constraints **never** violated to improve soft scores.

---

## 9. Soft constraints and fairness

Measurable metrics (computed on every SUCCESS):

| Metric | Description |
| --- | --- |
| `minRestMinutesByParticipant` | Per participant |
| `averageRestMinutes` | Tournament-wide |
| `restVariance` | Variance of rest gaps |
| `maxIdleGapMinutes` | Longest wait mid-tournament |
| `pitchDistribution` | Count per participant per pitch |
| `pitchSwitchCount` | Changes of pitch between consecutive matches |
| `firstSlotCount` / `lastSlotCount` | Per participant |
| `assignmentMovementCount` | vs previous schedule (regeneration) |
| `tournamentSpanMinutes` | Last end − first start |

Soft objectives (hierarchy — lexicographic recommended for determinism):

1. **S10** Feasibility / H satisfied (gate)
2. **S7** Minimise `tournamentSpanMinutes` (compact) within ties
3. **S1** Minimise `restVariance` and maximise `minRestMinutesByParticipant` minimum
4. **S2** Penalise back-to-back (rest == transition only)
5. **S5** Balance first/last slot counts
6. **S3** Balance pitch usage
7. **S6** Minimise pitch switches
8. **S4** Minimise excessive idle (cap outliers)
9. **S8** Minimise `assignmentMovementCount` on regeneration

Weighted scoring alternative: only if lexicographic ties remain ambiguous — use **fixed integer weights** documented in code; no randomness.

**Tie-breaking:** sort candidate slots by `(startAt, pitchResourceId)`; sort fixtures by `(roundIndex, slotIndexInRound, fixtureId)`.

---

## 10. Feasibility model

```typescript
function analyseTournamentFeasibility(input: FeasibilityInput): FeasibilityReport;

type FeasibilityVerdict = "FEASIBLE" | "TIGHT" | "INFEASIBLE";

interface FeasibilityReport {
  verdict: FeasibilityVerdict;
  requiredFixtureCount: number;
  requiredMatchMinutes: number; // incl. transitions
  availablePitchMinutes: number;
  minTheoreticalDurationMinutes: number;
  bottlenecks: ("PITCH" | "REST" | "WINDOW" | "PARTICIPANT")[];
  diagnostics: EngineDiagnostic[];
  suggestions: FeasibilitySuggestion[]; // explanatory only
}
```

Example diagnostic codes (structured, localizable outside engine):

- `CAPACITY.PITCH_MINUTES_SHORT`
- `CAPACITY.WINDOW_TOO_SHORT`
- `REST.CANNOT_SATISFY_MIN_REST`
- `LOCKS.CONFLICTING`

---

## 11. Locking and regeneration

### 11.1 Lock types

| Lock | MVP | Semantics |
| --- | --- | --- |
| **FULL_ASSIGNMENT_LOCK** | **YES** | Fixed pitch + start (and derived end) |
| **TIME_LOCK** | Schema-ready | Fixed start; pitch optimisable |
| **PITCH_LOCK** | Schema-ready | Fixed pitch; time optimisable |

### 11.2 Regeneration

`regenerateTournamentSchedule` inputs: existing assignments, locks, optional config deltas.

Output includes **schedule diff** per fixture:

| Diff | Meaning |
| --- | --- |
| `UNCHANGED` | Same pitch + start |
| `MOVED_TIME` | Pitch same |
| `MOVED_PITCH` | Time same |
| `MOVED_TIME_AND_PITCH` | Both changed |
| `NEW` | Previously unscheduled |
| `REMOVED` | Was scheduled, now unscheduled (only if unlock + infeasible — never silent) |

Optimiser **prefers** leaving unlocked assignments stable (S8).

Audit: `lockedByUserId`, `lockedAt` on assignment row (01F persistence).

---

## 12. Versioning and persistence proposal (future — not 01A)

Map to existing schema first — **minimal additive model**:

| Proposed model | Why |
| --- | --- |
| **`TournamentFixture`** | Stable WHO (`eventId`, `sideAParticipantId`, `sideBParticipantId`, stage/round indexes) |
| **`TournamentScheduleVersion`** | Draft vs approved; `status: WORKING \| APPROVED \| SUPERSEDED`; pointer from Event optional |
| **`TournamentFixtureAssignment`** | Belongs to version; `fixtureId`, `facilityResourceId`, `startAt`, `endAt`, lock fields |
| **`TournamentFormatConfig`** | JSON or normalized columns on Event or 1:1 extension — format id + parameters |

**Not needed:** duplicate `FacilityResource`; generic Activity; separate publication table initially — **`approvedVersionId`** on Event + existing visibility flags; publication consumes approved version snapshot.

**Indexes:** `@@unique([versionId, fixtureId])`; `@@index([eventId, status])`; pitch overlap queries by `[facilityResourceId, startAt]`.

**Lifecycle:** Working draft edits → approve creates immutable approved version → publish uses approved → new edit forks new working version from approved.

---

## 13. Manual planning contract (future UI)

Grid: **time ↓**, **pitches →** (align with Planning Hub Kalender unless UX research prefers transpose).

Actions: drag fixture, change pitch, keyboard move, lock/unlock, inspect conflict, regenerate unlocked.

**Before persist:** run `validateManualAssignmentMove` (hard constraints). UI shows blocking conflicts; **no silent invalid persist**.

Reuse: scheduler draft + conflict preview from planning-hub; tournament-specific fixture tray and lock chrome.

---

## 14. Visual planner composition (architecture only)

Header, feasibility summary, unscheduled tray, pitch columns, time axis, fixture cards (lock/conflict/fairness badges), regenerate, version selector, publish/share — all **SCE Design System v1.0**.

---

## 15. Fixture card semantics

**Do not** embed full `SceMatchCard` in every cell.

Recommended: new **`SceTournamentFixtureCard`** composition (MICRO/COMPACT) reusing:

- `ClubCrest` / participant identity primitives from tournament lobby
- VS band pattern from `SceMatchCard` `programme-fixture` / MICRO density
- Canonical match **identity** fields only (names, crests, kickoff, pitch, lock, conflict)

One activity card family; purpose-built tournament-fixture density.

---

## 16. Dressing rooms

**Recommendation:** **Exclude** dressing rooms from pitch/time optimiser MVP.

- Match scheduler → pitches + times.
- Tournament operations → existing `TournamentParticipantAllocation` + future optional post-schedule assistant.

Evidence: Wochenplaner already models tournament dressing per participant separately from pitch occupancy.

---

## 17. Permissions (future)

| Capability | Proposed mapping (MVP) |
| --- | --- |
| View schedule | `EVENTS_VIEW` + tournament access |
| Generate / edit schedule | `EVENTS_MANAGE` or new `tournaments.schedule.manage` if PO wants separation |
| Lock / unlock | Same as edit |
| Approve / publish schedule | `activities.tournament.approve` + existing publication permissions |

Recommend **defer** new permission until PO confirms schedule editing should differ from tournament edit — document hook in 01B.

---

## 18. Publication architecture

Single **approved schedule version** consumed by:

- Internal Tournament Center / Planner
- Programme (fixture-expanded view — future)
- Public website / live link / PDF / QR (01I)

No per-channel duplicated schedule tables — renderers map version → channel DTO.

---

## 19. Results / live tournament (future compatibility)

`TournamentFixture.id` durable for:

- Score / result status
- Standings / group tables
- Knockout progression (`feedsFixtureId` optional metadata)

Keep `stageId` + `roundIndex` on fixture for bracket UI.

---

## 20. Algorithm recommendation (MVP)

**Strategy:** deterministic **greedy earliest-feasible** placement + **deterministic local improvement** (single-pass slot swaps / rest repair) + full **hard validator**.

| Approach | Fit |
| --- | --- |
| Greedy earliest-feasible | **MVP** — explainable, fast for ≤12 teams |
| Greedy + local improvement | **MVP** — fairness without CP-SAT |
| Backtracking / CP | Defer unless infeasibility rate high |
| Weighted random | **Rejected** |

Pipeline:

1. Order fixtures deterministically.
2. Assign each to lexicographically first feasible slot.
3. Local improvement passes (bounded iterations, deterministic order).
4. Validate all hard constraints.
5. Compute metrics / diagnostics.

Typical youth sizes (4–12 teams, 1–4 pitches) fit **browser or server** TypeScript; target **<500ms** for MVP limits.

**No heavy optimisation dependency in 01A/01E.**

---

## 21. Engine purity

| Layer | Allowed |
| --- | --- |
| **Pure engine** (`lib/tournament-scheduling/**`) | Input JSON → output JSON; deterministic; no I/O |
| **Application service** | Load Prisma, permissions, availability intervals, call engine, persist |
| **Persistence** | Prisma mutations, version rows |
| **Authorization** | Session / permission gates |
| **UI** | React planner |

Forbidden inside engine: Prisma, React, fetch, permissions, LLM, locale strings.

Diagnostics: **codes** + structured params; localization in presentation layer.

---

## 22. Test strategy (future implementation matrix)

Coverage targets listed in programme brief — property tests:

- At most one assignment per fixture
- No participant / pitch overlap
- All assignments in window
- Locks preserved
- Same input → same output (snapshot hash)
- Regeneration diff correctness

Use **in-memory** inputs only — no persistent test data.

---

## 23. Performance boundaries (MVP recommendation)

| Limit | Value | Rationale |
| --- | --- | --- |
| Max participants | **16** | Youth/amateur typical; O(n²) fixtures |
| Max fixtures | **120** | 16 teams RR = 120 matches single round |
| Max pitches | **8** | Facility realism |
| Max candidate slots | **500** | Window / duration derived; prevents UI hang |

Warn beyond limits; reject extreme configs in UI.

---

## 24. API / application boundaries

| Operation | Layer |
| --- | --- |
| `generateTournamentFixtures` | Pure engine |
| `analyseTournamentFeasibility` | Pure engine |
| `scheduleTournament` / `regenerateTournamentSchedule` | Pure engine |
| `validateManualAssignmentMove` | Pure engine |
| Load/save version, locks | Application + persistence |
| Permission checks | Authorization wrapper |
| Planner UI | React |

No generic `/api/activity` scheduler.

---

## 25. Concurrency model

Optimistic concurrency on **`TournamentScheduleVersion`**: client sends `expectedVersion` / `updatedAt`; server rejects stale writes with **`SCHEDULE.STALE_VERSION`** (future UX: merge or reload).

---

## 26. Proposed package breakdown (adjusted)

| Package | Scope |
| --- | --- |
| **01A** | Research + contracts + ADR (**this doc**) |
| **01B** | Persistence: `TournamentFixture`, version + assignment skeleton |
| **01C** | Deterministic fixture generation (round-robin MVP) |
| **01D** | Feasibility + hard constraint validator + diagnostics codes |
| **01E** | Automatic schedule optimiser (greedy + local improvement) |
| **01F** | Versioning, locks, regeneration, diff API |
| **01G** | Visual pitch/time planner (read-only + generate first) |
| **01H** | Manual editing + conflict UX (DnD) |
| **01I** | Approval, publication, sharing (PDF/QR/link) |
| **01J** | Responsive / a11y / operational polish |
| **01K** | Integrity, legacy migration, closure |

Split **01G/01H** to keep planner UI reviewable separately.

---

## 27. Non-goals confirmed (01A)

No planner UI, DnD, migrations, production schedules, PDF/QR, results/standings, knockout progression, LLM, Dashboard/Mein Programm/Navbar/Wochenplaner changes, tournament create redesign, activity card redesign, PROD touch.

---

## 28. Safety & compliance (01A)

| Check | Result |
| --- | --- |
| SCE_DESIGN_SYSTEM_COMPLIANCE | **PASS** (architecture preserves DS) |
| WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE | **PASS** |
| PARALLEL_CARD_FAMILY_INTRODUCED | **NO** |
| PARALLEL_NAV_PATTERN_INTRODUCED | **NO** |
| BINARY_CONTROL_COMPLIANCE | **PASS** |
| NEW_BINARY_CHECKBOXES | **0** |

---

## 29. Observability (engine trace)

`algorithmVersion`, `inputFingerprint` (hash, no PII), counts, iteration bounds, hard pass/fail, objective vector, duration ms — dev/support only.

---

*End of SCE-TOURNAMENT-PLANNER-01A*
