# SCE-COMM-07 — Polls & Date Polls

Polls and Date Polls use `PlatformCommunication`; they are not a separate communication domain.

Poll responses are structured Communication responses and are not Event attendance.

Every published Poll uses canonical COMM-03 recipient resolution via `resolveCommunicationRecipientsForDispatch()`.

Historical Poll audience comes from dispatch-time recipient snapshots (`PlatformCommunicationRecipientSnapshot`).

A Date Poll may create a canonical Event, but the Event domain remains the owner of the resulting event.

## Architecture

| Concern | Owner |
| --- | --- |
| Poll question, options, responses, lifecycle | `PlatformCommunication` + `PlatformCommunicationPoll*` |
| Delivery / eligibility | COMM-03 recipient snapshots |
| Engagement (`RESPONDED`) | `PlatformCommunicationRecipientSnapshot.engagement` |
| Resulting scheduled event | `Event` (type `OTHER`, source `MANUAL`) |
| Event attendance / RSVP | Participation domain (unchanged) |

### Persistence

- `PlatformCommunicationPoll` — mode, deadline, visibility, lifecycle, selected option, created event reference
- `PlatformCommunicationPollOption` — label (POLL) or `startAt`/`endAt` (DATE_POLL)
- `PlatformCommunicationPollResponse` — selections keyed by `recipientSnapshotId` (never arbitrary person IDs)

## Modes & lifecycle

- **SINGLE** — one option per recipient snapshot; updates replace prior selection
- **MULTIPLE** — many options per snapshot; toggling while open

Lifecycle: draft communication → publish → **OPEN** → optional deadline expiry → **CLOSED** (sender). Closed polls reject response mutations; history is retained.

## Response identity & safeguarding

Responses bind to dispatch snapshots where `deliveryUserId` matches the acting user. Guardian substitution remains on the snapshot (`viaGuardianSubstitution`); the delivery user submits, subject identity stays on `subjectPersonId`.

Anonymous polls are **not** implemented (identity required for eligibility, safeguarding, and non-responder tracking).

## Results visibility

- `AFTER_RESPONSE` — recipient after voting
- `AFTER_CLOSE` — all recipients after close
- `SENDER_ONLY` — managers/sender only (plus org send permission)

Aggregate counts are loaded on demand; timeline uses summaries to avoid N+1 response rows.

## Date Poll → Event

1. Close poll
2. Sender selects winning option (votes inform but do not auto-decide ties)
3. **Termin erstellen** calls `createOtherEventFromDatePoll` (requires `EVENTS_MANAGE` independently of poll send permission)
4. `createdEventId` persisted — repeat conversion returns the same event (idempotent)

## Notifications

New types: `TEAM_POLL_PUBLISHED`, `TEAM_DATE_POLL_PUBLISHED`. No per-vote notifications. Sender excluded from publish attention (existing producer).

## API seams (mobile-ready)

- `POST /api/teams/:teamId/communications/polls`
- `POST .../:communicationId/poll/response`
- `POST .../:communicationId/poll/close`
- `POST .../:communicationId/poll/winner`
- `POST .../:communicationId/poll/create-event`
- `GET .../:communicationId/poll/recipients` (authorized detail)

## COMM-10 seam

`listPollNonRespondedSnapshotIds()` identifies non-responders from immutable snapshots + response rows (no live membership recompute).

## Known limitations

- No anonymous voting
- No free-text / matrix surveys
- No push / smart reminders (COMM-09 / COMM-10)
- Date Poll composer uses browser `datetime-local` (server persists UTC instants)
