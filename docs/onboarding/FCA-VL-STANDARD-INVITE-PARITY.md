# FCA VL standard invite parity (Person hinzufügen)

## Branch

`cursor/vl-standard-invite-parity` → base **STAGE**

## UI

`/dashboard/admin/people-access` → **Person hinzufügen** (inline collapsible)

1. Person: Vorname, Nachname, E-Mail
2. Zugangstyp: **Vereinsleitung (Pilot) — Mitwirkung** oder individuell
3. Organisationsfunktion (VL-Pfad)
4. Zugriffsvorschau + getrennte bestehende/ergänzende VL-Rechte bei Bestandsmitgliedern
5. Personalisierte Einladungs-E-Mail (gleiche Vorlage wie VL-Review)

## APIs

| Route | Purpose |
| --- | --- |
| `POST /api/admin/people-access/vl-invite/resolve` | Einzelempfänger + Contributor-Rollen-Diff (Diagnose) |
| `POST /api/admin/people-access/vl-invite/preview-email` | `buildVlInvitationEmailContent` (inert link) |
| `POST /api/admin/people-access/vl-invite/send` | `orchestrateVlInvitationSend` (Dry-Run default) |

## Contributor role (operator / release)

```bash
npx tsx scripts/sync-fca-vereinsleitung-contributor-pilot-role.ts
```

Apply (STAGE only, fingerprint `acd3b37682911890`):

```bash
APP_ENV=stage SCE_DATA_ENVIRONMENT=STAGE SCE_DATA_DATABASE_FINGERPRINT=acd3b37682911890 \
SCE_OPERATION_AUTHORIZATION=sync-fca-vereinsleitung-contributor-pilot-role:stage \
APPLY_FCA_VL_CONTRIBUTOR_PILOT_ROLE_SYNC=true npx tsx scripts/sync-fca-vereinsleitung-contributor-pilot-role.ts
```

## Live send (canonical STAGE only)

- Vercel project: `sportclubevo-webapp-stage`
- Scope: **Production** (serves `https://fcallschwil.sportclubevo.com`)
- Set `VL_INVITATION_LIVE_SEND=true` — **not** on Preview scopes or the separate production project
- Verify: `GET https://fcallschwil.sportclubevo.com/api/health/diag` → `operationalPolicy.vlInvitationSendMode` = `LIVE_ALLOWED`
- Sending still requires `users.invite`, `confirmLiveSend: true`, contributor role provisioned, and final UI confirmation

## Tests

```bash
npx vitest run lib/admin/vl-onboarding
npx vitest run app/api/admin/people-access/vl-invite
```