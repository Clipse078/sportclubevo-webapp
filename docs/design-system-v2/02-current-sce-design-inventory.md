# Current SCE design inventory

Audit snapshot: branch `STAGE` @ `4f498000efe70b82720b2d9320ac0d46fd816900`.  
**No code changes** — paths are live repository references.

---

## 1. Global tokens and CSS variables

| Asset | Role |
| --- | --- |
| `app/globals.css` | **Single runtime source of truth** for colours, typography vars, `.sce-type-*`, `.sce-nav-*`, `.fca-*`, surface layers, tenant vars |
| `app/layout.tsx` | Font loading: `Inter`, `Barlow_Condensed` → `--font-inter`, `--font-display` |
| `lib/design-system/sce-foundation-contract.ts` | Typed semantic names for surfaces, text, status, activity pills — **no literal colours** |
| `lib/shell/sce-app-background.ts` | Authenticated background image contract |
| `lib/shell/sce-surface-system.ts` | Match card surface token (`SCE_SURFACE_TOKEN_MATCH_CARD`) |
| `lib/cms/design-system.ts` | CMS / website builder tokens (separate consumer) |

### Dark-background dependencies (representative)

`:root` in `app/globals.css`:

- `--background: #0a0f1e`
- `--surface` / `--surface-2` / `--surface-3` — navy stacks
- `--sce-app-chrome`, `--sce-surface-dense`, `--sce-match-card-surface` — translucent dark RGBA stacks
- Decorative `--sce-app-background-image` for coaching motif PNG

**Ripgrep snapshot:** ~479 files under `components/`, `app/`, `lib/` reference `#0a0f1e`, `#121a2e`, `sce-surface-dense`, or `fca-` patterns.

### Legacy / tenant-specific global classes

| Class prefix | Location | Note |
| --- | --- | --- |
| `.fca-*` | `app/globals.css` | FC Allschwil marketing typography (eyebrow, heading, card) |
| `.sce-type-*` | `app/globals.css` | DS-02 semantic type roles (dark-primary tuned) |
| `[data-sce-theme="light"]` | `app/globals.css` | Partial light icon tokens only — **not** a full white app theme |

---

## 2. Tailwind configuration

- **Tailwind v4** via `@import "tailwindcss"` in `app/globals.css`
- `@theme { … }` block defines brand palette steps (`--color-brand-blue`, `--color-sce-base`, etc.)
- No separate `tailwind.config.ts` in repo root (v4 CSS-first config)

---

## 3. Typography implementation

| Concern | Implementation |
| --- | --- |
| Body default | `body { font-family: var(--font-body); font-size: 14px; }` |
| Display token | `--font-display: var(--font-display), "Barlow Condensed", …` |
| Semantic roles | CSS vars `--sce-fs-*`, `--sce-fw-*`, utilities `.sce-type-page-title` etc. |
| Page chrome titles | `.sce-page-eyebrow`, `.sce-page-title` (mixed uppercase on eyebrow only) |
| Activity primary lines | `SportingActivityIdentity` — `font-semibold`, no italic, no forced uppercase |

---

## 4. Shared components and UI primitives

| Area | Paths |
| --- | --- |
| Design-system React | `components/design-system/icons/*` (`SceIcon`, registry, governance tests) |
| Workspace chrome | `components/sce/workspace/*`, `lib/design-system/sce-workspace-hierarchy.ts` |
| Navigation spine | `components/sce/navigation/SceNavigationSpineRow.tsx`, `SceDomainNavigationPanel.tsx` |
| Forms / density | `lib/design-system/sce-form-control-*`, `sce-dense-ui-*`, `sce-density-border-*` |
| Functional surfaces | `lib/design-system/sce-functional-surface-styles.ts` |
| Switches / binary governance | `components/ui/SwitchToggle.tsx`, `lib/design-system/sce-binary-checkbox-audit.ts` |

---

## 5. Header, sidebar, navigation, breadcrumbs

