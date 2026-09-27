# SCE-COMM-11 — Club Communication

**Programme:** SCE COMM  
**Branch:** `cursor/comm-11-club-communication`  
**Services:** `lib/communication/club/`  
**Routes:** `/dashboard/communication/mitteilungen`  
**API:** `/api/communication/club/*`

---

## Canonical ownership

Club Communication reuses **PlatformCommunication**; it is not a separate communication domain.

| Concern | Owner |
|--------|--------|
| Content + lifecycle | `PlatformCommunication` |
| Originating context | `CommunicationContextRef` (`ORGANISATION`, optional `ORG_UNIT`) |
| Audience definitions | `CommunicationAudienceSpec` + COMM-02 `TargetGroup` |
| Recipient resolution | COMM-03 `resolveCommunicationRecipients*` |
| Sender scope | COMM-03 `resolveSenderCommunicationScope` |
| Snapshots | `PlatformCommunicationRecipientSnapshot` |
| Notifications | Canonical `Notification` |
| Push | COMM-09 downstream only |

**Zielgruppen remain organisation-wide audience definitions and are not owned by Club Communication.**

**Selecting a Zielgruppe does not grant authorization to communicate with all of its members.**

**Effective recipients remain selected target ∩ sender communication scope ∩ recipient eligibility.**

**Dynamic audiences are resolved at publish time; sent recipient snapshots are immutable.**

**COMM-11 reuses COMM-09 Push through the canonical Notification pipeline and does not implement Push delivery itself.**

**COMM-11 does not implement Campaign Composer or Email Delivery.**

---

## Information architecture

```
Kommunikation
  → Mitteilungen   (/dashboard/communication/mitteilungen)
  → Zielgruppen    (/dashboard/communication/zielgruppen)
```

Deep links for notifications: `/dashboard/communication/mitteilungen/{communicationId}`.

---

## Communication types (club level)

| Kind | Enabled in COMM-11 |
|------|-------------------|
| MESSAGE | Yes |
| ANNOUNCEMENT | Yes |
| ALERT | Yes |
| POLL / DATE_POLL / REQUEST / CAMPAIGN | No (later packages) |

---

## Permissions (`PermissionModule.COMMUNICATION`)

| Permission | Purpose |
|------------|---------|
| `communication.club.view` | List/read published club communications |
| `communication.club.send` | Create/edit/publish/archive drafts; full org sender scope |
| `communication.club.engagement_detail` | Recipient-level engagement detail on demand |

Club admin / platform super admin inherit send + detail where applicable.

Team trainers **do not** receive club send rights from `communication.team.send` alone.

---

## Composer & audience modes

- **Whole organisation** — structural `wholeOrganisation: true` (resolved by COMM-03, not direct User query from UI)
- **Saved Zielgruppe(n)** — `savedTargetGroupIds` with UNION composition + deduplication
- **Structural targets** — org units, teams, roles via canonical selectors
- **Explicit persons** — only where audience validation already supports include/exclude

Preview uses COMM-03 counts (`previewClubCommunicationAudience`). Detailed recipient names require engagement-detail permission.

---

## Draft vs dispatch

- **Draft save** persists `audienceSpecJson` only — **no** recipient snapshots.
- **Publish** calls COMM-03 dispatch, writes immutable snapshots, emits Notifications.

---

## Safeguarding

All sends pass COMM-03 guardian expansion and channel eligibility. Snapshot rows retain `subjectPersonId`, `deliveryUserId`, `viaGuardianSubstitution`.

---

## Notifications

| Kind | NotificationType |
|------|------------------|
| MESSAGE | `CLUB_COMMUNICATION_PUBLISHED` |
| ANNOUNCEMENT | `CLUB_ANNOUNCEMENT_PUBLISHED` |
| ALERT | `CLUB_ALERT_PUBLISHED` |

Push eligibility follows COMM-09 mapping (ALERT → high priority hint).

---

## Boundaries

| Package | COMM-11 stance |
|---------|----------------|
| COMM-12 Campaign Composer | Not implemented; composer primitives reusable |
| COMM-13 Email Delivery | No outbound email; IN_APP (+ preference seam) only |
| COMM-14 Sponsor | No sponsor fields or audiences |

---

## Mobile / API seams

Presentation-independent endpoints:

- `GET/POST /api/communication/club`
- `GET/PATCH /api/communication/club/[id]`
- `POST /api/communication/club/preview`
- `POST /api/communication/club/send`
- `POST /api/communication/club/[id]/publish`
- `POST /api/communication/club/[id]/archive`
- `POST /api/communication/club/[id]/acknowledge`
- `GET /api/communication/club/[id]/engagement?detail=1`

---

## Database

Migration: `20260927250000_sce_comm_11_club_communication`

- Adds `ORGANISATION` / `ORG_UNIT` conversation context kinds
- Adds `ORG_GENERAL` conversation kind
- Adds club permissions + notification enum values
- **No** `ClubCommunication` table

---

## Known limitations

- Club composer UI exposes whole-organisation and saved Zielgruppen first; advanced structural pickers can extend the existing audience spec contract without new domain models.
- Email channel remains preference-compatible but COMM-13 owns delivery.
- Campaign workflow, scheduling, and analytics belong to COMM-12+.
