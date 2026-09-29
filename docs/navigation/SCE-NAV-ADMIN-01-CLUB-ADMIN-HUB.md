# SCE-NAV-ADMIN-01 — Club Admin Navigation & Admin Hub

## Previous state

- Primary club navigation ended at **Publizieren** (`dashboard | planung | kommunikation | club | publishing`).
- Tenant administration lived under **Club → Administration** (explorer-only L2 group) with scattered `/dashboard/admin/**` routes.
- No `/dashboard/admin` landing page; `administration` nav entry defaulted to `/dashboard/admin/branding`.
- Parent **Administration** visibility used a broad permission union (users, seasons, facilities, tenants, roles).

## Canonical Club Admin authorization

- **Capability:** `users.manage_memberships` (`TENANT_ADMINISTRATION_PERMISSIONS`).
- **Helpers:**
  - `hasTenantAdministrationAccess()` — permission checks for UI/tests.
  - `requireTenantAdministration()` — server gate for the Admin Hub page.
  - `resolveAdminAreaRoutePermissionKeys(pathname)` — layout gate for `/dashboard/admin/**` (tenant admin by default; platform prefixes for commercial billing, tenants, integrations).

Platform Super Admin (`users.manage`, `billing.view`, …) does **not** inherit tenant Admin nav via platform keys alone.

## Nav visibility contract

- **Show** top-level **Admin** (after **Publizieren**) only when `users.manage_memberships` is present in the active tenant context.
- **Hide** for coaches, communication senders, team managers, and other roles without tenant-admin authority.
- Communication, tasks, or club content permissions alone do **not** expose Admin.

## Route protection

- `proxy.ts` forwards `x-sce-pathname` for `/dashboard/admin/**` server layouts.
- `app/(admin)/dashboard/admin/layout.tsx` enforces `resolveAdminAreaRoutePermissionKeys` (redirect to `/dashboard` when denied — existing product pattern).
- Individual pages retain finer-grained checks (e.g. People & Access `users.view`, billing `billing.view`).

## Admin Hub

- **Route:** `/dashboard/admin`
- **Title:** Admin
- **Subtitle:** Vereinsweite Einstellungen, Zugriffe und Administration.
- Cards are permission-filtered from `lib/nav/admin-hub-catalog.ts` (People & Access, roles, facilities, seasons, email sender, etc.). No platform tenant list or dead links.

## Surfaced existing routes (examples)

| Card | Route |
|------|--------|
| Personen & Zugänge | `/dashboard/admin/people-access` |
| Rollen & Berechtigungen | `/dashboard/administration/roles` |
| Anlagen & Ressourcen | `/dashboard/admin/facilities` |
| Saisons | `/dashboard/seasons` |
| E-Mail-Absender | `/dashboard/communication/email-sender` |

## Mobile / explorer

- Same `buildAppNavigationModelForUser` model drives desktop primary row, overflow, mobile bottom nav, and global explorer.
- Admin is L1 domain `admin` (icon: `settings`).

## Tests

- `lib/nav/__tests__/sce-nav-admin-01-club-admin-navigation.test.tsx`
- Updated NAV-IA-V2 regression tests (six L1 domains, Admin explorer group).

## PR / deployment

- Branch: `cursor/nav-admin-01-club-admin-hub-e81d` → `STAGE`
- User acceptance: FCA Club Admin on canonical STAGE after deployment.

## User acceptance status

Pending post-merge STAGE deployment verification.
