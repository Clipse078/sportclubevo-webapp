# SCE-COMM-UX-05 — Kampagnen End-to-End UX

**Programme:** SCE COMM  
**Branch:** `cursor/comm-ux-05-campaigns`  
**Routes:** `/dashboard/communication/kampagnen`, `/new`, `/[id]`  
**Architecture:** SCE-COMM-12, COMM-03, COMM-11–19 (unchanged domain contracts)

---

## Product purpose

**Kampagnen** are planned organisation-wide communications to broader selected audiences — optionally via saved Zielgruppen, multiple channels, scheduling, and post-publication delivery analytics. Distinct from operational **Mitteilungen** (COMM-UX-04) and person-to-person **Direktnachrichten** (COMM-UX-04A).

No parallel campaign engine: all persistence remains `PlatformCommunication` with `kind: CAMPAIGN`.

---

## Discovery summary

| Area | Owner |
|------|--------|
| Campaign owner | `campaign-service.ts` (COMM-12) on organisation conversation |
| Lifecycle | `DRAFT` / `READY` / `PUBLISHED` / `ARCHIVED` + publication schedule overlay |
| Composer API | `/api/communication/campaign` + publish/schedule/archive |
| Audience | COMM-03 via `audienceSpecJson`, Zielgruppen + sponsor selectors |
| Sponsor context | COMM-13 sponsor audience components (same engine) |
| Channels | `orchestrationMetaJson` (`inApp`, `push`, `email`) |
| Templates | COMM-16 `PlatformCommunicationTemplate` (`kind: CAMPAIGN`) |
| Scheduling | COMM-16 `PlatformCommunicationPublicationSchedule` |
| Delivery | COMM-14 email queue + in-app/push notifications |
| Analytics | COMM-19 `CommunicationDeliveryAnalyticsPanel` |
| Authorization | COMM-11 club send/view/engagement permissions (re-exported as campaign auth) |

---

## Overview IA

- COMM-UX-01 shell (`CommunicationWorkspaceHeader`, `CommunicationContentSurface`)
- H1 **Kampagnen** + concise planned-communication description
- **Neue Kampagne** (send permission)
- Toolbar: search, status (incl. **Geplant** via schedule filter), **Meine Kampagnen**
- Desktop table / mobile linked cards — full row opens detail
- Columns: title/subject, lifecycle status, audience summary, channels, time, creator, delivery snapshot count (published only)
- Removed internal schedule board with raw `kind` labels from pre-UX list

Display helpers: `lib/communication/campaign/kampagnen-display.ts`

---

## Lifecycle presentation

Canonical status mapped to German UI:

- Entwurf, Bereit, Geplant (schedule `SCHEDULED`), Wird versendet (`PROCESSING`), Veröffentlicht, Archiviert

Delivery failures remain in COMM-19 analytics — not promoted to lifecycle **Fehlgeschlagen**.

---

## Composer IA

Single-page sequential sections (aligned with Mitteilungen UX):

1. **Inhalt** — internal name, Betreff, Nachricht; optional template apply (COMM-16)  
2. **Empfänger** — whole org, Zielgruppen, sponsor audience (COMM-13) + preview  
3. **Kanäle** — In-App / Push / E-Mail toggles + email readiness link to E-Mail-Absender  
4. **Zeitpunkt** — immediate vs plan (COMM-16)  
5. **Überprüfen** — summary + confirmation before publish/plan  

Actions: **Entwurf speichern**, **Jetzt veröffentlichen** / **Kampagne planen** (no ambiguous Speichern for publish).

---

## Templates seam

Optional template dropdown loads CAMPAIGN templates server-side; **Vorlage übernehmen** fetches template detail and populates draft fields. Manage link to Vorlagen when authorized. Saving draft as template uses existing `from-communication` API.

---

## Audience / Zielgruppen

Human-readable summaries via `summarizeClubAudienceSpec`. Editor state inference: `kampagnen-audience-editor.ts`. Preview: `POST /api/communication/campaign/preview` (COMM-03).

Copy states audience ≠ guaranteed delivery (preferences, consent, safeguarding, channel eligibility).

---

## Sponsor / commercial consent

Sponsor audience uses canonical campaign engine. Composer surfaces werbliche Kommunikation notice (COMM-17 boundary). Zielgruppe membership is not treated as commercial consent.

---

## Safeguarding

Static copy + canonical recipient resolution (COMM-18). No campaign-specific minor logic.

---

## Detail IA

- **Übersicht** — status, creator, time, channels, audience (+ sponsor context when applicable)  
- **Inhalt / Empfänger** — frozen snapshot messaging for published campaigns  
- **Zustellung & Reaktionen** — COMM-19 panel (channel-separated, no email-open fiction)  
- **Empfängerdetails** — paginated table when engagement-detail permission  
- **Archivieren** when lifecycle allows  

---

## Authorization

View: club communication view permissions. Send/manage: `COMMUNICATION_CLUB_SEND`. Engagement summary: published analytics. Recipient detail: `COMMUNICATION_CLUB_ENGAGEMENT_DETAIL` (or send fallback per COMM-11).

---

## Responsive / accessibility

Table/card split at `md`. Composer sections use labelled headings, field labels, review checkbox, status pills with screen-reader hints where needed.

---

## Performance

Overview avoids per-row analytics; schedule joined in batch in `listCampaigns`. Recipient detail capped (50) on detail page.

---

## Schema

No schema changes in UX-05. List enrichment uses existing publication schedule + orchestration JSON.

---

## Deferred

- COMM-UX-07 full template management UI  
- Separate “delivery failed” lifecycle badge (would misrepresent partial failures)  
- Per-campaign inbox views (Kampagnen are not an inbox)

---

## Tests

`app/(admin)/dashboard/communication/__tests__/comm-ux-05-kampagnen.test.tsx` — overview, composer, sponsor notice, detail/analytics gates, lifecycle labels, filters.

Regression: COMM-12 list mock updated for schedule join.
