# SCE-COLLAB-01 — Contextual Club Collaboration Foundation

## Status

| Package | Status |
|---------|--------|
| **SCE-COLLAB-01A** (Training vertical slice) | **CLOSED** (PR [#810](https://github.com/Clipse078/sportclubevo-webapp/pull/810) → STAGE) |
| **SCE-COLLAB-01B** (Matches + Tournaments) | **CLOSED** (PR [#811](https://github.com/Clipse078/sportclubevo-webapp/pull/811) → STAGE; R7 closure 2026-10-09) |
| **SCE-PEOPLE-TEAM-ONBOARDING-01** (operational roster → communication eligibility) | **FUTURE / PLANNED** |
| **SCE-COLLAB-01C** (Club Events / broader activity adapters) | **CLOSED** (PR [#812](https://github.com/Clipse078/sportclubevo-webapp/pull/812) → STAGE; merge `a03c0f9d5f03c767b1650028ef1e47eec6c8510a` 2026-10-09) |
| **SCE-COLLAB-01D** (Multi-activity impact) | **IMPLEMENTED / HUMAN_UAT_PENDING** (training series PUT slice; see `SCE-COLLAB-01D.md`) |
| **TRAINER-SPIELERBOERSE-01** | FUTURE (consumer of contextual collaboration seams) |
| SCE-COLLAB-01 (full roadmap) | **IN_PROGRESS** (01A + 01B + 01C closed; 01D Human UAT pending) |

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

| Club event (Veranstaltung) | `lib/collaboration/club-event/*` | `PATCH /api/events/[eventId]`, club event facility allocation routes |

`CLUB_EVENT` uses the same `ActivityChangeSet` seam (01C).

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
- Club Event adapter merged in 01C (Human UAT R5 PASS; STAGE `a03c0f9d5f03c767b1650028ef1e47eec6c8510a`).
- SFV async change surfacing remains future (requires durable impact inbox — not in 01B).

## Future: Trainer-/Spielerbörse

Contextual collaboration + targeted communication will consume the same change/audience seams; not implemented in 01A.

## Tests

- `lib/collaboration/__tests__/sce-collab-01a-activity-change.test.ts`
- `lib/collaboration/__tests__/sce-collab-01a-r1-verification.test.ts` (SCE-COLLAB-01A-R1 gate)
- `lib/collaboration/__tests__/sce-collab-01b-activity-change.test.ts`
- `lib/collaboration/__tests__/sce-collab-01b-r1-verification.test.ts` (SCE-COLLAB-01B-R1 gate)
- `lib/collaboration/__tests__/sce-collab-01b-r2-verification.test.ts` … `sce-collab-01b-r7-verification.test.ts` (R2–R7 gates)
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

## SCE-COLLAB-01B-R3 — real browser multi-mutation cycle fix (2026-10-09)

### Human UAT (UAT-04R2)

| Step | Result |
|------|--------|
| Resource first (`null → Kunstrasen 2`) | **PASS** (banner correct) |
| Time second (`10:00 → 10:15`) without dismiss | **FAIL** — banner showed time only; resource delta dropped |
| Composer after second mutation | **FAIL** — body contained time only |

**UAT-04R2 overall:** **FAIL** — cumulative unresolved cycle did not survive resource → time in the Vercel browser flow.

### Root cause (R3)

The server cumulative diff was correct whenever the client resent the **original** `collaborationCycleBaseline`. Human UAT proved the **time PATCH** often ran **without** that baseline, so the API diffed only the immediate pre-PATCH snapshot (`resource = Kunstrasen 2`, `time = 10:00`) against post-PATCH state → **time-only** impact.

Contributing client lifecycle issues (R3):

1. **Baseline read timing** — `attachCycleBaseline` read React state; the unresolved baseline must also be available synchronously from a ref updated in the same turn as `applyMutationCollaboration`.
2. **Baseline/impact desync guard** — when a mutation response includes `collaboration` but omits `collaborationCycleBaseline`, the client now **preserves** the existing cycle baseline instead of leaving impact without a sendable baseline.
3. **Provider lifetime** — `ActivityChangeCollaborationProvider` moved to **activity `[id]` layouts** (tournament / match / training session) so ordinary same-activity `router.refresh()` / RSC revalidation on the edit page does **not** remount the collaboration host that sits under the page component.

### Provider lifetime semantics (final)

| Boundary | Clears unresolved cycle? |
|----------|-------------------------|
| User dismiss | Yes — new baseline after dismiss |
| Communication successfully sent | Yes |
| Net diff returns to zero (reversion) | Yes |
| Navigate to different activity | Yes (provider unmount) |
| Hard browser reload | Yes (transient model; no DB persistence) |
| Same-activity resource save, tournament PATCH, publication-only save, `router.refresh()` | **No** |

### Architecture (unchanged intent, enforced in R3)

- **BASELINE** — canonical participant-facing state immediately before the **first** unresolved worthy mutation (server returns `collaborationCycleBaseline`; client retains until cycle ends).
- **CURRENT** — latest canonical snapshot after the most recent mutation.
- **IMPACT** — typed net diff baseline → current (`ActivityChangeSet`), never string concatenation of per-step banners.

**Status after R3 implementation:** SCE-COLLAB-01B = **IMPLEMENTED / HUMAN_UAT_FIX_IN_PROGRESS** (not CLOSED). Resume Human UAT at **UAT-04R3**.

## SCE-COLLAB-01B-R4 — composer crash after cumulative prepare (2026-10-09)

### Human UAT (UAT-04R3 partial)

| Step | Result |
|------|--------|
| Cumulative banner after resource + time (and further resource change) | **PASS** — one banner with multiple typed deltas (Human evidence: Zeit 10:00→10:15 + Spielfeld Kunstrasen 2→Hauptfeld) |
| UAT-04R3-B / UAT-04R3-C | **PASS** |
| UAT-04R3-E — click **Änderung kommunizieren** | **FAIL** — full-page Next.js error (“This page couldn’t load”) |

Zero-recipient preview text (“Für diese Zielgruppe konnten aktuell keine Empfänger ermittelt werden.”) was visible on the banner and is **not** the crash cause.

### Root cause (R4)

R3 moved `ActivityChangeCollaborationProvider` / impact surface to **activity `[id]` layouts**, **above** page-level `<ToastProvider>`. After prepare succeeded, `ContextualActivityCommunicationComposer` mounted and called `useToast()` **outside** any `ToastProvider`, throwing `useToast must be used inside <ToastProvider>`. That uncaught client error surfaced as a generic full-page failure.

Prepare/orchestration, cumulative `ActivityChangeSet`, fingerprint, and audience resolution were **not** the failing boundary.

### Fix (R4)

Wrap `EventActivityCollaborationHost` and `TrainingSessionCollaborationHost` with `<ToastProvider>` so the impact surface and inline composer always sit inside a toast context (same pattern as `dashboard/teams/register`).

Failure isolation unchanged: prepare errors remain inline on the impact surface; publish errors remain in the composer; tournament saves and cumulative cycle state are not rolled back.

### Tests

- `lib/collaboration/__tests__/sce-collab-01b-r4-verification.test.tsx`
- `lib/collaboration/__tests__/sce-collab-01b-r5-verification.test.ts`
- `components/admin/collaboration/__tests__/ContextualActivityCommunicationComposer.test.tsx` — cumulative tournament prepare body/fingerprint/idempotency + composer open/cancel with activity layout host.

**Status after R4 implementation:** SCE-COLLAB-01B = **IMPLEMENTED / HUMAN_UAT_IN_PROGRESS** (not CLOSED). Resume Human UAT at **UAT-04R4**.

## SCE-COLLAB-01B-R5 — recipient resolution diagnosis + zero-recipient UX (2026-10-09)

### Human UAT (R4 sign-off + R5 blocker)

| Step | Result |
|------|--------|
| R4 cumulative banner (TIME + RESOURCE) | **PASS** |
| R4 composer opens with both changes | **PASS** |
| R4 cancel preserves cycle | **PASS** |
| R4 composer crash (ToastProvider) | **FIXED** (R4) |
| UAT-05 send with zero eligible recipients | **BLOCKED** — dispatch guard correctly rejects; UI previously showed raw English `no eligible recipients for dispatch` |

### Tournament audience semantics (PlayMore Turnier)

| Stage | Behaviour |
|-------|-----------|
| Internal SCE teams | `Event.teamId` (when tenant-scoped) **union** distinct `TournamentParticipant.teamId` rows; external clubs remain `teamId: null` and are excluded |
| Canonical audience spec | `buildOperationalAudienceForTeamIds` → Zielgruppen `UNION` with one structural component `{ teamIds: […] }` (sorted dedupe) |
| Recipient resolution | COMM-03 `resolveCommunicationRecipients` PREVIEW (impact banner + prepare) and DISPATCH (publish via `publishTeamCommunication` + `preservePreparedAudience: true`) |
| Multi-team union | F2 ∪ F3 recipients; COMM-03 deduplicates persons across teams; no whole-tenant fallback |

### Eligible operational recipient (current SCE product)

Team operational audience = **active `TeamSeason` roster** for structural `teamIds`:

- active **player** squad members (`playerSquadMembers`) with active tenant `Person`
- active **trainer** team members (`trainerTeamMembers`) with active tenant `Person`

Downstream COMM-03 intersects with sender communication scope, channel/category eligibility (IN_APP / `TEAM_OPERATIONAL`), preferences, safeguarding/guardian substitution. Persons without a linked active delivery user are excluded at dispatch. **Parent/guardian-only delivery without a supported person→user path is not a separate audience shortcut in 01B.**

If F2/F3 have no roster persons satisfying the pipeline, **zero recipients is a data/eligibility boundary**, not authorization to weaken dispatch.

### R5 diagnosis (PlayMore zero recipients)

Code path review (no resolver bug identified for multi-team union):

1. `resolveTournamentAudienceContext` → canonical internal team ids + labels
2. `buildOperationalAudienceForTeamIds` → multi-team structural union
3. PREVIEW/DISPATCH via COMM-03 → `effectiveCount === 0`
4. Publish guard in `publishTeamCommunication` throws `no eligible recipients for dispatch` (unchanged)

**Zero stage:** post-resolution effective delivery targets (COMM-03 dispatch pipeline), not tournament adapter or missing union support.

### Zero-recipient UX (R5)

| Surface | Behaviour |
|---------|-----------|
| Impact banner | `Zielgruppe: {team labels}` + `Empfänger: {count}` (no emails/user ids) |
| Prepare API | Returns `audienceLabel`, `recipientCount`, `canDispatch` (draft still allowed) |
| Composer | German panel **Keine Empfänger verfügbar**; Send disabled when `canDispatch === false` |
| Publish API | Maps zero-recipient guard to `errorCode: NO_ELIGIBLE_RECIPIENTS` + localized German message |

### Publish revalidation

Prepare-time preview does **not** bypass dispatch-time resolution. Publish re-runs COMM-03 DISPATCH; race to zero recipients returns localized error, leaves DRAFT + cumulative cycle intact.

### Successful send reset

Unchanged from R3/R4: successful publish → collaboration cycle reset; failed/zero send → cycle preserved.

### Tests

- `lib/collaboration/__tests__/sce-collab-01b-r5-verification.test.ts`
- `components/admin/collaboration/__tests__/ContextualActivityCommunicationComposer.test.tsx`
- Tournament route publish error mapping extended in `app/api/collaboration/tournaments/[tournamentId]/__tests__/collaboration-communication-routes.test.ts`

**Status after R5 implementation:** SCE-COLLAB-01B = **IMPLEMENTED / HUMAN_UAT_IN_PROGRESS** (not CLOSED). Resume Human UAT at **UAT-05**.

## SCE-COLLAB-01B-R6 — STAGE recipient eligibility diagnosis (2026-10-09)

### Human UAT (R5 sign-off)

| Gate | Result |
|------|--------|
| UAT-05A cumulative tournament communication flow | **PASS** |
| UAT-05B zero-recipient UX (German copy, Send disabled) | **PASS** |
| UAT-05C no raw dispatch error exposed | **PASS** |
| ZERO_RECIPIENT_PROTECTION | **PASS** |

Open question for R6: **why** STAGE F2/F3 operational audience resolves to zero dispatchable recipients (data vs resolver).

### STAGE read-only diagnosis (FC Allschwil)

| Check | Result |
|-------|--------|
| Database | STAGE Neon host matched `STAGE_DB_URL` fingerprint (not PROD) |
| Mutations | **None** (SELECT / read-only resolver PREVIEW only) |
| Dispatch | **None** |

**PlayMore Turnier (UAT-aligned multi-team audience):** event `cmsutv9kj000p04l4mac8jlvo` (2026-10-17) — internal participants **FC Allschwil Junioren F2** + **FC Allschwil Junioren F3**; external clubs excluded via `teamId: null` on other tournaments in tenant.

**Canonical audience:** `resolveTournamentAudienceContext` → `buildOperationalAudienceForTeamIds` → COMM-03 structural `teamIds` union (F2 ∪ F3).

### Funnel (aggregate, no PII)

| Stage | F2 | F3 | F2 ∪ F3 (Oct-17 PlayMore) |
|-------|----|----|---------------------------|
| Active `TeamSeason` (status ACTIVE) | 1 (Season 2026/2027) | 1 | 2 team-season rows |
| Active `playerSquadMembers` | 0 | 0 | 0 |
| Active `trainerTeamMembers` | 0 | 0 | 0 |
| `resolveTeamAudiencePersonIds` | 0 persons | 0 persons | 0 persons |
| COMM-03 PREVIEW `effectiveCount` | — | — | **0** |
| COMM-03 DISPATCH pipeline targets | — | — | **0** (matches PREVIEW) |

**First material drop-off:** structural team roster resolution — there are **no** active player or trainer memberships on any active `TeamSeason` for F2/F3 (in fact **zero** active squad/trainer rows tenant-wide on STAGE at diagnosis time).

**Not the limiting factor in this STAGE snapshot:** Person→User linkage, tenant membership, guardian substitution, or channel preference — the pipeline never receives candidate persons because the operational roster is empty. No canonical F2 trainer membership (including any real-world trainer expectation) exists in DB; Michael was **not** used as proof.

**Control group:** no other FC Allschwil team produced ≥1 COMM-03 operational recipient on STAGE — same empty roster pattern across teams (tenant has active persons/users, but none attached to team seasons).

### Classification

**EXPECTED_DATA_GAP** — STAGE lacks team-season roster onboarding (players/trainers) required for `defaultTeamOperationalAudience` / COMM-03 structural team resolution. **Not** a tournament multi-team union defect and **not** grounds to weaken dispatch or add fallback recipients.

### Operational prerequisites (future onboarding, not R6 scope)

| Path | Required links for IN_APP team operational delivery |
|------|-----------------------------------------------------|
| **Trainer** | Team → active `TeamSeason` → active `trainerTeamMember` → active tenant `Person` → `Person.userId` → active `User` (+ safeguarding/preferences as applicable) |
| **Player (adult / direct)** | Same via `playerSquadMember` → `Person` → `User` |
| **Player (minor / guardian)** | Above plus canonical `GuardianRelationship` → guardian `Person.userId` when tenant safeguarding requires guardian delivery |

F2/F3 on STAGE today: teams + active seasons exist; **membership → person → user** chain is missing for all roster slots.

### R6 outcome

- **No product code changes**
- **No STAGE data changes**
- Resume Human UAT zero-recipient path as **expected** until roster/users are onboarded; positive send UAT requires data onboarding package (future), not resolver weakening.

**Status after R6:** SCE-COLLAB-01B = **IMPLEMENTED / HUMAN_UAT_IN_PROGRESS** (zero-recipient path understood; positive send blocked on data).

## SCE-COLLAB-01B-R7 — final closure gate (2026-10-09)

### Human UAT final ledger (01B)

| ID | Scenario | Disposition | Notes |
|----|----------|-------------|-------|
| UAT-01 | Non-participant-facing edit → no communication prompt | **PASS** | Match/tournament publication-only / remarks-only saves do not clear or spuriously open impact (R2/R3) |
| UAT-02 | Supported kickoff/location/resource change → correct impact | **PASS** | Typed TIME / RESOURCE / VENUE presentation (R2); facility canonical labels |
| UAT-03 | Match communication prep → SCE team audience; opponent excluded; no auto-send | **PASS** | `Event.teamId` + mapping fallback; external clubs never in structural `teamIds` |
| UAT-04 | Tournament cumulative one-activity / one-message workflow | **PASS** | R2 baseline semantics; R3 client baseline ref + activity layouts; R4 composer; Human: resource+time+resource cumulative banner and composer body |
| UAT-05 (zero recipient) | F2∪F3 labels, Empfänger 0, German UX, Send disabled | **PASS** | R5/R6; dispatch guard unchanged |
| UAT-05 (positive real dispatch on STAGE) | Real IN_APP send to roster user | **NOT_TESTABLE_DATA_BLOCKED** | R6: zero active `playerSquadMember` / `trainerTeamMember` on STAGE F2/F3 (tenant-wide); **not FAIL** |
| UAT-06 | Dismiss/cancel — saved activity preserved; no auto-send; cycle boundary | **PASS** | Dismiss clears transient cycle; cancel composer preserves cycle (R4) |
| UAT-07 | Actor without `communication.team.send` cannot prepare/publish | **PASS** | Service + API routes; R1 matrix |
| UAT-08 | SFV-originated match changes | **NOT_APPLICABLE / DEFERRED** | Sync detection exists; **no durable pending-impact inbox** in 01B — no post-sync communicate surface |

**Human UAT blockers remaining:** none (positive STAGE send explicitly classified as data-blocked substitute).

### Positive dispatch — automated substitute (R7)

Controlled fixtures (no STAGE seeding) in `sce-collab-01b-r7-verification.test.ts` plus existing R1/R3/R5/COMM-03/COMM-04/COMM-18 batches cover: structural trainer/player candidates, F2∪F3 union, external exclusion, PREVIEW `effectiveCount > 0` → `canDispatch`, publish via `publishTeamCommunication` with `preservePreparedAudience`, zero-recipient and dispatch-time disappearance guards, authorization/tenant draft isolation, cumulative body through publish update, duplicate draft idempotency, MATCH/TOURNAMENT orchestration anchors.

### R7 technical gates

| Gate | Result |
|------|--------|
| Lint (all PR TS/TSX vs `origin/STAGE`) | **PASS** — 0 errors; 4 pre-existing warnings on touched files (`no-unused-vars`, `react-hooks/exhaustive-deps`) |
| Collaboration regression | **PASS** — 156 tests (`lib/collaboration`, collaboration API routes, admin collaboration UI) |
| 01A training regression | **PASS** — 01A suites + training API routes green after R2 response-shape test fixture alignment |
| COMM / audience / guardian (bounded) | **PASS** — COMM-03 + Zielgruppen + COMM-04 + COMM-18: 79/79; full `lib/communication`: 609 pass / **4 known baseline P2** (unchanged unrelated debt) |
| Facility + activity presentation | **PASS** — 184/184 |
| Build | **PASS** — `NODE_OPTIONS=--max-old-space-size=8192 npm run build` |
| Schema / migration / STAGE data / roles / permissions | **NO CHANGE** |
| PROD | **UNTOUCHED** |

**Status after R7:** **SCE-COLLAB-01B = CLOSED** (merge-ready pending PR review; positive STAGE send remains **NOT_TESTABLE_DATA_BLOCKED** until **SCE-PEOPLE-TEAM-ONBOARDING-01**).

### SCE-PEOPLE-TEAM-ONBOARDING-01 (future)

**Working title:** Operational Team Roster & Communication Eligibility.

**Purpose:** make real operational audiences usable end-to-end: Team → TeamSeason → player/trainer memberships → Person → User → guardian (when safeguarding requires) → tenant access → COMM-03 eligibility. Not in scope for COLLAB-01B closure.

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

**Not closed:** SCE-COLLAB-01 overall roadmap (01C Human UAT, 01D multi-activity impact, TRAINER-SPIELERBOERSE-01).

---

## SCE-COLLAB-01C — Club Events (2026-10-09)

### Architecture discovery

| Concern | Canonical source |
|---------|------------------|
| Activity identity | `Event` with `type = OTHER` (Veranstaltungen) |
| Scheduling | `startAt`, `endAt`, `allDay`, tenant timezone via `club-event-api-scheduling` |
| Venue | `Event.location` (free-text Ort) |
| Facility / resource | `EventFacilityAllocation` → `FacilityResource` (canonical presentation labels) |
| Status / cancellation | `Event.status` (`SCHEDULED`, `ARCHIVED`, …) |
| Audience | `EventParticipationAudienceEntry` (`PERSON`, `TEAM`, `ORG_UNIT`, `ROLE`) expanded via existing requirement resolvers |
| Communication context | `CommunicationContextRef` `{ kind: "EVENT", eventId }` + COMM-10 `eventAnchor` in orchestration meta |
| Presentation | `formatClubEventTimingLabel` + facility canonical pitch labels (same as Weekplanner / Veranstaltungen UI) |

Mutation paths wired for collaboration (failure-isolated):

- `PATCH /api/events/[eventId]` (participant-facing fields only in change policy)
- `POST/PATCH/DELETE` `/api/events/[eventId]/facility-allocations/*`

### Participant-facing change policy

| Field | Communicated |
|-------|--------------|
| DATE / START_TIME / END_TIME | Yes (timed events; all-day date moves via DATE) |
| VENUE (`location`) | Yes |
| RESOURCE (facility allocations) | Yes |
| STATUS (archive/cancel semantics) | Yes |
| TITLE / DESCRIPTION | No (not in 01C policy — internal/title comms out of scope) |
| Publication toggles, remarks, organizer, internal metadata | No |

### Audience semantics (01C)

- **Canonical source:** stored `EventParticipationAudienceEntry` rows (not invented).
- **CommunicationAudienceSpec:** UNION of structural/explicit components mirroring entry kinds; COMM-03 reused with EVENT context.
- **Send path:** team conversation when `Event.teamId` + `communication.team.send`; otherwise **club** conversation (`communication.club.send`) — separate from `events.manage`.
- **Zero recipients:** same 01B UX (composer may open; Send disabled; German copy).
- **DOMAIN-CONSUMERS-01:** not implemented — only event-scoped participation audience.

### Cumulative semantics

Same 01B baseline/current cycle (`collaborationCycleBaseline` on mutation requests); survives `router.refresh` via `[eventId]/layout.tsx` collaboration host.

### Broader adapter discovery

| Candidate | Decision |
|-----------|----------|
| MEETING / other TaskContext types | **DEFERRED** — no canonical activity presentation + participation audience parity |
| TRAINING / MATCH / TOURNAMENT | Already covered in 01A/01B |

### Automated verification

- `lib/collaboration/__tests__/sce-collab-01c-activity-change.test.ts`
- `app/api/collaboration/club-events/[eventId]/__tests__/collaboration-communication-routes.test.ts` (when present)

### Human UAT script (STAGE)

| ID | Scenario | Expected |
|----|----------|----------|
| UAT-01 | Edit remarks/publication only | No collaboration banner |
| UAT-02 | Change event time | Banner old → new |
| UAT-03 | Change Ort + resource before communicate | One banner, two lines |
| UAT-04 | Open composer | One editable message with both changes |
| UAT-05 | Audience label + recipient count | Canonical participation audience |
| UAT-06 | Cancel composer | Banner remains |
| UAT-07 | Send or zero-recipient UX | Explicit send resets cycle; zero → disabled Send (DATA_BLOCKED if no eligible users on STAGE) |

**01C status:** **CLOSED** (merged via PR #812; feature head `e790d274f520e6a79b6c7a7ac77923876034ee45`).

---

## SCE-COLLAB-01C-R1 — Human UAT defect (2026-10-09)

### Human UAT finding

| Check | Result |
|-------|--------|
| UAT-02 change detection (time delta visible) | **PASS** |
| UAT-02 persistent contextual collaboration impact surface on `/dashboard/veranstaltungen/[eventId]/edit` | **FAIL** — only dismissible “Veranstaltung aktualisiert” header + change line; missing Zielgruppe, Empfänger, **Änderung kommunizieren**, composer path |
| UAT-03 … UAT-07 | **BLOCKED_BY_UAT_DEFECT** |
| Save UX — primary **Speichern** only at bottom of long edit form | **FAIL** |

### ROOT_CAUSE

| Area | Finding |
|------|---------|
| **MUTATION_RESPONSE** | `PATCH /api/events/[eventId]` already returns `{ collaboration, collaborationCycleBaseline }` with worthy `changeSet` (change detection worked in UAT). |
| **CLIENT_HANDLING** | `VeranstaltungEditForm` calls `applyMutationCollaboration`; cycle baseline attachment is correct. |
| **CYCLE_PROVIDER** | `EventActivityCollaborationHost` in `[eventId]/layout.tsx` wraps the edit route; provider lifecycle is correct. |
| **IMPACT_SURFACE** | `ContextualActivityChangeImpactSurface` rendered, but **degraded mode**: `impact.audience === null` and `impact.canCommunicate === false`, so Zielgruppe / Empfänger / communicate action were suppressed. Caused by participation-audience spec building skipping entries without `referenceId`, returning `null` audience context even when labeled participation rows exist; preview/authorization never ran. Impact slot placement above the page shell also read as a toast-like banner. |
| **EDIT_ROUTE** | Edit page did not mount the impact slot inside the planning editor shell (layout-only slot). |
| **ROUTER_REFRESH** | Not the primary defect; client cycle state remains in the layout provider (01B invariant). |

### FIX

- Harden club-event audience resolution: human-readable labels from `EventParticipationAudienceEntry`, valid `CommunicationAudienceSpec` only from resolvable reference ids, failure-isolated preview with display-only audience fallback.
- Mount `EventActivityCollaborationImpactSlot` on the **edit page** below `PlanningEditorHeader`; suppress duplicate layout slot for club events (`suppressImpactSlot`).
- Remove nested `ToastProvider` on the edit page (use collaboration host provider — 01B R4 boundary).
- Add top **Speichern** in header actions (`form=` association + shared submit/loading via `VeranstaltungEditSubmitProvider`); duplicate-submit guard on the form handler.
- Impact surface UX: show **1 Änderung** / **n Änderungen** count header (canonical copy).

### AUTOMATED_REGRESSION

- `lib/collaboration/__tests__/sce-collab-01c-r1-verification.test.tsx` (R1-01 … R1-20 subset)
- Updated `sce-collab-01c-activity-change.test.ts`, `ContextualActivityChangeImpactSurface.test.tsx`
- Re-run 01A/01B collab regressions (`sce-collab-01b-r3`, `sce-collab-01b-r4`, …) on R1 branch

### HUMAN_UAT_RETEST_REQUIRED

| ID | Scenario |
|----|----------|
| UAT-R1-01 | Top **Speichern** visible without scrolling |
| UAT-R1-02 | Change time → save with top **Speichern** |
| UAT-R1-03 | Persistent impact surface: count, delta, **Zielgruppe**, **Empfänger**, **Änderung kommunizieren** |
| UAT-R1-04 | Second save accumulates changes (one surface, two lines) |
| UAT-R1-05 | Composer opens with cumulative body + subject |
| UAT-R1-06 | Human-readable Zielgruppe (no raw enums/ids) |
| UAT-R1-07 | Composer cancel → unresolved surface remains |

**01C status after R1:** IMPLEMENTED / **HUMAN_UAT_PENDING** (retest required; not CLOSED).

**COLLAB-01 status:** **IN_PROGRESS** (01A/01B CLOSED; 01C retest pending).

---

## SCE-COLLAB-01C-R2 — Human UAT R2 (2026-10-09)

### Human UAT R1 result (deployed feature SHA)

| Check | Result |
|-------|--------|
| Top **Änderungen speichern** visible + works | **PASS** |
| Change detection + persistent surface below header | **PASS** |
| Zielgruppe / Empfänger / **Änderung kommunizieren** | **FAIL** — surface showed change-only mode |
| Duplicate bottom **Änderungen speichern** | **FAIL** |
| UAT-R1-03 onward | **BLOCKED** |

**01C remains:** IMPLEMENTED / **HUMAN_UAT_PENDING** (not CLOSED).

### Exact UAT event diagnosis (STAGE read-only)

| Field | Value |
|-------|-------|
| Event ID | `cmsprr1r6000304jr98oq6899` |
| Title | Mittgliederversammlung (STAGE row) |
| Tenant | `cmomwboak0000tsf3zzivrs46` |
| Type / status | `OTHER` / `SCHEDULED` |
| `EventParticipationAudienceEntry` rows | **0** |
| Audience state | **A — no participation audience configured** |
| `CommunicationAudienceSpec` | **null** (not fabricated) |
| `canCommunicate` | **false** (no valid audience + auth path not reached) |
| `canDispatch` | **n/a** (composer not offered without valid audience) |

**ROOT_CAUSE:** Mitgliederversammlung has **no** participation audience entries in STAGE. R1 treated missing spec as `audience === null`, so the impact surface hid Zielgruppe/Empfänger entirely instead of explaining the state. Separate UX finding: duplicate primary Save at bottom of form.

**Participation UX:** Audience is configured in **Teilnehmer** on the edit page via `ClubEventParticipationAudienceEditor` (team/org/role/person entries); editable after create. Reminders/deadline rail is separate (`ParticipationRequestConfigEditor`).

### R2 fix

| Area | Change |
|------|--------|
| Audience states | Explicit **none** / **invalid** / **valid** handling; always surface Zielgruppe on worthy club-event changes |
| No audience | **Keine Zielgruppe festgelegt**, Empfänger **—**, action **Zielgruppe festlegen** opens contextual audience dialog (R4; no page jump) |
| Invalid/stale | Human label without IDs; no silent drop to null-only surface |
| Communication path | **TEAM** only when all resolvable entries are `TEAM`; otherwise **CLUB** (`communication.club.send`). TEAM path no longer blocks club path for ROLE/ORG/PERSON/mixed audiences |
| `canCommunicate` vs `canDispatch` | Unchanged 01B contract: composer when authorized + valid audience; Send disabled when preview count is 0 |
| Save UX | Remove bottom primary Save; keep top header Save + bottom **Abbrechen** only |

### Tests

- `lib/collaboration/__tests__/sce-collab-01c-r2-verification.test.tsx` (R2-01 … R2-20 subset)
- Updated `sce-collab-01c-r1-verification.test.tsx` (bottom Save removed)
- Re-run 01A/01B/01C regressions on branch

### Human UAT R2 (after deploy)

| ID | Expectation |
|----|-------------|
| UAT-R2-01 | Single top Save; no bottom duplicate |
| UAT-R2-02 | After time change: count + delta + Zielgruppe state (for this event: **Keine Zielgruppe festgelegt** + Empfänger **—** until audience configured) |
| UAT-R2-03 … UAT-R2-05 | **Änderung kommunizieren** + composer after configuring a valid participation audience (or any event with resolvable audience + send permission) |

**Note:** Full communicate flow for Mitgliederversammlung requires setting participation audience in **Teilnehmer** first (product-correct; not a COLLAB data patch).

---

## SCE-COLLAB-01C-R3 — Human UAT R2 follow-up (2026-10-09)

### Human UAT R2 result

| Check | Result |
|-------|--------|
| Single top **Änderungen speichern** + save works | **PASS** |
| Worthy change detection + persistent impact surface | **PASS** |
| Empty audience **Keine Zielgruppe festgelegt** (no fabricated recipients) | **PASS** |
| Bottom **Abbrechen** alone on long page | **FAIL** — must move to header |
| Continue from changed event into communication after configuring audience | **FAIL** — unresolved cycle did not re-resolve audience/preview |
| Club Event collaboration look-and-feel vs Tournamentcenter | **FAIL** — must use exact shared Tournamentcenter surface/composer path |

**01C remains:** IMPLEMENTED / **HUMAN_UAT_PENDING** (not CLOSED).

### R3 fix — Tournamentcenter shared UI seam

| Area | Change |
|------|--------|
| Impact / composer | Club events use the same `EventActivityCollaborationHost` → `ContextualActivityChangeImpactSurface` → `ContextualActivityCommunicationComposer` path as `/dashboard/tournamentcenter` (no club-specific visual wrapper) |
| Layout placement | Club event layout matches tournament: impact slot at activity host top (removed `suppressImpactSlot` + duplicate edit-page slot) |
| Header actions | **Änderungen speichern** (primary) + **Abbrechen** (secondary) + **+ Aufgabe** in `PlanningEditorHeader`; bottom Save/Cancel removed |
| Audience refresh | `POST/DELETE /api/events/[eventId]/participation-audience*` accepts `collaborationCycleBaseline` and returns `{ collaboration, collaborationCycleBaseline }` via `appendClubEventParticipationAudienceCollaboration` |
| Client lifecycle | `ClubEventParticipationAudienceEditor` calls `useCollaborationMutation` after audience save — preserves unresolved cycle, re-runs preview/auth, updates `canCommunicate` / Empfänger without another event PATCH |
| Change set | Participation audience remains configuration-only (not an `ActivityChangeSet` entry) |

### Tests

- `lib/collaboration/__tests__/sce-collab-01c-r3-verification.test.tsx` (R3-01 … R3-30 subset)
- Tournament / 01A / 01B regressions on branch

### Human UAT R3 (after deploy)

| ID | Expectation |
|----|-------------|
| UAT-R3-01 | Header: Save + Cancel + Aufgabe; no bottom Save/Cancel |
| UAT-R3-02 | Time change → Tournament-style surface + **Zielgruppe festlegen** when no audience |
| UAT-R3-03 | Configure audience in Teilnehmer → time change stays unresolved; audience not listed as change |
| UAT-R3-04 | Surface shows readable Zielgruppe + Empfänger + **Änderung kommunizieren** without re-editing time |
| UAT-R3-05 | Composer matches Tournamentcenter; zero recipients → Send disabled |
| UAT-R3-06 | Composer cancel → unresolved surface remains |

**COLLAB-01 status:** **IN_PROGRESS** (01A/01B CLOSED; 01C Human UAT R3 pending).

---

## SCE-COLLAB-01C-R4 — Human UAT R3 follow-up (2026-10-09)

### Human UAT R3 result

| Check | Result |
|-------|--------|
| Header **Änderungen speichern** / **Abbrechen** / **+ Aufgabe**; no bottom Save/Cancel | **PASS** |
| Worthy change + Tournament-style impact surface | **PASS** |
| Empty audience **Keine Zielgruppe festgelegt** + Empfänger **—** | **PASS** |
| **Zielgruppe festlegen** jumps to Teilnehmer section (anchor) | **FAIL_UX** — loses collaboration context on long edit page |
| UAT-R3-04 … UAT-R3-06 | **BLOCKED** on contextual audience flow |

**01C remains:** IMPLEMENTED / **HUMAN_UAT_PENDING** (not CLOSED).

### R4 fix — contextual audience configuration (no page jump)

| Area | Change |
|------|--------|
| Trigger | **Zielgruppe festlegen** is a button (not `#veranstaltung-edit-participants-heading`) |
| Presentation | SCE `Dialog` + `ContextualClubEventParticipationAudienceDialog` (Tournamentcenter/SCE modal language) |
| Editor reuse | `ClubEventParticipationAudienceEditorCore` shared by Teilnehmer section and contextual dialog; same `/api/events/[eventId]/participation-audience` persistence + `useCollaborationMutation` lifecycle |
| Teilnehmer | Page section unchanged — second entry point to the same canonical editor |
| Labels | Human-readable Team / Organisationseinheit / Rolle / Person (no raw enum in UI) |
| Save / cancel | **Speichern** persists pending selection, refreshes audience/recipient preview + `canCommunicate`, closes dialog; **Abbrechen** closes without mutation; unresolved `ActivityChange` preserved |
| Scroll | No hash navigation / `scrollIntoView` for contextual action |
| Change set | Audience configuration still not an `ActivityChangeSet` entry |

### Tests

- `lib/collaboration/__tests__/sce-collab-01c-r4-verification.test.tsx` (R4-01 … R4-24 subset)
- Updated `sce-collab-01c-r3-verification.test.tsx` (configure action no longer anchor)
- Re-run 01A / 01B / 01C / bounded regressions on branch

### Human UAT R4 (after deploy)

| ID | Expectation |
|----|-------------|
| UAT-R4-01 | Time change save → Tournament-style surface |
| UAT-R4-02 | **Zielgruppe festlegen** opens in-place audience dialog — **no** jump to page bottom |
| UAT-R4-03 | Select audience + **Speichern** → dialog closes; time change still unresolved; audience not listed as change |
| UAT-R4-04 | Surface shows Zielgruppe + Empfänger + **Änderung kommunizieren** without another event edit |
| UAT-R4-05 | Composer matches Tournamentcenter; Empfänger **0** → Send disabled |
| UAT-R4-06 | Composer **Abbrechen** → unresolved surface remains |

**COLLAB-01 status:** **IN_PROGRESS** (01A/01B CLOSED; 01C Human UAT R4 pending).

---

## SCE-COLLAB-01C-R5 — Human UAT R4 follow-up (2026-10-09)

### Human UAT R4 result

| Check | Result |
|-------|--------|
| UAT-R4-01 | **PASS** |
| UAT-R4-02 | **PASS** — contextual SCE dialog; no anchor jump |
| UAT-R4-03 | **BLOCKED_EMPTY_SELECTOR** — Team dropdown only placeholder „Team auswählen“ |
| UAT-R4-04 … UAT-R4-06 | **BLOCKED** on empty selector |

**01C remains:** IMPLEMENTED / **HUMAN_UAT_PENDING**.

### Audience option architecture

| Kind | Source | Notes |
|------|--------|-------|
| TEAM | Client `GET /api/teams` (`ClubEventParticipationAudienceEditorCore`) | Tenant from session; includes current-season `TeamSeason` metadata; **no** roster / COMM-03 recipient gate for listing |
| ORG_UNIT / ROLE / PERSON | Backend `participation-audience` POST kinds | UI selectors for these types not yet exposed in `ClubEventParticipationAudienceEditorCore` (Team-only add UI today); counts exist on STAGE |

**Layering (explicit):**

1. **Audience target discovery** — selectable Team / Org / Role / Person (`EventParticipationAudienceEntry`)
2. **Audience spec resolution** — `CommunicationAudienceSpec` from configured entries
3. **COMM-03 recipient resolution** — eligible recipients (may be **0** without hiding the Team from the selector)

### Normal vs contextual editor

Both `ClubEventParticipationAudienceEditor` (Teilnehmer) and `ContextualClubEventParticipationAudienceDialog` render the same `ClubEventParticipationAudienceEditorCore` with identical props (`eventId`, `interaction` only). **No** contextual prop/context loss — same fetch paths.

### STAGE read-only diagnosis (FC Allschwil, event `cmsprr1r6000304jr98oq6899`)

| Metric | Value |
|--------|------:|
| Tenant | `cmomwboak0000tsf3zzivrs46` (FC Allschwil) |
| TOTAL_TEAMS | 28 |
| ACTIVE_TEAMS | 28 |
| ACTIVE_TEAM_SEASONS (current) | 28 |
| SELECTOR_ELIGIBLE_TEAMS | 28 (structural; not roster-gated) |
| ORG_UNIT / ROLE / PERSON (tenant rows) | 17 / 4 / 4 |

Sample teams include Junioren A/B/C rows and 1./2. Mannschaft — data present on STAGE.

### Root cause

**R5-F — CANONICAL_PARTICIPATION_EDITOR_DEFECT** (client response parsing, not STAGE data):

`GET /api/teams` returns a **bare JSON array** (see `app/api/teams/route.ts`). `ClubEventParticipationAudienceEditorCore` incorrectly read `{ teams: [...] }`, so `teams` state was always `[]` in production for **both** Teilnehmer and contextual dialog. Vitest mocks used the wrong shape and masked the defect.

**Not** R5-E (STAGE data gap). **Not** recipient/roster coupling (R5-C).

### R5 fix

| Area | Change |
|------|--------|
| Parser | `lib/teams/parse-teams-list-api-response.ts` — canonical array + legacy wrapper; active teams; season `displayName` labels |
| Core editor | Use parser; `GET /api/teams` with `cache: "no-store"`; empty state **Keine Teams verfügbar** |
| Tests | `sce-collab-01c-r5-verification.test.tsx`, `parse-teams-list-api-response.test.ts` |

### Human UAT R5 (after deploy)

| ID | Expectation |
|----|-------------|
| UAT-R5-01 | Dialog opens in place |
| UAT-R5-02 | FC Allschwil teams visible in Team selector |
| UAT-R5-03 | Select Team + save → dialog closes; change preserved |
| UAT-R5-04 | Zielgruppe + Empfänger 0/n + **Änderung kommunizieren** |
| UAT-R5-05 | Composer opens; Empfänger 0 → Send disabled |
| UAT-R5-06 | Composer cancel → unresolved change remains |

### Human UAT R5 result (product owner, STAGE — final)

| Check | Result | Notes |
|-------|--------|-------|
| UAT-R5-01 | **PASS** | Contextual Zielgruppe dialog opens in place |
| UAT-R5-02 | **PASS** | Team dropdown lists real FC Allschwil teams (e.g. Junioren E1–F3, Seniorinnen, …) |
| UAT-R5-03 | **PASS** | Team selected (example: **Seniorinnen**) and audience saved |
| UAT-R5-04 | **PASS** | Unresolved participant-facing change preserved (example: Zeit 20:30 → 20:00) after audience save |
| UAT-R5-05 | **PASS** | Impact refreshes: Zielgruppe **Seniorinnen**, Empfänger **0**, **Änderung kommunizieren** available |
| UAT-R5-06 | **PASS** | Composer **Mitteilung vorbereiten**; subject **Änderung: …**; body includes unresolved change; **Keine Empfänger verfügbar**; Send disabled |

**Zero-recipient classification:** **EXPECTED_DATA_STATE** — structural Team exists and is selectable; COMM-03 returns 0 eligible recipients because FC Allschwil STAGE lacks onboarded active TeamSeason roster → person → user links (**not** an 01C collaboration/audience/authorization defect). Positive-recipient dispatch remains covered by automated tests and 01B verification. **No STAGE roster data was fabricated for UAT.**

**Follow-up (not 01C scope):** **SCE-PEOPLE-TEAM-ONBOARDING-01** — operational roster onboarding so COMM-03 can resolve real recipients for structural teams on STAGE.

### SCE-COLLAB-01C closure gate (2026-10-09)

| Gate | Result |
|------|--------|
| Human UAT R5 | **PASS** |
| 01C automated suite (activity-change + R1–R5 + club-event collaboration APIs) | **70/70 PASS** |
| 01A/01B regression (collaboration batches) | **123/123 PASS** |
| COMM-03 + club/team communication + impact surface | **32/32 PASS** |
| Participation audience + teams list parser | **29/29 PASS** (excludes KNOWN_P2 harness) |
| Facility integrity | **168/168 PASS** |
| Veranstaltung facility allocation regression | **PASS** |
| ESLint (PR-changed TS/TSX) | **0 errors** after closure lint fix |
| Build | **PASS** — `NODE_OPTIONS=--max-old-space-size=8192 npm run build` (closure 2026-10-09) |
| Schema / migration / role / permission / STAGE data mutation | **NO** |
| PROD | **Untouched** |

**KNOWN_P2 (pre-existing on STAGE, unrelated mock gap):** `lib/events/__tests__/sce-events-audience-01.test.ts` — 3 failures (`eventParticipationAudienceEntry.findMany` mock undefined).

**01C status:** **CLOSED** (PR #812 → STAGE).

**COLLAB-01 status:** **IN_PROGRESS** (01A/01B/01C CLOSED; 01D outstanding).

### SCE-COLLAB-01C — STAGE merge closure (2026-10-09)

| Field | Value |
|-------|-------|
| PR | [#812](https://github.com/Clipse078/sportclubevo-webapp/pull/812) |
| Merge method | Merge commit (same as 01A/01B) |
| Merged at | 2026-10-09T18:54:20Z |
| Feature head | `e790d274f520e6a79b6c7a7ac77923876034ee45` |
| Pre-merge STAGE | `82465e651a11c6ec1dea32464b6488299d5d77c2` |
| Code merge SHA (STAGE) | `a03c0f9d5f03c767b1650028ef1e47eec6c8510a` |
| Deployed STAGE SHA (`/api/health/diag`) | `a03c0f9d5f03c767b1650028ef1e47eec6c8510a` |
| Shared STAGE URL | https://fcallschwil.sportclubevo.com |
| Human UAT R5 | **PASS** |
| Post-merge sentinels (bounded) | **91/91 PASS** (01C suite + club-event APIs + 01B R7 + teams parser + COMM-03 recipient resolution) |
| P0 / P1 / NEW_FAILURES | **0 / 0 / 0** |
| Schema / migration / role / permission / STAGE data | **NO** |
| PROD | **Untouched** |
| Zero-recipient on STAGE | **EXPECTED_DATA_STATE** — follow **SCE-PEOPLE-TEAM-ONBOARDING-01** (no roster fabrication for UAT) |

**Next package (recommended):** **SCE-PEOPLE-TEAM-ONBOARDING-01** — then **SCE-COLLAB-01D** (multi-activity impact).
