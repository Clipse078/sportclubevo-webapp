# SCE-DESIGN-SYSTEM-07 — Status, Feedback, Loading, Empty & Error

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-07` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-06` (**CLOSED / ACCEPTED / MERGED**, PR **#884**) |
| **Status** | **READY FOR PO VISUAL REVIEW** (draft PR — do not merge until PO accepts) |
| **`DS07_STATUS`** | **READY_FOR_PO_REVIEW** |
| **Branch** | `cursor/sce-design-system-07-status-feedback-loading-empty-error` |
| **Baseline STAGE** | `5439f64d914a53f1dc3d029957e8a021cf0a0269` |
| **Successor** | **`SCE-DESIGN-SYSTEM-08`** (after PO acceptance) |

**PO review:** `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

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
| Personen & Zugänge | `SceEmptyState` first-use + filtered no-results |
| Mein Programm | Semantic empty variants via dashboard bridge |
| Planning Hub | Filtered empty → `SceEmptyState` |

---

## Governance flags (PO review gate)

| Flag | DS-07 value |
| --- | --- |
| `STATUS_FEEDBACK_SYSTEM_PRODUCT_WIDE` | **YES** |
| `READINESS_SYSTEM_CANONICAL` | **YES** |
| `EMPTY_STATE_SYSTEM_CANONICAL` | **YES** |
| `LOADING_SYSTEM_CANONICAL` | **YES** |
| `ACTIONABLE_ERROR_UX_REQUIRED` | **YES** |
| `GENERIC_INTERNAL_ERROR_AS_DEFAULT` | **NO** |
| `VISIBLE_PRODUCT_ADOPTION_REQUIRED` | **YES** |
| `VISIBLE_DESIGN_CONVERGENCE_REQUIRED` | **YES** |
| `FUNCTIONAL_SURFACE_HIERARCHY_REQUIRED` | **YES** |
| `RAW_DECORATIVE_BACKGROUND_AS_DEFAULT_CONTENT_SURFACE` | **NO** |
| `CARD_SOUP_ALLOWED` | **NO** |
| `BINARY_CONTROL_COMPLIANCE` | **PASS** |
| `NEW_BINARY_CHECKBOXES` | **0** |
| `SCE_DESIGN_SYSTEM_COMPLIANCE` | **PASS** |

Automated guardrails: `lib/design-system/__tests__/sce-design-system-07-status-feedback.test.ts` · `components/sce/feedback/__tests__/SceFeedbackPrimitives.test.tsx`.

**Finish marker (after PO acceptance):** `SCE_DESIGN_SYSTEM_07_CLOSED_ACCEPTED_MERGED`
