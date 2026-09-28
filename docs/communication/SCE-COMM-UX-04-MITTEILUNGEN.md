# SCE-COMM-UX-04 — Mitteilungen End-to-End UX

**Programme:** SCE COMM  
**Branch:** `cursor/comm-ux-04-mitteilungen`  
**Routes:** `/dashboard/communication/mitteilungen`, `/new`, `/[id]`  
**Architecture:** SCE-COMM-11, COMM-14, COMM-16, COMM-17, COMM-18, COMM-19 (unchanged contracts)

---

## Product purpose

**Mitteilungen** are operational or informational club communications to a defined audience (trainingsinfo, Terminänderung, Vereinsinformation). They are distinct from **Kampagnen** (COMM-UX-05) and from ad-hoc **Neue Nachricht** (COMM-UX-04A).

---

## Overview IA

- COMM-UX-01 `CommunicationWorkspaceHeader` + `CommunicationContentSurface`
- H1: **Mitteilungen**
- Primary action: **Neue Mitteilung** (send permission only)
- Compact table (desktop) / stacked list (mobile)
- Search (`q`) + status filter — server-backed via `listClubCommunications`
- Row hierarchy: title → status → audience → creator → time → delivery snapshot count (published only)
- Scheduled drafts show status **Geplant** via publication schedule join (no per-row analytics queries)

---

## Composer IA

Single-page structured flow:

1. **Inhalt** — Art, Titel/Betreff, Nachricht  
2. **Empfänger** — Ganzer Verein / gespeicherte Zielgruppen + canonical preview API  
3. **Kanäle** — In-App, Push, E-Mail (canonical defaults + readiness)  
4. **Zeitpunkt** — Jetzt senden / Planen (COMM-16 schedule API)  
5. **Überprüfen** — summary + confirmation checkbox before send/schedule  

Actions: **Entwurf speichern** (secondary), **Mitteilung senden** / **Mitteilung planen** (primary).

---

## Audience UX

Reuses Zielgruppen / structural specs already stored in `audienceSpecJson`. UI exposes whole-organisation and saved Zielgruppen selection; complex specs remain visible via audience summary on detail.

---

## Recipient preview

`POST /api/communication/club/preview` — shows effective subject count, exclusions, scope notice. Copy clarifies preferences and safeguarding (COMM-17/18).

---

## Safeguarding

Static product copy: minors route delivery to guardians per club policy. Analytics panel (COMM-19) keeps subject vs delivery identity separation.

---

## Channels

Presentation-only in composer (canonical channel intent defaults). No provider names. Email readiness from `/api/communication/email/readiness`.

---

## Scheduling

Draft + `POST /api/communication/schedules/:id` — tenant timezone via `CommunicationScheduleFields`.

---

## Review / publish

Review section summarizes content, audience, channels, timing. Send uses `/api/communication/club/send` or draft publish route; scheduling does not imply delivery until publication processor runs.

---

## Detail IA

- **Übersicht** — status, creator (person name), time, audience  
- **Inhalt** / editable composer for drafts without active schedule  
- **Empfänger** — summary + snapshot count when published  
- **Zustellung & Reaktionen** — `CommunicationDeliveryAnalyticsPanel` + optional detail table (engagement permission)

---

## Analytics semantics

No fabricated email-open metrics. Summary uses COMM-19 canonical buckets. Recipient detail paginated (limit 50) and permission-gated.

---

## Permissions

| Capability | Permission |
|------------|------------|
| View list/detail | `communication.club.view` (+ tenant admin) |
| Create/send/schedule | `communication.club.send` |
| Recipient-level detail | engagement detail flag on club authz |

---

## Responsive / a11y

One H1 per page, section `h2`s in composer, labelled search/filters, `aria-pressed` on audience chips, review readable by screen readers, mobile list without horizontal table.

---

## Performance

List: bounded `take` (≤100), schedule batch lookup, `_count` snapshots only — no per-row delivery analytics. Preview on demand (not per keystroke).

---

## Boundaries

Does not change Communication hub, inbox, Kampagnen UI, Zielgruppen management, templates library, providers, preferences, safeguarding policy, or schema.
