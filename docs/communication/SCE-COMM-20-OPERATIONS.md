# SCE-COMM-20 — Communication programme operations

Canonical operations reference for the SportClubEvo Communication platform (COMM-01 through COMM-19).  
**Values for secrets are never documented here — variable names only.**

---

## Architecture map

| Area | Canonical owner | Key paths |
|------|-----------------|-----------|
| Domain contracts | COMM-01 | `lib/communication/platform/` |
| Zielgruppen | COMM-02 | `lib/communication/zielgruppen/` |
| Recipient resolution | COMM-03 | `lib/communication/platform/recipient-resolution/` |
| Team communication | COMM-04–08 | `lib/communication/team/` |
| Web Push | COMM-09 | `lib/push/` + Notification bridge |
| Event smart reminders | COMM-10 | `lib/communication/event/`, `lib/communication/smart-reminders/` |
| Club communication | COMM-11 | `lib/communication/club/` |
| Campaign composer | COMM-12 | `lib/communication/campaign/` |
| Sponsor audience | COMM-13 | `lib/communication/sponsor/` |
| Outbound email | COMM-14 | `lib/communication/platform-email/` |
| Inbound IMAP / inbox | COMM-15 | `lib/communication/inbox/` |
| Templates & scheduling | COMM-16 | `lib/communication/templates/`, schedules API |
| Preferences & consent | COMM-17 | `lib/communication/preferences/` |
| Youth / guardian safeguarding | COMM-18 | `lib/communication/platform/safeguarding/` |
| Delivery analytics | COMM-19 | `lib/communication/analytics/` |

**Downstream (not Communication domain truth):** `lib/notifications/*` delivers user attention; Billing email uses `lib/billing/billing-communication/*` and Infomaniak SMTP — separate from Communication Resend transport.

### Channels (active)

`IN_APP`, `PUSH`, `EMAIL` — see `lib/communication/platform/channels.ts`. SMS is reserved, not implemented.

### Preference categories

`TEAM_OPERATIONAL`, `CLUB_OPERATIONAL`, `CLUB_INFORMATION`, `SPONSOR_COMMERCIAL` — see `lib/communication/platform/preference-categories.ts`.

### Audience formula (invariant)

`selected target ∩ sender communication scope ∩ recipient eligibility` (authorization ≠ membership).

Recipient snapshots at publish time are immutable (`PlatformCommunicationRecipientSnapshot`).

---

## Environment variables (names only)

| Variable | Used by |
|----------|---------|
| `DATABASE_URL` | Prisma / all persistence |
| `CRON_SECRET` | All `/api/cron/*` routes (fail closed when unset in production side-effect policy) |
| `RESEND_API_KEY` | Communication outbound email (`lib/email/mailer.ts`) |
| `EMAIL_FROM` | Platform default sender fallback |
| `EMAIL_INBOUND_DOMAIN` | Reply routing / inbound addressing seams |
| `RESEND_RECEIVING_API_KEY` | Optional Resend receiving API (when distinct from `RESEND_API_KEY`) |
| `COMMUNICATION_EMAIL_TEST_RECIPIENT` | Bounded test send recipient for email readiness |
| `SCE_COMMUNICATION_ENCRYPTION_KEY` | AES-256-GCM for IMAP mailbox credentials (COMM-15) |
| `PUSH_VAPID_PUBLIC_KEY` | Web Push client subscription |
| `PUSH_VAPID_PRIVATE_KEY` | Web Push server signing |
| `PUSH_VAPID_SUBJECT` | VAPID subject (`mailto:` or `https:`) |
| `APP_BASE_URL` | Deep links in email/push rendering |
| `ACCEPTANCE_ENABLED_EXTERNAL_PROVIDERS` | Acceptance / side-effect gating (includes `web-push`, `resend`, `cron` as configured) |

Billing SMTP and invoice mail identity variables remain in Billing docs — do not merge with Communication transport.

---

## Production cron inventory

All routes: `GET`, `Authorization: Bearer ${CRON_SECRET}`, fail closed when secret unset.

