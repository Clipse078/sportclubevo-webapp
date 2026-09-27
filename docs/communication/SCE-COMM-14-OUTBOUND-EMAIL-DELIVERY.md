# SCE-COMM-14 — Outbound Email Delivery

**Programme:** SCE COMM  
**Branch:** `cursor/comm-14-outbound-email-delivery`  
**Services:** `lib/communication/platform-email/`, `lib/email/outbound-email-transport.ts`  
**API:** `/api/communication/email/*`, `/api/cron/platform-communication-email`

---

## Summary

COMM-14 makes **EMAIL** a canonical outbound delivery channel for `PlatformCommunication` recipients (club communication, campaigns, external sponsor snapshots from COMM-13).

Communication remains the owner of content, audience, immutable recipient snapshots, channel intent, and delivery orchestration.

**E-Mail-Absender** (`email-sender-service`) remains the sender identity/configuration owner.

Email transport is provider-neutral at the domain boundary (`sendOutboundEmail` → Resend adapter in `lib/email/mailer.ts`).

**Provider separation (intentional):** Platform Communication outbound email uses **Resend** (API via `lib/email/mailer.ts`). Billing invoice delivery continues to use **`billing-email-transport.ts`** (Infomaniak SMTP when selected). These are separate transport paths; COMM-14 does not introduce a second Communication engine and does not change Billing transport.

`SENT` on `PlatformCommunicationEmailDeliveryAttempt` means **provider/transport acceptance only** (SMTP/API handoff), not mailbox delivery, opens, or reads (COMM-19).

---

## Pipeline

```
PlatformCommunication (published)
  → immutable PlatformCommunicationRecipientSnapshot
  → email eligibility (COMM-03 delivery identity + sponsor snapshot markers)
  → tenant sender resolution (E-Mail-Absender)
  → deterministic rendering (subject/html/text)
  → PlatformCommunicationEmailDeliveryAttempt (idempotent)
  → cron batch processor
  → SMTP/API acceptance recorded as SENT (not DELIVERED/READ)
```

Publication success is independent from email transport outcome.

---

## Delivery state

`PlatformCommunicationEmailDeliveryAttempt` tracks per-recipient snapshot attempts:

| Status | Meaning |
|--------|---------|
| `PENDING` | Queued for transport |
| `PROCESSING` | Claimed by worker |
| `SENT` | Provider accepted message (SMTP/API acceptance) |
| `FAILED` | Terminal/bounded retry exhaustion |
| `SKIPPED` | Not deliverable (missing email, channel disabled, readiness, preference seam) |

No open/read/delivered-to-mailbox analytics (COMM-19).

---

## Sponsors (COMM-13)

External sponsor contacts keep immutable snapshot identity. `externalSnapshotJson.deliveryCapability` records email candidacy at publish time (`EMAIL_DELIVERY_CANDIDATE` vs explicit skip reasons).

Historical snapshots are never rewritten when live sponsor master data changes.

---

## Boundaries

| Topic | Owner |
|-------|-------|
| Inbound email / IMAP / mailbox sync | COMM-15 |
| Reusable templates & scheduling | COMM-16 |
| Preferences & consent evaluator | COMM-17 (integrated at enqueue + processor) |
| Delivery analytics (opens/clicks/dashboards) | COMM-19 |

COMM-14 does **not** implement inbound email, template libraries, or analytics pixels.

---

## Security & privacy

- One logical recipient per outbound message (`to` only; no multi-recipient leakage).
- Provider credentials remain server-side env configuration only.
- Test delivery is authenticated and restricted to `COMMUNICATION_EMAIL_TEST_RECIPIENT`.
- Test delivery does not mutate production communication delivery attempts.

---

## Database

Additive migration: `20260927280000_sce_comm_14_outbound_email_delivery`

---

## Attachments

Communication attachments remain canonical on `PlatformCommunicationAttachment`. Email attachment streaming is deferred in COMM-14; transport sends rendered body content only.
