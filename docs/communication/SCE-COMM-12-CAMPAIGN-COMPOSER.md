# SCE-COMM-12 — Campaign Composer

**Programme:** SCE COMM  
**Branch:** `cursor/comm-12-campaign-composer`  
**Services:** `lib/communication/campaign/`  
**Routes:** `/dashboard/communication/kampagnen`  
**API:** `/api/communication/campaign/*`

---

## Canonical ownership

Campaign is a **Communication workflow/type** on **PlatformCommunication** (`kind = CAMPAIGN`). There is no parallel campaign recipient, delivery, or notification domain.

| Concern | Owner |
|--------|--------|
| Content + lifecycle | `PlatformCommunication` |
| Internal identification | `PlatformCommunication.internalName` |
| Recipient-facing title | `PlatformCommunication.subject` |
| Audience definitions | `CommunicationAudienceSpec` + COMM-02 `TargetGroup` |
| Recipient resolution | COMM-03 |
| Sender scope | COMM-03 `resolveSenderCommunicationScope` |
| Snapshots | `PlatformCommunicationRecipientSnapshot` |
| Notifications | Canonical `Notification` |
| Push | COMM-09 downstream only |

**Campaign audience uses canonical Zielgruppen/COMM-03.**

**Audience resolves at publish time; draft/ready rows store intent only.**

**Published recipient snapshots are immutable and must never be recomputed.**

**Campaign authorization (`communication.club.send`) remains separate from Zielgruppe membership.**

**Push remains COMM-09 downstream; COMM-12 does not implement VAPID/provider/service worker logic.**

---

## Lifecycle

| Status | Meaning |
|--------|---------|
| `DRAFT` | Editable composition |
| `READY` | Reviewed, publishable (still editable) |
| `PUBLISHED` | Dispatch completed; historical record |
| `ARCHIVED` | Retired from active lists |

Published content is not silently mutated; further sends require a new publication (future explicit resend/version packages).

---

## Composer

Built on COMM-11 club composer primitives:

- Internal campaign name (`internalName`)
- Recipient subject/title (`subject`)
- Body (`bodyText`)
- Audience (whole org, Zielgruppen, structural selectors via audience spec)
- Attachments via canonical `CommunicationAttachment` links
- Audience preview (COMM-03 counts)
- Content preview (presentation-only)
- Save draft / mark ready / publish

---

## Publish pipeline

```
Campaign (CAMPAIGN)
  → PlatformCommunication publish transition
  → COMM-03 dispatch + safeguarding
  → immutable PlatformCommunicationRecipientSnapshot rows
  → Notification (CLUB_CAMPAIGN_PUBLISHED)
  → COMM-09 Push (downstream)
```

Publish is idempotent: repeating publish on an already published campaign does not duplicate snapshots or notifications.

---

## Channel intent (transport-independent)

`orchestrationMetaJson` records:

- `IN_APP` — active
- `PUSH` — active via Notification/COMM-09
- `email: NOT_IMPLEMENTED` — COMM-13 owns outbound email delivery

Scheduling seam records `SCHEDULED_NOT_IMPLEMENTED` for COMM-16.

---

## Boundaries

| Package | COMM-12 stance |
|---------|----------------|
| COMM-13 Email Delivery | No SMTP/provider/queue; email intent only |
| COMM-14 Sponsor Campaigns | No sponsor fields or audiences |
| COMM-15 Communication Center / Inbox / IMAP | Not implemented |
| COMM-16 Templates & Scheduling | No template library or scheduler; minimal seam only |

---

## Permissions

Reuses COMM-11:

- `communication.club.view`
- `communication.club.send`
- `communication.club.engagement_detail`

---

## Database

Migration: `20260927260000_sce_comm_12_campaign_composer`

- Adds `READY` to `PlatformCommunicationStatus`
- Adds optional `internalName` on `PlatformCommunication`
- Adds `CLUB_CAMPAIGN_PUBLISHED` notification type
- Index on `(tenantId, kind, status)`

No `Campaign*` tables.

---

## API seams (mobile-ready)

- `GET/POST /api/communication/campaign`
- `GET/PATCH /api/communication/campaign/[id]`
- `POST /api/communication/campaign/preview`
- `GET /api/communication/campaign/[id]/preview-content`
- `POST /api/communication/campaign/[id]/ready`
- `POST /api/communication/campaign/[id]/publish`
- `POST /api/communication/campaign/[id]/archive`
- `GET /api/communication/campaign/[id]/engagement?detail=1`
