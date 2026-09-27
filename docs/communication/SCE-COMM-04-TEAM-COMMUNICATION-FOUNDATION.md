# SCE-COMM-04 — Team Communication Foundation

**Baseline:** `origin/STAGE` @ `a26d1b4c6a194acd0e8df0120a391e85c2f512b9`  
**Service:** `lib/communication/team/`  
**Persistence:** `PlatformCommunication*`

## Programme invariants

- Team communication uses the canonical Communication engine.
- A Team is a structural communication context/audience and does not own a separate recipient engine.
- Authorization to send is separate from Team membership.
- Historical recipients are dispatch-time snapshots and are never recomputed from current Team membership.
- Communication owns content; Notification owns attention signals.

## Domain boundaries

| Domain | Owns |
|--------|------|
| Communication (`PlatformCommunication`) | content, lifecycle, audience intent, dispatch snapshots |
| COMM-03 | recipient resolution (`resolveCommunicationRecipients*`) |
| Team | identity, seasons, squad/trainers |
| Notification | attention signals (`TEAM_COMMUNICATION_PUBLISHED`) |
| COMM-01A threads | registration/email collaboration (unchanged) |

## Conversation anchor

- **Anchor:** `PlatformCommunicationConversation.teamId` (stable `Team.id`).
- **Membership at dispatch:** active `TeamSeason` roster via structural `teamIds` audience (COMM-03).
- Season transitions do not rewrite historical snapshot rows.

## Default audience

`defaultTeamOperationalAudience(teamId)` / preset `ALL` → structural team selector. No automatic saved `TargetGroup` per team.

Presets (COMM-04): `ALL`, `PLAYERS` (trainer exclusion at dispatch), `TRAINERS_STAFF` (team ∩ roleKeys trainer).

## Permissions

| Permission | Purpose |
|------------|---------|
| `communication.team.view` | View team communication space |
| `communication.team.send` | Publish team communication |

Effective rules (see `team-communication-authorization.ts`):

- **View:** allocated squad/trainers, club admin, org comm admin, `teams.manage`, explicit comm team permissions.
- **Send:** active trainer on current season, club admin, org comm admin (`communication.zielgruppen.manage`), `teams.manage`, `communication.team.send`.

Players may view but cannot send team-wide communication by default.

## Lifecycle

`DRAFT → PUBLISHED → ARCHIVED`. Published audience and snapshots are immutable.

## API / mobile seam

- `GET/POST /api/teams/[teamId]/communications`
- Service methods: `getTeamCommunicationSpace`, `listTeamCommunications`, `createTeamCommunicationDraft`, `publishTeamCommunication`, `archiveTeamCommunication`

## UI entry

`/dashboard/teams/[teamId]/kommunikation` — foundation list, empty state, minimal publish seam (COMM-05 adds chat UX).

## COMM-05 readiness

Single persistence model supports future threading, reactions, read state (`PlatformCommunicationRecipientSnapshot.engagement`), attachments, and mobile composer without a second message store.

## Known limitations (COMM-04)

- No chat composer polish, reactions, mentions, unread badges, or push/email delivery.
- Poll/alert/campaign UX deferred; kinds validated at domain layer only.
