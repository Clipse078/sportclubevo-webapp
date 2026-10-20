# SCE-DESIGN-SYSTEM-06 — Actions, Dialogs & Composer

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-06` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-05` (**CLOSED / ACCEPTED / MERGED**, PR **#883**) |
| **Status** | **READY FOR PO REVIEW** (draft PR → **STAGE**) |
| **`DS06_STATUS`** | **READY_FOR_PO_REVIEW** |
| **Branch** | `cursor/sce-design-system-06-actions-dialogs-composer` |
| **Baseline STAGE** | `896d51e70586e28a78511cdea3f621b826483366` |
| **Successor** | **`SCE-DESIGN-SYSTEM-07`** — Status, Feedback & System States |
| **Foundation consumed** | DS-02 tokens · DS-03 workspace · DS-04 cards · DS-05 controls |

**PO review:** `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-07`**

---

## Mission

Establish **one canonical SCE action and dialog language** across SportClubEvo while **evolving — not replacing —** the accepted `SceActivityComposer`.

**Core principles:** ONE SCE ACTION LANGUAGE · ONE SCE DIALOG LANGUAGE · ONE CANONICAL COMPOSER FOUNDATION · PURPOSE-BUILT WORKFLOWS · WORLD-CLASS MICRO DETAIL.

---

## Deliverables

| Artifact | Purpose |
| --- | --- |
| [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) | Master entry — DS-06 section |
| [`SCE-DESIGN-SYSTEM-06-ACTION-DIALOG-INVENTORY.md`](../design/SCE-DESIGN-SYSTEM-06-ACTION-DIALOG-INVENTORY.md) | DS-10 migration gate + nested dialog audit |
| `lib/design-system/sce-action-dialog-foundation.ts` | Action hierarchy, dialog types, nested policy |
| `lib/design-system/sce-action-dialog-micro-ux.ts` | Micro-UX contract + shared class tokens |
| `lib/design-system/sce-design-system-06-meta.ts` | Typed audit + governance |
| `components/sce/actions/*` | `SceActionLink`, `SceIconButton`, `SceOverflowMenu`, `SceConfirmDialog` |

---

## Representative adoption (DS-06)

| Area | Evidence |
| --- | --- |
| Activity Composer | Footer `data-sce-composer-action` + hierarchy markers; architecture unchanged |
| Communication | Hub primary/secondary → `SceActionLink` (canonical Button variants) |
| Admin | `UserRowActionsMenu` → `SceOverflowMenu` + `SceConfirmDialog` |
| Tournament operational | `TurniereTournamentRecordDeleteDialog` → `SceConfirmDialog` |
| Overflow menu | Shared trigger/item/destructive tokens (`sce-action-dialog-micro-ux.ts`) |
| Dialog shell | `Dialog` close control + `data-sce-dialog-shell` markers |

---

## Governance flags (PO review gate)

| Flag | DS-06 value |
| --- | --- |
| `ACTION_SYSTEM_PRODUCT_WIDE` | **YES** |
| `DIALOG_SYSTEM_PRODUCT_WIDE` | **YES** |
| `ACTIVITY_COMPOSER_CANONICAL` | **YES** |
| `PARALLEL_PATTERN_INTRODUCED` | **NO** |
| `PARALLEL_MODAL_SYSTEM` | **NO** |
| `BINARY_CONTROL_COMPLIANCE` | **PASS** |
| `NEW_BINARY_CHECKBOXES` | **0** |
| `CANONICAL_TOGGLES_USED` | **YES** |
| `WORKSPACE_SYSTEM_PRODUCT_WIDE` | **YES** |
| `CARD_SYSTEM_PRODUCT_WIDE` | **YES** |
| `FORM_CONTROL_SYSTEM_PRODUCT_WIDE` | **YES** |
| `WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE` | **PASS** |
| `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE` | **YES** |
| `DATABASE_MIGRATION_REQUIRED` | **NO** |
| `PERSISTENT_TEST_DATA` | **0** |
| `PROD` | **UNTOUCHED** |

Automated guardrails: `lib/design-system/__tests__/sce-design-system-06-actions-dialogs.test.ts` plus DS-01–DS-05 regression suites as applicable.

---

## Nested dialog audit summary

| Metric | Value |
| --- | ---: |
| `NESTED_DIALOG_PATTERNS_FOUND` | 4 |
| `NESTED_DIALOG_PATTERNS_MIGRATED_DS06` | 0 |
| `NESTED_DIALOG_PATTERNS_DEFERRED` | 2 |
| `NESTED_DIALOG_JUSTIFIED_EXCEPTIONS` | 2 |

---

## Micro UX (DS-06)

| Flag | Value |
| --- | --- |
| `WORLD_CLASS_MICRO_UX_REQUIRED` | **YES** |
| `LOCAL_MICRO_PATTERN_DRIFT_ALLOWED` | **NO** |
| `ACTION_MICRO_STATES_AUDITED` | **YES** |
| `DIALOG_MICRO_STATES_AUDITED` | **YES** |
| `COMPOSER_MICRO_STATES_AUDITED` | **YES** |
| `MICRO_RESPONSIVE_QUALITY` | **PARTIAL_DS09_FINAL** |
| `MICRO_ACCESSIBILITY` | **PARTIAL_DS09_FINAL** |

---

## DS-05 debt (unchanged)

Do **not** opportunistically migrate all 17 remaining binary-setting checkboxes — explicit DS-10 debt unless a touched DS-06 surface requires migration. **NEW_BINARY_CHECKBOXES = 0**.

---

## Closure criteria (PO)

Product Owner review required before merge to **STAGE**. Visual UAT remains PO-owned.

**Finish marker:** `SCE_DESIGN_SYSTEM_06_READY_FOR_PO_REVIEW`
