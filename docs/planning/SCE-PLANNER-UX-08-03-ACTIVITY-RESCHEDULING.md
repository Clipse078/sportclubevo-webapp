# SCE-PLANNER-UX-08-03 — Activity Rescheduling

**Status:** In progress (branch `cursor/sce-planner-ux-08-03-activity-rescheduling`)

**Human UAT:** NOT YET PASSED

## Perspectives

| Perspective | Meaning |
|-------------|---------|
| **Kalender** | **Wann?** — sporting activity date/time |
| **Spielfeld** | **Wo?** — primary pitch/resource (08-02 reservation window) |
| **Garderobe** | Supporting dressing-room reservation (08-02) |

Activity rescheduling mutates **activity time** only (`timeTarget: activity`). Resource timelines continue to mutate **resource occupancy** without changing Spielzeit/Trainingszeit unless explicitly in Alternativplan time overrides.

## Architecture

```
Kalender DnD / Termin ändern
  → SchedulerDraftChange (timeTarget: activity)
  → buildActivityRescheduleProposal + resource impact
  → POST /api/planning-hub/activity-rescheduling/validate
  → VON/NACH confirmation (Termin verschieben)
  → applyPlanningHubActivityRescheduleDraft
  → canonical persistence (training reschedule / match PATCH / tournament PATCH / plan time override)
```

Core modules:

| Module | Role |
|--------|------|
| `lib/planning-hub/planning-activity-rescheduling.ts` | Authority, proposal, resource impact (buffers preserved on refs) |
| `lib/planning-hub/activity-rescheduling-mutations.ts` | Permission gate + unified apply |
| `app/api/planning-hub/activity-rescheduling/validate/route.ts` | Server authority + conflict revalidation |
| `components/admin/planning-hub/PlanningHubActivityScheduleEditDialog.tsx` | Non-DnD **Termin ändern** |
| `components/admin/planning-hub/PlanningHubManipulationConfirm.tsx` | VON/NACH + Spielfeld/Garderobe consequence lines |

## Authority

| Activity | Standardplan | Notes |
|----------|--------------|-------|
| Training | SCE_MANAGED | Single occurrence via `TrainingSession` override columns — series recurrence unchanged |
| Match MANUAL | SCE_MANAGED | `PATCH /api/matchcenter/[id]` startAt/endAt |
| Match SFV / import | PROVIDER_MANAGED | Read-only in Kalender; explanation in UX |
| Tournament | SCE_MANAGED | `PATCH /api/tournaments/[id]` |
| Veranstaltung | NOT_SUPPORTED (v1) | Out of package |
| Alternativplan | ALTERNATIVE_PLAN_ONLY | Plan time overrides |

## Resource impact

Occupancy buffers (`occupancyBeforeMinutes` / `occupancyAfterMinutes`) stay on allocations; when activity time moves, effective reservation windows shift via `computeResourceOccupancyWindow` — relative buffers preserved.

## Recurring training boundary

Only **one TrainingSession occurrence** is rescheduled. `TrainingSeries` recurrence is never mutated (TRAININGCENTER-02). Series-wide shift deferred.

## Permissions

`canManageTrainings` / `canManageEvents` + plan context via `manipulation-capabilities.ts`. No role-name checks. APIs enforce `TRAININGS_MANAGE`, `EVENTS_MANAGE`, planning allocation permissions on validate.

## Read-model invalidation

- Training: `notifyPersonalDashboardForTrainingSession` (existing reschedule service)
- Match: `notifyPersonalDashboardForSportingEvent` on startAt/endAt PATCH
- Tournament: existing tournament service notifications
- Planner pages: `router.refresh()` after successful apply

## Human UAT scenarios (Preview)

| ID | Scenario |
|----|----------|
| A | Move FCA-managed training to another time |
| B | Move training to another date |
| C | Confirm pitch reservation follows with buffers |
| D | Attempt move causing resource conflict |
| E | Non-DnD **Termin ändern** |
| F | SFV match cannot be silently rescheduled |
| G | Unauthorized user cannot reschedule |
| H | Dashboard/calendar reflect change without stale personal data |

## Cross-package invariant (08-02)

Resource timeline manipulation (`timeTarget: resourceOccupancy`) must **not** call training `/reschedule` or mutate activity `startAt`/`endAt` on Standardplan.