| Path | Cadence (vercel.json) | Purpose |
|------|------------------------|---------|
| `/api/cron/communication-inbox-sync` | `*/5 * * * *` | IMAP mailbox sync (COMM-15) |
| `/api/cron/platform-communication-email` | `*/5 * * * *` | Outbound Communication email batch processor (COMM-14) |
| `/api/cron/communication-reminders` | `*/1 * * * *` | Due smart reminder schedules (COMM-10) |
| `/api/cron/communication-scheduler` | `*/1 * * * *` | Scheduled Communication publication (COMM-16) |

Push delivery for Communication uses the shared Notification pipeline: `processPendingPushNotificationDeliveries` is invoked from `/api/cron/task-notifications`, `/api/cron/participation-notifications`, and `/api/cron/requirement-notifications` (existing platform crons).

Regression guard: `__tests__/vercel-cron-schedules.test.ts` (every `app/api/cron/*/route.ts` must appear exactly once in `vercel.json`).

---

## Operations

### Email readiness (Communication)

1. Configure `RESEND_API_KEY` and tenant **E-Mail-Absender** (`email-sender-service`).
2. Use admin **E-Mail-Absender** UI / `GET /api/communication/email/readiness`.
3. Outbound attempts are processed by `platform-communication-email` cron; publication does not fail when transport is down — attempts stay `PENDING`/`SKIPPED` with reasons.

### Mailbox (inbound)

1. Set `SCE_COMMUNICATION_ENCRYPTION_KEY` before first credential save (production fail closed).
2. Configure mailbox via Kommunikationscenter settings (`communication.inbox.settings`).
3. **Test connection** does not import mail.
4. Sync runs on `communication-inbox-sync` cron; per-mailbox failures are isolated.
5. Replies use canonical Communication outbound email transport.

### Scheduler

Scheduled drafts publish via `communication-scheduler` cron with lease/idempotent publication semantics (COMM-16).

### Push

1. Configure VAPID trio when enabling real Web Push.
2. Users enable push via explicit browser gesture (`enableWebPushFromUserGesture`).
3. Without VAPID, deliveries are `SKIPPED` / `NOT_CONFIGURED`.

### Troubleshooting

| Symptom | Check |
|---------|--------|
| Email stuck pending | Cron registered, `CRON_SECRET`, Resend readiness, recipient email eligibility |
| Inbox not updating | Cron, encryption key, mailbox lease/stale lease logs |
| Reminders not firing | `communication-reminders` cron, `CommunicationReminderExecution` idempotency |
| Push not received | VAPID env, user preference, category matrix, device registration, notification crons |
| Cross-tenant suspicion | API must derive `tenantId` from session — never trust client-supplied tenant |

---

## Security

- **Tenant isolation:** All Communication services scope by authenticated tenant context; foreign IDs fail closed.
- **Credentials:** IMAP secrets encrypted at rest; never returned to browser APIs.
- **Safeguarding:** Guardian delivery expands recipients without granting commercial consent (COMM-18).
- **Consent:** Commercial email requires explicit opt-in; no weak public unsubscribe URL (deferred — see `SCE-COMM-20-DEFERRED.md`).
- **Cron:** No unauthenticated batch processors.

---

## Migrations

Communication programme migrations (COMM-02 onward) live under `prisma/migrations/20260927120000_sce_comm_*` plus earlier `comm_01*` foundation migrations.

**COMM-16 recovery note:** Migration `20260927300000_sce_comm_16_templates_scheduling` was once recovered via `prisma migrate resolve` after objects were verified complete in a target database. **Do not manually pre-create migration objects** in deployed environments — use `prisma migrate deploy` only.

**COMM-20 rule:** Never run migration recovery or writes against remote STAGE/Production from hardening agents; validate locally when disposable DB is available.

---

## Permissions (summary)

| Permission | Surface |
|------------|---------|
| `communication.zielgruppen.view` / `.manage` | Zielgruppen |
| `communication.club.view` / `.send` / `.engagement_detail` | Mitteilungen, Kampagnen, analytics detail |
| `communication.inbox.view` / `.manage` / `.reply` / `.settings` | Kommunikationscenter |
| `sponsoring.view` / `sponsoring.manage` | Sponsor audience seams (COMM-13) |

Team send uses team-scoped authorization (`team-communication-authorization`) plus tenant permissions.

---

## Related documents

- Package specs: `docs/communication/SCE-COMM-*.md`
- Deferred capabilities: `SCE-COMM-20-DEFERRED.md`
- Architecture source matrix: `SCE-COMM-01-source-matrix.json`
