# SCE Design System v1.0 — Master Entry Point

> **Programme:** [`SCE-UI-ROLLOUT-01+`](../roadmap/SCE-UI-ROLLOUT-01.md) · **Design System programme:** [`SCE-DESIGN-SYSTEM-01`](../roadmap/SCE-DESIGN-SYSTEM-01.md) — **CLOSED / ACCEPTED / MERGED** (PR **#879**) · [`SCE-DESIGN-SYSTEM-02`](../roadmap/SCE-DESIGN-SYSTEM-02.md) — **CLOSED / ACCEPTED / MERGED** (PR **#880**) · [`SCE-DESIGN-SYSTEM-03`](../roadmap/SCE-DESIGN-SYSTEM-03.md) — **CLOSED / ACCEPTED / MERGED** (PR **#881**) · [`SCE-DESIGN-SYSTEM-04`](../roadmap/SCE-DESIGN-SYSTEM-04.md) — **CLOSED / ACCEPTED / MERGED** (PR **#882**) · [`SCE-DESIGN-SYSTEM-05`](../roadmap/SCE-DESIGN-SYSTEM-05.md) — **CLOSED / ACCEPTED / MERGED** (PR **#883**) · [`SCE-DESIGN-SYSTEM-06`](../roadmap/SCE-DESIGN-SYSTEM-06.md) — **CLOSED / ACCEPTED / MERGED** (PR **#884**) · [`SCE-DESIGN-SYSTEM-07`](../roadmap/SCE-DESIGN-SYSTEM-07.md) — **CLOSED / ACCEPTED / MERGED** (PR **#885**) · [`SCE-DESIGN-SYSTEM-08`](../roadmap/SCE-DESIGN-SYSTEM-08.md) — **CLOSED / ACCEPTED / MERGED** (PR **#886**) · [`SCE-DESIGN-SYSTEM-09`](../roadmap/SCE-DESIGN-SYSTEM-09.md) — **CLOSED / ACCEPTED / MERGED** (PR **#887**)  
> **Established by:** SCE-UI-ROLLOUT-01B (Context Tabs foundation)  
> **`SCE_DESIGN_SYSTEM_PROGRAMME_STATUS`:** **IN PROGRESS** · **`NEXT_PACKAGE`:** **SCE-DESIGN-SYSTEM-10** — Product-wide Adoption / Legacy Removal · [`SCE-DESIGN-SYSTEM-09`](../roadmap/SCE-DESIGN-SYSTEM-09.md) — **CLOSED / ACCEPTED / MERGED** (PR **#887**) · [`SCE-DESIGN-SYSTEM-08`](../roadmap/SCE-DESIGN-SYSTEM-08.md) — **CLOSED / ACCEPTED / MERGED** (PR **#886**)

---

## SCE-DESIGN-SYSTEM-01 — current state vs target v1.0

**PO closure (DS-01):** `PO_ARCHITECTURE_REVIEW = PASS` · `PO_VISUAL_DIRECTION_REVIEW = PASS` · `DS01_STATUS = CLOSED / ACCEPTED / MERGED` (architecture baseline). See [`SCE-DESIGN-SYSTEM-01`](../roadmap/SCE-DESIGN-SYSTEM-01.md).

**PO closure (DS-02):** `PO_FOUNDATION_REVIEW = PASS` · `PO_ARCHITECTURE_REVIEW = PASS` · `DS02_STATUS = CLOSED / ACCEPTED / MERGED` (foundations & tokens — **no** product-wide migration). See [`SCE-DESIGN-SYSTEM-02`](../roadmap/SCE-DESIGN-SYSTEM-02.md).

**PO closure (DS-03):** `PO_WORKSPACE_SYSTEM_REVIEW = PASS` · `PO_BREADCRUMB_SYSTEM_REVIEW = PASS` · `PO_CONTEXT_TAB_SYSTEM_REVIEW = PASS` · `PO_NAVIGATION_ARCHITECTURE_REVIEW = PASS` · `DS03_STATUS = CLOSED / ACCEPTED / MERGED` (workspace / surface / navigation — representative adoption; DS-10 completes product-wide migration). See [`SCE-DESIGN-SYSTEM-03`](../roadmap/SCE-DESIGN-SYSTEM-03.md).

**PO closure (DS-04):** `PO_CARD_SYSTEM_REVIEW = PASS` · `PO_INFORMATION_PRESENTATION_REVIEW = PASS` · `PO_ACTIVITY_PRESENTATION_REVIEW = PASS` · `PO_INFOBOARD_P0_REVIEW = PASS` · `DS04_STATUS = CLOSED / ACCEPTED / MERGED` (PR **#882**; cards & information presentation — representative adoption; DS-10 completes legacy card inventory). See [`SCE-DESIGN-SYSTEM-04`](../roadmap/SCE-DESIGN-SYSTEM-04.md).

**PO closure (DS-05):** `PO_FORM_CONTROL_SYSTEM_REVIEW = PASS` · `PO_TOGGLE_FIRST_REVIEW = PASS` · `PO_FORM_CONTROL_MICRO_UX_REVIEW = PASS` · `DS05_STATUS = CLOSED / ACCEPTED / MERGED` (PR **#883**; forms & controls + R1 micro-UX — representative adoption; DS-10 completes form/control + micro drift inventory). See [`SCE-DESIGN-SYSTEM-05`](../roadmap/SCE-DESIGN-SYSTEM-05.md).

**DS-01 P0 audit carry-forward:** `P0_ACTIVITY_TAB_KEYBOARD_ACCESSIBILITY = CLOSED_BY_DS03` · `P0_INFOBOARD_MATCH_PRESENTATION = CLOSED_BY_DS04` · **`DS01_OPEN_P0_FINDINGS = 0`** (historical audit rows preserved in migration matrix).

| | **Current state (STAGE baseline)** | **Target v1.0 (DS-02+ implementation)** |
| --- | --- | --- |
| **Scope** | Strong canonical cores (nav, activity cards, composer, context tabs, crest rules, tournament fixture presentation) coexisting with legacy admin surfaces, local empty states, and ~32 estimated binary-setting checkboxes | One enforced consumption model across modules with tokenised foundations and unified feedback primitives |
| **Documentation** | This master doc + UI rollout standards + **DS-01** registry/matrix | Same master doc as single entry; registry rows marked **CANONICAL** only after adoption package lands |
| **Migration** | [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md) (28 rows) + [`SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md`](./SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md) | DS-10 closes MUST-MIGRATE register entries |
| **Compliance** | Package closure fields defined below — manual | DS-11 adds automated guardrails where practical |

**DS-01 does not claim unfinished primitives are already canonical.** Refer to [`SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md`](./SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md) for proposed v1.0 registry and classification counts.

**Terminology:** Use **SCE activity card family** (`SceMatchCard`, `SceTrainingCard`, `SceTournamentCard`, `SceClubEventCard`, tournament fixture presentation layer). Do **not** introduce **“World Activity Card”** as a product or architecture concept in new Design System documentation (historical roadmap phrasing only).

### PO visual direction (DS-01-R1 — locked)

Product Owner decision: **`/dashboard/communication`** and related Communication settings surfaces (including **`/dashboard/communication/email-sender`**) are a **primary positive visual reference** for SCE Design System v1.0. Extract **visual principles** into canonical rules and roll them out product-wide — **not** copy the Communication hub layout onto every module.

| Flag | Value |
| --- | --- |
| `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE` | **YES** |
| `PRODUCT_WIDE_ROLLOUT_TARGET` | **YES** |
| `DARK_NAVY_SCE_LANGUAGE` | **CANONICAL_DIRECTION** |
| `RESTRAINED_ACCENT_USAGE` | **REQUIRED** |
| `LAYERED_SURFACE_HIERARCHY` | **REQUIRED** |
| `CALM_INFORMATION_HIERARCHY` | **REQUIRED** |
| `DOMAIN_SPECIFIC_LAYOUTS_PRESERVED` | **YES** |
| `TOURNAMENT_OPERATIONAL_PATTERNS_PRESERVED` | **YES** |
| `ACTIVITY_CARD_FAMILY_PRESERVED` | **YES** |
| `ACTIVITY_COMPOSER_PRESERVED` | **YES** |
| `CANONICAL_NAVIGATION_PRESERVED` | **YES** |
| `PREMIUM_DOES_NOT_MEAN_OVERSIZED` | **YES** |

Architecture closure markers (DS-01-R1):

```text
COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES
PRODUCT_WIDE_ROLLOUT_TARGET = YES
DARK_NAVY_SCE_LANGUAGE = CANONICAL_DIRECTION
RESTRAINED_ACCENT_USAGE = REQUIRED
LAYERED_SURFACE_HIERARCHY = REQUIRED
CALM_INFORMATION_HIERARCHY = REQUIRED
DOMAIN_SPECIFIC_LAYOUTS_PRESERVED = YES
TOURNAMENT_OPERATIONAL_PATTERNS_PRESERVED = YES
ACTIVITY_CARD_FAMILY_PRESERVED = YES
ACTIVITY_COMPOSER_PRESERVED = YES
CANONICAL_NAVIGATION_PRESERVED = YES
PREMIUM_DOES_NOT_MEAN_OVERSIZED = YES
```

### World-class micro UX / visual detail (permanent — all Design System packages)

A package is not complete when the correct component exists, the correct token is used, or the layout is structurally consistent. **Every touched surface must also pass micro review.**

```text
WORLD_CLASS_SCE_QUALITY =
  MACRO ARCHITECTURE + COMPONENT QUALITY + MICRO DETAIL QUALITY
```

**Visual references (quality inspiration — do not copy layouts):** Communication / Mail Inbox · Dashboard · global navigation · SCE Match Cards · Wochenplaner · Tournament / Spielplan. Generalise the **micro** quality (alignment, icon sizing, borders, focus, density), not the screen structure.

**MICRO HIERARCHY:** PRIMARY CONTENT → SECONDARY CONTENT → METADATA → SUPPORTING AFFORDANCE. Chevrons, metadata icons, badges, and status dots must support primary content — not compete with it.

| Governance flag | Value |
| --- | --- |
| `WORLD_CLASS_MICRO_UX_REQUIRED` | **YES** |
| `MICRO_STATE_COVERAGE_REQUIRED` | **YES** |
| `MICRO_ALIGNMENT_CONSISTENCY_REQUIRED` | **YES** |
| `MICRO_RESPONSIVE_QUALITY_REQUIRED` | **YES** |
| `MICRO_ACCESSIBILITY_REQUIRED` | **YES** |
| `LOCAL_MICRO_PATTERN_DRIFT_ALLOWED` | **NO** |
| `UNEXPLAINED_MICRO_PATTERN_DRIFT_ALLOWED_AT_DS10_CLOSURE` | **NO** |

Equivalent control semantics must consume **canonical micro recipes** (`lib/design-system/sce-micro-ux-governance.ts`, `lib/design-system/sce-form-control-micro-ux.ts` for DS-05 forms). Unexplained local drift (icon sizes, focus rings, error spacing, chevrons, clear-button placement) is **Design System debt** gated at DS-10.

**Density:** micro polish must hold in **COMFORTABLE**, **COMPACT**, and **DENSE** — dense operational surfaces (Wochenplaner, Tournament Planner) stay information-rich; quality comes from precision, not extra whitespace.

Typed governance: `lib/design-system/sce-micro-ux-governance.ts` · automated DS-05 checks: `lib/design-system/__tests__/sce-design-system-05-r1-micro-ux.test.ts`.

**Canonical visual language**

- **Dark / navy SCE product language** — preserve atmospheric `--sce-app-background` and layered dark surfaces (`--sce-surface-*`). Avoid drift toward generic white SaaS unless accessibility or domain requirements justify an exception.
- **Layered surface hierarchy** (reconciled with DS-01 architecture, not a competing model):

```text
APP (atmospheric background)
  → CHROME (AppShellNavigation — two-row, on-demand L2/L3)
  → WORKSPACE (module canvas — e.g. SCE_DASHBOARD_MODULE_PAGE_SURFACE / SceWorkspaceSurface)
  → PAGE (PageShell + width mode)
  → SECTION (headers, grouped content)
  → PANEL / CARD (elevated working surfaces)
  → CONTROLS & ACTIONS
```

- **Restrained accent** — orange (`--sce-primary`) for primary actions, active navigation, meaningful icons, important links, and focused emphasis — **not** dominant surface colour.
- **Calm information hierarchy** — clear title, concise description, controlled whitespace, muted secondary text, restrained borders, obvious primary action, limited competing actions (Communication hub exemplifies this).
- **Depth without noise** — prefer surface contrast and restrained borders over excessive boxes, shadows, and decoration.

**Preservation rule:** Communication provides a **primary visual reference**. The Design System provides **product-wide rules**. Domain workflows retain **purpose-built compositions** (activity cards, tournament planner grids, permission matrices, Wochenplaner density, `SceActivityComposer`, NAVBAR-UPGRADE-01 shell).

**Density:** Support **COMFORTABLE · COMPACT · DENSE** tiers under the same SCE language. Operational surfaces (tables, Personen & Zugänge, Wochenplaner, Tournament Planner) stay efficient — **`PREMIUM_DOES_NOT_MEAN_OVERSIZED`**.

Full pattern mapping: [`SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md`](./SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md) · product-wide rollout classifications: [`SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md`](./SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md).

---

## Foundations & tokens (SCE-DESIGN-SYSTEM-02)

**`FOUNDATION_SOURCE_OF_TRUTH`:** `app/globals.css` — semantic aliases on `:root` (DS-02). Typed names and guardrails: `lib/design-system/sce-foundation-contract.ts` (no duplicate colour literals).

| Concern | Contract |
| --- | --- |
| Semantic colours (surfaces, text, borders, accent, status) | `--sce-color-*` in `app/globals.css` |
| Activity semantics (SPIEL / TRAINING / TURNIER / VERANSTALTUNG) | `--sce-activity-*` + `activity-type-pill.ts` |
| Typography roles | `--sce-fs-*` + optional `.sce-type-*` utilities |
| Spacing roles | `--sce-space-*` + `--sce-sp-*` scale |
| Radii / elevation | `--sce-radius-*`, `--sce-elevation-*` |
| Focus | `--sce-focus-ring-color`, `--sce-focus-input-shadow`, global `:focus-visible` |
| Layout density | `--sce-density-{comfortable,compact,dense}-*` |
| Overlay layering | `lib/ui/sce-overlay-layering.ts` + `--sce-z-*` |
| Context tab foundation | `lib/design-system/sce-context-tabs-foundation.ts` → **`SceContextTabs`** (canonical) |

**Navigation rollout (not DS-02):** Breadcrumbs and product-wide context tab adoption → **`SCE-DESIGN-SYSTEM-03`** (`BREADCRUMB_ROLLOUT_OWNER` · `CONTEXT_TAB_ROLLOUT_OWNER`).

**Representative adoption in DS-02:** `Button`, `SwitchToggle`, `Badge`, `SceWorkspaceSurface`, `SceContextTabs`, activity type pills — proof of token architecture only; not DS-10 migration.

Full package doc: [`SCE-DESIGN-SYSTEM-02`](../roadmap/SCE-DESIGN-SYSTEM-02.md).

Automated guardrails: `lib/design-system/__tests__/sce-design-system-02-foundations.test.ts`.

**DS-02 PO lock — product-wide workspace system** (implementation rollout → **DS-03**; completion gate → **DS-10**):

| Flag | Value |
| --- | --- |
| `WORKSPACE_SYSTEM_PRODUCT_WIDE` | **YES** |
| `BREADCRUMB_SYSTEM_PRODUCT_WIDE` | **YES** |
| `CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC` | **YES** |
| `LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED` | **NO** |
| `BREADCRUMBS_CANONICAL_NAVIGATION_LANGUAGE` | **YES** |
| `BREADCRUMB_ROLLOUT_OWNER` | **SCE-DESIGN-SYSTEM-03** |
| `CONTEXT_TABS_CANONICAL` | **SceContextTabs** |
| `CONTEXT_TAB_ROLLOUT_OWNER` | **SCE-DESIGN-SYSTEM-03** |
| `PRODUCT_WIDE_WORKSPACE_MIGRATION_REQUIRED` | **YES** |
| `UNEXPLAINED_LEGACY_WORKSPACES_ALLOWED_AT_DS10_CLOSURE` | **NO** |

**Canonical navigation stack** (complement — do not duplicate):

```text
GLOBAL NAVIGATION → BREADCRUMBS → WORKSPACE / PAGE HEADER → CONTEXT TABS (when semantic) → WORKSPACE CONTENT
```

Communication (`/dashboard/communication`) remains the **primary positive visual reference**, **not** a universal page template. Preserve tournament planner density, Activity Composer, Programme Engine, activity cards, and domain-specific layouts per DS-01-R1.

Full DS-03 scope: [`SCE-DESIGN-SYSTEM-03`](../roadmap/SCE-DESIGN-SYSTEM-03.md).

---

## Workspace / navigation (SCE-DESIGN-SYSTEM-03)

**Canonical composition** (`SceWorkspaceChrome`):

```text
SceBreadcrumbs → SceWorkspaceHeader → SceContextTabs (when semantic) → content / SceWorkspaceSurface
```

| Primitive | Role |
| --- | --- |
| `AppShellNavigation` | Global SCE domain (unchanged NAVBAR-UPGRADE-01) |
| `SceBreadcrumbs` | Hierarchy wayfinding — **WHERE am I?** |
| `SceWorkspaceHeader` | Object/workspace identity + actions — calm, not oversized |
| `SceContextTabs` | Context subviews — **WHAT can I view/do here?** |
| `PageShell` | Page frame + width modes |
| `SceWorkspaceSurface` | Bounded tab/workspace panel |

**Responsive breadcrumbs:** mobile parent back-link + current label; full trail from `sm` with truncation/collapse for deep paths.

**Context tabs:** URL-first (`?tab=` or `tabRoutes` for route-segment modules). **No parallel tab frameworks** — local shells migrate or documented exceptions ([`SCE-DESIGN-SYSTEM-03-MIGRATION-INVENTORY.md`](./SCE-DESIGN-SYSTEM-03-MIGRATION-INVENTORY.md)).

**Keyboard:** `SceContextTabs` supports arrow keys, Home/End, roving tabindex, and Mehr overflow links.

Automated guardrails: `lib/design-system/__tests__/sce-design-system-03-workspace-navigation.test.ts`.

**DS-03 locks:** `WORKSPACE_SYSTEM_PRODUCT_WIDE = YES` · `BREADCRUMB_SYSTEM_PRODUCT_WIDE = YES` · `CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC = YES` · `LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED = NO` · `BREADCRUMBS_CANONICAL_NAVIGATION_LANGUAGE = YES` · `CONTEXT_TABS_CANONICAL = SceContextTabs` · `ACTIVITY_TAB_ARROW_KEY_ACCESSIBILITY = IMPLEMENTED` · `DOMAIN_SPECIFIC_REVIEW_REQUIRED_AT_DS10 = YES` (interim exceptions: `TeamCockpitNav`, `ProgrammeViewSwitcher`, `CommunicationInboxToolbar`, composer `localNavigation`).

Full package doc: [`SCE-DESIGN-SYSTEM-03`](../roadmap/SCE-DESIGN-SYSTEM-03.md).

---

## Cards & information presentation (SCE-DESIGN-SYSTEM-04)

**`CARD_SYSTEM_PRODUCT_WIDE`:** **YES** · **`COMMUNICATION_IS_UNIVERSAL_CARD_TEMPLATE`:** **NO**

One SCE information language — multiple purpose-built compositions (shared hierarchy, surfaces, typography, spacing, metadata, status shells, action placement).

| Concern | Contract |
| --- | --- |
| Information hierarchy | `SCE_INFORMATION_HIERARCHY_LAYERS` — `lib/design-system/sce-card-information-hierarchy.ts` |
| Information panel shell | `SceInformationSurface` |
| Capability cards | `CommunicationHubCapabilityLink` (navigation) · `SceFeatureCard` (functional) |
| Summary / metric | `DashboardKpiCard` — **`PREMIUM_DOES_NOT_MEAN_OVERSIZED`** |
| Activity family | `SceMatchCard`, `SceTrainingCard`, `SceTournamentCard`, `SceClubEventCard` + `SceActivityPresentationModel` |
| Tournament fixtures | `SceTournamentFixtureCard` — domain-specific canonical |
| Infoboard match P0 | **`INFOBOARD_MATCH_PRESENTATION_P0 = CLOSED`** — Screen 1 UI fallback removed; mapper synthesis; Screen 2 `InfoboardCompactMatchIdentity` |
| DS-10 inventory | [`SCE-DESIGN-SYSTEM-04-CARD-INVENTORY.md`](./SCE-DESIGN-SYSTEM-04-CARD-INVENTORY.md) |
| DS-10 card gate | `UNEXPLAINED_LEGACY_CARD_FAMILIES_ALLOWED_AT_DS10_CLOSURE = NO` |

Automated guardrails: `lib/design-system/__tests__/sce-design-system-04-cards.test.ts`.

Full package doc: [`SCE-DESIGN-SYSTEM-04`](../roadmap/SCE-DESIGN-SYSTEM-04.md).

**DS-04 PO locks:** `CARD_SYSTEM_PRODUCT_WIDE = YES` · `ACTIVITY_CARD_FAMILY_CANONICAL = YES` · `WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE = PASS` · `INFOBOARD_MATCH_PRESENTATION_P0 = CLOSED` · `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES` · `COMMUNICATION_IS_UNIVERSAL_CARD_TEMPLATE = NO` · `BINARY_CONTROL_COMPLIANCE = PASS` · `NEW_BINARY_CHECKBOXES = 0` · `CANONICAL_TOGGLES_USED = YES`.

---

## Forms & controls (SCE-DESIGN-SYSTEM-05)

**`FORM_CONTROL_SYSTEM_PRODUCT_WIDE`:** **YES** · **`PARALLEL_PATTERN_INTRODUCED`:** **NO**

One SCE form/control language — semantic controls for semantic jobs. Evolve existing `.fca-input` / `SwitchToggle` / Activity date-time primitives; do **not** introduce parallel form frameworks.

| Concern | Contract |
| --- | --- |
| Form-field composition | `SceFormField` — LABEL · CONTROL · DESCRIPTION · VALIDATION · STATUS (`SCE_FORM_FIELD_LAYERS`) |
| Text inputs / textarea | `SceTextInput` · `SceTextarea` → `.fca-input` / `.fca-textarea` in `app/globals.css` |
| Search | `SceSearchField` (icon, placeholder, clear) — club/team selector wraps same primitive |
| Select vs combobox | Bounded set → `SceToolbarSelect` / native select with tokens; discovery → `SceListSelectorPanel` / combobox popover |
| Date / time | `SceActivityDateInput` · `SceActivityTimeInput` · `SceActivityDateTimeInput` — preserve smart activity semantics |
| Binary ON/OFF settings | **`SwitchToggle` / `SwitchThumb` — Toggle First** (no new binary checkboxes) |
| Multi-select / row select / consent | `SceCheckbox` — legitimate checkbox semantics only |
| Single visible choice (small set) | `SceSegmentedControl` — modes/views, not fake tabs |
| Validation | Field errors via `SceFormField`; form-level `ValidationSummary` — **UNVISITED ≠ ERROR** |
| Disabled vs read-only | Disabled = non-interactive; read-only = visible but not editable (distinct styling) |
| Density | DS-02 `COMFORTABLE` · `COMPACT` · `DENSE` on form fields |
| DS-10 inventory | [`SCE-DESIGN-SYSTEM-05-FORM-CONTROL-INVENTORY.md`](./SCE-DESIGN-SYSTEM-05-FORM-CONTROL-INVENTORY.md) |

Automated guardrails: `lib/design-system/__tests__/sce-design-system-05-forms.test.ts` · `lib/design-system/__tests__/sce-design-system-05-r1-micro-ux.test.ts` · `lib/design-system/__tests__/sce-binary-control-standard.test.ts`.

**R1 micro-UX (`SCE_FORM_CONTROL_MICRO_UX`):** `WORLD_CLASS_FORM_CONTROL_MICRO_UX = PASS` · `FOCUS_NOT_COLOUR_ALONE = YES` · `CALM_FIELD_HIERARCHY = YES` · `BINARY_SETTING_ROW_LAYOUT_CANONICAL = YES` — shared field stack rhythm, semantic required/error tokens (no raw palette drift), foundation-aligned focus rings, invalid borders on `SceTextInput`/`SceTextarea`, and stable `data-sce-*` markers on primitives plus `data-sce-binary-setting-row` on representative Toggle First migrations. Contract: `lib/design-system/sce-form-control-micro-ux.ts`.

Full package doc: [`SCE-DESIGN-SYSTEM-05`](../roadmap/SCE-DESIGN-SYSTEM-05.md).

**DS-05 PO locks:** `FORM_CONTROL_SYSTEM_PRODUCT_WIDE = YES` · `BINARY_CONTROL_COMPLIANCE = PASS` · `NEW_BINARY_CHECKBOXES = 0` · `CANONICAL_TOGGLES_USED = YES` · `VALIDATION_SYSTEM_CANONICAL = YES` · `DISABLED_READ_ONLY_SEMANTICS_CANONICAL = YES` · `ACTIVITY_COMPOSER_ARCHITECTURE = PRESERVED` · `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES` · `WORLD_CLASS_FORM_CONTROL_MICRO_UX = PASS` · `MICRO_RESPONSIVE_QUALITY = PARTIAL_DS09_FINAL` · `MICRO_ACCESSIBILITY = PARTIAL_DS09_FINAL` · `UNEXPLAINED_MICRO_PATTERN_DRIFT_ALLOWED_AT_DS10_CLOSURE = NO`.

---

## Actions, dialogs & composer (SCE-DESIGN-SYSTEM-06)

**`ACTION_SYSTEM_PRODUCT_WIDE`:** **YES** · **`DIALOG_SYSTEM_PRODUCT_WIDE`:** **YES** · **`ACTIVITY_COMPOSER_CANONICAL`:** **YES** · **`PARALLEL_MODAL_SYSTEM`:** **NO**

One SCE action language and one dialog architecture — evolve `SceModalOverlay` / `Dialog` / `SceActivityComposer`; do **not** introduce a second modal stack.

| Concern | Contract |
| --- | --- |
| Action hierarchy | `SCE_ACTION_HIERARCHY` — PRIMARY · SECONDARY · TERTIARY/TEXT · DESTRUCTIVE · ICON ACTION (`lib/design-system/sce-action-dialog-foundation.ts`) |
| Primary / secondary CTAs | `Button` · `SceActionLink` — **one primary per local context**; restrained orange accent |
| Icon actions | `SceIconButton` — required `aria-label`, canonical touch target |
| Workspace actions | `SceWorkspaceHeader` · `PageActions` |
| Overflow menus | `SceOverflowMenu` + shared item/trigger tokens |
| Dialog shell | `Dialog` on `SceModalOverlay` · `useSceModalDialog` focus trap |
| Confirmations | `SceConfirmDialog` — meaningful copy, safe cancel, destructive hierarchy |
| Composer | `SceActivityComposer` — overlay/page/mobile, guided Zurück/Weiter, dirty guard, `secondaryPanel` |
| Dirty guard | `SceContextDirtyGuardProvider` · `confirmNavigationIfDirty` |
| Nested modals | **Avoid modal → modal** — inventory in DS-06; elevated `stackLayer` exceptions only |
| DS-10 inventory | [`SCE-DESIGN-SYSTEM-06-ACTION-DIALOG-INVENTORY.md`](./SCE-DESIGN-SYSTEM-06-ACTION-DIALOG-INVENTORY.md) |

Automated guardrails: `lib/design-system/__tests__/sce-design-system-06-actions-dialogs.test.ts`.

**SCE_ACTION_DIALOG_MICRO_UX:** `WORLD_CLASS_ACTION_DIALOG_MICRO_UX = PASS` · `ACTION_HIERARCHY_NOT_COLOUR_ALONE = YES` · `ONE_PRIMARY_PER_CONTEXT = YES` — shared dialog close/footer tokens, overflow menu recipes, composer footer `data-sce-composer-action` markers. Contract: `lib/design-system/sce-action-dialog-micro-ux.ts`.

Full package doc: [`SCE-DESIGN-SYSTEM-06`](../roadmap/SCE-DESIGN-SYSTEM-06.md).

**DS-06 PO closure locks:** `DS06_STATUS = CLOSED / ACCEPTED / MERGED` · `ACTION_SYSTEM_PRODUCT_WIDE = YES` · `DIALOG_SYSTEM_PRODUCT_WIDE = YES` · `ACTIVITY_COMPOSER_CANONICAL = YES` · `BINARY_CONTROL_COMPLIANCE = PASS` · `NEW_BINARY_CHECKBOXES = 0` · `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES` · `VISIBLE_DESIGN_CONVERGENCE_REQUIRED = YES` · `FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED = YES` · `RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE = NO` · `PITCH_COUNT_RECOMMENDATION = YES` · `PLAYING_FORMAT_RECOMMENDED_FROM_TEMPLATE = NO` · `PLAYING_FORMAT_AUTO_ASSIGNED_TO_RECOMMENDED_PITCH = NO` · `WORLD_CLASS_MICRO_UX_REQUIRED = YES` · `LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO` · `MICRO_RESPONSIVE_QUALITY = PARTIAL_DS09_FINAL` · `MICRO_ACCESSIBILITY = PARTIAL_DS09_FINAL` · `UNEXPLAINED_LEGACY_ACTION_DIALOG_FAMILIES_ALLOWED_AT_DS10_CLOSURE = NO` · `SCE_DESIGN_SYSTEM_COMPLIANCE = PASS`.

**DS-06-R1–R3 (accepted on PR #884):** visible adoption on Tournament Center, Planung, and Personen & Zugänge; **Turnierplanung einrichten** for legacy HOME tournaments (no recreation; AWAY protected); R2 functional Planung resource surfaces + idempotent recommended pitch count preparation; R3 **schedule recommendation ≠ playing format** (Spielform optional until organiser chooses). Metadata: `sce-design-system-06-meta.ts` · `sce-design-system-06-r1-meta.ts` · `sce-design-system-06-r2-meta.ts` · `sce-design-system-06-r3-meta.ts`. Remaining visual debt: **DS-07–DS-10** — not a claim of full-app visual migration.

---

## Status, feedback, loading, empty & error (SCE-DESIGN-SYSTEM-07)

**`STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE`:** **YES** · **`READINESS_SYSTEM_CANONICAL`:** **YES** · **`EMPTY_STATE_SYSTEM_CANONICAL`:** **YES** · **`LOADING_SYSTEM_CANONICAL`:** **YES**

One semantic feedback model (SUCCESS · WARNING · ERROR · INFO · NEUTRAL) — **icon + text**, never colour alone. Restrained surfaces aligned with Communication workspace quality.

| Concern | Contract |
| --- | --- |
| Semantic feedback | `SceSemanticFeedback` — role/status/alert semantics (`lib/design-system/sce-feedback-status-foundation.ts`) |
| Readiness / status panel | `SceReadinessStatusPanel` — Email Sender **Versandbereitschaft** reference |
| Empty states | `SceEmptyState` — EMPTY ≠ ERROR; NO_RESULTS ≠ FIRST_USE |
| Actionable errors | `SceActionableError` + `buildSceActionableErrorPresentation` — **`GENERIC_INTERNAL_ERROR_AS_DEFAULT = NO`** |
| Loading hierarchy | Control → local → skeleton → workspace skeleton (`SCE_LOADING_HIERARCHY`) |
| Skeletons | `SceSkeleton` recipes · bridge to `LoadingSkeleton` · `prefers-reduced-motion` |
| Legacy empty bridge | `EmptyState` / `DashboardEmptyState` → `SceEmptyState` |
| DS-10 inventory | [`SCE-DESIGN-SYSTEM-07-FEEDBACK-INVENTORY.md`](./SCE-DESIGN-SYSTEM-07-FEEDBACK-INVENTORY.md) |

Automated guardrails: `lib/design-system/__tests__/sce-design-system-07-status-feedback.test.ts` · `components/sce/feedback/__tests__/SceFeedbackPrimitives.test.tsx`.

Full package doc: [`SCE-DESIGN-SYSTEM-07`](../roadmap/SCE-DESIGN-SYSTEM-07.md).

**PO closure (DS-07):** `PO_DS07_VISUAL_UAT = PASS` · `PO_DS07_R1_VISUAL_UAT = PASS` · `PO_EMPTY_STATE_REVIEW = PASS` · `PO_PEOPLE_ACCESS_FEEDBACK_REVIEW = PASS` · `PO_TOURNAMENT_PLANUNG_FEEDBACK_REVIEW = PASS` · `PO_READINESS_SYSTEM_REVIEW = PASS` · `DS07_STATUS = CLOSED / ACCEPTED / MERGED` (PR **#885**). See [`SCE-DESIGN-SYSTEM-07`](../roadmap/SCE-DESIGN-SYSTEM-07.md).

**DS-07 PO closure locks:** `STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE = YES` · `READINESS_SYSTEM_CANONICAL = YES` · `EMPTY_STATE_SYSTEM_CANONICAL = YES` · `LOADING_SYSTEM_CANONICAL = YES` · `ACTIONABLE_ERROR_UX_REQUIRED = YES` · `GENERIC_INTERNAL_ERROR_AS_DEFAULT = NO` · `VISIBLE_DESIGN_CONVERGENCE_REQUIRED = YES` · `FEEDBACK_NEAREST_MEANINGFUL_CONTEXT = YES` · `DS10_FINAL_ADOPTION_REQUIRED = YES` · `BINARY_CONTROL_COMPLIANCE = PASS` · `NEW_BINARY_CHECKBOXES = 0` · `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES` · `WORLD_CLASS_MICRO_UX_REQUIRED = YES` · `LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO` · `MICRO_RESPONSIVE_QUALITY = PARTIAL_DS09_FINAL` · `MICRO_ACCESSIBILITY = PARTIAL_DS09_FINAL` · `SCE_DESIGN_SYSTEM_COMPLIANCE = PASS`.

**Representative adoption:** Email Sender readiness → `SceReadinessStatusPanel` · Tournament Planung readiness/planning feedback · Personen & Zugänge feedback layer + empty language (dense table → **DS-08**) · Planning Hub + Mein Programm empty language · Planung setup dialog load error UX. DS-10 completes product-wide empty/loading/error sweep per [`SCE-DESIGN-SYSTEM-07-FEEDBACK-INVENTORY.md`](./SCE-DESIGN-SYSTEM-07-FEEDBACK-INVENTORY.md).

**DS-07-R1 (accepted on PR #885):** contained empty states in list surfaces · readiness visual DNA without local restyling · `people-access-list` skeleton geometry · explicit DS-08 handoff ([`SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md`](./SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md)). Metadata: `sce-design-system-07-meta.ts` · `sce-design-system-07-r1-meta.ts`.

---

## Tables, lists & dense UI (SCE-DESIGN-SYSTEM-08)

**`DENSE_UI_SYSTEM_PRODUCT_WIDE`:** **YES** · **`TABLE_SYSTEM_CANONICAL`:** **YES** · **`LIST_SYSTEM_CANONICAL`:** **YES** · **`DENSE_SURFACE_CANONICAL`:** **YES**

One dense-information language for administrative tables, entity lists, and operational scanning — **not** card soup, **not** forced identical tables everywhere.

| Concern | Contract |
| --- | --- |
| Dense surface | `SceDenseSurface` — toolbar → header → rows → DS-07 states in same region |
| Tabular data | `SceDataTable` when column relationships matter |
| Entity lists | `SceDenseGridRow` + `SceEntityIdentity` when hierarchy/identity scanning matters |
| Toolbar | `SceDenseToolbar` + DS-05 `SceSearchField` / filters |
| Row actions | DS-06 `SceIconButton` · `SceOverflowMenu` · `SceActionLink` |
| Status | Existing `AdminStatusPill` / Badge — no new pill family |
| Selection | Checkboxes only for legitimate multi-select + bulk actions |
| DS-10 inventory | [`SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md`](./SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md) |

Automated guardrails: `lib/design-system/__tests__/sce-design-system-08-dense-ui.test.ts` · `components/sce/dense/__tests__/SceDensePrimitives.test.tsx`.

Full package doc: [`SCE-DESIGN-SYSTEM-08`](../roadmap/SCE-DESIGN-SYSTEM-08.md).

**PO closure (DS-08):** `PO_DS08_VISUAL_UAT = PASS` · `PO_DS08_R1_RUNTIME_REVIEW = PASS` · `PO_PEOPLE_ACCESS_DESKTOP_REVIEW = PASS` · `PO_PEOPLE_ACCESS_RESPONSIVE_REVIEW = PASS` · `PO_ROLES_DENSE_TABLE_REVIEW = PASS` · `DS08_STATUS = CLOSED / ACCEPTED / MERGED` (PR **#886**). See [`SCE-DESIGN-SYSTEM-08`](../roadmap/SCE-DESIGN-SYSTEM-08.md).

**DS-08 PO closure locks:** `DENSE_UI_SYSTEM_PRODUCT_WIDE = YES` · `TABLE_SYSTEM_CANONICAL = YES` · `LIST_SYSTEM_CANONICAL = YES` · `DENSE_SURFACE_CANONICAL = YES` · `ROW_ACTION_SYSTEM_CANONICAL = YES` · `DENSE_FILTER_TOOLBAR_CANONICAL = YES` · `TABLE_WHEN_COLUMN_RELATIONSHIPS_MATTER = YES` · `LIST_WHEN_ENTITY_HIERARCHY_MATTERS = YES` · `CARD_GRID_AS_DEFAULT_DENSE_UI = NO` · `CARD_SOUP_ALLOWED = NO` · `SERVER_COMPONENT_SAFE_DENSE_UI_API = YES` · `EVENT_HANDLERS_CROSS_RSC_BOUNDARY = NO` · `VISIBLE_PRODUCT_ADOPTION_REQUIRED = YES` · `VISIBLE_DESIGN_CONVERGENCE_REQUIRED = YES` · `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES` · `WORLD_CLASS_MICRO_UX_REQUIRED = YES` · `LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO` · `RESPONSIVE_FINAL_HARDENING = DS09` · `ACCESSIBILITY_FINAL_HARDENING = DS09` · `PRODUCT_WIDE_RESPONSIVE_AUDIT_REQUIRED = YES` · `PRODUCT_WIDE_ACCESSIBILITY_AUDIT_REQUIRED = YES` · `DS10_FINAL_ADOPTION_REQUIRED = YES` · `PRODUCT_WIDE_DENSE_UI_MIGRATION_COMPLETE = NO` · `LOCAL_PARALLEL_DENSE_UI_SYSTEMS_ALLOWED = NO` · `BINARY_CONTROL_COMPLIANCE = PASS` · `NEW_BINARY_CHECKBOXES = 0` · `SCE_DESIGN_SYSTEM_COMPLIANCE = PASS`.

**Representative adoption (PO accepted):** `PEOPLE_ACCESS_DENSE_UI = ACCEPTED` · `ROLES_OVERVIEW_DENSE_UI = ACCEPTED` · `BILLING_TABLE_BRIDGE = ACCEPTED` — Personen & Zugänge entity grid → `PeopleAccessDenseUserRow` · Roles overview semantic table → `TenantRolesOverviewDenseTable` · Billing bridge → `BillingDataTable` / `SceDataTable`. DS-10 completes product-wide dense migration per [`SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md`](./SCE-DESIGN-SYSTEM-08-DENSE-UI-INVENTORY.md). Responsive/a11y final hardening → [`SCE-DESIGN-SYSTEM-08-DS09-HANDOFF.md`](./SCE-DESIGN-SYSTEM-08-DS09-HANDOFF.md).

---

## Responsive & accessibility (SCE-DESIGN-SYSTEM-09)

**`RESPONSIVE_SYSTEM_PRODUCT_WIDE`:** **YES** · **`ACCESSIBILITY_SYSTEM_PRODUCT_WIDE`:** **YES**

One responsive and accessible SCE interaction language across desktop, laptop, tablet, and mobile — properties of **canonical primitives**, not repeated local fixes per screen.

| Concern | Contract |
| --- | --- |
| Viewport tiers | `SCE_RESPONSIVE_VIEWPORT_TIERS` — aligned with `SCE_FOUNDATION_BREAKPOINTS_PX` |
| Page overflow | `HORIZONTAL_PAGE_OVERFLOW_ALLOWED = NO` · `SCE_APP_MAIN_COLUMN` overflow clip |
| Dense UI | Contained table scroll when semantic · mobile table→list where adopted |
| Touch | `SCE_TOUCH_TARGET_CONTRACT` — coarse pointer targets on nav, sort, icon actions |
| Accessibility | `SCE_ACCESSIBILITY_CONTRACT` — keyboard, visible focus, dialog focus management |
| Dialogs | Mobile adaptive shell on `Dialog` · Composer full-screen preserved |
| Activity cards | Home-left / away-right identity grammar invariant |

Automated guardrails: `lib/design-system/__tests__/sce-design-system-09-responsive-accessibility.test.ts`.

Full package doc: [`SCE-DESIGN-SYSTEM-09`](../roadmap/SCE-DESIGN-SYSTEM-09.md).

**PO closure (DS-09):** `PO_DS09_VISUAL_UAT = PASS` · `PO_RESPONSIVE_REVIEW = PASS` · `PO_ACCESSIBILITY_REVIEW = PASS` · `PO_DESKTOP_REVIEW = PASS` · `PO_MOBILE_REVIEW = PASS` · `PO_TABLET_REVIEW = PASS` · `PO_HORIZONTAL_OVERFLOW_REVIEW = PASS` · `PO_LONG_CONTENT_REFLOW_REVIEW = PASS` · `PO_KEYBOARD_FOCUS_REVIEW = PASS` · `DS09_STATUS = CLOSED / ACCEPTED / MERGED` (PR **#887**). See [`SCE-DESIGN-SYSTEM-09`](../roadmap/SCE-DESIGN-SYSTEM-09.md).

**DS-09 PO closure locks:** `RESPONSIVE_SYSTEM_PRODUCT_WIDE = YES` · `ACCESSIBILITY_SYSTEM_PRODUCT_WIDE = YES` · `LOCAL_BREAKPOINT_DRIFT_ALLOWED = NO` · `HORIZONTAL_PAGE_OVERFLOW_ALLOWED = NO` · `RESPONSIVE_REFLOW_REQUIRED = YES` · `FIXED_NAV_CONTENT_COLLISION = NO` · `BOTTOM_NAV_CONTENT_OBSCURED = NO` · `KEYBOARD_ACCESS_REQUIRED = YES` · `VISIBLE_FOCUS_REQUIRED = YES` · `COLOUR_ONLY_SEMANTICS_ALLOWED = NO` · `TOUCH_TARGET_HARDENING_REQUIRED = YES` · `TEXT_EXPANSION_RESILIENT = YES` · `PRODUCT_WIDE_RESPONSIVE_AUDIT_REQUIRED = YES` · `PRODUCT_WIDE_ACCESSIBILITY_AUDIT_REQUIRED = YES` · `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES` · `VISIBLE_DESIGN_CONVERGENCE_REQUIRED = YES` · `FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED = YES` · `RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE = NO` · `CARD_SOUP_ALLOWED = NO` · `WORLD_CLASS_MICRO_UX_REQUIRED = YES` · `LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO` · `BINARY_CONTROL_COMPLIANCE = PASS` · `NEW_BINARY_CHECKBOXES = 0` · `CANONICAL_TOGGLES_USED = YES` · `DS10_FINAL_ADOPTION_REQUIRED = YES` · `PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED` · `SCE_DESIGN_SYSTEM_COMPLIANCE = PASS`.

**Representative hardening:** global nav + mobile bottom nav · workspace header · Personen & Zugänge toolbar · Roles dense responsive strategy · Dialog mobile shell · feedback empty-state reflow. DS-10 completes route migration per [`SCE-DESIGN-SYSTEM-09-RESPONSIVE-A11Y-INVENTORY.md`](./SCE-DESIGN-SYSTEM-09-RESPONSIVE-A11Y-INVENTORY.md) and [`SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md`](./SCE-DESIGN-SYSTEM-09-DS10-HANDOFF.md).

**Closure marker:** `SCE_DESIGN_SYSTEM_09_CLOSED_ACCEPTED_MERGED`

---

## SCE-DESIGN-SYSTEM-10 — Product-wide adoption / legacy removal

Product-wide rollout of workspace chrome, bounded surfaces, dense UI, forms (Toggle First), actions, and feedback — consuming DS-01–DS-09 inventories.

| DS-10 inventory | [`SCE-DESIGN-SYSTEM-10-PRODUCT-WIDE-MIGRATION-MATRIX.md`](./SCE-DESIGN-SYSTEM-10-PRODUCT-WIDE-MIGRATION-MATRIX.md) |
| --- | --- |
| Typed matrix | `SCE_DESIGN_SYSTEM_10_PRODUCT_WIDE_MIGRATION_MATRIX` in `lib/design-system/sce-design-system-10-meta.ts` |
| Roadmap | [`SCE-DESIGN-SYSTEM-10`](../roadmap/SCE-DESIGN-SYSTEM-10.md) |

**Delivery status:** `DS10_STATUS = PO_VISUAL_UAT_IN_PROGRESS` · `PRODUCT_WIDE_DESIGN_MIGRATION_COMPLETE = NO` · R1 Batch 01 Club/Org core · **not merged** · **DS-11 not started**.

Automated guardrails: `lib/design-system/__tests__/sce-design-system-10-product-wide-adoption.test.ts`.

---

## Design principle

**One SCE. One navigation language. One activity language. One visual family.**

---

## Foundational hierarchy

```text
Atmospheric background
  → Context header (identity)
  → Context navigation (tabs)
  → Workspace surface
  → Sections / cards
  → Fields / actions
```

Detailed workspace rules: [`SCE-WORKSPACE-SURFACE-STANDARD.md`](./SCE-WORKSPACE-SURFACE-STANDARD.md)

---

## Canonical primitives (01B baseline)

| Pattern | Canonical module | Standard |
|---------|------------------|----------|
| Context tabs | `lib/context-tabs`, `components/sce/context-tabs/SceContextTabs.tsx` | [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md) |
| Binary on/off settings | `SwitchToggle`, `SwitchThumb` (`components/ui/SwitchToggle.tsx`) | **SCE Control Standard — Toggle First** (this document) |
| Activity tab registries | `lib/activity-navigation/configs.ts` | Activity keys on generic contract |
| Workspace surface | `SceWorkspaceSurface` | [`SCE-WORKSPACE-SURFACE-STANDARD.md`](./SCE-WORKSPACE-SURFACE-STANDARD.md) |
| Activity presentation | `lib/sporting-activity-presentation/canonical` (`SceActivityPresentationModel`) | [`SCE-ACTIVITY-PRESENTATION-STANDARD.md`](./SCE-ACTIVITY-PRESENTATION-STANDARD.md) — **01C** |

---

## Activity presentation (01C)

Canonical pipeline for every SCE sporting activity surface:

```text
domain data (authoritative)
  → typed adapter / resolver (01C)
  → SceActivityPresentationModel (discriminated: MATCH | TRAINING | TOURNAMENT | CLUB_EVENT)
  → shared activity component family (01D–01G)
  → density renderer (HERO | STANDARD | COMPACT | MICRO)
```

**Rules:**

1. Future modules **must consume** `resolveSceActivityPresentation` / `SceActivityPresentationModel` (or the Activity Detail bridge `resolveSceActivityPresentationFromDetail`) when representing an SCE activity — not ad-hoc title/subtitle strings.
2. **Match identity** is always fixture-authoritative: **home left, away right** via `buildMatchClubIdentityPair` — never tenant-relative reordering.
3. **Training location** uses structured `SportingActivityLocation` and `formatSceActivityLocationHierarchy` (host → venue → resource).
4. **Tournament organiser** remains visible via `buildTournamentOrganiserClubIdentity` — tournaments are not matches.
5. **Routes** use `buildSceActivityRoute` / existing `buildSportingActivityDetailHref*` — no duplicate URL policy in cards.
6. **Formatting** (locale strings) stays at the presentation boundary; adapters preserve structured schedule/location/status.

Parallel local presentation models require an ADR exception ([`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md)).

Automated guardrails: `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01c-architecture.test.ts`.

---

## Canonical Match card family (01D)

| Item | Contract |
|------|----------|
| **Component** | `SceMatchCard` (`components/sporting-activity/SceMatchCard.tsx`) |
| **Model** | `SceMatchPresentationModel` via `resolveSceMatchPresentation` — **no parallel Match card model** |
| **Densities** | `HERO` · `STANDARD` · `COMPACT` · `MICRO` — policy from `SCE_ACTIVITY_DENSITY_CONTRACT` |
| **Rich skeleton** | `HERO`, `STANDARD`, and `COMPACT` are **scale variants of one DOM** (`SceMatchRichCardContent` + `SCE_MATCH_RICH_DENSITY_SCALE`) — not separate layouts |
| **MICRO** | Only permitted **structural** variant (inline fixture row) for genuinely constrained contexts |
| **Bounded width** | Rich cards use density max-width tokens (`max-w-lg` / `max-w-md` / `max-w-sm`); surfaces use grids/columns — cards must not stretch to full page width |
| **Surface layout** | Grouping, columns, readiness rails, and actions belong to the **surface** — they must not relocate competition, badges, fixture, schedule, or location inside the card |
| **Identity grammar** | **HOME** name/crest · **vs** · **AWAY** crest/name — fixture-authoritative (`homeLeftAwayRightInvariant`) |
| **Crests** | `ClubCrest` / `ClubIdentity` from 01C — cards do not resolve logo URLs locally |
| **SCE Match crest rule** | When a **valid club logo** exists, render the **full crest artwork** with **`object-contain`**, preserving aspect ratio. Real crests **MUST NOT** appear inside avatar-style **circular pills** (`rounded-full`, circular masks, or circular crop). **Circular initials/icon treatment is reserved for missing or broken crest fallbacks** only. |
| **Results** | Show only when 01C `result` is non-null; **no fake 0:0** for upcoming fixtures |
| **SCE Match result rule** | A real match score (including **0:0**) is the **primary numeric focal point** of completed/live match presentation. Result typography **MUST** use the canonical match density scale (`resultTextClass` / `sceMatchCenterTypographyScale`) — **HERO `text-5xl`**, **STANDARD `text-3xl`**, **COMPACT `text-2xl`**, **MICRO `text-lg`** — and be **materially larger** than VS text and schedule/competition metadata. Scores use semantic token **`--sce-match-result-foreground`** (warm ivory; **same for win/loss/draw**). **Do not** style scores as accent/orange decoration or outcome green/red. |
| **Match operational composition** | Matchcenter / Spiele **open-points** and **Spielvorbereitung** panels are **secondary** operational UI. They **MUST NOT** sit beside the canonical `SceMatchCard` in a layout that compresses card width or distorts fixture identity. Stack operational panels **below** the full-width bounded card (or an clearly separated secondary area). No absolute overlap on neighbouring cards; decorative status lines stay inside the operational panel. |
| **Match crest completeness** | When club/provider data resolves a crest, `SceMatchPresentationModel.fixture.*.logoUrl` **MUST** carry it for **upcoming, live, and completed** matches and across Team / Matchcenter / Wochenplaner consumers. **Tenant team display names** (e.g. Junioren B1) use the **owning club crest** (`Tenant.logoUrl` / internal `canonicalTeamId`), not a team-initial glyph, when available. Lifecycle or result state **MUST NOT** drop crest URLs that the identity layer already resolved. |
| **SCE CLUB VISUAL IDENTITY** | See rules below — participant name ≠ club crest; one canonical resolver; `ClubCrest` renders only. |
| **Crest resolution (upstream)** | **`lib/sporting-data/sce-club-visual-identity.ts`** (`resolveSceClubCrestUrl`, `resolveTenantClubCrestUrl`, `loadSceClubCrestResolutionContext`) is the single crest source. Match read models populate `externalLogoUrl`; presentation uses **`resolveMatchSideClubLogoUrl` → `ClubIdentity` → `ClubCrest`** only. **Initials** when canonical resolution and image load both fail — never because a consumer skipped relations. |

### SCE CLUB VISUAL IDENTITY (product-wide)

1. **Participant display name** (e.g. Junioren B1, FC Therwil C2) and **owning-club visual identity** are separate — never invent a “team crest” from the participant label.
2. **Owning club** supplies the crest (tenant Verein for internal teams; ExternalClub / canonical Verein for opponents).
3. **`lib/sporting-data/sce-club-visual-identity.ts`** owns crest URL resolution — consumers do not chain `externalLogoUrl ?? Tenant.logoUrl ?? …` locally.
4. **`ClubCrest`** owns rendering only — no logo URL logic in cards, rows, or Infoboard-specific crest resolvers when they represent the same club concept.
5. **Real crest** = full uncropped artwork, **`object-contain`**, transparent background preserved; square **layout bounds** only.
6. **Real crest MUST NOT** use circular masks, avatar pills, or `rounded-full` on the image silhouette.
7. **Initials / neutral icon** only when canonical resolution yields no asset **or** the image genuinely fails to load — not while a valid URL is present.
8. **No name matching or hardcoded club→URL maps** in UI modules — only canonical directory / provider relationships.
9. **Same rules** for Matchcenter, Team Cockpit, Wochenplaner, tournaments, standings enrichment, Infoboard/public feeds.
10. **Tenant internal teams** use **`getTenantClubCrestUrlCached`** (`Tenant.logoUrl` → tenant SFV Verein `ExternalClub.logoUrl`).
| **Status** | `matchLifecycle` via `resolveSceMatchLifecycleStatus` — **Heute** (warning), **Morgen** (info), **Live** (success), **Beendet** (success), **Abgesagt** (danger); rendered with DS `Badge` (`SceMatchCardStatus`) — text first, colour supplementary |
| **Tenant context** | **Heim** / **Auswärts** on `contextBadges` — quiet `ActivityContextBadge`; never reorder fixture sides |
| **Result context** | **Sieg** / **Unentschieden** / **Niederlage** on `contextBadges` — semantic badge, not a second fixture layout |
| **Routes** | `model.route.consumeHref` for primary navigation — no local href builders |
| **Responsive** | Truncation + grid reflow; narrow-safe (see preview gallery) |
| **Accessibility** | Fixture `aria-label`, decorative crests when adjacent text exists, focus ring on card link |
| **Preview / UAT** | `/sce-preview/match-card` (deterministic fixtures, no DB) |

Representative integration (01D R5): Activity Detail (HERO), Team → Nächste Spiele (STANDARD grid), Team → Resultate (COMPACT grid), Team → Übersicht next/last (COMPACT), Matchcenter Spielplanung + Resultate (bounded card grids + operational panels), Planner “Planung bearbeiten” match summary (COMPACT); all via `scePresentation` / `resolveSceMatchPresentation`.

Automated guardrails: `components/sporting-activity/__tests__/sce-ui-rollout-01d-match-card.test.tsx`, `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01d-architecture.test.ts`.

Future Match surfaces (**01H–01L**) must adopt `SceMatchCard` — not local card variants.

---

## Canonical Training card family (01E)

| Item | Contract |
|------|----------|
| **Component** | `SceTrainingCard` (`components/sporting-activity/SceTrainingCard.tsx`) |
| **Model** | `SceTrainingPresentationModel` via `resolveSceTrainingPresentationFromLegacy` / typed management & Wochenplaner adapters — **no parallel Training card model** |
| **Densities** | `HERO` · `STANDARD` · `COMPACT` · `MICRO` — policy from `SCE_ACTIVITY_DENSITY_CONTRACT` |
| **Rich skeleton** | `HERO` and `STANDARD` share one rich DOM; `COMPACT` uses the management/list grid variant; `MICRO` is the only other structural variant |
| **Identity grammar** | Training title → team → schedule → location → status — **never** home/away, VS, or result semantics |
| **Location** | Structured `SportingActivityLocation` + `formatSceActivityLocationHierarchy` (club/host → venue → resource) with clean degradation |
| **Schedule** | `schedulePresentation`: `SESSION` (instant `schedule`) vs `RECURRING_DEFINITION` (weekday rhythm + time label) — do not render epoch placeholders for series |
| **Status** | Domain-backed labels (`Aktiv`, `Inaktiv`, …) via `SceTrainingCardStatus` / DS `Badge` — text first |
| **Routes** | `model.route.consumeHref` only — no local href builders |
| **Management boundary** | `SceTrainingCard` owns **presentation**; Trainings management rows keep actions, filters, weekday column, facility column, and status column |
| **MICRO / planner** | Narrow-safe team + time + resource; full planner grid adoption deferred to **01H** (`PlanningHubActivityBlock` remains legacy identity until then) |
| **Preview / UAT** | `/sce-preview/training-card`, `/sce-preview/weekplanner-training` |

Representative integration (01E): Activity Detail training embed (HERO), Trainings management row identity (`COMPACT`, status in row column), Wochenplaner “Planung bearbeiten” training summary (`WeekplannerTrainingIdentityCard`).

Automated guardrails: `components/sporting-activity/__tests__/sce-ui-rollout-01e-training-card.test.tsx`, `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01e-architecture.test.ts`.

Future Training surfaces (**01H–01L**) must adopt `SceTrainingCard` — not local card variants.

### Mein Programm / PERSON programme list-row contract (01J-R4)

| Item | Contract |
|------|----------|
| **Scope** | `surface="list-row"` with `listRowPresentation="operational"` (match: `programme-fixture`) — Dashboard preview, `/dashboard/mein-programm` Liste, Programme Engine list rows |
| **Information rows** | Exactly **three** rows under the type label: **ROW 1** activity identity + club crest(s) · **ROW 2** team(s)/OrgUnit(s) · **ROW 3** time → location |
| **Match ROW 1** | HOME club + crest \| VS \| away crest + club — home always left |
| **Match ROW 3** | Kickoff only when provider end is not authoritative — never fabricate `-` end times |
| **MICRO calendar** | **Excluded** — calendar cells keep MICRO grammar (TYPE → identity → time → location) |

---

## Canonical Tournament card family (01F)

| Item | Contract |
|------|----------|
| **Component** | `SceTournamentCard` (`components/sporting-activity/SceTournamentCard.tsx`) |
| **Model** | `SceTournamentPresentationModel` via `resolveSceTournamentPresentation` / Wochenplaner adapter — **no parallel Tournament card model** |
| **Densities** | `HERO` · `STANDARD` · `COMPACT` · `MICRO` — policy from `SCE_ACTIVITY_DENSITY_CONTRACT` |
| **Identity grammar** | Tournament title → **organiser** (always when data exists) → optional **Hauptteam** → schedule → location → status — **never** Match semantics (no VS, home/away pairing, scores) |
| **Organiser invariant** | Organiser is a first-class field (`ClubIdentity`); must remain visible at HERO, STANDARD, COMPACT, and identifiable at MICRO — not tooltip-only |
| **Hauptteam** | Distinct from organiser; do not substitute organiser with Hauptteam or venue |
| **Location** | Venue → resource on card; **omit** organiser/host from location line when organiser is rendered separately |
| **Schedule** | Concrete `schedule.startAt` / `endAt` from domain — no Training-style recurring definition |
| **Status** | Domain-backed labels via `SceTournamentCardStatus` / DS `Badge` — text first |
| **Routes** | `model.route.consumeHref` / `manageHref` — no local href builders |
| **Management boundary** | `SceTournamentCard` owns **identity/context presentation**; `TurniereManagementRow` owns date column, context rail (schedule/location), operational status/visibility, and action menu |
| **TOURNAMENT_LIST_ROW_COMPOSITION** | Four zones on `/dashboard/tournamentcenter`: **date** (compact weekday/day/month) · **identity** (`SceTournamentCard` `surface="list-row"` — type, crest, title, organiser, Hauptteam only) · **context** (calendar date, time range, location icons; status + visibility) · **action** (row menu). **Desktop (xl+):** DATE \| IDENTITY \| CONTEXT \| ACTION on one row. **Tablet (md–lg):** DATE \| IDENTITY \| ACTION with CONTEXT under identity. **Mobile:** stack. Tablet grid placement uses `md:max-xl:` so xl desktop column/row placement is explicit. No duplicated organiser/Hauptteam/time/location/status; no nested card shell in list-row |
| **List-row surface** | `surface="list-row"` — embedded presentation: no competing border/background; `max-w-none`; organiser crest uses list-row sizing (`planner` bounds) |
| **Organiser crest pipeline** | Domain `resolveTournamentOrganizerIdentity` → `organizerLogoUrl` on DTO / Weekplanner item → `buildTournamentOrganiserClubIdentity` → `resolveTournamentOrganiserCrestUrlFromDomain` → `ClubCrest`. **No** consumer-local `tenantLogoUrl` bypass; preview fixtures must supply domain organiser fields |
| **Club crest** | Organiser `ClubIdentity` → canonical `ClubCrest` at HERO/STANDARD/COMPACT and MICRO when width allows; **no** Tournament-local logo resolver; real crests use `object-contain` (no circular mask on PNG/SVG); initials/icon fallback only when no usable crest |
| **Semantic hierarchy** | Tournament type pill (orange/gold) → title → organiser + crest → Hauptteam (team accent) → date/time → location → status text |
| **Preview / UAT** | `/sce-preview/tournament-card`, `/sce-preview/weekplanner-tournament` |

Representative integration (01F): Activity Detail tournament embed (HERO), Turniere management row identity (`COMPACT`, status in row column), Wochenplaner “Planung bearbeiten” tournament summary (`WeekplannerTournamentIdentityCard`).

Automated guardrails: `components/sporting-activity/__tests__/sce-ui-rollout-01f-tournament-card.test.tsx`, `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01f-architecture.test.ts`.

Future Tournament surfaces (**01H–01L**) must adopt `SceTournamentCard` — not local card variants.

---

## Canonical Club Event card family (01G)

| Item | Contract |
|------|----------|
| **Component** | `SceClubEventCard` (`components/sporting-activity/SceClubEventCard.tsx`) |
| **Model** | `SceClubEventPresentationModel` via `resolveSceClubEventPresentation` / `resolveSceClubEventPresentationFromLegacy` — **no parallel Club Event card model** |
| **Activity label** | **VERANSTALTUNG** (`activityKind: EVENT` on `ActivityTypePill`) |
| **Densities** | `HERO` · `STANDARD` · `COMPACT` · `MICRO` — policy from `SCE_ACTIVITY_DENSITY_CONTRACT` |
| **Identity grammar** | Event title (primary) → optional **organiser/host** → schedule → location → lifecycle **status** — **never** Match (VS, home/away, scores), Tournament-only (Hauptteam, organiser invariant crest), or Training-only (recurrence/coach) semantics |
| **Tenant visual identity (`CLUB_EVENT_TENANT_IDENTITY`)** | Tenant-owned Club Events **always** use the configured **tenant club crest** as primary visual ownership wherever SCE renders Club Event identity (programme rows, dashboard, calendar MICRO when crest slot applies). **`tenantClub` ≠ audience** — audience (Teams, OrgUnits, club-wide) communicates relevance, not crest selection. Optional explicit **external organiser** remains domain data; crest falls back to organiser only when tenant identity is absent. |
| **Programme three-row contract (01J-R5.1+)** | Row 1: **tenant crest + event title** · Row 2: audience / scope · Row 3: time + location |
| **Organiser line** | Optional organiser **name** when distinct from suppressed duplicate under crest; crest via `resolveSceClubEventPrimaryVisualIdentity` |
| **All-day** | Domain `schedule.allDay` → **Ganztägig** via `formatClubEventTimingLabel` / `formatSceClubEventTimeLabel` — never fake `00:00–23:59` |
| **Location** | `formatSceActivityLocationHierarchy` on resolved `SportingActivityLocation`; omit organiser from location line when shown as secondary identity; no raw resource keys |
| **Status vs publication** | Lifecycle `status` on card (`SceClubEventCardStatus`); publication/visibility labels stay in management row columns — do not collapse |
| **Routes** | `model.route.consumeHref` / `manageHref` from `buildSceActivityRoute("CLUB_EVENT", …)` |
| **Event audience («Gültig für»)** | Optional `model.audience` (`CLUB_WIDE` \| `SELECTED_ORG_UNITS`) — authoritative organisational scope (Teams + OrgUnits via `ClubEventOrganisationalAudience*` relations). **Separate** from organiser, publication, participation, and authorization. Render via `SceClubEventAudienceLine` (contextual identity — **not** a second activity accent). Reduced density: compact labels e.g. «3 Organisationseinheiten» / «2 Teams». Parent OrgUnit selection = **exact unit** (no silent descendant expansion). |
| **Management boundary** | `SceClubEventCard` owns **identity** (`list-row`); `VeranstaltungListRow` owns date block, **context zone** (schedule/location), lifecycle + publication — no duplicated schedule/location on the card in list rows |
| **Date block (DS-10 R2)** | Left **date block = date identity only** (weekday · day · month) — **no start time** in the block; time/Ganztägig lives in the **context zone** (and card schedule rows where the card owns schedule). Same contract as Turniere management rows (`turniere-row-date-block`). See `SCE_ACTIVITY_DATE_BLOCK_CONTRACT` in `activity-card-temporal-grammar.ts`. |
| **VERANSTALTUNGEN_LIST_ROW_COMPOSITION** | **Date** (weekday/day/month — date-only block) · **Identity** (`SceClubEventCard` `list-row` — VERANSTALTUNG pill, title, organiser/audience) · **Context** (date line, time/Ganztägig, location, status + publication). Responsive grid reuses Turniere row contract (without action column) |
| **Detail context** | Edit workspace header uses `SceClubEventCard` `surface="context-header"` (`VeranstaltungEditPlanningHeader`) — canonical hierarchy, not ad-hoc subtitle strings |
| **Preview / UAT** | `/sce-preview/club-event-card` |

Representative integration: Veranstaltungen create/edit (`ClubEventOrganisationalAudienceEditor`), management list + edit context header. Persistence: [`SCE-CLUB-EVENT-AUDIENCE-01`](../roadmap/SCE-CLUB-EVENT-AUDIENCE-01.md) — no parallel organisational hierarchy; `Event.teamId` remains compatibility-only.

Automated guardrails: `components/sporting-activity/__tests__/sce-ui-rollout-01g-club-event-card.test.tsx`, `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01g-architecture.test.ts`.

Future Club Event surfaces (**01H–01K**) must adopt `SceClubEventCard` — not local card variants.

---

## Club Event create/edit workflow (Audience-01 R1)

| Item | Contract |
|------|----------|
| **Navigation** | Canonical `SceContextTabs` / `SceContextTabsBoundary` — **no** parallel form-tab or wizard stepper |
| **Create route** | `/dashboard/veranstaltungen/new` with `?tab=` URL continuity (`uebersicht` · `gueltigkeit` · `termin` · `ressourcen` · `publikation`) |
| **Edit route** | Activity detail tabs (`ClubEventActivityTabShell`) remain authoritative; **Übersicht** stacks Grunddaten · Gültigkeit · Termin sections; Ressourcen/Planung · Publikation/Mehr unchanged |
| **Dirty guard** | `SceContextDirtyGuardProvider` on create + edit shells |
| **Actions** | Persistent **Abbrechen** / **Veranstaltung erstellen** (or save) outside tab panels — not gated by active tab |
| **Create scope** | Tab panels contain **create-time** fields only — no post-create placeholders (Teilnehmer · Aufgaben · Zusammenarbeit); those surfaces stay on persisted edit/activity context |
| **Gültigkeit** | `ClubEventOrganisationalAudienceEditor` + `SceSegmentedControl` scope · `SceChipMultiSelectorField` targets — applicability wording, not marketing «Zielgruppe» |
| **Termin** | `VeranstaltungScheduleFields` + canonical **Wiederholung** / **Ganztägig** switches (`SwitchThumb`) — no checkboxes |
| **Recurrence UX** | Natural-language interval/end controls (e.g. «Alle … Wochen/Monate», «Nach … Terminen») · **Zusammenfassung** with `formatClubEventRecurrenceSummaryDe` + bounded occurrence preview from canonical generation — no raw RRULE; short tab content is acceptable (no filler panels) |
| **Series model** | `ClubEventSeries` + materialized `Event` occurrences (`clubEventSeriesId` + `clubEventOccurrenceDateKey`); programme consumers read occurrences, not rules |
| **Recurrence indicator** | Restrained «Wiederkehrend» on series members in edit context — same `SceClubEventCard` family, no new activity color |

Automated guardrails: `lib/events/__tests__/club-event-recurrence.test.ts`, `lib/veranstaltungen/__tests__/club-event-create-workflow.test.ts`.

---

## SCE Activity Creation (**FOUNDATION_IMPLEMENTED** — 01B; domain adoption **01C+**)

Product principle: **«One creation language, domain-specific workflows.»**

The Activity Composer is an **adaptive container** for canonical domain creation workflows — not a generic CRUD generator, forced wizard, generic Activity API, or four independent modals.

Full contracts: [`SCE-ACTIVITY-CREATION.md`](./SCE-ACTIVITY-CREATION.md) · Architecture: [`SCE-ACTIVITY-CREATE-01A.md`](../roadmap/SCE-ACTIVITY-CREATE-01A.md) · **ADR-11** (**Accepted**)

### Nested interaction rule (Activity Composer)

A modal **Activity Composer must not launch another independent modal, dialog, sheet, or drawer** over itself for normal creation interactions. Prefer inline controls, combobox/search, popover, expandable region, or Composer-owned embedded panel. If the interaction is genuinely too complex, use **full-page `/new` mode** — not stacked dialogs. **Club Event organisational audience selector** is the first mandated application (**01C**).

| Item | Status | Notes |
|------|--------|-------|
| **`SceActivityComposer`** shell (overlay / page / fullscreen) | **FOUNDATION_IMPLEMENTED** | `components/sce/activity-composer/` + `SceModalOverlay` |
| **SCE Guided Activity Composer** (`guidedWorkflow` on create definition) | **CANONICAL (01E-R1, R6)** | Progress «Schritt X von Y», step states (**unvisited / current / completed / error** — completed = reviewed + valid), footer «Zurück» / «Weiter», domain primary action **only** on final **Übersicht** review — freely navigable, clearly guided; no locked wizard |
| **`SceActivityComposerWorkflowNav`** | **CANONICAL (01E-R1)** | Workflow presentation over Context Tabs (`aria-current="step"`) |
| **`MatchCreateMatchupSelector`** | **CANONICAL (01E-R1, Match)** | Football matchup identity — HOME left / AWAY right, large bare crests, composer-safe opponent picker |
| **SCE Activity Date & Time Input** (`SceActivityDateInput`, `SceActivityTimeInput`, `SceActivityDateTimeInput`) | **CANONICAL (01E-R2, 01F-R1)** | Display **DD.MM.YYYY** + **HH:MM**; users may type compact digits (**DATE_COMPACT_ENTRY** = DDMMYYYY, optional DDMMYY with 20xx year) and **TIME_COMPACT_ENTRY** = HMM/HHMM — normalized on blur/Enter in `lib/sce/activity-datetime/sce-activity-datetime.ts` (canonical formatting must not require manually typing separators); calendar assists (does not replace typing); no browser-native combined `datetime-local` in SCE activity creation composers |
| **Creation contract** (`SceActivityCreateDefinition`) | **FOUNDATION_IMPLEMENTED** | `lib/sce/activity-composer/` — not JSON CRUD |
| **Context tabs on create** | **REUSABLE** | `SceContextTabs` — Club Event reference on STAGE |
| **Guided Training/Match/Tournament create** | **EXISTING** | Migrate to tabs in 01D–01F before overlay parity |
| **Full-page `/new` routes** | **EXISTING** | Remain canonical deep links |
| **Dirty guard** | **FOUNDATION_IMPLEMENTED** | Reuses `SceContextDirtyGuardProvider` for close/backdrop/Escape |
| **Nested Sheet selectors** | **Gate — refactor in 01C** | Audience picker must not stack on composer overlay |
| **Toggle First on create** | **EXISTING** target | No new binary checkboxes in composer adoption |
| **Activity identity header** | **FOUNDATION_IMPLEMENTED** | `ActivityTypePill` in composer header |
| **Domain create workflows on production `/new`** | **NOT YET IMPLEMENTED** | 01C–01F adoption |

PO visual UAT for 01B foundation: **`/sce-preview/activity-composer`**, **`/sce-preview/activity-composer/page-mode`**.

**Presentation geometry (01B-R1):**

| Mode | Contract |
|------|----------|
| **Overlay** | Stable bounded creation workspace; scroll only in composer body (`.sce-scroll-region-dark`) |
| **Page** | Natural content-driven flow — same tabs/workflow, no overlay height inheritance |
| **Fullscreen** | Viewport-filling responsive adaptation |

*Shared workflow does not require identical container geometry.*

**Draft / action / governance contract (01B-R2 + 01B-R3):**

| Topic | Contract |
|-------|----------|
| Lifecycle | START → COMPOSE → optional draft → **commit validation** → direct publish **or** submit for **Freigabe** |
| Principle | *Saving preserves work. Submitting commits the activity. Publication follows effective governance policy.* |
| Footer | Ghost **Abbrechen** · secondary draft save · policy-aware primary (`Training erstellen` vs **Zur Freigabe einreichen**) |
| Validation vs approval | **Draft/commit validation** (form) ≠ **governance approval** (optional, admin-controlled, creator-specific) |
| Governance default | **DIRECT_PUBLISH** — approval never globally mandatory |
| Validators | 1:n pool per activity type; **ANY_ONE** approve in V1; no self-approval |
| Approval UX | **Not** a Composer content tab — workflow state + future **Freigaben** inbox |
| Admin (future) | Person-centric + governance-centric views over **one** policy store; create = Toggle; publication mode = single-choice |
| Dirty vs draft | Dirty = local changes; draft = persisted incomplete activity |
| Autosave | **Not in 01B** — explicit persistence only |
| Success | `DRAFT_SAVED` \| `PUBLISHED` \| `SUBMITTED_FOR_APPROVAL` (`CREATED` legacy alias) |
| Domain persistence | **01C+** — governance DB deferred unless 01C gate requires it |

---

## Activity card semantic color language (01D R10 / 01F / 01G)

Shared **information hierarchy** for Match, Training, Tournament, and Club Event cards — one SCE semantic visual language. Cards stay domain-specific in layout and identity grammar; **color encodes meaning**, not decoration.

| Concept | Module | Tailwind / token contract | Used for |
|---------|--------|---------------------------|----------|
| **ACTIVITY_TYPE_ACCENT** | `ActivityTypePill` / `activity-color-tokens` | Training blue · Match red · Tournament orange · Club Event violet | Activity kind only — not schedule/location |

**Activity-type marker contract (01D R10A):** one shared `ActivityTypePill` primitive on Match, Training, and Tournament cards. Labels are fixed SCE vocabulary (not free-form identity subtitles):

| Activity kind | Card label | Semantic accent |
|---------------|------------|-----------------|
| `MATCH` | **SPIEL** | match red |
| `TRAINING` | **TRAINING** | training blue |
| `TOURNAMENT` | **TURNIER** | tournament orange |
| `CLUB_EVENT` | **VERANSTALTUNG** | club event violet (`--sce-club-event`) |

Density rules suppress the pill only via the shared activity density contract — not Match-only exceptions.
| **PRIMARY_IDENTITY** | `activity-card-semantic-tokens` → `SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS` | `text-[var(--foreground)]` | Club names (match fixture), tournament title, training title |
| **SECONDARY_IDENTITY** | `SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS` | `text-[var(--text-2)]` | Match competition, tournament organiser, quiet type context |
| **TEAM_CONTEXT** | `SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS` | info-tinted `color-mix` on foreground | Hauptteam, training team emphasis |
| **SCHEDULE** | `SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS` + density `scheduleTextClass` / `scheduleIconClass` | `text-[var(--text-2)]`, **date and time share weight** (`font-medium` on rich rows) | Calendar + clock rows |
| **LOCATION** | `SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS` via `sceActivityLocationTextClass` / `sceActivityLocationIconClass` | cooler info tint on schedule base | MapPin + venue/resource line |
| **FIXTURE_SEPARATOR** | `SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS` | `text-[var(--muted)]` | Match **VS** only — subordinate to crests/names |
| **MATCH_RESULT** | match density scale | `--sce-match-result-foreground` | Scores only — not status badge colors |
| **STATUS** | `SceMatchCardStatus`, `SceTrainingCardStatus`, `SceTournamentCardStatus` | DS `Badge` semantics | Text first; lifecycle/warning/danger — never color alone |
| **WARNING / SUCCESS (Match ops)** | Matchcenter open-points / preparation panels | existing amber/emerald operational semantics | **Not** flattened into generic card foregrounds |

**Rules:**

1. Consume `lib/sporting-activity-presentation/canonical/activity-card-semantic-tokens.ts` and density scale modules — **no ad-hoc `color-mix` or hex** on card surfaces.
2. **Do not** import Tournament orange or Training blue into Match fixture/result presentation.
3. Location lines **must** use location tokens — not raw schedule classes without the location tint.
4. **`CANONICAL_ACTIVITY_LOCATION`** — structured `SportingActivityLocation` + `formatSceActivityLocationHierarchy` (host → venue → resource). Presentation uses **human-facing labels** only; raw resource keys/slugs/enums (e.g. `KUNSTRASEN_2`) **never** render. Each hierarchy level must belong to the **same authoritative activity location**. **Match** home/away venue ownership is resolved in `buildMatchSportingActivityLocation` before cards consume the model; tenant operational pitch allocation applies to **HOME** matches only and must not leak into **AWAY** external venues. **Provider location text (01D R10B):** for **AWAY** / external matches, SFV (or other provider) `venueName` / `location` strings are **authoritative** — preserve them as supplied (e.g. `Sportzentrum Tannenbrunn, Sissach - 2`). Do **not** strip pitch-like suffixes such as ` - 2` from provider venue text merely because they resemble internal pitch metadata. Do **not** append tenant operational resource codes (e.g. `KUNSTRASEN_2` from FC Allschwil allocation) to away presentation. **HOME** matches may use tenant venue/resource hierarchy with registry human labels (e.g. `Im Brüel · Kunstrasen 2`). Import tail cleanup via `sanitizeImportedVenuePresentation` applies only to comma-before-dash import artifacts (e.g. `, - 3` at end), not to legitimate provider ` - N` suffixes embedded in the venue string. Shared location **visual** semantics do not imply shared domain-resolution logic (Training vs Match vs Tournament).
5. Club Event cards consume the same schedule/location/status tokens; activity accent uses `--sce-club-event` / `club-event-violet` on `ActivityTypePill` only (including MICRO — no local violet badge markup).
6. **Event audience ≠ publication ≠ participation ≠ organiser** — only `model.audience` renders scope; publication stays in management context columns.
7. Future Sponsor cards should extend this table, not introduce a parallel palette.

Automated guardrails: `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01d-r10-semantic-alignment.test.ts`.

### Programme list vs Resultate (01J R5.1)

| Concept | Contract |
|---------|----------|
| **PROGRAMME_RESULTATE_VISUAL_FAMILY** | Programme surfaces wrap canonical `SceTrainingCard` / `SceMatchCard` / `SceTournamentCard` / `SceClubEventCard` list-row compositions in `SceProgrammeActivityCardShell` — **same shell tokens** as Resultate `SceMatchCard` (`SCE_MATCH_CARD_SHELL_CLASS`) |
| **PURPOSE_BUILT_COMPOSITIONS** | Programme Match uses `listRowPresentation="programme-fixture"` three-row operational grammar; Resultate keeps rich score-centric card body — **do not** merge layouts |
| **MATCH_INSIDE_CREST_RULE** | Programme fixture Row1 reading order: home club name → home crest → VS → away crest → away club name; centred compact band (`programmeFixtureBandClass`) — crests **inside** next to VS, not on outer card edges |
| **DENSITY** | `COMPACT` programme shell on Dashboard preview; `STANDARD` on full programme workspaces; Resultate card density unchanged |
| **PROGRAMME_BORDER_HIERARCHY (R5.4)** | Default programme cards: neutral elevated border only — **no** permanent `--sce-primary` outline on both day/group containers and cards. Day sync = label typography; next-upcoming = `SCE_PROGRAMME_ACTIVITY_CARD_EMPHASIS_CLASS` (`--border-strong`) |
| **PUBLISHING_CHANNEL_IA (R5.4)** | Publizieren L2 represents **channels** (Website, Infoboard, Mobile App, Medien) — not abstract “Inhalte” buckets; Website L3 leads with News |
| **PUBLISHING_CHANNEL_ICONS (R5.4.1)** | Every Publizieren L2 channel row carries a canonical SCE destination icon via `NAV_DESTINATION_SCE_ICON_BY_KEY` (incl. **Mobile App** → approved handset/contact glyph) — no page-local icon hacks |
| **PLANNER_ADAPTIVE_DENSITY (R5.4.1)** | Wochenplaner activity blocks resolve **WIDE · MEDIUM · NARROW · MICRO** from **layout width** (`blockLayoutPx` / lane geometry), not viewport breakpoints; progressive disclosure hides pills, team/resource lines, and inline **Termin ändern** before text collides |
| **PLANNER_AUTOMATIC_DETAIL (R5.4)** | Wochenplaner clipped activity detail opens on **card hover/focus/touch** — no separate info icon; hidden fields remain in the automatic detail surface |
| **WOCHENPLANER_DEFAULT_VIEW (R5.5)** | `/dashboard/planner/week` without `ansicht` resolves to **Liste** (`ansicht=liste` omitted when default) |
| **WOCHENPLANER_VIEW_ORDER (R5.5)** | Perspective switcher order: **Liste → Spielfeld → Garderobe → Kalender** (consistent everywhere the hub tabs render) |
| **WOCHENPLANER_LIST_CARDS (R5.5)** | Wochenplaner **Liste** uses the same canonical `SceTrainingCard` / `SceMatchCard` / `SceTournamentCard` / `SceClubEventCard` family as `/dashboard/programm`, wrapped in `SceProgrammeActivityCardShell` — **no** parallel planner card family or table-row imitation |
| **CANONICAL_PROGRAMME_LIST_CONTRACT (R5.5.1)** | A programme/planner list row **is** `SceProgrammeActivityCardShell` at `w-full` — the shell is the visual list row. Activity-specific internal layouts may stay compact/purpose-built (`max-w-none` on list-row Sce* bodies). **NESTED_VISUAL_CARD_SHELL: NO** — do not wrap the shell in a second full-width planner row with border/hover. Planner operational status and the row action menu extend **inside** the shell (flex: card interaction surface + menu anchor), not in a detached outer column |
| **PLANNER_OPERATIONAL_STATUS (R5.5)** | Conflicts and incomplete planning data compose onto canonical cards (`PlannerOperationalIssueSummary` + shared `PlannerOperationalStatusSection`) — not a separate card type |
| **PLANNER_ISSUE_DISCLOSURE (R5.5)** | Issue **summary** visible on the card without hover; **specific** conflict/incomplete lines in hover/focus detail and opened planning workspace (`Planungsstatus`) |
| **IMPERSONATION_SHELL (R5.4.1)** | Active impersonation banner renders **above** the complete authenticated shell (before `AppShellNavigation`), occupies normal layout space, and pushes navbar + domain panel downward — never below the global header |

Module: `lib/sporting-activity-presentation/canonical/activity-card-programme-shell.ts`.

---

## Controls — binary state (Toggle First)

**SCE Control Standard — Toggle First** (established with SCE-UI-ROLLOUT-01B closure, 2026-10-11):

SCE must **not** introduce **checkboxes** for binary on/off **settings** or persistent boolean **application state**.

Binary state and boolean settings must use the canonical SCE **Toggle/Switch** pattern (`SwitchToggle` / `SwitchThumb`).

### Requirements

1. **Toggle/Switch** is the SCE canonical binary-state control.
2. **New binary checkboxes are prohibited** for settings (see compliance gate below).
3. A toggle must communicate the **current state** clearly (on/off), not only the action.
4. Labels must describe the **setting or state** (e.g. “Website sichtbar”), not merely “Yes/No”.
5. State must remain understandable **without relying on colour alone** (label + switch position / `aria-checked`).
6. **Keyboard accessibility** is required (Space/Enter toggles; label association via `htmlFor` where used).
7. **Visible focus** is required on the switch control.
8. **Disabled** state must be visually and semantically distinguishable.
9. **Touch targets** must remain usable on mobile (minimum interactive size per workspace standards).
10. **Immediate effect** vs **save-required** effect must be behaviourally clear (copy, section context, or explicit save affordance — do not imply instant persistence when a form still requires “Speichern”).
11. **Do not use toggles for navigation** (use routes, links, or context tabs).
12. **Do not use toggles for tab / filter / view switching** (use context tabs, filters, or segmented controls).
13. **Do not use toggles as a substitute for multi-selection** (see below).

### Good uses (toggle)

- Website / Infoboard enabled or disabled
- Public / private visibility
- Notifications enabled / disabled
- Feature enabled / disabled
- “Person ist aktiv”, captain flags, and similar **on/off** settings

### Do not use a checkbox for these

### Multi-selection (not toggle)

When the interaction is **selecting multiple independent items** (bulk table rows, choosing several recipients, pick-N lists), use the appropriate SCE **multi-selection** pattern (table selection checkboxes, picker lists, etc.).

**Do not** misrepresent multi-selection as a single toggle.

### Control choice matrix

| Problem | Canonical pattern |
|---------|-------------------|
| **Binary state** (setting on/off) | **Toggle/Switch** |
| **Context navigation** (detail sections) | **Context tabs** |
| **Filter / view mode** | Filter rail, segmented control, or domain-appropriate filter |
| **Single choice** (one of N) | Radio group, select, or menu |
| **Multi-selection** | Checkbox lists / table selection where multi-select is the model |
| **Action** | Button or menu action |

### Legacy binary checkboxes

Existing binary-setting checkboxes in the product are **legacy UI**. They should migrate to `SwitchToggle` during the relevant SCE-UI-ROLLOUT adoption package or **01N** cleanup — **not** as part of unrelated packages.

Inventory and migration tracking for control-level legacy lives in [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md) (**control backlog** — separate from the 01A register totals).

Row-selection and bulk-operation checkboxes are **out of scope** for Toggle First migration.

---

## Design system ownership

- Shared interaction and visual patterns belong in the SCE design system.
- Future modules **must consume** existing canonical patterns before introducing new ones.
- Parallel tab/card/workspace frameworks require an ADR ([`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md)).

---

## Domain extension rule

A module may introduce **genuinely new domain UX**. It may **not** independently redefine an existing SCE pattern (context tabs, workspace surfaces, activity cards, status semantics, action hierarchy, forms, dialogs, responsive behaviour, accessibility behaviour) without an explicit design-system ADR.

---

## Future-module compliance contract

Every future SCE package must declare **`SCE_DESIGN_SYSTEM_COMPLIANCE`** in its closure report:

| Field | Description |
|-------|-------------|
| **`SCE_DESIGN_SYSTEM_COMPLIANCE`** | **PASS** / **FAIL** (aggregate gate) |
| **`CANONICAL_PRIMITIVES_USED`** | List (e.g. `SceContextTabs`, `SceWorkspaceSurface`) |
| Canonical navigation pattern | Context tabs / route tabs / filters (justify if not context tabs) |
| Canonical workspace pattern | Dark workspace + sections |
| **`NEW_PRIMITIVES_INTRODUCED`** | List of new UX primitives |
| **`NEW_PRIMITIVES_JUSTIFICATION`** | ADR link or closure exception when new primitives are introduced |
| **`RESPONSIVE_COMPLIANCE`** | PASS / deferred with package id |
| **`ACCESSIBILITY_COMPLIANCE`** | PASS / deferred with package id |
| **`PARALLEL_PATTERN_INTRODUCED`** | **YES/NO** |
| **`BINARY_CONTROL_COMPLIANCE`** | **PASS** / **FAIL** |
| **`NEW_BINARY_CHECKBOXES`** | Count; must be **0** unless an approved design-system exception exists |
| **`CANONICAL_TOGGLES_USED`** | **YES** / **NO** / **NOT_APPLICABLE** (when package introduces no binary settings) |
| **`MULTI_SELECTION_PATTERN`** | **canonical** / **not_applicable** / **exception_documented** |
| **`WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE`** | **PASS** when surfaces consume the SCE activity card **family** (`SceMatchCard`, `SceTrainingCard`, `SceTournamentCard`, `SceClubEventCard`, tournament fixture presentation) — no parallel card framework |

**Target gate:** `SCE_DESIGN_SYSTEM_COMPLIANCE = PASS`

Any introduction of a **new binary checkbox** for settings must fail **`BINARY_CONTROL_COMPLIANCE`** unless an explicit architecture / design-system exception is approved and recorded (ADR or package closure exception).

Automated guardrails (01B / 01C):

- Context tabs: `lib/context-tabs/__tests__/context-tabs-architecture.test.ts`
- Binary control standard (doc + canonical primitive): `lib/design-system/__tests__/sce-binary-control-standard.test.ts`
- Activity presentation model: `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01c-architecture.test.ts`

Product-wide static enforcement of “no new setting checkboxes” is deferred to a future UI rollout / design-system hardening package if AST-based rules are required; the compliance contract and Toggle First rule are authoritative from 01B closure onward.

---

## SCE Club & Team Selector (01E-R3 / R4 visual polish)

One canonical engine for club and team selection across SCE — **visual-first**, **browse-first**, **search-assisted**, **crest-led**, backed by the **same Club Directory data** as `/dashboard/vereine` (no parallel opponent lists or Match-specific caches).

| Principle | Rule |
|-----------|------|
| **VISUAL-FIRST** | Crest + club name on grid cards (`ClubLogo` **bare** — fixed crest bounding box, `object-contain`, no avatar circle) |
| **BROWSE-FIRST** | Eligible clubs visible when the selector opens; search **filters** that universe |
| **SEARCH-ASSISTED** | `SceClubTeamSearch` — leading icon slot + `.fca-search-input` padding contract; optional trailing clear |
| **CANONICAL-DATA** | `GET /api/clubs/selectable` + Club Directory query service (Vereine source of truth) |
| **ONE-ENGINE** | `SceClubTeamSelectorDialog` modes: `CLUB_ONLY` · `TEAM_ONLY` · `CLUB_THEN_TEAM` |
| **CLUB_ONLY** | Match **Gegner**, Tournament **externer Verein** (participant/opponent club identity only — no second team drilldown) |
| **TEAM_ONLY** | Match **eigenes Team**, tenant team assignment |
| **CLUB_THEN_TEAM** | Only when the domain genuinely requires external club **and** structured external team (not merely because ExternalTeam rows exist) |
| **GRID DENSITY** | `SceClubGrid` ≈ **4 columns** at form-dialog width (`grid-cols-2 sm:3 lg:4`); club names **line-clamp-2**, centered |
| **TEAM ROWS** | `SceTeamList` card rows; secondary line via `formatSelectableTeamMetadata` (deduped, localized gender labels) |
| **SCROLL** | Dialog owns layout; results region uses `.sce-scroll-region-dark` (no nested white scrollbar chrome) |
| **KEYBOARD-ACCESSIBLE** | Dialog focus trap, Esc, return focus to invoking control |
| **RESPONSIVE** | Grid columns increase only while cards stay comfortably wide; full-screen-friendly on small viewports |

**Composer subordinate dialog exception:** Activity creation may open this selector as an **elevated** modal (`Dialog` `stackLayer="elevated"`) above the Activity Composer. It must not close the composer or trigger leave-intent guards; focus returns to «Team ändern» / «Gegner ändern» on dismiss.

Modules:

- `components/sce/club-team-selector/*`
- `lib/sce/club-team-selector/*`
- `app/api/clubs/selectable/*`

Future club/team pickers **must** consume this engine unless an ADR documents an exception.

---

## SCE overlay layering (01E-R4)

Portalled floating surfaces use explicit stack tokens (`lib/ui/sce-overlay-layering.ts`, `app/globals.css`):

| Layer | z-index | Usage |
|-------|---------|--------|
| App popover | 70 | Combobox / filter dropdowns in main workspace |
| Modal overlay root | 100 | Activity Composer, standard dialogs |
| Composer popover | 105 | `SceActivityCalendarPopover`, other composer-owned popovers (`PopoverContent` `floatingLayer="composer"`) |
| Elevated modal | 110 | Club/team selector over composer |

---

## SCE Activity Date & Time (01E-R2 / R4 layout)

- Manual **DD.MM.YYYY** + **HH:MM** via `SceActivityDateTimeInput` (termin row grid at `sm+`).
- Calendar assistance via `SceActivityCalendarPopover` on the **composer popover** layer (never behind composer overlay).

---

## CANONICAL SCE CALENDAR SYSTEM (01I R6.1)

| Item | Contract |
|------|----------|
| **Engine** | `SceCalendarEngine` + `MonthActivityGrid` — one month shell (header, navigation, weekday row, grid, today, legend, overflow) |
| **MICRO renderer** | `ProgrammeCalendarMicroEntry` only — **no** `PersonalCalendar*Tile` / `MatchCalendarTile` parallel families |
| **Semantic slots** | TYPE · VISUAL IDENTITY (`ClubCrest`) + IDENTITY · TIME (+ Clock) · LOCATION (+ MapPin) · STATUS |
| **Location (MICRO)** | `formatSceActivityLocationHierarchy` with `{ includeHostClub: false }` — identity line owns host/opponent/organiser; location line is venue/resource only |
| **TRAINING crest** | Tenant club via `SceTrainingPresentationModel.tenantClub` (canonical `ClubIdentity`) |
| **MATCH crest (team scope)** | Opponent `ClubIdentity` — scope team never shown as opponent |
| **TOURNAMENT crest** | Organiser `ClubIdentity`; tournament title remains identity text |
| **CLUB EVENT** | Title identity — no automatic crest |
| **TASK** | Non-sporting — no crest; Clock/MapPin only when time/location exist |

Authoritative engine doc: [`docs/calendar/SCE-CALENDAR-ENGINE.md`](../calendar/SCE-CALENDAR-ENGINE.md) (consumer matrix + adoption status).

---

## Canonical global navigation (NAVBAR-UPGRADE-01)

Desktop shell (R9): **one primary domain bar**, **one persistent tenant bar**, **on-demand hierarchical navigation panel** — L2/L3 are not a permanent horizontal strip.

| Surface | Role | Implementation | Rules |
|---------|------|----------------|-------|
| **Row 1 — Tenant + L1 + utilities** | Tenant crest + name · Club · Planung · Publizieren · Kommunikation · Admin · global utilities | `SceTenantContextRail` + `ScePrimaryNavigation` + `SceGlobalUtilities` | **One strong L1 selection maximum** (`--active` or open panel). **Active L1 domain:** icon **and** label use canonical `--sce-primary` (orange) while retaining underline/background and `aria-current` — color alone is not the only active signal. Route-active and panel-open are separate states: when a foreign panel is open, the route domain may use `--route-context` only — never two full active treatments. Domains with children open `SceDomainNavigationPanel` (`aria-expanded`); panel-open is not `aria-current`. |
| **Row 2 — Platform + season** | SportClubEvo wordmark (left) · season context (right, under utilities) | `ScePlatformBrandRail` + `SceRow2SeasonContext` inside `SceTenantContextRow` | Always visible on desktop while panels overlay page content; **no** horizontal L2 strip; empty middle workspace is intentional. |
| **On-demand L2/L3** | Module discovery within a domain | `SceDomainNavigationPanel` fed by `resolveDomainSecondaryNavItems` + `resolveSecondaryNavItemModuleLocalChildren` | One overlay panel; simple domains = single column; hierarchical domains = L2 left + L3 right; **never** add a permanent Row 3. **Selected route item:** icon + label use canonical `--sce-primary` (same token as L1); restrained selected surface may remain. **Panel browse (`--selected`) ≠ route selected (`--active`)** — opening another L2 column to preview L3 must not paint orange unless canonical route resolution marks that item active. |

**Canonical navigation active route path (01J-R5.3.2)**

When the current route resolves to an **L3 destination**, the **full ancestry** is route-active:

| Level | Route rule | Visual (token `var(--sce-primary)`) |
|-------|------------|-------------------------------------|
| **L1 domain** | Current route belongs to this domain | Icon + label |
| **L2 category** | Direct L2 match **or** owns the active L3 descendant (**active ancestor**) | Icon + label + disclosure chevron (when present) |
| **L3 destination** | Current route resolves here | Label + icon when present |

**Active descendant ⇒ active ancestor:** if Teams is the current L3 under Organisation, Organisation is route-active even when another L2 row was only **browsed** to preview a different L3 column. **Browse / open panel (`--selected`) ≠ route active (`--active`).** Hover and focus do not imply route-active.

Leaf L3 links use `aria-current="page"`. Active L2 ancestors are visually active but do **not** claim `aria-current="page"` when they are not the leaf route.

Inactive items stay neutral/muted; hover may brighten but must not mimic route-active orange. Focus uses `:focus-visible` independently. Orange reinforces the path alongside `aria-current` and surface indicators — not as the sole accessibility signal.

**Navigation rules (canonical)**

1. **Do not use horizontally scrolling navigation as the primary desktop mechanism for module discovery.**
2. **Where L2 and L3 coexist, prefer one coherent hierarchical navigation surface** rather than stacked/nested disclosures.
3. **Navigation panels overlay content and never create additional persistent shell rows.**

**Branding**

- **Primary workspace identity (tenant):** Row 1 — `HeaderTenantIdentity` `layout="tenant-row-rail"` + transparent crest → `/dashboard`.
- **Secondary platform identity:** Row 2 — `ScePlatformBrandRail` / SportClubEvo wordmark → `/dashboard` (quieter visual weight than tenant).

**Global utilities (right cluster)**

- `SceGlobalUtilities` (Row 1): **notifications + account only** — **no contextual workflow quick actions** in the Navbar (no «Meeting planen», no path-keyed create CTAs). Contextual actions belong on workspace/page surfaces (`headerActions`, module toolbars). Season lives on Row 2 (`SceRow2SeasonContext`). **Desktop module discovery** is L1 domains + `SceDomainNavigationPanel` — not a global hamburger/overflow trigger in Row 1.
- **Primary navigation icons** use canonical state-driven monochrome foreground (`currentColor`). Individual navigation icons must not introduce independent semantic colors (orange/blue/accent fills) in inactive rows — state controls color, not icon artwork.
- **Season context** uses the Row 2 width budget. The **full localized season label** is the default desktop representation (`lg` and up) and must not collapse based on Row 1 width pressure; compact variants apply only on genuinely constrained tablet tiers.
- Global **`+ Erstellen`** remains the accepted `SceActivityCreateMenu` contract on module surfaces (01G) — not duplicated in the shell.

**Responsive**

- Tiering via `usePrimaryNavLayoutTier` + `maxInlineDomainsForTier`; overflow via single `SceNavigationOverflow` (same domain list as inline — no parallel route arrays).
- Mobile: existing bottom primary nav + drawer; desktop L2/L3 hidden below `md`.

**Accessibility**

- Distinct `nav` landmarks: `primaryNavAria` (Row 1 L1), `moduleNavAria` (Row 2 platform bar), `mobilePrimaryNavAria` (bottom nav). On-demand L2/L3 uses `SceDomainNavigationPanel` with domain-scoped `aria-label` (not a permanent context row).
- `aria-current="page"` on active links (`SceNavigationItem`).
- Visible `:focus-visible` rings on all levels; overflow menu is keyboard-operable native links.

Styles: `app/(admin)/global-app-navigation.css` · Shell composer: `components/admin/layout/AppShellNavigation.tsx`.

### Page shell vs navigation grid (NAVBAR-UPGRADE-01-R8)

**Navigation grid** (Row 1 / Row 2 only): tenant or platform identity rail (`--sce-nav-brand-rail-width`) + navigation workspace + utilities (Row 1). Row 2 repeats the rail column for platform identity and right-aligns season under Row 1 utilities. Navigation identity rails **never** determine page content alignment (`--sce-page-gutter` only). Horizontal alignment for L1 uses `--sce-shell-workspace-start` inside the header — **not** for page bodies.

**Page grid** (`SceApplicationPageGrid` + `PageShell`): responsive horizontal gutters via `--sce-page-gutter` (16px mobile → 32px large desktop). Page content is **never** offset by the navigation brand rail.

**Width modes** (`data-sce-page-width` on `PageShell`):

| Mode | Use |
|------|-----|
| `operational` | Wochenplaner, dense planners — full width within gutters |
| `readable` | Default admin pages — optional max-width (~75rem) |
| `dashboard` | Card home — centered max-width (~87.5rem) |

Rule (canonical): *Navigation identity rails never dictate the left edge of application page content. Pages use canonical responsive page gutters and an appropriate content-width mode.*

Implementation: `lib/shell/sce-page-layout.ts` · `components/sce/shell/SceApplicationPageGrid.tsx`.

---

## Related documents

- [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md)
- [`SCE-ACTIVITY-PRESENTATION-STANDARD.md`](./SCE-ACTIVITY-PRESENTATION-STANDARD.md)
- [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md)
- [`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md)
