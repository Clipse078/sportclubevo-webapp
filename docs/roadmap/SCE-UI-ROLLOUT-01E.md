# SCE-UI-ROLLOUT-01E — Training Card Family

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01E` |
| **Status** | **IN_PROGRESS** — implementation + automated validation; PO visual UAT pending |
| **Base** | `STAGE` @ `adca5a59` (post-01D) |
| **Scope** | Canonical `SceTrainingCard` family (HERO · STANDARD · COMPACT · MICRO) on 01C `SceTrainingPresentationModel` |

## Delivered

- `SceTrainingCard` + density renderers
- Adapters: legacy, management row, Wochenplaner training item
- `schedulePresentation` distinction (session vs recurring definition)
- Representative integrations: Activity Detail, `/dashboard/training` row identity, Wochenplaner editor shell
- Preview routes for PO UAT

## Deferred (by design)

- Broad `PlanningHubActivityBlock` / calendar cell replacement → **01H**
- Programme / Dashboard / communication adoption → **01I–01K**

## PO visual UAT

Pending deployment review on preview routes and STAGE representative surfaces.
