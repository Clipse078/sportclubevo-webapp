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

- Passwords/app passwords encrypted at rest (`communication-secret-crypto.ts`)
- Never returned to browser after storage
- Never logged or stored in audit metadata
- Connection test returns safe codes/messages only

---

## IMAP sync

- Incremental UID sync per folder (`CommunicationCenterMailboxFolder`)
- Tracks `uidValidity`, `lastProcessedUid`
- UIDVALIDITY change resets cursor (no duplicate replay across validity epochs)
- Idempotent import keys: `(folderId, uidValidity, imapUid)` + tenant-scoped `Message-ID`
- Cron batch processor isolates broken mailboxes
- Sync lease prevents concurrent workers on same mailbox

Provider deletion sync is **not** implemented (import/history oriented).

---

## Messages

Parsed canonical fields: Message-ID, In-Reply-To, References, addresses, subject, plain text, sanitized HTML, attachment metadata.

HTML is sanitized; remote images blocked by default (`data-blocked-remote-src`).

---

## Threading

Primary: Message-ID / In-Reply-To / References.  
Conservative subject fallback only when headers missing (stored as `subject-fallback:…` root id).

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

Reply failures keep thread intact; retry via idempotency key.

Outbound reply attachments remain deferred (COMM-14 attachment transport scope).

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
