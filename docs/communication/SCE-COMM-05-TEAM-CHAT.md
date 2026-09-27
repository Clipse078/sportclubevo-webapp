# SCE-COMM-05 — Team Chat

**Branch:** `cursor/comm-05-team-chat`  
**Baseline:** `origin/STAGE` @ COMM-04 foundation  
**Service:** `lib/communication/team/team-chat-service.ts`

## Invariants

- Team Chat uses `PlatformCommunication`; it is not a separate message domain.
- Every Team message uses canonical COMM-03 recipient resolution via `publishTeamCommunication`.
- Historical recipient truth comes from dispatch-time snapshots (`PlatformCommunicationRecipientSnapshot`).
- `READ` is distinct from `ACKNOWLEDGED` and `RESPONDED` (engagement on snapshots).
- Notification is the attention layer; Communication owns the message.

## Architecture

| Concern | Owner |
|---------|--------|
| Message content & lifecycle | `PlatformCommunication` |
| Conversation anchor | `PlatformCommunicationConversation.teamId` (stable `Team.id`) |
| Recipients | COMM-03 + immutable snapshots |
| Reactions | `PlatformCommunicationReaction` |
| Mentions | `PlatformCommunicationMention` + composer-selected Person IDs |
| Attachments | `CommunicationAttachment` + `PlatformCommunicationAttachment` |
| Read state | `PlatformCommunicationRecipientSnapshot.engagement` → `READ` |
| Attention | `NotificationType.TEAM_COMMUNICATION_PUBLISHED` (+ mention dedupe keys) |

COMM-01A `CommunicationThread` / `CommunicationMessage` remain for registration/email collaboration and are **not** Team Chat owners.

## UX

- Route: `/dashboard/teams/[teamId]/kommunikation`
- Conversation-first mobile-first stream (`TeamChatView`), constrained desktop column (`max-w-2xl`).
- Composer sends via `sendTeamChatMessage` (draft + publish orchestration, default team audience preset `ALL`).
- Deep link: `?communicationId=` highlights/focuses a message (Notification-compatible href).

## Replies

- Nullable `PlatformCommunication.replyToCommunicationId` (one-level only).
- Cross-team / cross-tenant reply targets rejected in service layer.

## Reactions

Bounded keys: `THUMBS_UP`, `HEART`, `JOY`. Unique per `(communicationId, personId, reactionKey)`.

## Mentions

- Candidates scoped to active season roster (players + trainers) via `listTeamChatMentionCandidates`.
- Persisted as `PlatformCommunicationMention` rows; optional mention notifications (dedupe `team-comm-mention:*`).

## Read / unread

- Unread = recipient snapshots for viewer's `deliveryUserId` with engagement not in `READ|ACKNOWLEDGED|RESPONDED`, excluding messages sent by viewer's Person.
- Opening chat calls `markTeamChatConversationRead` (batch snapshot updates + soft notification read for team chat href).

## Attachments

- References canonical `CommunicationAttachment` (Workspace snapshot / staged upload pipeline).
- Direct chat upload UI deferred; composer supports attachment ID reference seam.

## Safeguarding

- Send pipeline unchanged: COMM-03 dispatch + guardian policy seams apply to every message.

## Team membership changes

- Historical snapshots immutable; new members do not gain retroactive snapshot rows.
- Conversation listing uses published communications in the team conversation (authorization via COMM-04 view rules), not live membership recomputation for historical delivery.

## API / mobile seams

- `GET/POST /api/teams/[teamId]/communications/messages`
- `GET /api/teams/[teamId]/communications/unread-count`
- `POST /api/teams/[teamId]/communications/mark-read`
- `POST/DELETE /api/teams/[teamId]/communications/[communicationId]/reactions`
- Legacy `GET/POST /api/teams/[teamId]/communications` (list + chat send)

## Pagination

Cursor `{ publishedAt, id }` (base64url JSON), fetch latest page then `olderThanCursor` for history.

## Known limitations (COMM-05)

- No WebSockets / typing indicators / push / email delivery.
- No polls, requests, campaigns, or formal acknowledgement workflow.
- Message edit/delete deferred (archive tombstone via `ARCHIVED` status only).
- Attachment picker uses reference ID seam; rich upload UX deferred.

## Future seams

COMM-06 Announcements & Alerts · COMM-07 Polls · COMM-08 Requests · COMM-09 Push · COMM-10 Event comm — kinds/lifecycle already validated at platform layer.
