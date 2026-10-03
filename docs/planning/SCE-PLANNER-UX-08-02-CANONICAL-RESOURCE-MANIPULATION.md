# SCE-PLANNER-UX-08-02 — Canonical Resource Manipulation

**Status:** R1 closure on branch `cursor/sce-planner-ux-08-02-canonical-resource-manipulation` — **Spielfeld Human UAT PASS** (Preview); merge to STAGE pending final gate sign-off (PR #798, draft).

## R1 closure (2026-10-03)

| Gate | Result |
|------|--------|
| Spielfeld Human UAT (Preview) | **PASS** — reservation vs Spielzeit invariant; VON/NACH confirmation; no silent activity reschedule |
| Garderobe regression (automated) | **PASS** — E1→E2, occupancy move/resize/combined, persistence, conflicts |
| Non-DnD `Planung ändern` | **PASS** — keyboard/focus, confirm/cancel, same draft pipeline |
| Collapsed pitch safety | **PASS** — `__collapsed__*` rejected; canonical ids on expanded lanes |
| Focused planning matrix | **PASS** — see CI / local `lib/planning-hub` + `components/admin/planning-hub` |
| Full-repo baseline vs STAGE | See R1 delivery `FULL_REPO_BASELINE` |
| Production build | Required before merge (`NODE_OPTIONS=--max-old-space-size=8192 npm run build`) |

### Human UAT evidence (Spielfeld)

Recorded scenarios A–G: reservation-time change, Gesamt/A/B segment moves, cross-pitch move, combined resource+time, pure horizontal reservation move, and confirmation UX (`Planung ändern` → VON/NACH → unchanged Spielzeit → conflict result → Abbrechen / Änderung übernehmen). No silent activity rescheduling; no new resource conflicts in tested paths.

### Presentation polish

Manipulation confirmation uses canonical segment semantics where available: `Kunstrasen 3 · Gesamt`, `· A`, `· B` (via `formatManipulationResourceLabel` / `PlanningResourceGroup` — not display-string guessing). Underlying `FacilityResource` names and ids unchanged.

### Environment backlog (not 08-02 scope)

**PREVIEW-SECURITY-01** — Vercel Preview URL flagged “Dangerous” in Chrome during Human UAT. Treat as environment/browser reputation until investigated separately; not evidence of application compromise; not an 08-02 merge blocker unless compromise is proven.

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

- **08-03 — Activity Rescheduling:** Kalender activity date/time/duration, impact analysis, external/SFV authority — **not implemented in 08-02**.

## Roadmap next

| Id | Package |
|----|---------|
| **08-03** | Activity Rescheduling → Kalender |
| **FACILITY-MODEL-01** | Site/pitch persistence and presentation follow-ups (optional Gesamt labelling already uses segment role where model provides it) |
