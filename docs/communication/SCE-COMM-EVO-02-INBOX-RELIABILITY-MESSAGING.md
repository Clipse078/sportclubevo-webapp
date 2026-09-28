# SCE-COMM-EVO-02 — Inbox Reliability & Messaging

**Depends on:** SCE-COMM-EVO-01 (`cursor/comm-evo-01-product-completion-architecture`, PR #752)  
**Branch:** `cursor/comm-evo-02-inbox-reliability-messaging`

---

## 1. Conversation detail — BigInt root cause

Imported EMAIL rows store `CommunicationCenterMessage.imapUid` and `uidValidity` as Prisma `BigInt`.  
`GET /api/communication/inbox/conversations/[conversationId]` previously returned the raw Prisma graph via `NextResponse.json`, causing `JSON.stringify` to throw and the client to show *Die Konversation konnte nicht geladen werden.*

**Fix:** Explicit API boundary mapper `mapCommunicationCenterConversationDetailForClient()` in `lib/communication/inbox/conversation-detail-client-dto.ts`. No global BigInt hooks, no lossy `Number(bigint)`, no route-local mutation.

---

## 2. Detail DTO boundary

| Policy | Handling |
|--------|----------|
| BigInt (IMAP) | Omitted from client payload (server-only) |
| Dates | ISO 8601 strings (`toISOString()`) |
| Tenant / mailbox / folder IDs on messages | Omitted |
| Provider keys, Message-ID routing internals | Omitted |
| `storageKey`, checksums, ingestion metadata | Omitted |
| Attachments | Public metadata only (`filename`, `contentType`, `sizeBytes`, `downloadAvailable`) |

Client shape aligns with `InboxConversationDetail` / reading pane needs: channel, subject, status, mailbox state, `repliesAllowed`, assignment, participants context, message timeline.

---

## 3. Ansicht (INBOX-02) root causes fixed

1. **Stale split on preset change** — `setLayout` now applies `defaultListSplitPercentForLayout(layout)` whenever the layout preset changes (or user re-selects the same preset with `resetSplit`).
2. **Hydration race** — Initial GET cannot overwrite preferences after local cache or user-driven changes (`userPreferenceTouchedRef`).
3. **Responsive** — Below `lg`, master/detail override remains; stored desktop layout is not written from viewport logic (`CommunicationInboxWorkspaceLayout` read-only w.r.t. persistence).
4. **Persistence errors** — PUT failures show visible German status *Ansicht konnte nicht gespeichert werden.* (no longer `sr-only` only).

Global custom `listSplitPercent` persistence semantics unchanged (single stored value per user/tenant).

---

## 4. Reading pane

COMM-UX-03R2 state machine preserved. Detail errors remain recoverable via **Erneut versuchen**. Selection race guard unchanged. Focus on detail heading only on new selection load.

Email display: sender name/address, To line when present, per-message subject, timestamps, direction, body/HTML, attachment metadata list.

---

## 5. Attachment read path

IMAP ingestion already creates `CommunicationAttachment` + `CommunicationCenterMessageAttachment`.  
Tenant thread download (`downloadCommunicationAttachment`) authorizes via `CommunicationMessage` / thread links only — **not** center messages.

**EVO-02:** Reading pane shows attachment metadata; `downloadAvailable` is false until EVO-04 adds authorized center-message download. No private blob URLs or storage tokens in API responses.

---

## 6. Reply regression

Detail DTO retains `repliesAllowed`, channel, addresses, and message bodies required by existing reply UI/services. No multi-sender, Cc UI, or real outbound email added.

---

## 7. Boundaries (unchanged)

| Package | Scope |
|---------|--------|
| EVO-04 | Full attachment upload/download architecture for Communication Center |
| EVO-08 | Multi-sender |
| EVO-03 | Universal audience composer |
| RELEASE-01 | Remote migration reconciliation |

**Migration:** None (schema sufficient for INBOX-02).

---

## 8. Tests

- `lib/communication/inbox/__tests__/sce-comm-evo-02-inbox-reliability.test.ts`
- EVO-01 defect contracts (`sce-comm-evo-01-inbox-detail-serialization`, `sce-comm-evo-01-inbox-view-defect`) — acceptance tests, must stay green.
