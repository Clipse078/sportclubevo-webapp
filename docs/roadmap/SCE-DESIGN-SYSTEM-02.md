# SCE-DESIGN-SYSTEM-02 — Foundations & Tokens

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-02` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-01` (**CLOSED / ACCEPTED / MERGED**, PR **#879**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#880** → **STAGE**; merge `c94e36e53586f14940ca9a0f212ca3e87f5d7499`) |
| **`DS02_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-design-system-02-foundations-tokens` |
| **Accepted foundation head (`FEATURE_HEAD`)** | `00b5eeca31dd9ac9621fa0ee6491707a97f9ac5e` |
| **Baseline STAGE (pre-merge)** | `fb202812e7e710dea7be4bd597bd7e623fa8fb18` |
| **Successor** | **`SCE-DESIGN-SYSTEM-03`** — Workspace / Surface / Navigation System ([doc](./SCE-DESIGN-SYSTEM-03.md)) — **NOT STARTED** |

**PO closure:** `PO_FOUNDATION_REVIEW = PASS` · `PO_ARCHITECTURE_REVIEW = PASS` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-03`**

---

## Product-wide workspace system (PO lock — DS-02 closure)

**Target:** **ONE CANONICAL SCE WORKSPACE SYSTEM** across the entire SportClubEvo webapp (current and future workspaces). **Not** identical layouts — shared consumption of workspace hierarchy, surface language, header language, breadcrumb language, contextual navigation language, spacing, typography, action hierarchy, responsive principles, and accessibility principles. Domain-specific compositions remain allowed and required.

| Flag | Value |
| --- | --- |
| `WORKSPACE_SYSTEM_PRODUCT_WIDE` | **YES** |
| `BREADCRUMB_SYSTEM_PRODUCT_WIDE` | **YES** |
| `CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC` | **YES** |
| `LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED` | **NO** |
| `PRODUCT_WIDE_WORKSPACE_MIGRATION_REQUIRED` | **YES** |
| `UNEXPLAINED_LEGACY_WORKSPACES_ALLOWED_AT_DS10_CLOSURE` | **NO** |

**Canonical workspace hierarchy** (layers complement — do not duplicate):

```text
GLOBAL NAVIGATION
  → BREADCRUMBS
  → WORKSPACE / PAGE HEADER
  → CONTEXT TABS (when semantically appropriate)
  → WORKSPACE CONTENT
```

| Layer | Responsibility |
| --- | --- |
| **Global navigation** | Which major SCE domain am I in? |
| **Breadcrumbs** | Where am I in the product hierarchy? |
| **Workspace / page header** | What context/object/workspace am I viewing? |
| **Context tabs** | What can I view/do within this context? |
| **Workspace content** | Operational content |

**Breadcrumbs:** `BREADCRUMBS_CANONICAL_NAVIGATION_LANGUAGE = YES` · rollout **`BREADCRUMB_ROLLOUT_OWNER = SCE-DESIGN-SYSTEM-03`** (component, semantics, truncation, mobile back, a11y — **not** DS-02).

**Context tabs:** `CONTEXT_TABS_CANONICAL = SceContextTabs` · **`CONTEXT_TAB_ROLLOUT_OWNER = SCE-DESIGN-SYSTEM-03`**. **All workspaces ≠ all workspaces require tabs** — do not add artificial tabs to flat single-purpose workspaces.

**DS-10 completion gate:** DS-10 cannot close while unexplained legacy workspace systems remain. Every applicable workspace must be **(A)** migrated, **(B)** already compliant, or **(C)** an explicit documented domain-specific composition that still consumes canonical foundations/navigation semantics — **not (D)** forgotten legacy UI.

---

## Mission

Turn the accepted DS-01 architecture and PO visual direction into a **code-backed visual foundation** that DS-03 through DS-10 consume.

**Core principle:** DEFINE THE FOUNDATION ONCE. LET EVERY SCE WORKSPACE CONSUME IT.

This package is **not** the product-wide visual migration.

---

## Foundation source of truth

| Item | Owner |
| --- | --- |
| **Runtime tokens (colours, spacing, radii, elevation, motion)** | `app/globals.css` (`:root`, `@theme`, utility classes) |
| **Typed contract (names, semantics, guardrails)** | `lib/design-system/sce-foundation-contract.ts` |
| **Context tab foundation classes** | `lib/design-system/sce-context-tabs-foundation.ts` |
| **Overlay z-index** | `lib/ui/sce-overlay-layering.ts` + `--sce-z-*` in `globals.css` |

**Rule:** Do not maintain a second manually duplicated token source. TypeScript modules reference CSS custom property **names** only.

---

## PO visual direction (carried from DS-01-R1)

| Flag | Value |
| --- | --- |
| `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE` | **YES** |
| `DARK_NAVY_SCE_LANGUAGE` | **CANONICAL_DIRECTION** |
| `RESTRAINED_ACCENT_USAGE` | **REQUIRED** |
| `LAYERED_SURFACE_HIERARCHY` | **REQUIRED** |
| `CALM_INFORMATION_HIERARCHY` | **REQUIRED** |
| `PREMIUM_DOES_NOT_MEAN_OVERSIZED` | **YES** |

Reference routes: `/dashboard/communication` · `/dashboard/communication/email-sender`

---

## Semantic colour architecture

Application components should consume **meaning**, not raw palette steps (`navy-700`, `gray-800`, …).

### Surfaces

| Semantic token | CSS variable | Role |
| --- | --- | --- |
| App background | `--sce-color-app-background` | Atmospheric SCE canvas |
| Chrome | `--sce-color-chrome` | App shell / navigation chrome |
| Workspace | `--sce-color-workspace` | Module canvas |
| Page / module surface | `--sce-color-page-surface` | Page-level elevated canvas |
| Surface standard | `--sce-color-surface-standard` | Panels / cards |
| Surface elevated | `--sce-color-surface-elevated` | Raised panels |
| Surface interactive | `--sce-color-surface-interactive` | Inputs / subtle wells |
| Surface selected | `--sce-color-surface-selected` | Restrained selection wash |
| Surface hover | `--sce-color-surface-hover` | Hover elevation |

Hierarchy (architecture):

```text
APP → CHROME → WORKSPACE → PAGE → SECTION → PANEL/CARD → CONTROLS
```

### Text & icons

| Role | CSS variable |
| --- | --- |
| Text primary | `--sce-color-text-primary` |
| Text secondary | `--sce-color-text-secondary` |
| Text muted | `--sce-color-text-muted` |
| Text disabled | `--sce-color-text-disabled` |
| Icon primary | `--sce-color-icon-primary` |
| Icon muted | `--sce-color-icon-muted` |

### Borders & accent

| Role | CSS variable |
| --- | --- |
| Border subtle | `--sce-color-border-subtle` |
| Border standard | `--sce-color-border-standard` |
| Border strong | `--sce-color-border-strong` |
| Accent primary | `--sce-color-accent-primary` |
| Accent hover / active | `--sce-color-accent-hover` / `--sce-color-accent-active` |
| Focus | `--sce-color-focus` |
| Disabled | `--sce-color-disabled` |

### Status

| Role | CSS variable |
| --- | --- |
| Success | `--sce-color-status-success` |
| Warning | `--sce-color-status-warning` |
| Error | `--sce-color-status-error` |
| Info | `--sce-color-status-info` |
| Neutral | `--sce-color-status-neutral` |

---

## Activity semantic colours

Canonical activity identity (text labels mandatory — no color-only meaning):

| Activity | Label | Pill variant | CSS semantics |
| --- | --- | --- | --- |
| Match | SPIEL | `match-red` | `--sce-activity-match` |
| Training | TRAINING | `training-blue` | `--sce-activity-training` |
| Tournament | TURNIER | `tournament-orange` | `--sce-activity-tournament` |
| Club Event | VERANSTALTUNG | `club-event-violet` | `--sce-activity-club-event` |

Usage: type pills, small accents, icon accents, restrained selected states — **not** flooding whole surfaces.

Implementation: `activity-type-pill.ts` · `activity-color-tokens.ts`.

---

## Typography

Font families preserved: **Inter** (body), **Barlow Condensed** (display accents).

Semantic roles (CSS vars + optional utilities):

| Role | Token prefix | Utility class |
| --- | --- | --- |
| Page title | `--sce-fs-page-title` | `.sce-type-page-title` |
| Section title | `--sce-fs-section-title` | `.sce-type-section-title` |
| Card title | `--sce-fs-card-title` | `.sce-type-card-title` |
| Body / body secondary | `--sce-fs-body` | `.sce-type-body` / `.sce-type-body-secondary` |
| Label | `--sce-fs-label` | `.sce-type-label` |
| Metadata | `--sce-fs-metadata` | `.sce-type-metadata` |
| Caption | `--sce-fs-caption` | `.sce-type-caption` |
| Dense operational | `--sce-fs-dense` | `.sce-type-dense` |

Display / hero tokens remain for genuine marketing or hero surfaces only.

---

## Spacing

Base scale: `--space-*` / `--sce-sp-*` (4px grid).

Foundation **roles** (alias scale — product migration later):

- `--sce-space-page-gutter` (see also responsive `--sce-page-gutter` in `global-app-navigation.css`)
- `--sce-space-workspace-padding`
- `--sce-space-section-gap`
- `--sce-space-panel-padding`
- `--sce-space-form-gap`
- `--sce-space-control-gap`
- `--sce-space-inline-gap`
- `--sce-space-dense-inline`

---

## Radii, borders, elevation

| Role | CSS variable |
| --- | --- |
| Controls | `--sce-radius-control` |
| Panels / cards | `--sce-radius-panel` |
| Menus / popovers | `--sce-radius-menu` |
| Dialogs / composer | `--sce-radius-dialog` |
| Pills / badges | `--sce-radius-pill` |

Elevation prefers **surface contrast + restrained border**; shadow tokens:

- `--sce-elevation-panel`
- `--sce-elevation-elevated`
- `--sce-elevation-menu`
- `--sce-elevation-dialog`

---

## Focus & interaction states

Canonical focus language:

- Global `:focus-visible` outline uses `--sce-focus-ring-color`
- Inputs use `--sce-focus-input-shadow`
- Components use visible rings (not colour alone)

Foundation states: DEFAULT · HOVER · FOCUS · ACTIVE · SELECTED · DISABLED · READ_ONLY · LOADING (where applicable).

---

## Density foundation

Layout density tiers (opt-in per component):

| Tier | Control height var | Gap var |
| --- | --- | --- |
| COMFORTABLE | `--sce-density-comfortable-control-height` | `--sce-density-comfortable-gap` |
| COMPACT | `--sce-density-compact-control-height` | `--sce-density-compact-gap` |
| DENSE | `--sce-density-dense-control-height` | `--sce-density-dense-gap` |

**Separate:** activity presentation densities HERO · STANDARD · COMPACT · MICRO (`SCE_ACTIVITY_DENSITY_CONTRACT`).

**Rule:** `PREMIUM_DOES_NOT_MEAN_OVERSIZED`.

---

## Icons & crests

Icon size roles documented in `sce-foundation-contract.ts` (metadata, control, standard, feature, empty-state, status, resource).

Crest foundation sizes: MICRO · COMPACT · STANDARD · HERO — real club crests remain **object-contain**, no circular masks on artwork (DS-01 rules unchanged).

---

## Motion

Restrained transitions: `--sce-motion-*`, `--transition-*`. Existing `prefers-reduced-motion` rules in `globals.css` and `nav-icon-animations.css` remain authoritative.

---

## Responsive foundation

Documented breakpoints (repository-aligned):

| Tier | Intent |
| --- | --- |
| Mobile | `max-width: 768px` (`SCE_MOBILE_SHELL_MAX_WIDTH_PX`) |
| Small tablet | 769px+ |
| Large tablet | 1024px+ |
| Desktop | 1280px+ |
| Wide operational desktop | 1536px+ |

Page gutters: `--sce-page-gutter` stepped in `app/(admin)/global-app-navigation.css` (16px → 32px).

Comprehensive responsive adoption: **DS-09**.

---

## Z-index / layering

See master doc overlay table · `lib/ui/sce-overlay-layering.ts`.

---

## Breadcrumbs — foundation preparation

`BREADCRUMBS_CANONICAL_NAVIGATION_LANGUAGE = YES`

DS-02 provides typography, muted/active text, separator spacing, hover/focus, truncation **tokens** only.

**Rollout owner:** `BREADCRUMB_ROLLOUT_OWNER = SCE-DESIGN-SYSTEM-03`

Hierarchy principle:

```text
GLOBAL NAVIGATION → BREADCRUMBS → WORKSPACE/PAGE HEADER → CONTEXT TABS → CONTENT
```

---

## Context tabs — foundation preparation

`CONTEXT_TABS_CANONICAL = SceContextTabs`

Token-backed tab recipes: `lib/design-system/sce-context-tabs-foundation.ts`

**Rollout owner:** `CONTEXT_TAB_ROLLOUT_OWNER = SCE-DESIGN-SYSTEM-03`

Do not create a second tab system.

---

## Action & status preparation

Future action hierarchy (DS-05/06): PRIMARY · SECONDARY · TERTIARY/TEXT · DESTRUCTIVE · ICON ACTION — semantic colours wired; **Button** remains canonical target.

Status/readiness full implementation: **DS-07**.

---

## Toggle First

Binary on/off → **SwitchToggle**. Multi-selection → checkbox where appropriate.

**No new binary checkboxes in DS-02.** No mass migration (~32 legacy checkboxes) — DS-05 / DS-10.

---

## Representative adoption (DS-02)

**Representative adoption only** — not product-wide migration.

Updated to consume semantic foundation (aliases — no intentional visual drift):

- `Button`
- `SwitchToggle`
- `Badge`
- `SceWorkspaceSurface` / workspace layout tokens
- `SceContextTabs`
- `ActivityTypePill` activity semantics

**Not in scope:** dozens of routes, full breadcrumb migration, full tab rollout.

---

## Migration boundaries

| Package | Owns |
| --- | --- |
| **DS-02** | Token architecture + representative proof |
| **DS-03** | Workspace / surface / navigation + breadcrumbs + context tabs rollout |
| **DS-05–06** | Buttons / actions |
| **DS-07** | Status / empty / error |
| **DS-09** | Responsive audit |
| **DS-10** | Product-wide visual migration |

---

## Acceptance criteria

- [x] Single foundation source (`app/globals.css`) with semantic aliases
- [x] Typed contract without duplicate literals
- [x] Activity semantics preserved
- [x] Focus + density foundations documented and test-guarded
- [x] Overlay layering unchanged
- [x] Toggle First + SceContextTabs canonical references
- [x] Representative primitive adoption
- [x] Guardrail tests (`sce-design-system-02-foundations.test.ts`)
- [x] Master doc updated
- [x] PO visual UAT (PO-owned — **PASS**; Cursor skipped per closure policy)

---

## Governance (closure template)

| Field | DS-02 value |
| --- | --- |
| `SCE_DESIGN_SYSTEM_COMPLIANCE` | **PASS** (foundation scope) |
| `PARALLEL_PATTERN_INTRODUCED` | **NO** |
| `NEW_BINARY_CHECKBOXES` | **0** |
| `BINARY_CONTROL_COMPLIANCE` | **PASS** |
| `CANONICAL_TOGGLES_USED` | **YES** (SwitchToggle unchanged as canonical) |
| `MULTI_SELECTION_PATTERN` | **not_applicable** |
| `WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE` | **PASS** (SCE activity card family — `SceMatchCard`, `SceTrainingCard`, … — semantics preserved) |
| `PO_FOUNDATION_REVIEW` | **PASS** |
| `PO_ARCHITECTURE_REVIEW` | **PASS** |
| `DATABASE_MIGRATION_REQUIRED` | **NO** |
| `SCHEMA_DRIFT` | **NO** |
| `PERSISTENT_TEST_DATA` | **0** |
| `PROD` | **UNTOUCHED** |

```text
DS02_STATUS = CLOSED / ACCEPTED / MERGED
SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS
NEXT_PACKAGE = SCE-DESIGN-SYSTEM-03 — Workspace / Surface / Navigation System
WORKSPACE_SYSTEM_PRODUCT_WIDE = YES
BREADCRUMB_SYSTEM_PRODUCT_WIDE = YES
CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC = YES
LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED = NO
PRODUCT_WIDE_WORKSPACE_MIGRATION_REQUIRED = YES
UNEXPLAINED_LEGACY_WORKSPACES_ALLOWED_AT_DS10_CLOSURE = NO
MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED
SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED
```

---

## Related

- [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md)
- [`SCE-DESIGN-SYSTEM-01.md`](./SCE-DESIGN-SYSTEM-01.md)
- [`SCE-DESIGN-SYSTEM-03.md`](./SCE-DESIGN-SYSTEM-03.md)
- [`SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md`](../design/SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md)
