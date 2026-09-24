# DASHBOARD-04 — Schnellzugriff

## Summary

Unified personal **Schnellzugriff** combines permission-filtered **navigation** shortcuts and **creation actions** in one product component with per-user, per-tenant, cross-device persistence.

## Registry architecture

| Layer | Location | Role |
|-------|----------|------|
| Sidebar nav (canonical) | `lib/nav/nav-config.ts` | `getVisibleNavSections` supplies navigation entries |
| Create actions (canonical) | `lib/dashboard/quick-actions.ts` | `DASHBOARD_QUICK_ACTION_CATALOG` + `QUICK_ACCESS_CREATE_ACTION_BINDINGS` |
| Adapter | `lib/dashboard/quick-access/build-catalog.ts` | Builds `QuickAccessCatalogEntry[]` — **no duplicated permission rules for nav** |

Each catalog entry exposes: stable `key`, `kind`, `href`, `iconLabel`, `messageKey`, optional `navItemKey` / `catalogActionKey`, and `permissionKeys` (create actions only; nav authorization comes from visible nav).

## Stable keys

Persist semantic keys only:

- Navigation: `navigation.{navItemKey}` (e.g. `navigation.wochenplanner`)
- Create: `action.create-training`, `action.create-match`, …

Never persist translated labels, React component names, or array indexes.

## Authorization pipeline

```
buildQuickAccessCatalog(actor permissions + nav capabilities)
  → stored pinnedKeys (DB, may include stale keys)
  → filter to authorized catalog keys (silent drop)
  → visible Schnellzugriff DTOs
```

**Personalization never grants access.** Inaccessible stored pins are omitted from UI and from customize/API responses; raw DB rows may retain keys so pins can reappear when permissions return.

## Defaults

No stored row (`hasStoredPreference = false`): `deriveDefaultQuickAccessKeys` orders authorized nav + create entries using nav order and **additive** PersonalContext boosts (teams → planung modules). No trainer/admin persona templates.

Empty save payload is **rejected** (users must keep ≥1 pin when customizing).

## Customization

- Component: `PersonalQuickAccess` + `QuickAccessCustomizer` (sheet)
- Operations: add, remove, reorder (move up/down), reset (DELETE preference)
- Max pins: **8** (`QUICK_ACCESS_MAX_PINS`)

## Persistence

Model: `UserDashboardQuickAccessPreference`

- Scope: `(tenantId, userId)` unique
- Field: `pinnedKeys String[]` ordered stable keys
- API: `GET/PUT/DELETE /api/dashboard/quick-access`
- **Not** localStorage-canonical

### Semantics

| State | Behavior |
|-------|----------|
| No DB row | Product defaults |
| DB row | User order; unauthorized/stale keys filtered on read |
| Reset | Row deleted → defaults |

Stale registry keys: ignored on read; optional lazy retention in DB.

## Multi-tenant isolation

All reads/writes use authenticated active tenant + session user. Client-supplied `tenantId` mismatch → `403`. No admin override of another user's pins.

## Migration

`20260923210000_dashboard_04_quick_access_preference` — forward-only. **Not applied to STAGE in DASHBOARD-04.**

### DASHBOARD-04A STAGE deployment record (2026-09-23)

| Field | Value |
|-------|-------|
| Environment | STAGE |
| Database host fragment | `ep-wispy-hall-aso93dy6` |
| Database name | `neondb` |
| Database fingerprint | `acd3b37682911890` |
| Migration | `20260923210000_dashboard_04_quick_access_preference` |
| Migration checksum (SHA-256 of `migration.sql`) | `388b348864d023c5eaabf33ac80a9a79c87303fffbdae1995f483163ceaa9ca4` |
| Applied at (UTC) | `2026-09-23T21:31:46.312Z` |
| Method | Canonical `APPLY_DATABASE_MIGRATIONS=true` → `scripts/deploy-migrations-if-enabled.ts` → `prisma migrate deploy` (exactly one pending migration) |
| Runtime verification | `UserDashboardQuickAccessPreference.findUnique` succeeds on STAGE; controlled save/read/restore for FCA admin actor; no missing-table errors |

## DASHBOARD-06 handoff

- Component ready for placement under compact welcome, above Mein Programm / Mein Kalender
- Legacy `Schnellaktionen` strip remains until DASHBOARD-06 removes obsolete composition
- `getDashboardQuickActionDefs` retained for legacy strip only; Schnellzugriff uses unified registry

## Performance

One preference read per dashboard load; catalog filtered in memory from actor permissions.

## Accessibility

Keyboard-focusable links/buttons; sheet customizer; reorder via move up/down (not pointer-only).
