# SCE-TRAINING-AUDIENCE-01 — Trainingsteilnahme Domain Audience + Operational Attention

## Purpose

Second flagship **DomainAudience** consumer after SPIELBETRIEB-AUDIENCE-01 for **TrainingSession** squad participation (Trainingsbetrieb).

Target UX (operator):

> F2 · Training Mittwoch 15:45 — 4 Rückmeldungen ausstehend — **Erinnerung senden**

Only when a canonical training participation request is active (`participationResponseDueAt` set). No active Teilnahmeanfrage → no outstanding audience, no attention item, no reminder action.

## Participation model (current)

| Concept | Implementation |
|---------|----------------|
| Occurrence | `TrainingSession` (concrete generated occurrence; **not** series-wide) |
| Series | `TrainingSeries` — policies (`participationResponseDueDaysBefore`) snapshotted to session deadline fields |
| Team scope | `TrainingSession.teamSeasonId` → `TeamSeason` → `teamId` |
| Invitee population | Active `PlayerSquadMember` for `teamSeasonId` |
| Responses | `ParticipationResponse` with `eventKind: TRAINING`, `trainingSessionId` |
| Deadline / activation | `TrainingSession.participationResponseDueAt` — **Teilnahmeanfrage active only when set** (`isParticipationResponseRequested`) |
| Attendance (post-training) | `AttendanceRecord` on session — **not** used for participation audience |
| Guardians | COMM-18 via COMM-03 (same as Spielbetrieb) |
| Existing comm | SCE-COMM-10 `sendEventNoResponseSmartReminder` with `eventKind: TRAINING` |

### Session vs series

Participation responses are anchored per **TrainingSession** occurrence. One RSVP does not apply to all future Wednesdays unless product later adds series-wide requests (not in repository today).

### Participation vs attendance

- **Pre-training:** `ParticipationResponse` (YES/NO/MAYBE/OPEN) — this package.
- **Post-training:** `AttendanceRecord` — out of scope.

## Shared participation core

Reuses `lib/participation/participation-audience-resolution.ts` and `isParticipationResponseRequested` from `lib/participation/participation-response-requested.ts` (no training-specific resolution fork).

## Domain audience provider

| Field | Value |
|-------|-------|
| `domainKey` | `training` |
| `sourceKey` | `teilnahme` |
| Registry key | `training.teilnahme` |
| Registration | `ensureTrainingDomainAudienceRegistered()` (lazy, with Probetraining + Spielbetrieb in discovery/expansion) |

### Candidate identity

Format (11 colon segments):

`v1:team:{teamId}:ts:{teamSeasonId}:sess:{trainingSessionId}:kind:TRAINING:p:{preset-segment}`

Preset segments: `all`, `yes`, `no`, `maybe`, `not-responded`.

Validation: tenant, team, teamSeason, session id, `kind:TRAINING` (rejects MATCH-shaped ids). Tampering fails closed.

### Authorization

Team communication **view** (discovery/materialize) and **send** (Erinnerung), same gates as Spielbetrieb (`resolveTeamCommunicationAuthorization`).

### Live resolution / saved Zielgruppen

Saved references store `{ sourceKey, candidateId }` only. Materialization re-queries squad + responses. Inactive request, cancelled session, or past effective start → fail closed.

## Relevance window

| Session state | Attention / audience |
|---------------|----------------------|
| Future SCHEDULED, active request | Yes (if counts match preset) |
| Today before effective start | Yes |
| In progress (effective start passed) | No |
| Past / completed | No |
| CANCELLED / POSTPONED / MOVED / RECURRENCE_REMOVED | No |

Effective start: `overrideStartAt ?? startAt` (TRAININGCENTER-02 reschedule).

## Operational attention

| Field | Value |
|-------|-------|
| Source | `trainingParticipationOutstandingAttentionSource` |
| Kind | `participation-outstanding` |
| Action | `training.participation.remind-not-responded` → COMM-10 TRAINING remind |
| Deep link | `/dashboard/teams/{teamId}/teilnahmen` |

No persistence; count derived live. Disappears when outstanding = 0 or request deactivated.

## Manual reminder

`executeTrainingOutstandingParticipationReminder` — authenticate, authorize, verify active request + actionable session, live NOT_RESPONDED query, zero no-op, COMM-03 → COMM-17 → COMM-18.

## TOCTOU

Attention count is informational only. Send path re-queries outstanding recipients at execution time.

## Cancellation / change (future)

When training is cancelled/rescheduled, participation attention disappears (status / effective start gates). Future dynamic audience: «Teilnehmende eines abgesagten/geänderten Trainings» — documented only; not implemented here.

## FCA usage

Run read-only aggregate: `scripts/sce-training-audience-01-fca-readonly-aggregate.ts` (STAGE, no mutations).

## Deferred

- Dashboard/mobile aggregation registry (DOMAIN-OPERATIONAL-ATTENTION-01)
- Automatic reminder cron
- Training UI redesign
- EVENTS-AUDIENCE-01
