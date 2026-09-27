# SCE-COMM-10 — Event Communication & Smart Reminders

## Domain ownership

- **Event / Participation** owns schedule, identity, and `ParticipationResponse` RSVP state (`OPEN`, `YES`, `NO`, `MAYBE`).
- **Communication** owns message content, `PlatformCommunication` history, audience intent, and dispatch **recipient snapshots**.
- **Notification** owns attention signals; reminders create normal published communications → notifications (COMM-04/06 bridge).
- **Push** (COMM-09) delivers downstream from Notification — reminder orchestration never calls push providers.
- **Poll** owns poll responses; **Request** owns claims/capacity.

COMM-10 owns **orchestration** that selects canonical recipients for Event/Poll/Request reminder actions.

> Event attendance remains owned by the Event/Participation domain.  
> A reminder does not itself change Event attendance, Poll response or Request claim state.  
> Smart reminder recipients are resolved from canonical source-domain state at execution time.  
> Once dispatched, reminder recipients are stored as immutable Communication recipient snapshots.  
> COMM-10 reuses COMM-09 Push through the canonical Notification delivery pipeline; reminder services do not call Push providers directly.

## Event context

- `CommunicationContextRef`: `{ kind: "EVENT", eventId }` where `eventId` is the participation anchor id (calendar `Event.id` or `TrainingSession.id`).
- Communications are persisted on the team `PlatformCommunicationConversation` (team continuity) with EVENT context metadata.

## Event recipient presets

| Preset | Participation filter |
|--------|------------------------|
| `ALL_INVITEES` | All eligible invitees |
| `ACCEPTED_ONLY` | `ParticipationResponseStatus.YES` |
| `DECLINED_ONLY` | `NO` |
| `NOT_RESPONDED` | `OPEN` (implicit default until response) |

Eligibility source:

- **Team roster events** (TRAINING / MATCH / TOURNAMENT): active `playerSquadMember` for the `teamSeasonId`.
- **Club events (`CLUB_EVENT`)**: `EventParticipationAudienceEntry` via `resolveClubEventInviteePersonIds`.

`MAYBE` is treated as a response (excluded from `NOT_RESPONDED`, not counted as accepted/declined).

## Guardian / safeguarding

Event and reminder dispatches use COMM-03 recipient resolution (`resolveCommunicationRecipientsForDispatch`) including guardian substitution and preference/safeguarding seams. Snapshots preserve `subjectPersonId`, `deliveryUserId`, and `viaGuardianSubstitution`.

## Smart reminders

Origins (`PlatformCommunicationReminderOrigin` on `orchestrationMetaJson`):

- `EVENT_NO_RESPONSE`
- `POLL_NO_RESPONSE` — `listPollNonRespondedSnapshotIds` (COMM-07)
- `REQUEST_NO_RESPONSE` — `listRequestNonRespondedSnapshotIds` (COMM-08)
- `REQUEST_OPEN_CAPACITY` — `listRequestSlotsWithOpenCapacity` (COMM-08)

No new `PlatformCommunicationKind.REMINDER` — reminders use `MESSAGE` / `ANNOUNCEMENT` / `ALERT` plus orchestration metadata.

### Manual vs scheduled

- **Manual**: trainer/manager actions (UI + API) — distinct `manualActionKey` / no shared execution identity.
- **Scheduled**: `CommunicationReminderSchedule` with UTC `executeAt`, stable `executionIdentity`, processed by `/api/cron/communication-reminders`. Duplicate job runs are suppressed via `CommunicationReminderExecution`.

### Response-aware execution

Scheduled/manual smart reminders resolve non-responders **at execution time**. Published communications store immutable snapshots even if attendance changes afterward.

## Authorization

Separate from recipient membership:

- Team communication send permission (`requireTeamCommunicationSend`) for Event/Poll/Request reminder actions.
- Cross-team / foreign communication ids fail via tenant + conversation team guards.

## API seams (mobile-ready)

- `POST /api/teams/:teamId/events/communication/preview`
- `POST /api/teams/:teamId/events/communication/send`
- `POST /api/teams/:teamId/events/communication/remind-no-response`
- `POST /api/teams/:teamId/communications/:communicationId/poll/remind-non-responders`
- `POST /api/teams/:teamId/communications/:communicationId/request/remind-non-responders`
- `POST /api/teams/:teamId/communications/:communicationId/request/remind-open-capacity`
- Cron: `GET /api/cron/communication-reminders`

Schedule create/cancel: service layer (`createCommunicationReminderSchedule`, `cancelCommunicationReminderSchedule`) — UI deferred minimal.

## COMM-11 boundary

No organisation-wide club composer, arbitrary Zielgruppe campaigns, or sponsor campaign scheduling (COMM-11+).

## Known limitations

- Club-event (`CLUB_EVENT`) communication authorization follows team send permission on the team cockpit surface; org-wide club event operators may need COMM-11 org context.
- Automatic schedule UX is API/service-only in COMM-10; broad scheduling UI belongs to COMM-16.
- Existing participation **deadline notification** cron (`participation-notifications`) remains separate notification-only path; COMM-10 smart reminders are Communication artifacts.
