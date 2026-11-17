# FCA VL invitations & email UX — package handoff

## Git (child)

| Field | Value |
| --- | --- |
| Branch | `cursor/vl-invitations-email-ux-bca6` |
| Base PR | #1001 `cursor/vl-access-people-workspace` |
| Canonical STAGE | https://fcallschwil.sportclubevo.com |

## UI entry

`/dashboard/admin/people-access` → inline collapsible **「VL-Einladungen vorbereiten」** (FC Allschwil only, `users.invite`).

## Email preview (PO)

- API: `POST /api/admin/vl-invitations/preview-email` (`variant`: `new_account` \| `existing_account`)
- Workspace iframe: exact subject + rendered HTML, inert link `https://fcallschwil.sportclubevo.com/einladung/beispiel-vorschau`
- Subject example: **Einladung zu FC Allschwil auf SportClubEvo**
- Design: white background, navy text (`#0F172A`), copper CTA (`#B87333`), plain-text alternative

## Confirmed invitees (emails only)

| Email | STAGE state (verified) | Action |
| --- | --- | --- |
| irem.uysal@fcallschwil.ch | No account, person, membership, or pending invitation | `NEW_INVITATION` |
| nicole.nussli@fcallschwil.ch | same | `NEW_INVITATION` |
| andreas.gaedt@fcallschwil.ch | same | `NEW_INVITATION` |
| rene.leupi@fcallschwil.ch | same | `NEW_INVITATION` |

Read-only script: `npx tsx scripts/fca-vl-invitations-prepare-readonly.ts`. PO package: `docs/onboarding/FCA-VL-INVITATIONS-PO-REVIEW.md`.

Missing until PO confirms: **display names**, **organisational function keys** (required for live send; flagged per row).

## Preset access (least privilege)

- Role template: `FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE` (`pilot_vereinsleitung_mitglied`)
- VL flags: `canAccessVereinsleitung`, `canAttendVereinsleitungMeetings`
- Org unit: `vereinsleitung` assignment when applied
- Effective preview rows: Übersicht, Strategie & Ziele, Vorhaben & Umsetzung, Sitzungen

## Send policy

- **Vorschau prüfen** / **Einladungen senden** — administrator labels; `POST /api/admin/vl-invitations/send` returns mock transport, no tokens, no mail in this package
- Live production send: `VL_INVITATION_LIVE_SEND=true` + `confirmLiveSend` (not enabled in this run)

## Contributor role prerequisite

- Dry-run: `npx tsx scripts/sync-fca-vereinsleitung-contributor-pilot-role.ts`
- STAGE finding: role `pilot_vereinsleitung_mitglied` missing until authorised APPLY run

## Tests

- `vitest lib/admin/vl-onboarding`
- `vitest lib/email/templates/__tests__/invitation-template.test.ts`
- `vitest lib/roles/__tests__/fca-vereinsleitung-contributor-role.test.ts`
- Existing: `lib/users/__tests__/invitation.test.ts`, `app/api/auth/invitation/accept/__tests__/route.test.ts`

## Limitations

- No live invitation records or email delivery in this run
- No browser UAT / impersonation
- Role row `pilot_vereinsleitung_mitglied` must exist on tenant for fully accurate previews (template defined in repo)