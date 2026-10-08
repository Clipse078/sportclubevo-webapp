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

## Human UAT (preview)

| ID | Scenario |
|----|----------|
| COLLAB_UAT_01 | Edit without participant-facing change → no prompt |
| COLLAB_UAT_02 | Change location → save + impact + communicate offer |
| COLLAB_UAT_03 | Communicate → prefilled draft, no auto-send |
| COLLAB_UAT_04 | Time + location → consolidated summary |
| COLLAB_UAT_05 | Dismiss → saved training, no send |
| COLLAB_UAT_06 | User without comm send → no send capability |
