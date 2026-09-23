# DASHBOARD-D — Schnellzugriff Spec

## Goals

Combine **navigation shortcuts** and **creation actions** in one permission-safe, user-personalizable strip (~6–8 pins).

## Canonical registries (current state)

| Registry | Path | Contents |
|----------|------|----------|
| Sidebar navigation | `lib/nav/nav-config.ts` | `NAV_SECTIONS`, `getVisibleNavSections(permissionKeys, context)` |
| Dashboard quick actions | `lib/dashboard/quick-actions.ts` | `QUICK_ACTION_CATALOG` — creation/admin biased |
| Module definitions | same file | `MODULE_DEFINITIONS` |

**Problem:** Dashboard catalog duplicates routes/permissions from nav; only subset shown in `ClubDashboardView` (`COCKPIT_QUICK_ACTION_KEYS`).

## Target architecture

### Unified catalog (future)

```ts
type QuickAccessCatalogEntry = {
  key: string;
  kind: "navigate" | "create";
  label: string;
  href: string;
  permissionKeys: PermissionKey[];
  iconKey: string;
  defaultPriority?: number; // for bootstrap ordering
  navItemKey?: string; // link to NAV_SECTIONS item when navigate
};
```

Build by:

1. **Navigate entries:** derive from visible nav items (flatten `NAV_SECTIONS` + children) — **do not duplicate permission logic**.  
2. **Create entries:** subset of existing `QUICK_ACTION_CATALOG` or nav “new” routes.

Filter function:

```
visible = catalog.filter(e => hasAnyPermission(user, e.permissionKeys))
```

Personalization never adds permissions.

### Default selection (non-hardcoded personas)

Compute defaults at first visit:

1. Start from visible nav items sorted by nav order.  
2. Boost items matching **active relationships** (has team → include team cockpit, spiele, wochenplan; has registrations permission → anmeldungen).  
3. Append create actions user can perform (training, spiel, …).  
4. Take top 8 by score.

No static “Trainer template” unless relationship signals justify it.

### User personalization

| Capability | Behavior |
|------------|----------|
| Add | Pick from full visible catalog |
| Remove | Unpin |
| Reorder | Drag order persisted |
| Distinguish kind | Visual badge: none vs “+” for create |

### Persistence

**Recommendation: per-user-per-tenant DB storage.**

| Option | Pros | Cons |
|--------|------|------|
| localStorage | Zero schema | No cross-device |
| JSON on `User` | Simple | Wrong for multi-tenant users |
| JSON on `TenantMembership` | Tenant scoped | Limited schema evolution |
| **`UserDashboardPreference` table** | Clear, like `UserNotificationPreference` | Requires migration (DASHBOARD-04) |

Fields (proposed):

- `tenantId`, `userId` (unique pair)  
- `quickAccessOrder: string[]` (catalog keys)  
- `updatedAt`

Hero image stays on `User` (existing); quick access should **not** reuse hero fields.

### Limits

- Max pinned: **8**  
- Min displayed on dashboard: 4 (fill from defaults if user pins fewer)

### Responsive

- Horizontal scroll row with snap on narrow.  
- “Anpassen” full-screen sheet on mobile.

### Invalid destinations

- On load: drop pins whose catalog entry is missing or no longer authorized.  
- Silent removal from UI; optional toast “Shortcut entfernt (keine Berechtigung)”.

### Permission changes

- Re-filter on each dashboard load (server-side).  
- Client cache of pins is advisory only.

### Tenant switching

- Load preference row for `(userId, activeTenantId)`.  
- Defaults recomputed when no row exists.

## Explicit answer

**Should preferences be per-user-per-tenant?**  
**Yes.** Users can belong to multiple tenants; shortcuts and programme context are tenant-specific. Align with `UserNotificationPreference` and `TenantMembership` boundaries.

## Schema change

**Forbidden in DASHBOARD-D.** Expected in **DASHBOARD-04** unless product accepts localStorage MVP (not recommended).
