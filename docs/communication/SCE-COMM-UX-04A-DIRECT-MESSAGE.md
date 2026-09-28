# SCE-COMM-UX-04A — Neue Nachricht / Direktnachricht

**Programme:** SCE COMM  
**Branch:** `cursor/comm-ux-04a-direct-message`  
**Route:** `/dashboard/communication/inbox/new`  
**Architecture:** PlatformCommunication + Communication Center (SCE channel)

---

## Architecture decision

Direct messaging **does not** introduce `DirectMessage`, `PrivateMessage`, or a parallel engine.

| Concern | Owner |
|--------|--------|
| Content + lifecycle + `repliesAllowed` | `PlatformCommunication` (`kind: MESSAGE`, `contextRef.kind: DIRECT`) |
| Programme thread anchor | `PlatformCommunicationConversation` (`contextKind: DIRECT`, `conversationKind: DIRECT_THREAD`, unique `namedThreadSlug` per new thread) |
| Inbox presentation | `CommunicationCenterConversation` (`channel: SCE`) + `CommunicationCenterMessage` |
| Per-user inbox visibility | `CommunicationCenterConversationParticipant` |
| Recipient truth | `PlatformCommunicationRecipientSnapshot` (COMM-03 / COMM-18 / COMM-17 at dispatch) |
| Delivery | Canonical notification + optional COMM-14 email enqueue |

Each **Neue Nachricht** creates a **new** `DIRECT_THREAD` slug (no silent reuse of unrelated history). Replies append within the same inbox conversation / platform conversation pair.

---

## Multi-recipient semantics

Sender → N recipients fans out to **N independent SCE inbox threads** (one platform communication + one Communication Center conversation per subject person).

Recipients do **not** see other recipients (no group chat).

---

## Modes

| UI | Domain | `repliesAllowed` |
|----|--------|------------------|
| **Nachricht** | Two-way | `true` (default) |
| **Nur informieren** | One-way | `false` |

Persisted on `PlatformCommunication` and mirrored on `CommunicationCenterConversation` for inbox rendering.

---

## Reply enforcement

- API: `POST /api/communication/inbox/conversations/:id/reply` → `REPLIES_DISABLED` (403) when locked.
- SCE threads use `direct-reply-service` (in-app message append + dispatch snapshots).
- Email threads use COMM-15 transport only when `repliesAllowed` is true.
- Inbound IMAP replies on locked threads are stored but **do not** flip `repliesAllowed`.

Reply permission requires **both** `communication.inbox.reply` (or manage/admin) **and** `repliesAllowed === true`.

---

## Inbox integration

- Entry: **Neue Nachricht** in Kommunikationscenter header → `/dashboard/communication/inbox/new`.
- List/detail filtered: SCE conversations visible only to `CommunicationCenterConversationParticipant` users; EMAIL remains shared mailbox semantics.
- Locked UI: calm status **Nur zur Information · Antworten deaktiviert** (no disabled composer).

---

## Channels

Composer channel intent stored in `orchestrationMetaJson.channelIntent` (`IN_APP`, `PUSH`, `EMAIL`). Delivery reuses COMM-17 preferences and COMM-14 email enqueue when enabled and ready.

---

## Safeguarding

Uses COMM-03 dispatch + COMM-18 guardian expansion. Subject person remains the child; delivery may expand to guardians via snapshots (`viaGuardianSubstitution`).

---

## Threading

Unrelated historical threads are **not** reused for new sends (new `namedThreadSlug` per send). Replies in an open conversation continue on the same platform/inbox pair.

---

## Inbound email edge case

External email replies to informational messages may arrive in mailbox threads; ingestion preserves messages without unlocking `repliesAllowed`.

---

## Delivery / read

COMM-19 snapshot engagement applies to platform communications. No fabricated email-open metrics.

---

## Signature seam (COMM-UX-08A)

No signature management in 04A. Outbound SCE messages use plain body text; signature injection remains a future seam on send/render.

---

## Deferred

- Outbound attachment upload in direct composer (reuse `PlatformCommunicationAttachment` when product-ready).
- Scheduling (COMM-16) for direct messages.
- Hub-level duplicate composer entry (inbox primary action only; hub unchanged to avoid catalogue noise).

---

## Permissions

Send: `communication.club.send` or `communication.team.send` (tenant admin inherits), scoped via COMM-03 sender scope for recipient search and send.

View/reply inbox: existing COMM-15 inbox permissions + participant visibility for SCE.
