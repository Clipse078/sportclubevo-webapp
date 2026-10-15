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
