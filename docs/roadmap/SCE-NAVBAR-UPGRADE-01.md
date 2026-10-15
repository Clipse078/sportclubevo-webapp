# SCE-NAVBAR-UPGRADE-01 — Canonical Desktop Navigation Architecture

| Field | Value |
|-------|-------|
| **Status** | IN PROGRESS — AWAITING PO UAT |
| **Branch** | `cursor/sce-navbar-upgrade-01-canonical-navigation` |
| **Base** | `STAGE` @ `b101a171` (post **01I** / PR #846) |
| **Predecessor** | SCE-ACTIVITY-CREATE-01I — CLOSED / ACCEPTED / MERGED |
| **Successor (not started)** | SCE-ACTIVITY-CREATE-01J Dashboard + Mein Programm |

## Objective

Establish the canonical SportClubEvo desktop/tablet navigation hierarchy: one product navigation language, clear L1/L2/L3 separation, denser chrome, integrated season context, and design-system documentation — without route moves or Programme/Calendar semantic regressions.

## Delivered in this package

- **`components/sce/navigation/*`** — `ScePrimaryNavigation`, `SceModuleNavigation`, `SceContextNavigation`, `SceNavigationItem`, `SceNavigationOverflow`, `SceTenantIdentityBar`, `SceGlobalUtilities`, `SceGlobalSeasonSwitcher`.
- **`AppShellNavigation`** refactored to compose the above; corrected module vs context `aria-label` mapping.
- **`global-app-navigation.css`** — reduced row heights, distinct L2/L3 treatments, solid chrome (no decorative blur).
- **Tenant crest** — header-crest variant on `TenantLogo` / `HeaderTenantIdentity`.
- **Season** — compact global switcher; removed heavy “Saison wechseln” pills from teams/events header actions.
- **Tests** — `sce-navbar-upgrade-01-*`, updated SCE-VISUAL / NAV-IA-V2 contract tests.
- **Design system** — navigation section in `docs/design/SCE-DESIGN-SYSTEM.md`.

## Out of scope (unchanged)

- Programme engine, activity cards, calendar MICRO tiles (01I contracts).
- Dashboard/Mein Programm redesign (01J), Tournament Planner, Sponsor, Mobile app redesign.
- Background artwork, domain authorization redesign.

## PO UAT checklist (manual — PO owned)

- [ ] L1 dominance vs L2/L3 hierarchy on Club, Planung, Publishing routes
- [ ] Tenant crest + SCE wordmark separation at common laptop widths
- [ ] Season switcher discoverability vs primary nav visual weight
- [ ] Programme / Kalender / Wochenplaner surfaces still usable with reduced header height
- [ ] Overflow + mobile drawer parity with permissions

## Closure criteria

- PO UAT PASS on STAGE
- PR merged to `STAGE`
- Status → CLOSED / ACCEPTED

---

## Agent delivery report (R1 — FM26 / FC26 direction restore)

=== BRAND_HIERARCHY ===
PRODUCT_IDENTITY: SportClubEvo wordmark (`SidebarPlatformBrand`) — top of left brand rail
TENANT_POSITION: Directly under product wordmark in `sce-global-brand-tenant-stack`
TENANT_CREST: `TenantLogo` `header-crest`, ~26px, transparent, object-contain
TENANT_NAME: Subordinate semibold label (e.g. FC Allschwil)
TENANT_UNDER_SCE: YES
PRODUCT_VS_TENANT_HIERARCHY: Product dominates; club context is integrated workspace identity, not a second global-nav peer

=== FOOTBALL_PRODUCT_DESIGN ===
FM26_INFORMATION_ARCHITECTURE_INSPIRATION: YES — L1/L2/L3 separation, workspace eyebrow, dense chrome
FC26_VISUAL_IDENTITY_INSPIRATION: YES — crest rail, confident nav typography, stronger active destination
SCE_ORIGINALITY: YES — SCE wordmark, tokens, routes unchanged; no EA/FM clone assets
GENERIC_SAAS_HEADER_REMOVED: YES — stacked brand rail replaces horizontal SCE | Club divider pattern
ACTIVE_WORKSPACE_STRENGTH: YES — inset surface + orange bottom edge + stronger icon/label on L1 active
DENSITY: YES — ~72px header, tighter L2/L3 rows, controlled primary nav rhythm
TYPOGRAPHY: YES — 800-weight active L1; muted L2/L3
ICONOGRAPHY: YES — 20px L1 domain icons with aligned optical box

=== WORLD_CLASS_NAVIGATION_COMPLIANCE ===
STATUS: READY FOR PO UAT
TENANT_UNDER_SCE: YES
CLEAR_PRODUCT_CLUB_WORKSPACE_CONTEXT_HIERARCHY: YES
PREMIUM_PRIMARY_NAV: YES
FOOTBALL_MANAGEMENT_CHARACTER: YES
REDUCED_SECONDARY_NAV_WEIGHT: YES
CONTEXT_ATTACHED_TO_CONTENT: YES
QUIET_UTILITIES: YES (borderless season context; explorer hidden on wide desktop when all L1 fit)
THREE_STACKED_NAVBARS_REMOVED: YES (one header block; L2/L3 are subordinate rows, not equal navbars)
