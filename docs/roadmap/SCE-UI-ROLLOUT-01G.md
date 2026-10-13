# SCE-UI-ROLLOUT-01G — Club Event Card Family

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01G` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **CLOSED** |
| **OWNER_VISUAL_UAT** | **PASS_PO_PROVIDED** |
| **APPROVED_REVISION** | **01G-R1** |
| **STAGE baseline (01G start)** | `3ad12b25720565ca3fd778a94a0dc89cbdbcf766` |
| **Branch** | `cursor/sce-ui-rollout-01g-club-event-card-family` |
| **PR** | #836 → `STAGE` |

## Objective

Fourth canonical activity presentation family: **`SceClubEventCard`** consuming **`SceClubEventPresentationModel`** / **`SceActivityPresentationModel`** with activity label **VERANSTALTUNG**.

## Delivered

- `SceClubEventCard` densities: HERO · STANDARD · COMPACT · MICRO
- Adapters: `resolveSceClubEventPresentation`, `buildVeranstaltungenManagementActivityPresentation`
- All-day semantics: **Ganztägig** (no fake midnight ranges)
- Semantic accent: `--sce-club-event` / `club-event-violet` on `ActivityTypePill`
- Preview: `/sce-preview/club-event-card`
- Representative consumers: **`VeranstaltungListRow`** (Turniere-style row composition) + **`VeranstaltungEditPlanningHeader`** (`context-header`)
- Team audience architecture (analysis only): [`SCE-UI-ROLLOUT-01G-R1-TEAM-AUDIENCE-ARCHITECTURE.md`](./SCE-UI-ROLLOUT-01G-R1-TEAM-AUDIENCE-ARCHITECTURE.md)

## Out of scope (deferred)

- Broad Veranstaltungen page redesign
- `VeranstaltungCard.tsx` grid retirement → **01H**
- Dashboard / Mein Programm / Wochenplaner / communication adoption → **01H–01K**
- Club Event audience N:M schema → [`SCE-CLUB-EVENT-AUDIENCE-01`](./SCE-CLUB-EVENT-AUDIENCE-01.md)

## Toggle First

`BINARY_CONTROL_COMPLIANCE: PASS` — no new binary checkboxes in 01G sources.

## Validation (closure)

Automated suites at closure (HEAD includes 01G-R1 + closure documentation):

- `components/sporting-activity/__tests__/sce-ui-rollout-01g-club-event-card.test.tsx`
- `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01g-architecture.test.ts`
- `components/admin/veranstaltungen/__tests__/VeranstaltungListRow.composition.test.tsx`
- Shared card/regression guardrails: `sce-ui-rollout-01d-*`, `sce-ui-rollout-01e-*`, `sce-ui-rollout-01f-*`
- `lib/design-system/__tests__/sce-binary-control-standard.test.ts`

Design System contract: [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) (Canonical Club Event card family).

## Closure criteria (PO)

- [x] PO visual UAT — **PASS (01G-R1)** — surfaces: `/sce-preview/club-event-card`, `/dashboard/veranstaltungen`, `/dashboard/veranstaltungen/[eventId]/edit`
- [x] STAGE baseline integrity (`3ad12b25` post-PR-835)
- [x] Automated validation PASS
- [x] PR #836 merge to `STAGE` (closure commit)
- [x] Roadmap status → **CLOSED**

**NEXT:** [`SCE-CLUB-EVENT-AUDIENCE-01`](./SCE-CLUB-EVENT-AUDIENCE-01.md) — **CLOSED** (PR #837).

**Then:** [`SCE-ACTIVITY-CREATE-01A`](./SCE-ACTIVITY-CREATE-01A.md) → (gate) **01B+** → [`SCE-UI-ROLLOUT-01H`](./SCE-UI-ROLLOUT-01.md).
