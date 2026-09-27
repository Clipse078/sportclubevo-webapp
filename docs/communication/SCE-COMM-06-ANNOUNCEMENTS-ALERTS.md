# SCE-COMM-06 — Team Announcements & Alerts

## Programme intent

COMM-06 adds formal one-to-many Team communication on the **same** canonical platform introduced in COMM-01–COMM-05.

- **MESSAGE** — conversational Team Chat (COMM-05)
- **ANNOUNCEMENT** — formal Team information (`Mitteilung`)
- **ALERT** — urgent Team information (`Alarm`)

> Announcements and Alerts use `PlatformCommunication`; they are not separate content domains.

## Domain ownership

| Concern | Owner |
|--------|--------|
| Content & lifecycle | `PlatformCommunication` |
| Dispatch truth | `PlatformCommunicationRecipientSnapshot` |
| Engagement (`READ`, `ACKNOWLEDGED`, …) | Snapshot `engagement` (+ timestamps) |
| Attention / feed items | `Notification` (references communication via `entityId` + deep link) |

> Communication owns content; Notification owns attention.

## Read vs acknowledgement vs response

| State | Meaning |
|-------|---------|
| `READ` | Recipient consumed/viewed the communication |
| `ACKNOWLEDGED` | Recipient explicitly confirmed (`Bestätigen`) |
| `RESPONDED` | Reserved for future response kinds (polls, requests) |

> READ and ACKNOWLEDGED are separate engagement states.

Acknowledgement never auto-upgrades from READ alone in reverse; explicit acknowledgement transitions to `ACKNOWLEDGED` while preserving prior READ semantics.

## Creation flow (Team Cockpit)

Route: `/dashboard/teams/[teamId]/kommunikation`

Authorized senders choose **Nachricht**, **Mitteilung**, or **Alarm**:

1. Compose title/body, audience preset, optional acknowledgement toggle
2. Publish via `sendTeamFormalCommunication` → `createTeamCommunicationDraft` + `publishTeamCommunication`
3. COMM-03 dispatch resolves recipients and writes immutable snapshots

Default audience preset: **ALL** (`teamAudienceSpecForPreset`).

Presets: `ALL`, `PLAYERS`, `TRAINERS_STAFF` (no saved TargetGroup builder in the default Team flow).

> Every published Announcement or Alert uses canonical COMM-03 recipient resolution.

> Historical recipients come from dispatch-time snapshots.

## Acknowledgement

- `PlatformCommunication.acknowledgementRequired` (default `false`; ALERT defaults to required unless overridden)
- Recipient action updates snapshot `engagement` → `ACKNOWLEDGED` and sets `acknowledgedAt`
- Authorized sender/admin may inspect aggregate counts (and recipient detail when permitted)

## Notification boundary

| Kind | Notification type |
|------|-------------------|
| MESSAGE | `TEAM_COMMUNICATION_PUBLISHED` |
| ANNOUNCEMENT | `TEAM_ANNOUNCEMENT_PUBLISHED` |
| ALERT | `TEAM_ALERT_PUBLISHED` |

Notifications deep-link to `?communicationId=` and exclude the sender. No push/SMS/email in COMM-06.

## Safeguarding & authorization

- All dispatch passes `resolveCommunicationRecipientsForDispatch()` (minor/guardian policy unchanged)
- Send: COMM-04 Team communication send permission (trainers, org comm admin, club admin)
- Acknowledge: eligible snapshot recipient only
- Tracking detail: sender or authorized send/admin only

## Attachments

Reuse COMM-05 `PlatformCommunicationAttachment` / `CommunicationAttachment` pipeline.

## API / mobile seams

| Operation | Seam |
|-----------|------|
| Publish announcement | `POST /api/teams/:teamId/communications/announcements` |
| Publish alert | `POST /api/teams/:teamId/communications/alerts` |
| Acknowledge | `POST /api/teams/:teamId/communications/:communicationId/acknowledge` |
| Summary (+ optional recipients) | `GET /api/teams/:teamId/communications/:communicationId/engagement` |

Server actions mirror the same services for the Team Cockpit UI.

## Known limitations (COMM-06)

- No push/SMS/email channels
- No polls, requests, campaigns, or club-wide composer
- Published formal editing deferred; archive/tombstone only via existing lifecycle
- Reactions/replies disabled for formal cards (discussion stays in Team Chat)

## Future seams

COMM-07 Polls, COMM-08 Requests, COMM-09 Push, COMM-10 Event comms, COMM-11 Club comms, COMM-12 Campaign composer — all extend `PlatformCommunication` kinds without parallel stores.
