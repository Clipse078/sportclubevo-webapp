# SCE-COMM-INBOX-01 — Mailbox Organization

## Discovered contracts

- **Conversation model:** `CommunicationCenterConversation` (tenant-scoped, cursor-paginated list via `lastMessageAt` + `id`).
- **Workflow status:** `CommunicationCenterConversationStatus` — `OPEN` / `RESOLVED` (unchanged).
- **Per-user read state:** `CommunicationCenterConversationReadState.readAt` (unchanged semantics).
- **Assignment:** `assignedToUserId`, `assignedByUserId`, `assignedAt` (shared, unchanged).
- **IMAP ingestion:** `ingestCommunicationCenterImapMessage` threads by `threadRootMessageId`; no provider folder/archive mutation.
- **Authorization:** `communication.inbox.view` (view + personal read/star), `communication.inbox.manage` (shared organization + assignment/workflow), `communication.inbox.reply`.
- **Audit:** `recordCommunicationCenterAudit` with actions `communication.inbox.conversation.archived|restored|trashed|restored_from_trash`.

## Ownership semantics

| Dimension | Scope | Storage |
|-----------|--------|---------|
| Read / unread | User | `CommunicationCenterConversationReadState.readAt` |
| Star / Markiert | User | `CommunicationCenterConversationReadState.starredAt` (extended read-state row; avoids duplicate user×conversation table) |
| Archive / trash | Shared mailbox organization | `CommunicationCenterConversation.mailboxOrganization` |
| Open / resolved | Shared workflow | `CommunicationCenterConversation.status` |
| Assigned | Shared | assignment fields |

Archive and trash do **not** imply resolved, read, unassigned, or unstarred.

## Schema

- Enum `CommunicationCenterMailboxOrganization`: `INBOX`, `ARCHIVED`, `TRASHED`.
- Conversation fields:
  - `mailboxOrganization` (default `INBOX`)
  - `mailboxOrganizationBeforeTrash` (restore hint after trash)
- Read state: `starredAt` (nullable).

## Migration

`20260928120000_sce_comm_inbox_01_mailbox_organization` — additive, existing rows default to `INBOX`, read rows unchanged.

## PostgreSQL identifier safety

Explicit short index names:

- `cc_conv_tenant_mbox_org_last_idx`
- `cc_conv_read_user_star_idx`

Regression guard: `lib/communication/inbox/__tests__/postgres-identifier-safety-inbox-01.test.ts`.

## Lifecycle

- **Archive:** `INBOX → ARCHIVED` (manage permission, audited).
- **Restore to inbox:** `ARCHIVED → INBOX`.
- **Trash:** stores prior organization in `mailboxOrganizationBeforeTrash`, sets `TRASHED`.
- **Restore from trash:** returns to `mailboxOrganizationBeforeTrash` or `INBOX`.

## Inbound reactivation

New inbound message on existing thread while `ARCHIVED` or `TRASHED` → `INBOX` (clears `mailboxOrganizationBeforeTrash`). Does **not** change `OPEN`/`RESOLVED` (no automatic reopen of resolved conversations in this package).

## Outbound reactivation

- Reply to **archived** conversation → reactivates to `INBOX` before send.
- Reply to **trashed** conversation → blocked (`INVALID_STATE`); restore required.

## Bulk actions

`POST /api/communication/inbox/conversations/bulk` — max **100** deduplicated IDs, tenant-scoped, single transaction for updates; shared organization actions require manage permission.

## Search & mailboxes

List API: `mailbox=INBOX|STARRED|ARCHIVE|TRASH` + secondary `filter` + `search` (server-side on `searchText`).

## Provider boundary

SCE application state only — no IMAP folder moves, provider delete, or Seen flag changes.

## Performance

- Indexes on `(tenantId, mailboxOrganization, lastMessageAt)` and `(tenantId, userId, starredAt)`.
- List includes one read-state row per user (no star N+1).
- Optional batched mailbox counts via `?counts=1`.

## Accessibility & responsive

- Mailbox tabs (desktop) / select (mobile).
- Semantic checkboxes, star toggles, bulk toolbar.
- Reading-pane loading/error/empty contracts preserved (COMM-UX-03R2).

## Security

Unchanged: `bodyHtmlSanitized`, remote image blocking, tenant isolation, encrypted mailbox credentials.

---

## Deferred — SCE-COMM-INBOX-02 — Flexible Inbox Views

- Standard split vs larger reading pane / list presets
- Bottom reading pane, full-width reading, list-only
- Draggable divider and custom split ratio
- Compact / Standard / Spacious density
- Per-user persistence of layout preferences
