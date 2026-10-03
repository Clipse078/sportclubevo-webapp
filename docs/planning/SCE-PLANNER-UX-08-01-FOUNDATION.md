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

## R1 — compact control & resource hierarchy (Human UAT refinement)

- Compact planner toolbar: perspectives + resource scope (row 1); primary filters + **Ansicht** popover for visible time (row 2).
- `planning-resource-groups.ts` — presentation grouping only (FULL_PITCH + HALF_PITCH under facility record; dressing flat).
- `PlanningHubResourceScopeControl` — physical pitch chips for small tenants; searchable popover summary for medium/large (no endless chip strip).
- Resource timeline lane labels: primary physical pitch + subordinate segment rows (A/B/Gesamt). Drag/drop still uses canonical `resourceId`.

### FACILITY-MODEL-01 gap (documented, not fabricated)

- **Site → physical pitch → segment** is only as strong as tenant facility records: FCA uses one facility row per physical pitch (Hauptplatz, Kunstrasen 2, …) with FULL/HALF resources inside.
- Multi-pitch **sites** (e.g. “Im Brüel” spanning several pitches) are not a first-class entity in the current model; facility filter uses facility ids from catalog, not invented parent sites.

## Roadmap decomposition (08)

| Package | Focus |
|---------|--------|
| 08-01 | Foundation + R1 compact cockpit (this branch) |
| 08-02 | Resource hierarchy & facility navigation refinement |
| 08-03 | Operational conflict workflow |
| 08-04 | Drag/drop & manipulation hardening |
| 08-05 | Planning density / responsive optimization |
| 08-06 | Operational list excellence |
| 08-07 | Planning performance / large-tenant optimization |
| 08-08 | Final planning polish / acceptance |

**Dependencies (unchanged):** SCE-ACTIVITY-DESIGN-01E, ACTIVITY-DESIGN-02, FACILITY-MODEL-01, STATUS-DESIGN-01, PERFORMANCE-INFRA-01, BUILD-PERF.
