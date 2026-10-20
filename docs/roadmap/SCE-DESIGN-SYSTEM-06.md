# SCE-DESIGN-SYSTEM-06 — Actions, Dialogs & Composer

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-06` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-05` (**CLOSED / ACCEPTED / MERGED**, PR **#883**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#884** → **STAGE**; merge recorded on **STAGE** after merge) |
| **`DS06_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-design-system-06-actions-dialogs-composer` |
| **Baseline STAGE (pre-merge)** | `896d51e70586e28a78511cdea3f621b826483366` |
| **Accepted base implementation HEAD** | `4e36b3a7a71dad94e8e2aa60d7fe45556bd9bd98` |
| **Accepted R1 HEAD** | `2ec5cafbe4c5ea28a243f719934d302b44563ca3` |
| **Accepted R2 HEAD** | `a8dbd4b64f6e72e6efb71ac12de53232d9682eea` |
| **Accepted R3 HEAD** | `d657e74772208e401f4419057f954c8ca28ed07c` |
| **Feature HEAD before closure docs** | `19275e80b8409494b6e2111359ac814f8972c877` |
| **Closure commit** | `d208772701e6a0bad4582aa50391c9346db54059` |
| **STAGE merge commit** | `7690f15d2d2dc3e8f2ba0c1660bff66877cf83ab` |
| **PR** | **#884** — **MERGED** |
| **Successor** | **`SCE-DESIGN-SYSTEM-07`** — Status, Feedback, Loading, Empty & Error |
| **Foundation consumed** | DS-02 tokens · DS-03 workspace · DS-04 cards · DS-05 controls |

**PO closure:** `PO_DS06_R3_VISUAL_UAT = PASS` · `PO_TOURNAMENT_PLANNER_ENTRY_REVIEW = PASS` · `PO_SMART_PITCH_PREPARATION_REVIEW = PASS` · `PO_SPORTING_NEUTRALITY_REVIEW = PASS` · `PO_SURFACE_CONTAINMENT_REVIEW = PASS` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-07`** — Status, Feedback, Loading, Empty & Error

---

## PO acceptance (final closure)

Product Owner accepts DS-06 including **R1 visible adoption**, **R2 functional surfaces + pitch preparation**, and **R3 sporting-neutral schedule recommendation** at the accepted R3 implementation HEAD above. Closure is documentation and programme truth only — no redesign.

| Field | Value |
| --- | --- |
| `PO_DS06_R3_VISUAL_UAT` | **PASS** |
| `PO_TOURNAMENT_PLANNER_ENTRY_REVIEW` | **PASS** |
| `PO_SMART_PITCH_PREPARATION_REVIEW` | **PASS** |
| `PO_SPORTING_NEUTRALITY_REVIEW` | **PASS** |
| `PO_SURFACE_CONTAINMENT_REVIEW` | **PASS** |
| `ACTION_SYSTEM_PRODUCT_WIDE` | **YES** |
| `DIALOG_SYSTEM_PRODUCT_WIDE` | **YES** |
| `ACTIVITY_COMPOSER_CANONICAL` | **YES** |
| `VISIBLE_DESIGN_CONVERGENCE_REQUIRED` | **YES** |
| `FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED` | **YES** |
| `RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE` | **NO** |
| `PITCH_COUNT_RECOMMENDATION` | **YES** |
| `PLAYING_FORMAT_RECOMMENDED_FROM_TEMPLATE` | **NO** |
| `PLAYING_FORMAT_AUTO_ASSIGNED_TO_RECOMMENDED_PITCH` | **NO** |
| `WORLD_CLASS_MICRO_UX_REQUIRED` | **YES** |
| `LOCAL_MICRO_PATTERN_DRIFT_ALLOWED` | **NO** |
| `SCE_DESIGN_SYSTEM_COMPLIANCE` | **PASS** |

**Visible design direction (locked):** Communication workspace remains the **primary positive visual reference** — not a universal page layout. Domain-specific layouts stay valid. Remaining surface inconsistencies across the webapp are explicit **DS-07–DS-10 migration debt**; the full app is **not** visually migrated at DS-06 closure.

**Toggle First (locked):** binary ON/OFF → canonical toggle/switch · `BINARY_CONTROL_COMPLIANCE = PASS` · `NEW_BINARY_CHECKBOXES = 0` · `CANONICAL_TOGGLES_USED = YES`.

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
| `VISIBLE_PRODUCT_ADOPTION_REQUIRED` | **YES** (R1) |
| `VISIBLE_DESIGN_CONVERGENCE_REQUIRED` | **YES** (R1) |
| `MICRO_STATE_COVERAGE` | **PASS** (R1) |
| `MICRO_ALIGNMENT_CONSISTENCY` | **PASS** (R1) |

From **DS-06 onward**, every remaining Design System package must ship **(1)** canonical primitives where required, **(2)** representative real-product adoption, **(3)** visible visual convergence, **(4)** world-class micro-UX review, and **(5)** migration inventory for remaining legacy surfaces. A package must not report PASS when the application remains visually unchanged.

Automated guardrails: `lib/design-system/__tests__/sce-design-system-06-actions-dialogs.test.ts` · `lib/design-system/__tests__/sce-design-system-06-r1-visual-adoption.test.ts` plus DS-01–DS-05 regression suites as applicable.

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

Product Owner review **complete** — merged to **STAGE** via PR **#884**. Visual UAT remains PO-owned (`SKIPPED_PO_OWNED`).

**Finish marker:** `SCE_DESIGN_SYSTEM_06_CLOSED_ACCEPTED_MERGED`

---

## DS-06-R1 — visible adoption + existing tournament planner entry

PO visual UAT follow-up on draft PR **#884** (same branch — no DS-07 start).

| Surface | R1 adoption |
| --- | --- |
| Communication | Visual reference preserved — no regression |
| Tournament Center | `SceOverflowMenu` header actions · SCE surface list panels |
| Tournament detail / Planung | Actionable readiness panel · `TournamentPlanungSetupDialog` (TP01/02 reuse) |
| Personen & Zugänge | Canonical `Button` primary · SCE KPI card surfaces |

**Existing HOME tournament planner entry:** Planung incomplete state exposes **Turnierplanung einrichten** → embedded setup dialog → `persistTournamentPlannerFromComposer` (no tournament recreation, no parallel schedule truth).

**R1 status:** **CLOSED / ACCEPTED / MERGED** at `2ec5cafbe4c5ea28a243f719934d302b44563ca3`

---

## DS-06-R3 — schedule recommendation ≠ playing format

**Canonical principle:** SCE RECOMMENDS THE TOURNAMENT PROGRAMME. THE ORGANISER CHOOSES THE PLAYING FORMAT.

Automatic-first applies to **fixture / schedule / pitch structure** (field count, rounds, pairings, timing feasibility). It does **not** authorize SCE to infer players-per-side from participant count, category, or predefined Spielplan templates.

| Flag | R3 value |
| --- | --- |
| **PITCH_COUNT_RECOMMENDATION** | **YES** |
| **ROUND_SCHEDULE_RECOMMENDATION** | **YES** |
| **PLAYING_FORMAT_RECOMMENDED_FROM_PARTICIPANT_COUNT** | **NO** |
| **PLAYING_FORMAT_RECOMMENDED_FROM_CATEGORY** | **NO** |
| **PLAYING_FORMAT_RECOMMENDED_FROM_TEMPLATE** | **NO** |
| **PLAYING_FORMAT_AUTO_ASSIGNED_TO_RECOMMENDED_PITCH** | **NO** |
| **PITCH_COUNT_RECOMMENDATION_INDEPENDENT_OF_PLAYING_FORMAT** | **YES** |
| **EXISTING_USER_PLAYING_FORMAT_PRESERVED** | **YES** |

Typed governance: `lib/design-system/sce-design-system-06-r3-meta.ts`

**R3 status:** **CLOSED / ACCEPTED / MERGED** at `d657e74772208e401f4419057f954c8ca28ed07c`

---

## Final closure markers

```text
DS06_STATUS = CLOSED / ACCEPTED / MERGED
SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS
NEXT_PACKAGE = SCE-DESIGN-SYSTEM-07 — Status, Feedback, Loading, Empty & Error
ACTION_SYSTEM_PRODUCT_WIDE = YES
DIALOG_SYSTEM_PRODUCT_WIDE = YES
ACTIVITY_COMPOSER_CANONICAL = YES
VISIBLE_DESIGN_CONVERGENCE_REQUIRED = YES
FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED = YES
RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE = NO
PITCH_COUNT_RECOMMENDATION = YES
PLAYING_FORMAT_RECOMMENDED_FROM_TEMPLATE = NO
PLAYING_FORMAT_AUTO_ASSIGNED_TO_RECOMMENDED_PITCH = NO
WORLD_CLASS_MICRO_UX_REQUIRED = YES
LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO
BINARY_CONTROL_COMPLIANCE = PASS
NEW_BINARY_CHECKBOXES = 0
CANONICAL_TOGGLES_USED = YES
SCE_DESIGN_SYSTEM_COMPLIANCE = PASS
MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED
SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED
PO_DS06_R3_VISUAL_UAT = PASS
```
