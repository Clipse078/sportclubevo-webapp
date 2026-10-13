# SCE-UI-ROLLOUT-01G — Club Event Card Family

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01G` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **01G-R1 corrections** — pending PO visual UAT |
| **STAGE baseline (01G start)** | `3ad12b25720565ca3fd778a94a0dc89cbdbcf766` |
| **Branch** | `cursor/sce-ui-rollout-01g-club-event-card-family` |

## Objective

Fourth canonical activity presentation family: **`SceClubEventCard`** consuming **`SceClubEventPresentationModel`** / **`SceActivityPresentationModel`** with activity label **VERANSTALTUNG**.

## Delivered

- `SceClubEventCard` densities: HERO · STANDARD · COMPACT · MICRO
- Adapters: `resolveSceClubEventPresentation`, `buildVeranstaltungenManagementActivityPresentation`
- All-day semantics: **Ganztägig** (no fake midnight ranges)
- Semantic accent: `--sce-club-event` / `club-event-violet` on `ActivityTypePill`
- Preview: `/sce-preview/club-event-card`
- Representative consumers: **`VeranstaltungListRow`** (Turniere-style row composition) + **`VeranstaltungEditPlanningHeader`** (`context-header`)
- Team audience architecture: [`SCE-UI-ROLLOUT-01G-R1-TEAM-AUDIENCE-ARCHITECTURE.md`](./SCE-UI-ROLLOUT-01G-R1-TEAM-AUDIENCE-ARCHITECTURE.md)

## Out of scope (01H+)

- Broad Veranstaltungen page redesign
- `VeranstaltungCard.tsx` grid retirement
- Dashboard / Mein Programm / Wochenplaner / communication adoption

## Toggle First

`BINARY_CONTROL_COMPLIANCE: PASS` — no new binary checkboxes in 01G sources.

## NEXT (not started)

[`SCE-UI-ROLLOUT-01H`](./SCE-UI-ROLLOUT-01.md) — Core planning surface adoption.
