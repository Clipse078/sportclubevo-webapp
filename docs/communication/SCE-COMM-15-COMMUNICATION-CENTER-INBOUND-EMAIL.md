# SCE-COMM-15 — Communication Center & Inbound Email/IMAP

**Programme:** SCE COMM  
**Branch:** `cursor/comm-15-communication-center-inbound-email`  
**Services:** `lib/communication/inbox/`  
**UI:** `/dashboard/communication/inbox`, `/dashboard/communication/inbox/settings`  
**Cron:** `/api/cron/communication-inbox-sync`

---

## Summary

COMM-15 introduces the canonical **Kommunikationscenter** — a unified workspace for communication requiring attention.

Email/IMAP is implemented as an **inbound connector**, not as the Communication Center itself. The center owns conversations, assignment, read state, context linking, and replies. Outbound replies reuse **COMM-14** transport (`lib/email/outbound-email-transport.ts` + tenant E-Mail-Absender).

---

## Architecture

```
Kommunikationscenter
├── SCE communication (future connectors)
└── Email connector (IMAP today)
      └── InboundCommunicationConnector
            └── ImapInboundCommunicationConnector (imapflow + mailparser)
```

**Conversation owner:** `CommunicationCenterConversation` / `CommunicationCenterMessage` (distinct from `PlatformCommunication` club/campaign publishing and from COMM-01A registration `CommunicationThread`).

Optional links:

- `platformCommunicationId` on conversation
- `CommunicationCenterContextLink` (Person, Team, OrgUnit, Sponsor, Event, …)

---

## Mailbox model

`CommunicationCenterMailbox` (multi-tenant, multi-mailbox):

- connector type (`IMAP`)
- status (`ACTIVE`, `DISABLED`, `DISCONNECTED`)
- IMAP host/port/security/username
- encrypted credential (`SCE_COMMUNICATION_ENCRYPTION_KEY`, AES-256-GCM)
- sync lease + safe last error metadata

Disconnect stops future sync; historical conversations remain.

---

## Credential security

- Algorithm: **AES-256-GCM** (`lib/communication/inbox/communication-secret-crypto.ts`), payload format `v1:iv:tag:ciphertext`.
- **Production:** `SCE_COMMUNICATION_ENCRYPTION_KEY` is required before the first mailbox credential is saved (32-byte base64 or 64-char hex). Missing, empty, or malformed keys **fail closed** (no plaintext fallback).
- **Tests only:** when `NODE_ENV=test` and the key is unset, a fixed test key is used (`COMMUNICATION_SECRET_CRYPTO_TEST_KEY_BASE64`).
- Passwords/app passwords encrypted at rest; **never** returned to the browser after storage (`hasCredential` only).
- Never logged or stored in audit metadata (`inbox-audit.ts` strips forbidden fields).
- **Key rotation:** changing `SCE_COMMUNICATION_ENCRYPTION_KEY` does **not** automatically re-encrypt existing rows. Operators must replace mailbox credentials (or run a controlled migration) after rotating the application key.
- Credential replacement writes a new ciphertext; failed replacement does not clear an existing credential. Disconnect sets status `DISCONNECTED` (sync stops); ciphertext may remain for audit/reconnect but is not used while inactive.

---

## Production configuration contract

| Requirement | When |
|-------------|------|
| `SCE_COMMUNICATION_ENCRYPTION_KEY` | Before saving the first mailbox credential |
| `CRON_SECRET` | Before scheduled inbox sync runs in deployed environments |
| Cron route | `GET /api/cron/communication-inbox-sync` with `Authorization: Bearer ${CRON_SECRET}` |

Registered in `vercel.json` (`*/5 * * * *`, same cadence as billing inbound sync). Do not commit secret values.

The application **must** build and start without any configured mailbox; empty inbox/settings states are valid.

---

## IMAP sync

