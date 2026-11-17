# SCE permission catalogue coverage (audit snapshot)

Audit compares `lib/permissions/permissions.ts`, Prisma `Permission` rows (`scope=TENANT`, `grantableByAdmin=true`), nav-aligned editors (`lib/roles/nav-permission-presentation.ts`), API guards (`requireApiPermission` / route handlers), and invitation/people-access surfaces.

## Vereinsentwicklung (explicit editor rows)

| Module (UI) | Permission keys | Backend guard | Editor exposure | Scope / grantability | Disposition |
| --- | --- | --- | --- | --- | --- |
| Übersicht | `workspace.view`, `workspace.manage` | Workspace routes | Per-child unit in role editor | TENANT, grantable | Split from bundled row |
| Strategie & Ziele | `targets.view`, `targets.manage` | Target APIs | Ansehen/Verwalten | TENANT, grantable | Coupled with VL workspace gate on save |
| Vorhaben & Umsetzung | `initiatives.view`, `initiatives.manage` | Initiative APIs | Ansehen/Verwalten | TENANT, grantable | User label «Vorhaben» |
| Sitzungen | `meetings.view`, `meetings.manage` | Meeting APIs + org assignment | Ansehen/Verwalten + assignment note | TENANT, grantable | Meeting list requires PersonAssignment |

## Listing defect: `pilot_vereinsleitung_mitglied`

**Root cause:** `scripts/sync-fca-vereinsleitung-contributor-pilot-role.ts` created roles without `scope: "TENANT"` (Prisma default `PLATFORM`). `getTenantRolesOverview` filters `scope: "TENANT"` only, so provisioned pilot roles were invisible while VL resolution still matched by `tenantId` + key.

**Fix:** Sync script sets `scope: "TENANT"`, repairs existing rows, and preset resolution also filters `scope: "TENANT"`.

## Normal invitation flow

| Step | Persistence | Email |
| --- | --- | --- |
| Preview (`preview-email`) | None | Inert sample URL + admin preview logo |
| Prepare (`invite/send`, `confirmLiveSend: false`) | None | Mock transport only |
| Live send (`confirmLiveSend: true`, policy `LIVE_ALLOWED`) | Canonical `createPersonAndInvite` / resend + selected `roleIds` | Mock or live transport per env |

Unmapped legacy permissions remain in the supplemental unit; editors do not invent platform-only keys.