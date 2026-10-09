# SCE-COLLAB-01 — Contextual Club Collaboration Foundation

## Status

| Package | Status |
|---------|--------|
| **SCE-COLLAB-01A** (Training vertical slice) | **CLOSED** (PR [#810](https://github.com/Clipse078/sportclubevo-webapp/pull/810) → STAGE) |
| **SCE-COLLAB-01B** (Matches + Tournaments) | **IMPLEMENTED / HUMAN_UAT_FIX_IN_PROGRESS** |
| **SCE-COLLAB-01C** (Club Events / broader activity adapters) | FUTURE |
| **SCE-COLLAB-01D** (Multi-activity impact) | FUTURE |
| **TRAINER-SPIELERBOERSE-01** | FUTURE (consumer of contextual collaboration seams) |
| SCE-COLLAB-01 (full roadmap) | **IN_PROGRESS** (01A closed; 01B–01D remain) |

## Product principle

**CHANGE → IMPACT → AUDIENCE → INFORM**

Operational activity edits should surface who is affected and offer opt-in communication without leaving the save workflow.

## SCE-COLLAB-01A scope (Training only)

- Detect communication-worthy TrainingSession mutations (date, time, venue/resource, cancellation).
- Show a compact post-save impact surface on the Training session edit page.
- Prepare (not auto-send) a team **ANNOUNCEMENT** draft via existing PlatformCommunication / Zielgruppen infrastructure.
- Default audience: team operational audience (`defaultTeamOperationalAudience`).
- Deep/context reference: `CommunicationContextRef` `EVENT` with training session id (COMM-10 compatible `eventAnchor` in `orchestrationMetaJson`).

## Architecture reused

| Concern | Module |
|---------|--------|
| Team drafts | `createTeamCommunicationDraft` |
| Audience | `defaultTeamOperationalAudience`, COMM-03 recipient resolution |
| Authorization | `resolveTeamCommunicationAuthorization` (view/send separate from training edit) |
| Target validation | `resolveCommunicationTargetForTenant` (`TRAINING`) |
| Facility labels | `resolveCanonicalPitchPresentationLabel` |
| Effective allocations | `resolveTrainingOccurrenceAllocations` |

## Collaboration boundary (not TrainingForm → Announcement)

```
lib/collaboration/activity-change/*     canonical change set + policy
lib/collaboration/training/*            Training adapter (01A)
lib/collaboration/contextual-communication-service.ts
```

Domain adapters (01B):

| Domain | Module prefix | Mutation entry points |
|--------|---------------|------------------------|
| Training | `lib/collaboration/training/*` | `app/api/training-sessions/[sessionId]/*` |
| Match | `lib/collaboration/match/*` | `PATCH /api/matchcenter/[matchId]` (SCE-owned operational fields) |
| Tournament | `lib/collaboration/tournament/*` | `PATCH /api/tournaments/[tournamentId]`, tournament resource allocation routes |

Future: `CLUB_EVENT` via the same `ActivityChangeSet` seam.

### Match source ownership (01B)

| Field class | Ownership | Communicated in 01B |
|-------------|-----------|---------------------|
| `startAt` / `endAt` (manual events) | SCE mutation | Yes (local/manual path only) |
| `startAt` / status / `location` (SFV detail sync) | SFV provider | Detection supported in sync layer; **async surfacing deferred** (see below) |
| `pitchCode`, dressing-room codes | SCE allocation | Yes (resource/venue labels via facility integrity) |
| `resultLabel`, scores, sync metadata | Technical / sporting | No |
| Publication toggles | Operational | No |

### SFV asynchronous changes (01B boundary)

SFV match-detail sync (`lib/integrations/sfv/sync/detail-persistence.ts`) updates provider-managed fields without a human actor. **01B does not introduce durable pending-impact persistence** — therefore there is no Matchcenter post-sync “Änderung kommunizieren” surface for background SFV updates yet. Sync remains failure-isolated from collaboration. Human communication still requires explicit action with normal `communication.team.send` authorization when triggered from supported SCE mutation responses.

### Tournament audience (01B)

- Primary conversation anchor: `Event.teamId` when set, otherwise first canonical SCE `TournamentParticipant.teamId` (sorted).
- Multi-team tournaments: audience spec uses existing Zielgruppen `structural.teamIds` union (deduped via `resolveCommunicationRecipients`); no opponent/external club teams.

## Authorization

- **Activity edit**: existing training / allocation permissions on mutation routes.
- **Communicate**: `communication.team.send` required for prepare/publish APIs and `canCommunicate` flag on impact payload.
- Recipient preview uses COMM-03 preview mode; no extra enumeration endpoint.

## Failure boundaries

- Training mutations succeed even if collaboration impact assembly fails (impact omitted).
- Prepare/publish errors do not roll back training saves.

## Persistence

No new tables. Draft metadata stored on existing `PlatformCommunication.orchestrationMetaJson`.

Duplicate prepare: reuses existing DRAFT with same `activityId` + `changeFingerprint` for the same sender.

## Known limitations (01A)

- Training session edit page only (not Weekplanner sheet yet).
- Draft editing uses contextual inline composer (team chat timeline still hides unpublished drafts).
- Match/Tournament adapters implemented in 01B; Club Event remains future (01C).
- SFV async change surfacing remains future (requires durable impact inbox — not in 01B).

## Future: Trainer-/Spielerbörse

Contextual collaboration + targeted communication will consume the same change/audience seams; not implemented in 01A.

## Tests

- `lib/collaboration/__tests__/sce-collab-01a-activity-change.test.ts`
- `lib/collaboration/__tests__/sce-collab-01a-r1-verification.test.ts` (SCE-COLLAB-01A-R1 gate)
- `lib/collaboration/__tests__/sce-collab-01b-activity-change.test.ts`
- `lib/collaboration/__tests__/sce-collab-01b-r1-verification.test.ts` (SCE-COLLAB-01B-R1 gate)
- `lib/collaboration/match/__tests__/resolve-match-audience.test.ts`
- `lib/collaboration/tournament/__tests__/resolve-tournament-audience.test.ts`
- `lib/collaboration/shared/__tests__/operational-audience.test.ts`
- `app/api/collaboration/matches/[matchId]/__tests__/collaboration-communication-routes.test.ts`
- `app/api/collaboration/tournaments/[tournamentId]/__tests__/collaboration-communication-routes.test.ts`
- `app/api/collaboration/training-sessions/[sessionId]/__tests__/collaboration-communication-routes.test.ts`
- `components/admin/collaboration/__tests__/ContextualActivityChangeImpactSurface.test.tsx`
- Training mutation route regressions under `app/api/training-sessions/[sessionId]/**/__tests__/`

## SCE-COLLAB-01B-R1 verification evidence (2026-10-09)

| Gate | Result | Notes |
|------|--------|-------|
| Match / Tournament architecture | PASS | Event `MATCH` / `TOURNAMENT` snapshots; audience from `Event.teamId` + canonical mapping fallback (match) or `TournamentParticipant.teamId` union (tournament); opponent / external clubs excluded |
| Mutation paths | PASS (scoped) | Collaboration wired on `PATCH /api/matchcenter/[matchId]`, `PATCH /api/tournaments/[tournamentId]`, tournament resource allocation POST/DELETE; publication/result-only / SFV-protected schedule edits intentionally unwired |
| SFV boundary | PASS | `detail-persistence.ts` has no collaboration imports; identical payload → no `detectDetailChanges`; no auto draft/send from sync |
| Authorization matrix | PASS | Activity edit vs `communication.team.send` enforced in impact + prepare/publish service + API routes; effectiveUserId on match/tournament prepare APIs |
| Audience / enumeration security | PASS | Resolver unit tests (tenant-scoped teams only); recipient preview skipped when `canCommunicate` false |
| Idempotency / stale change set | PASS | Draft reuse by fingerprint; stale prepare rejected; domain-separated fingerprints |
| Failure isolation | PASS | `buildMatchMutationCollaborationImpact` / `buildTournamentMutationCollaborationImpact` return null on assembly errors |
| Facility integrity | PASS | `lib/facilities` regression batch: 168/168 |
| Activity presentation | PASS | `lib/sporting-activity-detail`: 16/16 |
| Collaboration automated gate | PASS | **96** tests (`lib/collaboration` + collaboration API routes + impact surface component); ≥80 01B/shared target met |
| 01A regression | PASS | All SCE-COLLAB-01A collaboration tests unchanged green in shared batch |
| Match / Tournament regression | PASS (scoped) | lib + API batches: failures confined to known P2 harness gaps (incomplete route prisma/policy mocks; DB-mutating allocation tests without `TEST_DATABASE_URL`) — reproduced on feature HEAD before R1 edits |
| Planner regression | KNOWN_BASELINE_P2 | `lib/planning`: 660 pass / 29 fail — pre-existing on branch, not introduced by R1 |
| Communication regression | KNOWN_BASELINE_P2 | `lib/communication`: 609 pass / 4 fail — same unrelated COMM debt as 01A-R1 |
| Impersonation / Zielgruppen | PASS | `trusted-session-state` + `lib/communication/platform/audience` in R1 batch: 139 pass |
| Lint (R1 files) | PASS | `./node_modules/.bin/eslint` on all R1-added/changed TS: 0 errors |
| Build | PASS | `NODE_OPTIONS=--max-old-space-size=8192 npm run build` green at R1 HEAD |
| Vercel preview | READY | PR #811 preview green at SHA `7b3174f8` (SCE-COLLAB-01B-R1) |

**Status after R1:** SCE-COLLAB-01B remains **IMPLEMENTED / HUMAN_UAT_PENDING** (not CLOSED).

## SCE-COLLAB-01B-R2 — cumulative unresolved change cycle (2026-10-09)

### Human UAT finding (UAT-04)

During Tournament editing, separate participant-facing mutations (e.g. start time via `PATCH /api/tournaments/[id]`, then pitch via resource allocation) **replaced** the pending impact with only the latest single-mutation delta. Required semantics: **one unresolved cycle** from first canonical baseline → latest canonical state → net typed `ActivityChangeSet` → one impact → one communication.

### Unresolved change cycle (active editing flow)

| Invariant | Behavior |
|-----------|----------|
| Baseline | Captured on first participant-facing mutation in the cycle (`collaborationCycleBaseline` returned from server) |
| Current | Latest canonical snapshot after each mutation |
| Net diff | Recalculated baseline → current (not an append-only edit log) |
| Multi-endpoint | Tournament/Match/Training mutations may participate in the same activity cycle when client sends stored baseline |
| Reversion | Fields returned to baseline values disappear from the pending change set |
| Zero net | Clears pending impact |
| Non-participant saves | Do not clear pending impact when client resends cycle baseline (publication-only, remarks-only, etc.) |
| Dismiss | Closes prompt without sending; saved activity unchanged; next cycle starts from post-dismiss canonical state |
| Send | Successful publish clears cycle; next change starts fresh baseline |
| Composer stale | If activity changes after prepare, composer closes with stale hint; user must prepare again (no silent obsolete publish) |
| Persistence | **Transient** client/page cycle only (`ActivityChangeCollaborationProvider` + optional baseline in mutation JSON). **No durable DB impact inbox** (SFV async deferred). |
| Hard reload | `HARD_RELOAD_RESETS_TRANSIENT_PENDING_CYCLE = YES` (acceptable for R2) |
| Navigation | Leaving activity page clears provider state (no cross-activity leakage) |

### Presentation (UAT-02/03 P2)

Match/Tournament resource-only changes use typed **`RESOURCE` / Spielfeld** deltas (`Nicht zugewiesen → …`) instead of repeating unchanged venue text in **`VENUE` / Ort**. Venue and resource may both appear when both meaningfully change.

### Modules (R2)

- `lib/collaboration/activity-change/cycle-baseline.ts` — serializable baseline + merge helpers
- `lib/collaboration/activity-change/collaboration-mutation-result.ts` — mutation response shape
- `lib/collaboration/client/use-collaboration-mutation.ts` — attach baseline + apply response
- Domain mutation builders accept optional `cycleBaseline` and return `{ impact, cycleBaseline }`

**Status after R2 implementation:** SCE-COLLAB-01B = **IMPLEMENTED / HUMAN_UAT_FIX_IN_PROGRESS** (not CLOSED). Resume Human UAT at **UAT-04R2**.

## SCE-COLLAB-01A-R1 verification evidence (2026-10-08)

| Gate | Result | Notes |
|------|--------|-------|
| Audience integration | PASS | `defaultTeamOperationalAudience` → `resolveCommunicationRecipients` PREVIEW; zero-recipient + preview-failure isolation covered in R1 tests |
| Authorization matrix | PASS | Activity ∩ comm send enforced in prepare/publish service + `COMMUNICATION_TEAM_SEND` API boundary; effectiveUserId path covered |
| Enumeration security | PASS | Recipient resolution skipped when `canCommunicate` false; prepare/publish 403 responses omit draft/recipient payloads |
| Prepare / publish | PASS | DRAFT-only prepare via `createTeamCommunicationDraft`; publish via `publishTeamCommunication` with re-auth |
| Duplicate semantics | PASS | Reuse by sender + `activityId` + `changeFingerprint`; distinct fingerprints across activities |
| Failure isolation | PASS | `buildTrainingMutationCollaborationImpact` swallows post-save assembly errors (training save unaffected) |
| Communication regression | PASS (scoped) | COMM-04 team comm, COMM-10/11, tenant isolation, audience capabilities: 192 tests in focused batch; 4 failures in unrelated full COMM suite classified as known baseline debt |
| Planner / training regression | PASS (scoped) | Training session lifecycle/reschedule + planning operational auth batch green; session-allocation harness emits 2 known P2 unhandled rejections (public cache notification mock) |
| Impersonation security | PASS | `trusted-session-state` + PEOPLE-ACCESS-IMPERSONATION governance tests in R1 batch |
| Build / lint (changed files) | PASS | `NODE_OPTIONS=--max-old-space-size=8192 npm run build` green; eslint on changed TS/TSX: 0 new errors |
| Vercel preview | READY | PR #810 preview deployed at SHA `17ad4bbaba240cd6f86d27a772105be1b4adadcf` (SCE-COLLAB-01A-R1) |

## SCE-COLLAB-01A Human UAT (2026-10-08)

**Result: PASS** — explicit user sign-off on preview (all scenarios below).

| ID | Scenario | Result |
|----|----------|--------|
| COLLAB_UAT_01 | Edit without participant-facing change → no unnecessary communication prompt | **PASS** |
| COLLAB_UAT_02 | Meaningful location change → correct old/new presentation and “Änderung kommunizieren” | **PASS** |
| COLLAB_UAT_03 | Prepared communication → correct contextual draft/audience; nothing sent automatically | **PASS** |
| COLLAB_UAT_04 | Multiple meaningful changes → consolidated summary | **PASS** |
| COLLAB_UAT_05 | Dismiss → Training remains saved; no communication sent | **PASS** |
| COLLAB_UAT_06 | Authorization boundary (no comm send) → accepted as part of sign-off; supported by R1 authorization/security matrix | **PASS** |

Evidence: user-provided explicit approval of COLLAB_UAT_01–06 (closure package SCE-COLLAB-01A-CLOSURE).

## Closure record

| Item | Value |
|------|-------|
| Package | SCE-COLLAB-01A |
| Status | **CLOSED** |
| Human UAT | **PASS** |
| R1 automated gate | **PASS** (see table above) |
| PR | #810 → `STAGE` |
| Scope delivered | Training contextual collaboration only |

**Not closed:** SCE-COLLAB-01 overall roadmap (01B Matches + Tournaments, 01C Club Events, 01D multi-activity impact, TRAINER-SPIELERBOERSE-01).
