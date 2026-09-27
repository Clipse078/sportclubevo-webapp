# SCE-COMM-13 — Sponsor Audience Integration

**Programme:** SCE COMM  
**Branch:** `cursor/comm-13-sponsor-audience-integration`  
**Services:** `lib/sponsoring/`, `lib/communication/sponsor/`  
**API:** `/api/communication/campaign/sponsor-audience`

---

## Architecture

| Domain | Owns |
|--------|------|
| **Sponsor** | `SponsorOrganisation`, `SponsorContact`, `SponsorCategory`, status, tenant scope |
| **Communication** | `PlatformCommunication`, campaign composer, `CommunicationAudienceSpec`, COMM-03 resolution, snapshots, notifications, push (COMM-09), engagement |

Communication references Sponsor entities through audience selectors. Communication does **not** copy sponsor master data into communication tables.

---

## Sponsor domain (minimum integration seam)

- `SponsorOrganisation` — partner company (`ACTIVE` / `INACTIVE`)
- `SponsorContact` — sponsor-owned contact, optional `Person` link
- `SponsorCategory` — optional grouping for audience selectors

Sponsor CRM, contracts, packages, and Business Club workflows remain future Sponsor-module work.

---

## Communication audience selectors

`CommunicationAudienceSpec.components[].sponsor`:

| Selector | Meaning |
|----------|---------|
| `allActiveSponsors` | All contacts under ACTIVE organisations at resolution time |
| `sponsorOrganisationIds[]` | Contacts for selected organisations |
| `sponsorContactIds[]` | Explicit contacts |
| `sponsorCategoryIds[]` | Contacts under ACTIVE orgs in categories |

Resolution uses COMM-03 union/dedup semantics. Linked `Person.id` values participate in canonical person resolution; external contacts use immutable sponsor snapshot rows.

---

## Internal vs external recipients

| Type | Delivery | Engagement |
|------|----------|------------|
| Linked Person with User | In-app notification + COMM-09 push eligibility | Canonical read/ack |
| Linked Person without User | Snapshot only (`INTERNAL_PERSON_NO_CHANNEL`) | No fake read state |
| External SponsorContact | Snapshot only (`EXTERNAL_SPONSOR_CONTACT`) | No fake read/open; email capability reported as `EMAIL_NOT_IMPLEMENTED` |

---

## Dynamic audience & publish

- **DRAFT / READY:** audience stores selectors only
- **PREVIEW:** resolves against current Sponsor-domain data
- **PUBLISH:** resolves recipients once; writes immutable `PlatformCommunicationRecipientSnapshot` rows
- **After publish:** sponsor membership changes do not rewrite historical snapshots

---

## Authorization

| Permission | Purpose |
|------------|---------|
| `sponsoring.view` | Read/select sponsor audience sources |
| `sponsoring.manage` | Future sponsor administration |
| `communication.club.send` | Compose/publish campaigns |

Viewing sponsors does not grant send. Sending campaigns does not grant sponsor administration.

---

## Sponsor module UI seam (deferred)

Flow A (`Sponsor → New communication`) uses `sponsorCampaignComposerHref()` to open the canonical campaign composer with preselected sponsor audience. Sponsor detail UI remains a future-module landing page until Sponsor CRM matures.

Communication history for a sponsor organisation is derived from canonical `PlatformCommunication.audienceSpecJson` via `listPlatformCommunicationsForSponsorOrganisation()`.

---

## Boundaries (COMM-14/15/16 not implemented)

| Out of scope | Status |
|--------------|--------|
| Outbound email delivery engine | `EMAIL_NOT_IMPLEMENTED` |
| IMAP communication center | Not implemented |
| Template platform | Not implemented |
| Campaign scheduling platform | Not implemented |
| Sponsor CRM inside Communication | Forbidden |

---

## Database safety

- Additive migration: `20260927270000_sce_comm_13_sponsor_audience_integration`
- No remote migration/seed/db writes in agent execution
- Sponsor-owned tables live in Sponsor domain; snapshot extensions are Communication integration metadata