| Component | Path | Notes |
| --- | --- | --- |
| Primary sidebar nav | `components/admin/layout/AdminSidebar.tsx` | `AnimatedNavIcon`, `getVisibleNavSections` |
| Top nav | `components/admin/layout/AppTopNav.tsx` | Utilities strip |
| App shell | `components/admin/layout/AppShellNavigation.tsx` | Composes spine + sidebar |
| Global drawer | `components/admin/layout/GlobalNavDrawer.tsx` | Mobile search + wayfinding |
| Nav config | `lib/nav/nav-config.ts`, `lib/nav/nav-ia-v2/*` | Capability-aware tree |
| Breadcrumbs | `lib/design-system/sce-breadcrumbs-foundation.ts` | DS-03 product-wide contract |
| CSS | `.sce-nav-item`, `.sce-nav-child`, `.sce-nav-icon-wrap` | Icons in wells; **no** label `text-transform: uppercase` |

---

## 6. Activity cards and sporting presentation (priority inventory)

### Canonical v1 presentation (post UI-Rollout)

| Variant | Component | Key libs |
| --- | --- | --- |
| Match | `components/sporting-activity/SceMatchCard.tsx` | `lib/sporting-activity-presentation/canonical/match-card-rich-density.ts` |
| Training | `components/sporting-activity/SceTrainingCard.tsx` | `SceProgrammeActivityCardShell` |
| Tournament | `components/sporting-activity/SceTournamentCard.tsx` | Status subcomponents |
| Club event | `components/sporting-activity/SceClubEventCard.tsx` | Event meta rails |
| Shared shell | `components/sporting-activity/SceProgrammeActivityCardShell.tsx` | Density: HERO / STANDARD / COMPACT / MICRO |
| List row meta | `components/sporting-activity/SceActivityListRowOperationalMeta.tsx` | Programme list composition |
| Identity (legacy compact) | `components/sporting-activity/SportingActivityIdentity.tsx` | Management + Mein Programm |
| Type pill | `components/sporting-activity/ActivityTypePill.tsx` | Colour semantics |

**Club / team typography on match cards:** `clubNameClass` uses `font-semibold` — **not** `uppercase italic` (`match-card-rich-density.ts`).

### Parallel / legacy card implementations

| Surface | Path |
| --- | --- |
| Matchcenter management row | `components/admin/matchcenter/SpieleManagementMatchRow.tsx`, `MatchCard.tsx` |
| Result rows | `SpieleManagementResultRow.tsx`, `MatchcenterResultRow.tsx` |
| Wochenplaner identity cards | `components/admin/planner/WeekplannerMatchIdentityCard.tsx`, `WeekplannerTrainingIdentityCard.tsx`, `WeekplannerTournamentIdentityCard.tsx` |
| Planning Hub list card | `components/admin/planning-hub/PlanningHubListeSceActivityCard.tsx` |
| Dashboard agenda | `components/ui/dashboard/DashboardTodayEventCards.tsx`, `PersonalProgrammeCanonicalAgendaRow.tsx` |
| Preview galleries | `app/sce-preview/*-card/page.tsx` |
| Infoboard match identity | `components/infoboard/shared/InfoboardCompactMatchIdentity.tsx` |

### Presentation read-model

- `lib/sporting-activity-presentation/` — canonical formatters, policies, semantic tokens
- `lib/sporting-activity-design/` — club identity, crest, density mapping
- Architecture doc: `docs/architecture/SCE-SPORTS-ACTIVITY-PRESENTATION.md` (referenced from roadmap)

---

## 7. Module surfaces (dashboard domains)

| Module | Representative entry / chrome |
| --- | --- |
| Dashboard home | `app/(admin)/dashboard/page.tsx`, `components/ui/dashboard/*` |
| Planning / Planner | `app/(admin)/dashboard/planner/*`, `components/admin/planner/*` |
| Planning Hub | `components/admin/planning-hub/*` |
| Matchcenter | `components/admin/matchcenter/*` |
| Teams | `components/admin/teams/*` |
| Events / club events | `components/admin/events/*`, club event presentation |
| Calendar / Wochenplaner | `lib/calendar/sce-calendar-engine/*`, planner views |
| Finance | `components/admin/finance/*` (grep-confirmed consumers of DS tokens) |
| Members / people | `components/admin/persons/*`, registrations `components/admin/registrations/*` |
| Documents / workspace | `components/admin/workspace/*`, `docs/workspace/*` |
| Sponsoring | Admin sponsoring modules (tenant-accent gradients common) |
| Administration | `components/admin/roles/*`, settings, masterdata |
| Communication | DS reference workspace per DS-02 (`/dashboard/communication`) |
| CMS / public website | `lib/cms/design-system.ts`, `components/admin/homepage-builder/*` |
| Infoboard | `components/infoboard/**` — **separate theme boundary** |

