# SCE-DESIGN-SYSTEM-05 — Forms & Controls

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-05` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-04` (**CLOSED / ACCEPTED / MERGED**, PR **#882**) |
| **Status** | **READY FOR PO REVIEW** (draft PR — do not merge until PO acceptance) |
| **`DS05_STATUS`** | **READY_FOR_PO_REVIEW** |
| **`DS05_R1_MICRO_UX_STATUS`** | **READY_FOR_PO_REVIEW** |
| **Branch** | `cursor/sce-design-system-05-forms-controls` |
| **Baseline STAGE** | `4bc4ad9f81eb243df5bcc68164085cace4b1f011` |
| **Accepted DS-05 implementation HEAD** | `f311c899822daed639b328f3281bb0b0a3c92e39` |
| **R1 micro-UX HEAD (`FEATURE_HEAD_FULL`)** | `4b6a3bcb63d0ba1adcf3394aca82adf264c423a8` |
| **Successor** | **`SCE-DESIGN-SYSTEM-06`** — Actions / Dialogs / Composer |
| **Foundation consumed** | DS-02 tokens · DS-03 workspace · DS-04 cards |

**PO review (pending):** `PO_FORM_CONTROL_SYSTEM_REVIEW` · `PO_TOGGLE_FIRST_REVIEW` · `PO_VALIDATION_LANGUAGE_REVIEW` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS`

---

## Mission

Establish **one canonical SCE form/control language** across SportClubEvo — text inputs, selects, comboboxes, search, date/time, labels, help, validation, toggles, checkboxes, radios/segmented controls, density, keyboard, and accessibility — without parallel local control systems.

**Core principle:** ONE SCE FORM LANGUAGE · SEMANTIC CONTROLS FOR SEMANTIC JOBS · **Toggle First** for binary settings.

---

## Deliverables

| Artifact | Purpose |
| --- | --- |
| [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) | Master entry — DS-05 section |
| [`SCE-DESIGN-SYSTEM-05-FORM-CONTROL-INVENTORY.md`](../design/SCE-DESIGN-SYSTEM-05-FORM-CONTROL-INVENTORY.md) | DS-10 migration gate + binary audit |
| `lib/design-system/sce-design-system-05-meta.ts` | Typed audit + governance |
| `lib/design-system/sce-form-control-foundation.ts` | Form architecture constants |
| `lib/design-system/sce-form-control-micro-ux.ts` | R1 micro-UX contract + DOM markers |
| `lib/design-system/sce-binary-checkbox-audit.ts` | Binary checkbox re-audit |
| `components/sce/forms/*` | `SceFormField`, `SceTextInput`, `SceTextarea`, `SceSearchField`, `SceCheckbox` |

---

## Representative adoption (DS-05)

| Area | Evidence |
| --- | --- |
| Activity Composer | Architecture preserved; existing date/time + SwitchToggle guardrails |
| Admin | `NotificationPreferencesSection` SwitchThumb; CMS `LayoutConfigPanel` responsive toggles |
| Communication | `EmailSenderWorkspace` `SceFormField`; preferences + personal signature toggles |
| Planning / operational | `PlannerEntryCreatePublicationFields` (publication switches + hidden fields) |
| Search / filter | `CompetitionsSearchBar` → `SceSearchField` + archived `SwitchToggle` |
| Binary settings | 14 binary-setting checkbox patterns migrated (see inventory) |

---

## Governance flags (closure target)

| Flag | DS-05 value |
| --- | --- |
| `FORM_CONTROL_SYSTEM_PRODUCT_WIDE` | **YES** |
| `BINARY_CONTROL_COMPLIANCE` | **PASS** |
| `NEW_BINARY_CHECKBOXES` | **0** |
| `CANONICAL_TOGGLES_USED` | **YES** |
| `PARALLEL_PATTERN_INTRODUCED` | **NO** |
| `VALIDATION_SYSTEM_CANONICAL` | **YES** |
| `DISABLED_READ_ONLY_SEMANTICS_CANONICAL` | **YES** |
| `ACTIVITY_COMPOSER_ARCHITECTURE` | **PRESERVED** |
| `WORKSPACE_SYSTEM_PRODUCT_WIDE` | **YES** |
| `CARD_SYSTEM_PRODUCT_WIDE` | **YES** |
| `WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE` | **PASS** |
| `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE` | **YES** |
| `DATABASE_MIGRATION_REQUIRED` | **NO** |

Automated guardrails: `lib/design-system/__tests__/sce-design-system-05-forms.test.ts` · `lib/design-system/__tests__/sce-design-system-05-r1-micro-ux.test.ts`.

---

## R1 — world-class micro-UX (same branch)

**`SCE_FORM_CONTROL_MICRO_UX`** · **`WORLD_CLASS_FORM_CONTROL_MICRO_UX = PASS`** · **`WORLD_CLASS_SCE_QUALITY`** (macro + component + micro)

Calm field hierarchy, semantic validation colour tokens, unified `focus-visible` rings on segmented controls and icon triggers, stable `data-sce-*` markers for primitives and binary-setting rows, and invalid-state borders on canonical text controls — without restarting DS-05 architecture or introducing parallel primitives.

**MICRO HIERARCHY:** PRIMARY CONTENT → SECONDARY CONTENT → METADATA → SUPPORTING AFFORDANCE.

| Flag | R1 value |
| --- | --- |
| `WORLD_CLASS_MICRO_UX_REQUIRED` | **YES** |
| `MICRO_STATE_COVERAGE_REQUIRED` | **YES** |
| `MICRO_ALIGNMENT_CONSISTENCY_REQUIRED` | **YES** |
| `MICRO_RESPONSIVE_QUALITY_REQUIRED` | **YES** |
| `MICRO_ACCESSIBILITY_REQUIRED` | **YES** |
| `LOCAL_MICRO_PATTERN_DRIFT_ALLOWED` | **NO** |
| `WORLD_CLASS_FORM_CONTROL_MICRO_UX` | **PASS** |
| `FOCUS_NOT_COLOUR_ALONE` | **YES** |
| `CALM_FIELD_HIERARCHY` | **YES** |
| `BINARY_SETTING_ROW_LAYOUT_CANONICAL` | **YES** |
| `PREMIUM_DOES_NOT_MEAN_OVERSIZED` | **YES** |
| `PO_FORM_CONTROL_MICRO_UX_REVIEW` | **PENDING** |

### === WORLD_CLASS_MICRO_UX === (DS-05 report)

| Field | Value |
| --- | --- |
| `WORLD_CLASS_MICRO_UX_REQUIRED` | **YES** |
| `MICRO_STATE_COVERAGE` | **PASS** |
| `MICRO_ALIGNMENT_CONSISTENCY` | **PASS** |
| `MICRO_RESPONSIVE_QUALITY` | **PARTIAL_DS09_FINAL** |
| `MICRO_ACCESSIBILITY` | **PARTIAL_DS09_FINAL** |
| `LOCAL_MICRO_PATTERN_DRIFT_ALLOWED` | **NO** |
| `CONTROL_MICRO_STATES_AUDITED` | `SCE_FORM_CONTROL_MICRO_STATE_MATRIX` in `sce-form-control-micro-ux.ts` |
| `MICRO_PATTERNS_CANONICALISED` | Shared focus ring, field stack, error/invalid, search icon + clear touch target, binary row markers |
| `MICRO_PATTERNS_DEFERRED` | CMS designer orange chrome, legacy selects, combobox sweep, campaign forms, infoboard — see inventory |

---

## Out of scope (explicit)

- **DS-06** — full actions/dialogs/composer programme (DS-05 aligns demo actions only)
- **DS-07** — Versandbereitschaft / application feedback systems
- **DS-09** — final responsive/a11y hardening
- **DS-10** — product-wide migration completion for remaining inventory rows
- **Manual UAT / screenshots** — PO-owned
