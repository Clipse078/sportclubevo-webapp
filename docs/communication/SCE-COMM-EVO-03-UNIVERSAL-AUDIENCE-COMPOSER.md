# SCE-COMM-EVO-03 — Universal Audience & Communication Composer

## Objective

One canonical **CommunicationAudienceSpec** selection experience shared by:

- **Neue Nachricht** (direct / private fan-out)
- **Mitteilungen** (club broadcast semantics)
- **Kampagnen** (campaign lifecycle; sponsor audiences remain separate)

No parallel audience engine, recipient tables, or resolver.

## Shared selector

UI: `components/admin/communication/audience/CommunicationAudienceSelector.tsx`

State: `CommunicationAudienceSelection` ↔ spec via `buildCommunicationAudienceSpec` / `inferCommunicationAudienceSelection` (`lib/communication/audience/communication-audience-selection.ts`).

Supported targets (when authorized):

| Target | Spec field |
|--------|------------|
| Gesamter Verein | `structural.wholeOrganisation` |
| Organisationseinheiten | `structural.orgUnitIds` |
| Teams | `structural.teamIds` |
| Zielgruppen | `savedTargetGroupIds` (one component per group) |
| Rollen | `structural.roleIds` |
| Personen | `explicit.includePersonIds` |

## Combination semantics

- Spec-level composition: **UNION** only in composers.
- Within one structural block, org units, teams and roles are **UNION**ed (COMM-03 `resolveStructuralAudiencePersonIds` mode `UNION`).
- Complex AND/OR rule builders belong in **Zielgruppen** (EVO-05), not in ordinary composers.

## Authorization intersection

`selected target ∩ sender communication scope ∩ recipient eligibility` — enforced server-side via `resolveCommunicationRecipients` / `resolveSenderCommunicationScope`. Client sends semantic selection only.

Search: `/api/communication/audience/search` (tenant-scoped; person search uses direct sender scope).

## Preview

`/api/communication/audience/preview` — COMM-03 counts, dynamic audience notice, optional guardian delivery aggregate, scope-limited notice.

Preview is not historical truth; snapshots at publish/send.

## Direct messages

- API accepts `audienceSpec` on `/api/communication/direct/send` (legacy `recipientPersonIds` when no spec).
- Audience resolved **once**; fan-out creates one private thread per effective subject person.
- **Nur informieren**: `repliesAllowed = false`; still private fan-out.

## Mitteilungen & campaigns

Composers build the same spec shape. Campaign **Sponsor** audiences stay on COMM-13 selectors (not mixed into ordinary direct messages).

## Integrations

- **EVO-04**: `CommunicationAttachmentPicker` unchanged; attachments referenced per thread without blob duplication.
- **EVO-08**: `CommunicationSenderSelector` when E-Mail is enabled.

## Consent & safeguarding

COMM-17 eligibility and COMM-18 guardian expansion remain in the recipient pipeline; preview may show aggregate guardian delivery counts without exposing guardian PII.

## Performance

No whole-organisation person list in the browser; search and preview samples are bounded server-side.

## Mobile & a11y

Selector uses touch-friendly controls, wrapping chips, popover search, live preview status, and labeled remove actions.

## EVO-05 boundary

Dynamic rule editing, intersection builders, and reusable exclusion logic remain in Zielgruppen management — composers consume saved groups only.
