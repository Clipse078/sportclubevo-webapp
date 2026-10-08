# SCE-COLLAB-01 — Contextual Club Collaboration Foundation

## Status

| Package | Status |
|---------|--------|
| **SCE-COLLAB-01A** (Training vertical slice) | **IMPLEMENTED / HUMAN_UAT_PENDING** |
| SCE-COLLAB-01 (full roadmap) | OPEN |

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

Future adapters: `MATCH`, `TOURNAMENT`, `CLUB_EVENT` via the same `ActivityChangeSet` seam.

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
- Match/Tournament/Club Event adapters not implemented.

## Future: Trainer-/Spielerbörse

Contextual collaboration + targeted communication will consume the same change/audience seams; not implemented in 01A.

## Tests

- `lib/collaboration/__tests__/sce-collab-01a-activity-change.test.ts`
- `lib/collaboration/__tests__/sce-collab-01a-r1-verification.test.ts` (SCE-COLLAB-01A-R1 gate)
- `app/api/collaboration/training-sessions/[sessionId]/__tests__/collaboration-communication-routes.test.ts`
- `components/admin/collaboration/__tests__/ContextualActivityChangeImpactSurface.test.tsx`
- Training mutation route regressions under `app/api/training-sessions/[sessionId]/**/__tests__/`

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

Status remains **IMPLEMENTED / HUMAN_UAT_PENDING** (not CLOSED).

## Human UAT (preview)

| ID | Scenario |
|----|----------|
| COLLAB_UAT_01 | Edit without participant-facing change → no prompt |
| COLLAB_UAT_02 | Change location → save + impact + communicate offer |
| COLLAB_UAT_03 | Communicate → prefilled draft, no auto-send |
| COLLAB_UAT_04 | Time + location → consolidated summary |
| COLLAB_UAT_05 | Dismiss → saved training, no send |
| COLLAB_UAT_06 | User without comm send → no send capability |
