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
| `POST /api/admin/people-access/vl-invite/resolve` | Einzelempfänger + Rollen-Sync-Diff |
| `POST /api/admin/people-access/vl-invite/preview-email` | `buildVlInvitationEmailContent` (inert link) |
| `POST /api/admin/people-access/vl-invite/send` | `orchestrateVlInvitationSend` (Dry-Run default) |

## Contributor role (nicht angewendet in diesem Lauf)

```bash
npx tsx scripts/sync-fca-vereinsleitung-contributor-pilot-role.ts
```

Live-Versand bleibt blockiert bis Rolle `pilot_vereinsleitung_mitglied` im Mandant existiert.

## Tests

```bash
npx vitest run lib/admin/vl-onboarding
npx vitest run app/api/admin/people-access/vl-invite
```