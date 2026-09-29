# SCE-COMM-HOTFIX-02 — Universal Recipient Selector Recovery

## Symptom

On `/dashboard/communication/inbox/new` (Neue Nachricht), the Empfänger step showed empty-state copy and an **Organisation** section label but **no usable control** to search, browse, or add Personen, Teams, OrgUnits, Rollen, or Zielgruppen.

## Root cause

`CommunicationAudienceSelector` loaded `/api/communication/audience/capabilities` for `context=DIRECT`. Capabilities required `communication.club.send` or `communication.team.send` only.

Route access for Neue Nachricht also allows **tenant administration** (`users.manage_memberships`) via `DIRECT_MESSAGE_SEND_ROUTE_PERMISSIONS`. Club administrators with that authority (without explicit club/team send keys) received **all capability flags false**, so every add trigger was hidden while empty-state copy still rendered.

Sender scope for DIRECT messages had the same gap: tenant admins fell through to an **empty** allowed person set, so person search would stay empty even if triggers were shown.

## Fix

1. **Capabilities** — Align DIRECT capabilities with `tenantPermissionsIncludeDirectMessageSend`; tenant admins receive structural selector features (persons, teams, org units, roles, target groups; whole organisation when club send or tenant admin).

2. **Sender scope** — Tenant admins on DIRECT context receive organisation-wide subject scope (same as club send), without weakening API authorization on the discover/preview/send routes.

3. **Unified selector UX** — One discover experience (`/api/communication/audience/discover`) with search, category tabs, browse-without-query, multi-select before closing, chips, preview counts, and optional resolved recipient list via canonical preview API.

## Canonical architecture reused

- `CommunicationAudienceSelection` / `buildCommunicationAudienceSpec`
- `/api/communication/audience/preview` (COMM-03 resolver)
- `/api/communication/audience/search` (per-kind search; discover composes browse + search)
- EVO-03 private fan-out via `/api/communication/direct/send`

## Authorization

Discover/preview/send still require direct-message route permissions. Capability flags reflect send authority; discovery results for persons remain sender-scope filtered. No broad permission grants added.

## Changed files

- `lib/communication/audience/communication-audience-capabilities.ts`
- `lib/communication/platform/recipient-resolution/sender-communication-scope.ts`
- `lib/communication/audience/communication-audience-search-service.ts`
- `lib/communication/direct/direct-recipient-search.ts`
- `app/api/communication/audience/discover/route.ts`
- `components/admin/communication/audience/CommunicationAudienceSelector.tsx`
- `lib/communication/__tests__/sce-comm-hotfix-02-recipient-selector.test.tsx`

## Tests

- `lib/communication/__tests__/sce-comm-hotfix-02-recipient-selector.test.tsx` (includes STAGE regression: empty capabilities ⇒ no trigger; tenant admin ⇒ capabilities enabled)

## PR / STAGE / acceptance

See agent return block for PR number, merge SHA, and deployment verification. Manual FCA STAGE acceptance may require the club operator (`USER_REQUIRED = YES` when agent lacks authenticated STAGE).