- Incremental UID sync per folder (`CommunicationCenterMailboxFolder`)
- Tracks `uidValidity`, `lastProcessedUid`
- UIDVALIDITY change resets cursor (no duplicate replay across validity epochs)
- Idempotent import keys: `(folderId, uidValidity, imapUid)` + tenant-scoped `Message-ID`
- **Cursor on failure:** if a message fails with a retryable ingest error, sync stops advancing the UID cursor beyond the last durably ingested UID so a later run can retry (e.g. UID 101 ok, 102 fails → cursor stays at 101).
- Cron batch processor isolates broken mailboxes (one auth failure does not stop others)
- Sync lease (`syncLeaseToken` / `syncLeaseExpiresAt`) prevents concurrent workers; stale leases expire and can be reclaimed

Provider deletion sync is **not** implemented (import/history oriented).

---

## Messages

Parsed canonical fields: Message-ID, In-Reply-To, References, addresses, subject, plain text, sanitized HTML, attachment metadata.

HTML is sanitized via `html-sanitizer.ts` (tag stripping for `script`, `iframe`, `object`, `embed`, `form`, etc.; removal of event handlers and `javascript:` URLs; remote `<img src>` rewritten to `data-blocked-remote-src` so tracking pixels do not load automatically).

---

## Threading

Primary: Message-ID / In-Reply-To / References.  
Conservative subject fallback only when headers missing (stored as `subject-fallback:…` root id). Unrelated messages with the same subject are **not** merged when Message-ID headers exist.

`Message-ID` is unique per tenant (`@@unique([tenantId, messageIdHeader])`); duplicates (e.g. Sent-folder re-import or broken senders) are treated as idempotent duplicates, not dropped silently without trace.

Outbound replies captured in-thread; Sent-folder re-import dedupes on Message-ID.

---

## Read state

SCE per-user read/unread via `CommunicationCenterConversationReadState` — independent from provider `\Seen`.

---

## Assignment & workflow

- Assignment to tenant user (`assignedToUserId`, `assignedByUserId`, `assignedAt`)
- Status: `OPEN` / `RESOLVED` (reopen supported)

---

## Contact matching

Tenant-scoped match against `Person.email` and `SponsorContact.email`:

- single match → `MATCHED`
- multiple → `AMBIGUOUS`
- no automatic Person creation

---

## Reply (COMM-14)

`reply-service.ts` → `evaluatePlatformEmailReadiness` + `resolveTenantEmailSender` + `sendOutboundEmail`.

Sender/mailbox mismatch fails closed (`SENDER_MAILBOX_MISMATCH`).

Reply failures keep thread intact (`FAILED` status, visible in UI); retry via stable idempotency key (no duplicate send on double-click/retry).

Outbound reply attachments remain deferred (COMM-14 attachment transport scope).

---

## Inbound attachments

- Metadata stored on `CommunicationAttachment` with `lifecycleStatus: STAGED`, `scanStatus: PENDING`, and a private `storageKey` seam.
- Bytes are **not** uploaded to private blob storage in COMM-15; the inbox UI does not expose download actions.
- Future work: persist to canonical private storage and gate download on `lifecycleStatus` + scan policy (malware scanning deferred).

---

## Email → Aufgabe seam

`CommunicationCenterAufgabeSeamReference` documents the contract; Aufgaben domain remains owner (no parallel inbox task model).

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `communication.inbox.view` | Read inbox |
| `communication.inbox.manage` | Assign / resolve |
| `communication.inbox.reply` | Send replies |
| `communication.inbox.settings` | Mailbox admin |

Tenant club admins receive settings via existing admin OR-path where configured.

---

## Boundaries

| Topic | Owner |
|-------|-------|
| Outbound email transport | **COMM-14** |
| Communication Center + inbound IMAP | **COMM-15** |
| Templates & scheduling | COMM-16 |
| Preferences & consent | COMM-17 |
| Delivery analytics | COMM-19 |

---

## Database

Additive migration: `20260927290000_sce_comm_15_communication_center_inbound_email`
