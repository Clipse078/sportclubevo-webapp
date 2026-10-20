# SCE-DESIGN-SYSTEM-07 — Status, Feedback, Loading, Empty & Error

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-07` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-06` (**CLOSED / ACCEPTED / MERGED**, PR **#884**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#885** → **STAGE**; merge recorded on **STAGE** after merge) |
| **`DS07_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **`DS07_R1_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-design-system-07-status-feedback-loading-empty-error` |
| **Baseline STAGE (pre-merge)** | `5439f64d914a53f1dc3d029957e8a021cf0a0269` |
| **Accepted base implementation HEAD** | `65799accf7350a6e97859d08c78be8ea42b552e2` |
| **Accepted R1 HEAD** | `a19bff63838e1ad8a7384f29b2eb1665bb0d890d` |
| **Feature HEAD before closure docs** | `a19bff63838e1ad8a7384f29b2eb1665bb0d890d` |
| **Closure commit** | `cbbcee90a504279b0fa196bcc1cc760d7704cb07` |
| **STAGE merge commit** | `PENDING_STAGE_MERGE` |
| **PR** | **#885** — **MERGED** (after merge) |
| **Successor** | **`SCE-DESIGN-SYSTEM-08`** — Tables, Lists & Dense UI |

**PO closure:** `PO_DS07_VISUAL_UAT = PASS` · `PO_DS07_R1_VISUAL_UAT = PASS` · `PO_EMPTY_STATE_REVIEW = PASS` · `PO_PEOPLE_ACCESS_FEEDBACK_REVIEW = PASS` · `PO_TOURNAMENT_PLANUNG_FEEDBACK_REVIEW = PASS` · `PO_READINESS_SYSTEM_REVIEW = PASS` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-08`** — Tables, Lists & Dense UI

---

## PO acceptance (final closure)

Product Owner accepts DS-07 including **R1 visual convergence** (contained empty states, feedback nearest context, readiness visual DNA, People & Access feedback layer, Tournament Planung hierarchy). Closure is documentation and programme truth only — no redesign.

**DS-07 does NOT claim** every status/error/empty/loading implementation is migrated product-wide. Representative adoption + canonical primitives + DS-10 inventory remain the migration gate.

---

## Mission

Establish **one canonical SportClubEvo language** for readiness, semantic feedback, loading, skeletons, empty/no-results states, and **actionable errors** — with **visible adoption** on representative surfaces (not architecture-only).

**Core principles:** ONE SEMANTIC FEEDBACK MODEL · ONE READINESS FAMILY · ONE EMPTY STATE LANGUAGE · ONE LOADING HIERARCHY · ACTIONABLE ERRORS · COMMUNICATION-QUALITY CALM · NO CARD SOUP.

---

## Deliverables

| Artifact | Purpose |
| --- | --- |
| [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) | Master entry — DS-07 section |
| [`SCE-DESIGN-SYSTEM-07-FEEDBACK-INVENTORY.md`](../design/SCE-DESIGN-SYSTEM-07-FEEDBACK-INVENTORY.md) | DS-10 migration gate |
| [`SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md) | Dense UI debt → DS-08 |
| `lib/design-system/sce-feedback-status-foundation.ts` | Semantic tones, empty variants, loading hierarchy |
| `lib/design-system/sce-actionable-error-foundation.ts` | Actionable error copy contract |
| `lib/design-system/sce-design-system-07-meta.ts` | Typed audit + governance |
| `components/sce/feedback/*` | Canonical primitives |

---

## Canonical primitives

| Primitive | Role |
| --- | --- |
| `SceSemanticFeedback` | SUCCESS / WARNING / ERROR / INFO / NEUTRAL inline or workspace feedback |
| `SceReadinessStatusPanel` | Setup / publication / configuration readiness (Email Sender reference) |
| `SceEmptyState` | FIRST_USE, NO_DATA, NO_RESULTS, FILTERED_NO_RESULTS, … |
| `SceActionableError` | Title, explanation, retry/dismiss — no default `Interner Fehler` |
| `SceSkeleton` | Restrained recipes + bridge to `LoadingSkeleton` |

Legacy bridge: `components/ui/page/EmptyState` → `SceEmptyState` · `DashboardEmptyState` → `SceEmptyState` layouts.

---

## Representative visible adoption

| Area | Evidence |
| --- | --- |
| Email Sender | `SceReadinessStatusPanel` for Versandbereitschaft |
| Tournament Planner | Readiness + `SceSemanticFeedback` planning UX; setup dialog actionable load errors |
| Personen & Zugänge | `SceEmptyState` first-use + filtered no-results (dense table → **DS-08**) |
| Mein Programm | Semantic empty variants via dashboard bridge |
| Planning Hub | Filtered empty → `SceEmptyState` |
| Dashboard | Positive reference — preserved |

---

## Governance flags (final closure)

| Flag | DS-07 value |
| --- | --- |
| `STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE` | **YES** |
| `READINESS_SYSTEM_CANONICAL` | **YES** |
| `EMPTY_STATE_SYSTEM_CANONICAL` | **YES** |
| `LOADING_SYSTEM_CANONICAL` | **YES** |
| `LOADING_SYSTEM_PRODUCT_WIDE` | **YES** |
| `ACTIONABLE_ERROR_UX_REQUIRED` | **YES** |
| `GENERIC_INTERNAL_ERROR_AS_DEFAULT` | **NO** |
| `RECOVERY_ACTION_REQUIRED_WHERE_POSSIBLE` | **YES** |
| `TECHNICAL_DETAILS_EXPOSED_TO_USER` | **NO** |
| `FEEDBACK_NEAREST_MEANINGFUL_CONTEXT` | **YES** |
| `EMPTY_STATE_CONTAINMENT_REQUIRED` | **YES** |
| `READINESS_VISUAL_DNA_SHARED` | **YES** |
| `LOCAL_READINESS_RESTYLING_ALLOWED` | **NO** |
| `VISIBLE_PRODUCT_ADOPTION_REQUIRED` | **YES** |
| `VISIBLE_DESIGN_CONVERGENCE_REQUIRED` | **YES** |
| `FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED` | **YES** |
| `RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE` | **NO** |
| `CARD_SOUP_ALLOWED` | **NO** |
| `DS10_FINAL_ADOPTION_REQUIRED` | **YES** |
| `BINARY_CONTROL_COMPLIANCE` | **PASS** |
| `NEW_BINARY_CHECKBOXES` | **0** |
| `SCE_DESIGN_SYSTEM_COMPLIANCE` | **PASS** |

Automated guardrails: `lib/design-system/__tests__/sce-design-system-07-status-feedback.test.ts` · `lib/design-system/__tests__/sce-design-system-07-r1-status-feedback.test.ts` · `components/sce/feedback/__tests__/SceFeedbackPrimitives.test.tsx`.

---

## R1 — visual convergence (PO accepted)

| Lock | Value |
| --- | --- |
| `DS07_INITIAL_VISUAL_REVIEW` | **PARTIAL_PASS** (historical — R1 required) |
| `PO_DS07_R1_VISUAL_UAT` | **PASS** |
| `EMPTY_STATE_CONTAINMENT_REQUIRED` | **YES** |
| `FEEDBACK_NEAREST_MEANINGFUL_CONTEXT` | **YES** |
| `READINESS_VISUAL_DNA_SHARED` | **YES** |
| `LOCAL_READINESS_RESTYLING_ALLOWED` | **NO** |
| `DS08_OWNS_DENSE_ADMIN_TABLE` | **YES** |

R1 metadata: `lib/design-system/sce-design-system-07-r1-meta.ts` · DS-08 handoff: [`SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md`](../design/SCE-DESIGN-SYSTEM-07-DS08-HANDOFF.md).

---

## DS-08 handoff (explicit)

DS-07 **does not** claim Personen & Zugänge dense table/list hierarchy is visually final. **DS-08** owns row density, headers, scanning hierarchy, pagination, row actions, and mobile transformation of dense information.

---

## Final closure markers

```text
DS07_STATUS = CLOSED / ACCEPTED / MERGED
SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS
NEXT_PACKAGE = SCE-DESIGN-SYSTEM-08 — Tables, Lists & Dense UI
STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE = YES
READINESS_SYSTEM_CANONICAL = YES
EMPTY_STATE_SYSTEM_CANONICAL = YES
LOADING_SYSTEM_CANONICAL = YES
ACTIONABLE_ERROR_UX_REQUIRED = YES
GENERIC_INTERNAL_ERROR_AS_DEFAULT = NO
VISIBLE_DESIGN_CONVERGENCE_REQUIRED = YES
WORLD_CLASS_MICRO_UX_REQUIRED = YES
LOCAL_MICRO_PATTERN_DRIFT_ALLOWED = NO
BINARY_CONTROL_COMPLIANCE = PASS
DS10_FINAL_ADOPTION_REQUIRED = YES
SCE_DESIGN_SYSTEM_COMPLIANCE = PASS
SCE_DESIGN_SYSTEM_07_CLOSED_ACCEPTED_MERGED
```
