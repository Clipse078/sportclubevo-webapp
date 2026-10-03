# SCE-PLANNER-UX-08-01 — Unified Planning & Allocation Workspace Foundation

## State model

- **Single workspace** at `/dashboard/planner/week` with URL-backed shared context.
- **Perspectives:** `kalender` (default) · `spielfeld` · `garderobe` · `liste` via `ansicht`.
- **Legacy:** `ansicht=ressourcen` + optional `ressource=garderobe` maps to Spielfeld / Garderobe.
- **Shared across perspectives:** `week`, `typ`, `team`, `facility`, `konflikte`, `plan`, `zeit` (Kalender), `day` (resource timelines), `resFilter` (resource subset).
- **`resourceCategory`** is derived from perspective for segment/mutation code paths (not a separate user mode).

## Resource timeline scalability

- `lib/planning-hub/resource-timeline/adaptive-lanes.ts` merges tenant facility catalog with day segments.
- Facility grouping, minimum label width (148px), horizontal scroll, optional `resFilter` subset.
- Scale fixtures: small / medium / large club in `scale-fixtures.ts` + component tests.

## Drag / drop contract (foundation)

| Surface | Vertical | Horizontal / lane |
|---------|----------|-------------------|
| Kalender | Time change | Day change where supported |
| Spielfeld | Time change | Pitch/resource allocation |
| Garderobe | Occupancy time | Dressing-room allocation |
| Liste | — | Explicit edit actions only |

All mutations remain **server-authoritative** via existing `canonical-planning-mutations` / `operational-planning-mutations`. UI capabilities from `manipulation-capabilities.ts` (TRAININGS_MANAGE / EVENTS_MANAGE / plan overrides).

## Roadmap decomposition (08)

| Package | Focus |
|---------|--------|
| 08-01 | Foundation (this) |
| 08-02 | Spielfeld resource planning depth |
| 08-03 | Garderobe allocation semantics (Heim/Gast) |
| 08-04 | Permission-aware drag/drop hardening |
| 08-05 | Conflict resolution & operational actions |
| 08-06 | List / search / bulk UX |
| 08-07 | Responsive / tablet hardening |
| 08-08 | Integration / Human UAT / release |

**Dependencies (unchanged):** SCE-ACTIVITY-DESIGN-01E, 02, FACILITY-MODEL-01, SCE-STATUS-DESIGN-01, SCE-ACTIVITY-COLOR-01, PERFORMANCE-INFRA-01, BUILD-PERF.
