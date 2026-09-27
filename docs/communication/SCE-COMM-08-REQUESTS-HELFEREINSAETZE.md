# SCE-COMM-08 — Team Requests & Helfereinsätze

Structured **REQUEST** communications on the canonical `PlatformCommunication` domain: simple asks (“Wer kann die Leibchen waschen?”) and multi-slot **Helfereinsätze** (Aufbau, Grill, Verkauf, Abbau) with server-enforced capacity and snapshot-based claims.

## Programme statements

- **Requests use PlatformCommunication; Helfereinsätze are not a separate communication domain.**
- **A Request claim is not an Aufgabe assignment.**
- **A Request claim is not Event attendance.**
- **Every published Request uses canonical COMM-03 recipient resolution.**
- **Historical Request recipients come from dispatch-time recipient snapshots.**
- **Capacity is enforced server-side and concurrent claims must not overbook a slot.**

## Architecture

| Layer | Owner |
|-------|--------|
| Content + lifecycle | `PlatformCommunication` (`kind = REQUEST`) |
| Structure | `PlatformCommunicationRequest` (1:1) |
| Slots | `PlatformCommunicationRequestSlot` |
| Claims | `PlatformCommunicationRequestClaim` → `PlatformCommunicationRecipientSnapshot` |
| Aufgaben | Canonical `Task` domain — **no auto-create on claim** |
| Event link | Optional `eventId` on request — Event remains Event-owned |

Simple requests are modeled as a **single slot**. Multi-slot Helfereinsätze use the same persistence.

## Slot model

Each slot supports: `label`, optional `description`, `requiredCapacity`, `sortOrder`, optional `startAt` / `endAt` (structured timestamps).

Derived per slot (never UI-only):

- `requiredCapacity`, `claimedCapacity`, `remainingCapacity`, `isFull`

## Concurrency

`claimTeamRequestSlot` runs in a transaction, locks the slot row with `SELECT … FOR UPDATE`, counts active claims, then inserts. Duplicate `(slotId, recipientSnapshotId)` is prevented by a unique index; same delivery user re-claiming the same slot is idempotent.

## Claim identity & guardians

Claims bind to **dispatch snapshots**, not client-supplied Person IDs.

- **Delivery user** (`deliveryUserId`) performs claim/unclaim in the UI/API.
- **Represented subject** remains on the snapshot (`subjectPersonId`, `viaGuardianSubstitution`).
- One claim action selects a **single** snapshot (prefers non-guardian-substitution when multiple snapshots exist for the same delivery user).
- Re-claim on the same slot for the same delivery user is idempotent across snapshots.

## Lifecycle

- Draft → publish → request `lifecycle = OPEN`
- Organizer may **close** (`CLOSED`); deadline can effectively close claim mutations while lifecycle stays `OPEN` until closed
- **FULL** is derived when all slot capacities are satisfied; `FULL ≠ CLOSED`
- Historical claims are retained

## Engagement

Successful claim transitions eligible snapshot engagement to **RESPONDED** (preserves existing `readAt` / `acknowledgedAt`). Unclaim does **not** roll back historical RESPONDED.

## Audience

Published requests use `resolveCommunicationRecipientsForDispatch()` with Team presets (`ALL`, `PLAYERS`, `TRAINERS_STAFF`). No Zielgruppe builder required for the default team flow.

## Organizer vs recipient visibility

- **Organizer / send-capable trainer:** aggregate status + claimant detail API
- **Ordinary recipient:** own claims + aggregate capacity; no peer identity list

## Aufgaben boundary

Claim ≠ assignment. Optional future **explicit** “Aufgabe erstellen” bridge is documented via `RequestClaimToAufgabeSeam` — not implemented in COMM-08.

## Event boundary

Optional `eventId` when Event exists in tenant and matches team access. Request claims do not read or write Event attendance.

## Notification

- **TEAM_REQUEST_PUBLISHED** on publish (sender excluded, dispatch recipients only)
- No claim/unclaim notifications in COMM-08

## COMM-10 reminder seams

- `listRequestNonRespondedSnapshotIds`
- `listRequestsWithOpenCapacity`
- `listRequestSlotsWithOpenCapacity`

Historical recipients always derive from dispatch snapshots.

## Known limitations

- No schedule conflict detection across slots
- No organizer override unclaim
- No push (COMM-09)
- No automatic Aufgabe conversion

## API (mobile seams)

- `POST /api/teams/:teamId/communications/requests`
- `POST …/request/claim`, `…/unclaim`, `…/close`
- `GET …/request/status`, `…/claimants`
