# SCE-COMM-02 — Zielgruppen Management Foundation

## Ownership

Zielgruppen are an **organisation-wide Communication capability** and are not owned by Sponsors, Teams, or individual feature modules.

- **Persistence:** existing tenant-scoped `TargetGroup` rows (`prisma/schema.prisma`).
- **Owner:** `TargetGroup.tenantId` (organisation/tenant).
- **Rules:** COMM-02 stores a v2 `ruleJson` envelope (`schemaVersion: 2`) with canonical `CommunicationAudienceSpec` plus a derived `resolverClause` for legacy resolution.

**Authorization to send and membership of a Zielgruppe are separate concerns.**

## UX location

**Kommunikation → Zielgruppen** (`/dashboard/communication/zielgruppen`).

Legacy `/dashboard/target-groups/*` redirects here.

## Permissions

| Key | Purpose |
|-----|---------|
| `communication.zielgruppen.view` | List/detail read |
| `communication.zielgruppen.manage` | Create/edit/archive |

Enforced in UI (`requireAnyPermission`), server actions, and `/api/target-groups/*`.

Club admins receive tenant permissions via existing seed policy when permissions are present in `prisma/seed.ts`.

## Structural targeting semantics (COMM-02)

Within the editor, selectors combine as **UNION (OR)**:

- Ganze Organisation (structural flag — no person IDs stored)
- Organisationseinheiten (1–n)
- Teams (1–n, **Team.id** — not TeamSeason; resolution uses active seasons at resolve time)
- Rollen (stored as **role keys** in audience spec)
- Explizite Personen (include)
- Explizite Ausschlüsse (exclude — **exclude wins** over include)

Every saved definition is validated with `validateCommunicationAudienceSpec`.

**Recipient counts displayed before COMM-03 must not be represented as authoritative dispatch recipient counts.** The UI shows structural summaries only.

## Team / season decision

Saved references use **`Team.id`** (stable across seasons). `target-group-resolver` and requirement resolvers resolve **active** `TeamSeason` membership at runtime. Season abstraction improvements remain a COMM-03 seam.

## Archive behaviour

- Default administrative removal: **ARCHIVED** status (API `DELETE` archives).
- Permanent delete remains behind `org.delete` hard-delete UI (registrations: `SetNull`).

## Historical references

Saved Zielgruppe definitions may evolve. Future sent communications will persist recipient snapshots (COMM-03+); historical send truth does not depend on the current definition.

## COMM-03 seams

Prepared without blocking:

- Full dynamic AND/OR/NOT rule builder
- Composed saved Zielgruppen
- Relationship/guardian expansion
- Authoritative recipient resolution & live preview
- `wholeOrganisation` resolver implementation
- Explicit exclude applied at dispatch pipeline

## Known limitations

- `resolverClause` omits excludes until COMM-03 pipeline applies explicit subtraction.
- `wholeOrganisation` does not resolve members in COMM-02 resolver previews.
- No relationship-based (e.g. Eltern) selectors unless canonically supported — not exposed in COMM-02 UI.

## Programme contracts (retained)

1. Zielgruppen are an organisation-wide Communication capability and are not owned by Sponsors, Teams, or individual feature modules.
2. Authorization to send and membership of a Zielgruppe are separate concerns.
3. Recipient counts displayed before COMM-03 must not be represented as authoritative dispatch recipient counts.
