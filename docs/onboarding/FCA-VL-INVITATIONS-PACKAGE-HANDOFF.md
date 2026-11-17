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

| Email | Proposed action (dry-run) |
| --- | --- |
| irem.uysal@fcallschwil.ch | Resolve via prepare API — typically `NEW_INVITATION` or `UPDATE_ACCESS` |
| nicole.nussli@fcallschwil.ch | same |
| andreas.gaedt@fcallschwil.ch | same |
| rene.leupi@fcallschwil.ch | same |

`POST /api/admin/vl-invitations/prepare` returns the concrete matrix against live STAGE data **without sending**.

Missing until PO confirms: **display names**, **organisational function keys** (optional in preset; flagged per row).

## Preset access (least privilege)

- Role template: `FCA_VEREINSLEITUNG_CONTRIBUTOR_PILOT_ROLE` (`pilot_vereinsleitung_mitglied`)
- VL flags: `canAccessVereinsleitung`, `canAttendVereinsleitungMeetings`
- Org unit: `vereinsleitung` assignment when applied
- Effective preview rows: Übersicht, Strategie & Ziele, Vorhaben & Umsetzung, Sitzungen

## Send policy

- Default: **DRY_RUN** — `POST /api/admin/vl-invitations/send` returns mock transport, no tokens, no mail
- Live: requires `VL_INVITATION_LIVE_SEND=true` **and** `confirmLiveSend: true` (not enabled in this run)

## Tests

- `vitest lib/admin/vl-onboarding`
- `vitest lib/email/templates/__tests__/invitation-template.test.ts`
- `vitest lib/roles/__tests__/fca-vereinsleitung-contributor-role.test.ts`
- Existing: `lib/users/__tests__/invitation.test.ts`, `app/api/auth/invitation/accept/__tests__/route.test.ts`

## Limitations

- No live invitation records or email delivery in this run
- No browser UAT / impersonation
- Role row `pilot_vereinsleitung_mitglied` must exist on tenant for fully accurate previews (template defined in repo)