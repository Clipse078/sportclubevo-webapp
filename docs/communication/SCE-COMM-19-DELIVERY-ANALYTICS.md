# SCE-COMM-19 — Delivery & Analytics

**Delivery analytics report evidence, not assumptions.**

## Counting contract

| Term | Meaning |
|------|---------|
| **Target subject** | Person or external entity the communication concerns (distinct `subjectPersonId` / sponsor subject snapshots). |
| **Recipient snapshot** | Immutable dispatch-time `PlatformCommunicationRecipientSnapshot` row. |
| **Delivery identity** | Actual user or external contact used for channel delivery (`deliveryUserId` or sponsor contact without user). |
| **Delivery attempt** | Channel-specific attempt row (e.g. `PlatformCommunicationEmailDeliveryAttempt`, `NotificationPushDeliveryAttempt`). |

Guardian expansion (COMM-18) increases delivery identities without changing subject count.

## Channel truth

- **In-App**: available, unread, read, acknowledged, responded — distinct states; read ≠ acknowledged ≠ responded.
- **Push**: attempted / sent (provider acceptance) / failed / skipped. Device attempts may exceed recipient identities. No read/open claims.
- **E-Mail**: pending, processing, sent (provider/transport acceptance only), failed, skipped. **SENT does not mean READ or inbox delivery.**

## Safeguarding

Aggregates only: minor subjects at dispatch, guardian-expanded deliveries, guardian-unavailable exclusions. No DOB or guardian graph in analytics payloads.

## Preferences (COMM-17)

Skipped email attempts aggregate reason buckets (disabled, consent required, channel unavailable). No club-wide consent search UI.

## Scheduling (COMM-16)

Until `PUBLISHED`, analytics show schedule state — **scheduled ≠ sent**.

## Authorization

- Summary: `communication.club.view` / team view scope.
- Recipient detail: `communication.club.engagement_detail` (or sender/team send rules).

## API

- `GET /api/communication/[communicationId]/analytics`
- `GET /api/communication/[communicationId]/delivery-detail?cursor=&limit=`

## Service

`getCommunicationDeliveryAnalytics({ tenantId, communicationId })` — single canonical aggregation layer for club, team, and campaign communications.
