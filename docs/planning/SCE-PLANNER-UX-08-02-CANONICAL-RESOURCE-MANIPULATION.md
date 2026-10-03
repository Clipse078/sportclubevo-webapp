# SCE-PLANNER-UX-08-02 — Canonical Resource Manipulation

**Status:** Implementation on branch `cursor/sce-planner-ux-08-02-canonical-resource-manipulation` — **Human UAT not yet passed.**

## Architecture

Shared pipeline for **Spielfeld** and **Garderobe** resource timelines:

```
DIRECT MANIPULATION (DnD or Planung ändern)
  → PROPOSED MUTATION (SchedulerDraftChange / PlanningResourceManipulation)
  → IMPACT / CONFLICT VALIDATION (server route + client preview)
  → USER CONFIRMATION (Planung ändern — VON/NACH + unchanged activity time)
  → SERVER-AUTHORITATIVE MUTATION
  → SUCCESS / ERROR RECOVERY
```

Core modules:

| Module | Role |
|--------|------|
| `lib/planning-hub/planning-resource-manipulation.ts` | Canonical kinds (`PITCH`, `DRESSING_ROOM`, …), mutation types, collapsed-row guard |
| `lib/planning-hub/manipulation-capabilities.ts` | Capability matrix by **surface** (`kalender` vs `resourceTimeline`) |
| `lib/planning-hub/scheduler/resource-segment-display.ts` | Reservation window from `WeekplannerResourceRef` occupancy |
| `lib/planning-hub/manipulation-projection.ts` | Draft projection + conflict preview |
| `components/admin/planning-hub/PlanningHubManipulationContext.tsx` | Pointer sessions, confirm, accessible editor |
| `app/api/planning-hub/resource-manipulation/validate/route.ts` | Server-side conflict preview |

## Resource time vs activity time

On **resource timelines**, horizontal move/resize changes the **reservation window** (`timeTarget: resourceOccupancy`). Sporting activity start/end (`item.startAt` / `item.endAt`) stay unchanged in projection and confirmation copy (e.g. *Trainingszeit … unverändert*, *Spielzeit … unverändert*).

**Kalender** remains activity scheduling → **SCE-PLANNER-UX-08-03** (no activity DnD expansion in 08-02).

## Supported resource kinds

- `PITCH` — Spielfeld perspective
- `DRESSING_ROOM` — Garderobe perspective
- `HALL`, `ROOM`, `OTHER_RESOURCE` — reserved identifiers for future physical resources

## Permissions

Capabilities only (`canManageTrainings` / `canManageEvents` + plan context). No role-name checks. Unauthorized users see no drag/resize/edit affordances; APIs remain authoritative.

## Pitch hierarchy

- Drops on synthetic collapsed overview ids (`__collapsed__*`) are ignored.
- Valid targets are canonical `FacilityResource` ids on expanded segment lanes (08-01 disclosure preserved).

## Persistence notes (FACILITY-MODEL-01)

- **Garderobe (Standardplan):** session/event dressing occupancy APIs (unchanged).
- **Spielfeld reservation interval (Standardplan):** end-only match operational end override where applicable; reservation **start** before kickoff / training pitch buffers on Standardplan require **Alternativplan** allocation occupancy (documented limitation until dedicated pitch occupancy persistence lands).
- **Alternativplan:** pitch and dressing occupancy buffers stored on `WeekplannerPlanAllocation` rows.

Whole/half pitch compatibility continues to use existing conflict detection; no invented parent/child schema in 08-02.

## Accessibility

- **Planung ändern** on resource blocks opens the same proposal → confirm → mutate pipeline (keyboard/focus-friendly dialog).

## Explicit boundary

- **08-03:** Kalender activity rescheduling, notifications, SFV authority workflows — out of scope for 08-02.