**Scale:** 201 `dashboard/**/page.tsx` files; 1,352 `components/admin/**/*.tsx` files.

---

## 8. Theme and tenant styling

| Mechanism | Path / mechanism |
| --- | --- |
| Tenant CSS vars | Injected in admin layout — `--tenant-primary`, `--tenant-secondary`; `--tenant-accent` derived via `color-mix` (documented in `globals.css`) |
| Branding UI | `components/admin/branding/*`, roadmap `cursor/admin-branding-ui-*` |
| Icon theme hook | `[data-sce-theme="light"]` icon colours only |
| Exception registry | `lib/design-system/sce-design-system-exception-registry.ts` |

---

## 9. Design-system tests and governance

| Asset | Purpose |
| --- | --- |
| `scripts/run-design-system-governance.ts` | CLI gate — **PASS** at audit time |
| `lib/design-system/sce-design-system-governance.ts` | Rule manifest (controls, surfaces, workspace, activity) |
| `lib/design-system/__tests__/sce-design-system-*.test.ts(x)` | Packages DS-01 … DS-11 regression |
| Sporting activity tests | `components/sporting-activity/__tests__/sce-ui-rollout-01*.test.tsx` |
| Icon system tests | `components/design-system/icons/__tests__/*` |
| Master doc | `docs/design/SCE-DESIGN-SYSTEM.md` |
| Programme roadmap | `docs/roadmap/SCE-DESIGN-SYSTEM-01.md` … `SCE-DESIGN-SYSTEM-11` meta in `lib/design-system/` |

---

## 10. Team name rendering contexts (audit matrix)

| Context | Uppercase? | Italic? | File |
| --- | --- | --- | --- |
| Match rich card club line | No (`font-semibold`) | No | `match-card-rich-density.ts` |
| Match list separator “vs” | Yes (utility class) | No | `SceMatchCard.tsx` |
| Match club pair auxiliary | Partial (`uppercase` on separator label) | No | `MatchClubPair.tsx` |
| Training card team label | Yes (tracking) | No | `SceTrainingCard.tsx` |
| Tournament card | Yes (label line) | No | `SceTournamentCard.tsx` |
| Programme identity primary | No | No | `SportingActivityIdentity.tsx` |
| Team selectors / tables | Mixed — module-specific | No | `components/admin/teams/*` (spot check required in migration) |
| Infoboard | Signage-specific | Signage-specific | `InfoboardCompactMatchIdentity.tsx` |

**Conclusion:** Uppercase appears in **labels and pills**, not as a unified **team name** contract; **italic is absent** in sporting-activity canonical paths.

---

## 11. Duplicated card / surface patterns

1. **Opaque match pitch card** (`--sce-match-card-surface`) vs **translucent `fca-card`** vs **functional panel** (`SCE_FUNCTIONAL_PANEL_CLASS`)
2. **List row** composition duplicated across Planning Hub, Matchcenter, dashboard agenda
3. **Lucide icons** inline in cards (`MapPin`, `Calendar` in `SceMatchCard.tsx`) vs `SceIcon` registry elsewhere — icon vocabulary split

---

## 12. Module-specific design exceptions

Recorded via DS-10/11 exception registry (10 governed exceptions at audit). New DS 2.0 work must **classify** infoboard, CMS public site, and email HTML templates as **boundary domains** before editing.

---

## Inventory totals (for PO report)

| Category | Count |
| --- | --- |
| Dashboard pages | 201 |
| Admin components | 1,352 |
| Sporting-activity components | 45 |
| Design-system lib files | 96 |
| Activity card variant implementations (named) | ≥ 12 primary + 4 canonical `Sce*Card` |
| Dark-token dependent files (approx.) | 479 |

See [07-migration-roadmap.md](./07-migration-roadmap.md) for package-level consumption order.
