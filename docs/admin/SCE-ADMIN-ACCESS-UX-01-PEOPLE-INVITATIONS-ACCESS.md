# SCE-ADMIN-ACCESS-UX-01 — People, Invitations & Access Management

## Architecture diagnosis

### Person vs User

- **Person** (`Person`): tenant-scoped club identity (master data). May exist without application access (`userId` null).
- **User** (`User`): global login account. Tenant access is mediated by **TenantMembership** plus **UserRole** assignments scoped with `tenantId`.

### Invitation

- Invitations use **PasswordResetToken** with `isInvitation=true` (72h expiry at service layer).
- Pending state = active, unused, non-expired invitation token (not `lastLoginAt`).
- Resend/revoke: `POST/DELETE /api/admin/users/[userId]/invite`.

### Roles & scope

- **Tenant-wide**: `UserRole.orgUnitId = null`.
- **OrgUnit scope**: `orgUnitId` + `scopeMode` (`THIS_ORG_UNIT`, `THIS_ORG_UNIT_AND_DESCENDANTS`).
- Club Admin is tenant-wide only (canonical key `club_admin__<tenantKey>`).
- No separate Team FK on `UserRole`; teams map through OrgUnits in product copy as “Team / Organisationseinheit”.

### Effective access

- Preview: `POST /api/tenant/effective-access/preview` (role IDs).
- Member view: `GET /api/tenant/effective-access?userId=` via `EffectivePermissionResolver`.

### Duplicate Club Admin chips

- **Cause**: legacy duplicate **Role** records (e.g. `club_admin__*` and `club_admin_*`) assigned concurrently.
- **UX**: `groupRoleChipsForDisplay` merges same display name; drawer notes multiple assignments when `assignmentCount > 1`.
- **Wizard**: `dedupeAssignableRolesForWizard` exposes a single Club Admin choice mapped to `club_admin__<tenantKey>`.

### Per-user permission overrides (01R1 diagnosis)

- Authorization is **role-only**: `UserRole → Role → RolePermission → Permission` via `EffectivePermissionResolver`.
- There is **no** persisted `UserPermission` allow/deny model; toggles in step 3 are **read-only** (nav-aligned switches showing the role baseline).
- Individual grant/revoke on top of roles requires an approved schema + resolver extension (not part of 01R1).

### Platform identities

- Platform roles (`scope=PLATFORM`, `tenantId=null`) on members with tenant access show **Systemzugang** badge.
- Tenant admins cannot manage platform identities via row actions / drawer edit (read-only contract).

### Self-lockout

- Existing server guards in role/membership mutations preserved (Club Admin protection in `lib/roles/mutations.ts` / membership routes).

## UX deliverables

- Route: `/dashboard/admin/people-access`
- 4-step wizard dialog: Person → Funktion & Bereich → Zugriff → Prüfen & Einladen
- Table IA: Person, Funktion, Bereich, Zugriff, Status, Letzte Aktivität
- Person access drawer with tabs: Übersicht, Funktionen, Zugriff, Aktivität
- Email lookup: `GET /api/admin/users/lookup?email=`

## Tests

- `app/(admin)/dashboard/admin/__tests__/sce-admin-access-ux-01-people-access.test.tsx`
- `lib/admin/people-access/__tests__/role-display.test.ts`

## Schema

- `SCHEMA_CHANGED=false` — presentation and lookup API only.
