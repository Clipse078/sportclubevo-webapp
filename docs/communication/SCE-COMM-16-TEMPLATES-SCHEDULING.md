# SCE-COMM-16 — Templates & Scheduling

## Ownership

| Concern | Owner |
|--------|--------|
| Reusable authoring defaults | `PlatformCommunicationTemplate` (tenant-scoped) |
| Communication instances | `PlatformCommunication` |
| Publication & recipient snapshots | Existing `publishCampaign` / `publishClubCommunication` (COMM-11/12) + COMM-03 |
| Delivery channels | IN_APP, Push (COMM-09), Email (COMM-14) |
| Future execution intent | `PlatformCommunicationPublicationSchedule` |
| Governance email templates | Legacy `CommunicationTemplate` (Vereinsleitung) — **not** COMM-16 |

## Template vs communication

- A template is **not** a communication.
- **Use template** creates a normal `DRAFT` communication, copies reusable fields/defaults, and stores `sourcePlatformTemplateId` + `sourcePlatformTemplateVersion` (`updatedAt` at use time).
- Later template edits do **not** mutate existing drafts or published communications.

### Supported template kinds

- `CAMPAIGN`
- `MESSAGE`
- `ANNOUNCEMENT`
- `ALERT`

Poll / Date poll / Request templates are intentionally excluded (structured domain models).

### Audience semantics

- Templates may store `audienceSpecJson` with **canonical selectors** (saved Zielgruppe ids, structural selectors, sponsor selectors).
- No recipient snapshots at template creation or template use.
- Dynamic membership is resolved at **publication** (schedule execution or publish-now).

## Scheduling lifecycle

`PlatformCommunicationPublicationSchedule.status`:

1. `SCHEDULED` — waiting for `scheduledAt` (UTC instant)
2. `PROCESSING` — atomically claimed by cron worker (`claimedAt`, `leaseExpiresAt`)
3. `PUBLISHED` — canonical publish succeeded (communication `PUBLISHED`)
4. `FAILED` — terminal scheduler/publication failure (bounded attempts)
5. `CANCELLED` — user cancelled or immediate publish consumed schedule

Communication remains `DRAFT`/`READY` until execution. Scheduling does **not** publish immediately.

## Timezone

- Tenant IANA timezone from `Tenant.timezone` (fallback `Europe/Zurich` via `resolveTenantEventTimezone`).
- UI uses `datetime-local` interpreted in tenant timezone; persisted `scheduledAt` is UTC plus `timezone` IANA context on the schedule row.
- DST handled by `parseTenantLocalDateTimeInput` / `zonedTimeToUtc` (same helpers as Event/Tournament local datetimes).
- **Non-existent local times** (spring-forward gap): rejected at schedule validation when the parsed UTC instant would **not** round-trip to the submitted `datetime-local` label (`parseScheduleInstant` guard). Example: Europe/Zurich `2026-03-29T02:30` fails closed instead of silently shifting to another wall time.
- **Ambiguous local times** (fall-back overlap): parsing is deterministic and stable across repeated input (Europe/Zurich `2026-10-25T02:30` contract in tests).

## Cron

- Route: `GET /api/cron/communication-scheduler`
- Auth: `Authorization: Bearer ${CRON_SECRET}` (fail closed)
- Vercel cadence: `*/1 * * * *` (~1 minute precision, not seconds)

## Claim, recovery, retry

- Claim-before-publish via `FOR UPDATE SKIP LOCKED` SQL (`publication-schedule-claim.ts`).
- Stale `PROCESSING` rows re-claimed when `leaseExpiresAt` elapsed (15 minutes). Re-claim **does not** increment `attemptCount` (only fresh `SCHEDULED` → `PROCESSING` claims do).
- Bounded `attemptCount` / `maxAttempts` (default 5); permanent validation errors → `FAILED`. Transient publish errors return the row to `SCHEDULED` until attempts exhaust.
- Idempotent publish services prevent duplicate snapshots/notifications on retry; processor short-circuits when communication is already `PUBLISHED`.

## Race semantics

| Action | Winner when concurrent with cron claim |
|--------|----------------------------------------|
| **Publish now** | `consumeActivePublicationScheduleForImmediatePublish` uses conditional `updateMany` on `SCHEDULED`/`PROCESSING`; at most one immediate-publish path cancels the active schedule. Canonical publish services enforce single publication either way. |
| **Cancel** | Only allowed in `SCHEDULED`. Once cron owns `PROCESSING`, cancel API returns validation failure (does not pretend success). |
| **Reschedule** | Only allowed in `SCHEDULED`. Cannot move a row already claimed into `PROCESSING`. |

## Audience resolution timing

**Critical:** scheduling does **not** freeze dynamic audiences.

Example: campaign scheduled Monday for Friday; Zielgruppe membership changes Wednesday → Friday execution resolves Friday membership, then creates immutable snapshots.

## Channels

Scheduler calls canonical publish only. Email readiness is evaluated at execution time (COMM-14). Publication success is independent of downstream email delivery failures.

## Authorization

- `communication.templates.view` / `communication.templates.manage`
- Using a template still requires send permission for target communication type (`communication.club.send`).
- Tenant isolation enforced on all template/schedule queries.

## Boundaries

| Package | Scope |
|---------|--------|
| COMM-10 | Event smart reminders (`CommunicationReminderSchedule`) |
| COMM-14 | Outbound email transport |
| COMM-15 | Communication Center + inbound IMAP |
| COMM-16 | Platform templates + one-time publication scheduling |
| COMM-17 | Preferences & consent (future) |
| COMM-19 | Delivery analytics expansion (future) |

Recurring campaigns are **not** in COMM-16 scope.
