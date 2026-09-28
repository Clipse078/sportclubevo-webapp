# SCE-COMM-UX-07 — Vorlagen Workspace

**Programme:** SCE COMM  
**Branch:** `cursor/comm-ux-07-templates`  
**Routes:** `/dashboard/communication/vorlagen`, `/new`, `/[id]`  
**Architecture:** COMM-16 (`PlatformCommunicationTemplate`) — no parallel template engine

---

## Canonical ownership

Reusable communication defaults remain on tenant-scoped **`PlatformCommunicationTemplate`**. Campaigns and Mitteilungen consume templates via COMM-16 services and APIs. Legacy Vereinsleitung `CommunicationTemplate` is out of scope.

---

## Supported kinds

| Kind | UX label | Typical use |
|------|----------|-------------|
| `CAMPAIGN` | Kampagne | Kampagnen composer |
| `ANNOUNCEMENT` | Mitteilung | Vereins-Mitteilungen |
| `ALERT` | Alarm | Vereins-Mitteilungen |
| `MESSAGE` | Nachricht | Club drafts only (not inbox Direktnachricht) |

Poll / structured team types are excluded (COMM-16 contract).

---

## Content model

- Name, description, status (`DRAFT` / `ACTIVE` / `ARCHIVED`)
- `internalName` (campaign)
- `subject`, `bodyText`
- Optional `audienceSpecJson` (`CommunicationAudienceSpec`)
- Optional `orchestrationMetaJson` (channel defaults via `CampaignOrchestrationMeta`; scheduling always `IMMEDIATE` in templates)

---

## Template application semantics

- **Use template** (`POST …/use`) creates a normal **DRAFT** communication and copies fields/defaults.
- Persists `sourcePlatformTemplateId` + `sourcePlatformTemplateVersion` on the communication row.
- **Copy-at-application:** later template edits do **not** mutate existing drafts or published communications.
- Kampagnen: `createCampaignDraft` + orchestration meta.
- Mitteilungen: `createClubCommunicationDraft` for `MESSAGE` / `ANNOUNCEMENT` / `ALERT`.

---

## Integrations

| Surface | Behaviour |
|---------|-----------|
| **Kampagnen (UX-05)** | Campaign composer lists `CAMPAIGN` templates; apply populates fields, audience, channels. |
| **Mitteilungen (UX-04)** | Mitteilung composer lists `ANNOUNCEMENT` + `ALERT` templates (optional apply). |
| **Inbox Direktnachricht (UX-04A)** | No template picker — fast path preserved. |
| **Zielgruppen (UX-06)** | Audience defaults reference saved groups by ID; UI shows human-readable names. |

---

## Usage & provenance

- **Usage:** only communications with `sourcePlatformTemplateId` (bounded list on detail).
- **No** inference from content similarity.
- Historical communications keep stored content even if template is archived or deleted (`onDelete: SetNull` on provenance FK).

---

## Duplication & archive

- **Duplizieren:** `duplicatePlatformCommunicationTemplate` — new ID, `(Kopie)` name, no usage history.
- **Archive:** `DELETE` API archives (`status: ARCHIVED`); no hard delete in UX.

---

## Authorization

- `communication.templates.view` / `communication.templates.manage` (+ tenant admin paths).
- Using a template still requires send permission for the target communication type.
- Server routes enforce manage/view independently of UI.

---

## Audit

When `createdByUserId` resolves to a person record, overview/detail show creator name. No fabricated identities.

---

## Overview UX

- COMM-UX-01 shell, search (name/content), filters (Alle / Mitteilungen / Kampagnen).
- Desktop table + mobile cards; usage count from provenance only.
- Empty + filtered-empty states.

---

## Editor UX

Four-step wizard: Grundlagen → Inhalt → Standardwerte → Vorschau / Überprüfen.  
Detail default: read-only sections + **Bearbeiten** (`?edit=1`).

---

## Responsive & accessibility

Semantic headings, labelled fields, keyboard step navigation, non-color-only status pills, confirmation for archive.

---

## Deferred

- Server-side full-text search beyond bounded list (100 rows).
- MESSAGE templates in Mitteilung composer (by design — UX-04A boundary).
- Scheduling defaults on templates (intentionally excluded).
