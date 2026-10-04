# SCE-PLANNER-UX-08-03 — Activity Rescheduling

**Status:** CLOSED

**Human UAT:** PASS (authenticated Vercel Preview, closure recorded 2026-10-04)

## Perspectives (canonical semantics)

| Perspective | Meaning |
|-------------|---------|
| **Kalender** | **Wann?** — sporting activity date/time |
| **Spielfeld** | **Wo?** — primary pitch/resource reservation window (08-02) |
| **Garderobe** | **Welche Nebenressourcen?** — supporting dressing-room reservation (08-02) |

**Hard invariant:** **RESOURCE RESERVATION TIME ≠ SPORTING ACTIVITY TIME**

Occupancy buffers (`occupancyBeforeMinutes` / `occupancyAfterMinutes`) stay on allocations; when activity time moves, effective reservation windows shift via `computeResourceOccupancyWindow` — relative buffers preserved (not overwritten with the activity interval).

Activity rescheduling mutates **activity time** only (`timeTarget: activity`). Resource timeline manipulation continues to mutate **resource occupancy** without changing Spielzeit/Trainingszeit unless explicitly in Alternativplan time overrides.

## Architecture

```
Kalender DnD / Termin ändern
  → SchedulerDraftChange (timeTarget: activity)
  → buildActivityRescheduleProposal + resource impact
  → POST /api/planning-hub/activity-rescheduling/validate
  → VON/NACH confirmation (Termin verschieben)
  → applyPlanningHubActivityRescheduleDraft
  → canonical persistence (training reschedule / match PATCH / tournament PATCH / plan time override)
  → read-model invalidation + router.refresh()
```

Core modules:

| Module | Role |
|--------|------|
| `lib/planning-hub/planning-activity-rescheduling.ts` | Authority, proposal, resource impact (buffers preserved on refs) |
| `lib/planning-hub/activity-rescheduling-mutations.ts` | Permission gate + unified apply |
| `app/api/planning-hub/activity-rescheduling/validate/route.ts` | Server authority + conflict revalidation |
| `components/admin/planning-hub/PlanningHubActivityScheduleEditDialog.tsx` | Non-DnD **Termin ändern** |
| `components/admin/planning-hub/PlanningHubManipulationConfirm.tsx` | VON/NACH + Spielfeld/Garderobe consequence lines |

## Mutation safety (closure review)

**Classification:** `SAFE_SINGLE_AUTHORITATIVE_WRITE`

`applyPlanningHubActivityRescheduleDraft` delegates to exactly one persistence path per apply:

| Context | Apply path | Writes |
|---------|------------|--------|
| Standardplan training | `PATCH /api/training-sessions/:id/reschedule` | Single occurrence override columns via `rescheduleTrainingSession` |
| Standardplan match (SCE-managed) | `PATCH /api/matchcenter/:id` (`startAt`/`endAt`) | Single authoritative match update |
| Standardplan tournament | `PATCH /api/tournaments/:id` | Single authoritative tournament update |
| Alternativplan | `PUT`/`DELETE` `/api/weekplanner/plans/:id/time-overrides` | Single plan time override row |

No chained independent client writes for activity-time moves. Dependent resource windows are **projected** from activity time + stored buffer minutes on read; they are not a second persistence step in the activity-reschedule apply path. Post-success `router.refresh()` and existing dashboard notify hooks are invalidation/refresh only.

08-03 does **not** introduce distributed pseudo-transactions from the browser.

## Authority

| Activity | Standardplan | Notes |
|----------|--------------|-------|
| Training | SCE_MANAGED | Single occurrence via `TrainingSession` override columns — series recurrence unchanged |
| Match MANUAL | SCE_MANAGED | `PATCH /api/matchcenter/[id]` startAt/endAt |
| Match SFV / import | PROVIDER_MANAGED | Read-only in Kalender; explanation in UX |
| Tournament | SCE_MANAGED | `PATCH /api/tournaments/[id]` |
| Veranstaltung | NOT_SUPPORTED (v1) | Out of package |
| Alternativplan | ALTERNATIVE_PLAN_ONLY | Plan time overrides |

## SFV / provider protection

Externally authoritative / SFV-managed matches cannot be silently rescheduled through the SCE activity rescheduling flow (`resolveActivityScheduleAuthority` + validate route).

## Resource impact behavior

Confirmation separates **sporting activity time** from **resource reservation / occupancy time**. Pitch and dressing-room consequences are visible before confirmation. Buffers on allocations are preserved when activity time moves.

## Conflict validation

Proposed activity reschedules that would create resource conflicts are detected server-side on validate; invalid state is not silently persisted.

## Recurring training boundary

Only **one TrainingSession occurrence** is rescheduled. `TrainingSeries` recurrence is never mutated (TRAININGCENTER-02). Series-wide shift deferred.

## Permissions

`canManageTrainings` / `canManageEvents` + plan context via `manipulation-capabilities.ts`. No role-name checks. APIs enforce `TRAININGS_MANAGE`, `EVENTS_MANAGE`, planning allocation permissions on validate. Unauthorized server mutation is rejected.

## Non-DnD accessibility

**Termin ändern** provides an accessible non-drag path through the same activity rescheduling workflow.

## Read-model propagation

- Training: `notifyPersonalDashboardForTrainingSession` (existing reschedule service)
- Match: `notifyPersonalDashboardForSportingEvent` on startAt/endAt PATCH
- Tournament: existing tournament service notifications
- Planner pages: `router.refresh()` after successful apply

Successful rescheduling propagates through relevant planning perspectives without manual data repair; activity/resource distinction remains intact.

## Human UAT evidence (Preview)

| ID | Scenario | Result |
|----|----------|--------|
| A | Training time move — activity vs reservation separation | **PASS** — e.g. Junioren F3 Training 17:15–18:45 → 16:00–17:30; Kunstrasen 2 A follows activity window; Garderobe E1 16:45–19:15 → 15:30–18:00 preserving −30/+30 occupancy buffer |
| B | Training date move with dependent reservations | **PASS** |
| C | Resource impact visible before confirm | **PASS** |
| D | Conflict protection | **PASS** |
| E | Non-DnD **Termin ändern** | **PASS** |
| F | SFV / external authority | **PASS** |
| G | Permission model | **PASS** |
| H | Propagation / freshness | **PASS** |

## Cross-package invariant (08-02)

Resource timeline manipulation (`timeTarget: resourceOccupancy`) must **not** call training `/reschedule` or mutate activity `startAt`/`endAt` on Standardplan.

## Delivery

- **PR:** #800 → STAGE
- **Feature HEAD (pre-merge):** `12d7a8704943b239e7cb10c18f6a4cb249862578`
- **STAGE base (08-03):** `1097b34ab12148d5fe788bb4356e811fe31c4f8c`
