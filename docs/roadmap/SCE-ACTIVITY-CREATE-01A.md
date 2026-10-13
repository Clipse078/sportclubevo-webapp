# SCE-ACTIVITY-CREATE-01A — Unified Activity Creation — Research & Architecture

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01A` |
| **Programme** | [`SCE-ACTIVITY-CREATE-01`](./SCE-ACTIVITY-CREATE-01.md) |
| **Status** | **NOT STARTED** |
| **Predecessor** | [`SCE-CLUB-EVENT-AUDIENCE-01`](./SCE-CLUB-EVENT-AUDIENCE-01.md) **CLOSED** |
| **Successor (if gate passes)** | `SCE-ACTIVITY-CREATE-01B+` — Activity Composer foundation and domain adoption |
| **Then** | [`SCE-UI-ROLLOUT-01H`](./SCE-UI-ROLLOUT-01.md) — Core planning surfaces adoption |

## Objective

Produce repository-grounded research and an architecture gate for **`SceActivityComposer`**: one creation UX family for Training, Match, Tournament, and Club Event — reusing **Universal Context Tabs**, Toggle First, and canonical activity presentation — without shipping product code in this package unless explicitly promoted.

## Inputs (canonical patterns already on STAGE)

- Club Event create: `/dashboard/veranstaltungen/new` — contextual tabs, dirty guard, create-time-only panels ([`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) Club Event create/edit workflow)
- Universal Context Tabs (`SceContextTabs`)
- Domain-specific operational editors post-create (participation, tasks, collaboration)

## Gate outputs (expected)

- Feasibility and migration map per activity type
- Shared shell API sketch (overlay vs full-page vs `/new` fallback)
- Validation / dirty-guard contract across tabs
- Accessibility and focus-restoration requirements
- Explicit **no nested-dialog** rule
- Recommendation: proceed to 01B+ or defer/adjust scope

## Out of scope

- Implementing composer UI or replacing live create flows
- Starting **SCE-UI-ROLLOUT-01H**
- PROD database or deploy actions
