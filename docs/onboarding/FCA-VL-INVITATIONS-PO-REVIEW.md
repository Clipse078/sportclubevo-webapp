# PO review package — PR #1002 (VL invitations & email UX)

Stack parent: **#1001** (`cursor/vl-access-people-workspace`).

## Deployment

| Field | Value |
| --- | --- |
| Final SHA | _populated at package close-out_ |
| GitHub checks | design-system-governance, route-lifecycle-governance, Vercel |
| Vercel Ready URL | _commit-bound preview URL when Vercel reports success on final SHA_ |
| Canonical STAGE app | https://fcallschwil.sportclubevo.com |
| People-access preview path | `/dashboard/admin/people-access` → **VL-Einladungen vorbereiten** |

## Recipient matrix (STAGE, read-only)

Source: `scripts/fca-vl-invitations-prepare-readonly.ts` (fingerprint `acd3b37682911890`).

| Email | Account | Person | Membership | Pending invitation | Resolved action | Proposed PO action |
| --- | --- | --- | --- | --- | --- | --- |
| irem.uysal@fcallschwil.ch | none | none | none | none | `NEW_INVITATION` | Admin send → new person + membership + contributor role + VL org assignment |
| nicole.nussli@fcallschwil.ch | none | none | none | none | `NEW_INVITATION` | same |
| andreas.gaedt@fcallschwil.ch | none | none | none | none | `NEW_INVITATION` | same |
| rene.leupi@fcallschwil.ch | none | none | none | none | `NEW_INVITATION` | same |

**Required before send (per row):** display name (Vor-/Nachname). **Optional enrichment:** organisational function key (`PersonAssignment` on org unit `vereinsleitung`).

**Blocker (tenant-wide):** Mandanten-Rolle `pilot_vereinsleitung_mitglied` / «Vereinsleitung (Pilot)» **fehlt** auf STAGE. UI zeigt Vorlage, nicht DB-wirksame Rechte, bis Rollensync angewendet ist.

## Contributor role sync (dry-run only this run)

```bash
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
  npx tsx scripts/sync-fca-vereinsleitung-contributor-pilot-role.ts
```

Apply (authorised STAGE only, not in this run):

```bash
SCE_OPERATION_AUTHORIZATION=sync-fca-vereinsleitung-contributor-pilot-role:stage \
  APPLY_FCA_VL_CONTRIBUTOR_PILOT_ROLE_SYNC=true \
  npx tsx scripts/sync-fca-vereinsleitung-contributor-pilot-role.ts
```

Dry-run outcome: create role with 8 permission keys + `canAccessVereinsleitung` + `canAttendVereinsleitungMeetings`; VL org unit `vereinsleitung` exists; 0 existing memberships on contributor role.

**Onboarding provisioning order (intended live send, not enabled here):**

1. Tenant contributor role must exist (sync above).
2. **Send:** canonical `POST /api/admin/users/invite` path with preset `roleIds` + scoped VL org assignment.
3. **Accept:** invitation token acceptance activates membership; roles and assignments materialise at invite creation / accept per existing lifecycle (no duplicate accounts on retry: idempotent lookups in `invitePersonToTenant`).

## Administrator flow labels

| Step | UI label |
| --- | --- |
| Resolve emails | **Vorschau prüfen** |
| Preview email | iframe **E-Mail-Vorschau** (inert URL) |
| Send attempt | **Einladungen senden** (no live mail in this package) |

## Email previews

Artifacts under `/opt/cursor/artifacts/`:

- `invitation-email-new-account.html` / `.txt`
- `invitation-email-existing-account.html` / `.txt`

Subject (both variants): **Einladung zu FC Allschwil auf SportClubEvo**

CTA contrast (white on `#B87333`): **3.79:1** — passes WCAG AA for large/bold button text (3:1). Hover token `#9A5F28` at 5.2:1 available if PO wants higher headroom.

## Invitation lifecycle (this package)

| Phase | Behaviour |
| --- | --- |
| Vorschau / prepare | No tokens, invitations, or mail |
| Einladungen senden | `POST /api/admin/vl-invitations/send` returns policy block + mock transport |
| Live production send | `VL_INVITATION_LIVE_SEND=true` + `confirmLiveSend` — **501 / disabled** in this release |
| Acceptance | Existing `app/api/auth/invitation/accept` + `lib/users/mutations` invitation flow |