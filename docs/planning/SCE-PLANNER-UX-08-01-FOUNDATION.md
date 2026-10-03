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

## R2 — collapsible physical pitch groups (Human UAT refinement)

- Default **Spielfeld → Alle**: one compact row per physical pitch (facility record); Gesamt/A/B segments are **collapsed** behind disclosure.
- **Collapsed overview** still renders child-segment allocations on the parent row (segment hint prefix on blocks); conflicts surface in the group summary (`1 Konflikt`, …).
- **Expanded** group: header + subordinate segment lanes (Gesamt, A, B). Drag/drop targets remain canonical `resourceId` on segment rows only — no ambiguous drops on collapsed parent.
- Selecting one physical pitch via `resFilter` (whole group ids) **auto-expands** that group.
- Dressing / Kalender unchanged from R1.

### FCA — Hauptfeld vs Hauptplatz (FACILITY-MODEL-01 finding)

| Source | Facility.name | Resource codes | Notes |
|--------|---------------|----------------|-------|
| **Current `prisma/seed.ts` (canonical target)** | Hauptplatz, Kunstrasen 2, Kunstrasen 3 | `STADION`, `STADION_A/B`, `KUNSTRASEN_*` | Three physical pitch **facility** rows; one FULL + two HALF resources each. |
| **Legacy / infoboard Screen-2 resolver** | Often labelled **Hauptfeld** in UI copy | Primary `HAUPTFELD`, `HAUPTFELD A/B`; legacy fallback `STADION*` | Same physical Brüelstadion pitch; resolver treats HAUPTFELD and STADION as **mutually ambiguous** if both exist. |
| **STAGE UAT observation (four pitches)** | Hauptfeld **and** Hauptplatz both visible | Typically separate `Facility` rows when legacy HAUPTFELD facility was created before seed migration to Hauptplatz | **Not** a fourth physical pitch — duplicate canonical facility records for one site. UI must show four groups if four facilities exist; consolidation requires **FACILITY-MODEL-01 migration** (merge facility, re-point allocations, retire duplicate codes), not tenant string hacks. |

**Migration implications (future FACILITY-MODEL-01):** pick one facility name/code set per physical pitch; merge duplicate facility ids; map `HAUPTFELD*` allocations to surviving `STADION*` (or vice versa) with audit; enforce single FULL_PITCH per physical pitch at site level.

## R1 — compact control & resource hierarchy (Human UAT refinement)

- Compact planner toolbar: perspectives + resource scope (row 1); primary filters + **Ansicht** popover for visible time (row 2).
- `planning-resource-groups.ts` — presentation grouping only (FULL_PITCH + HALF_PITCH under facility record; dressing flat).
- `PlanningHubResourceScopeControl` — physical pitch chips for small tenants; searchable popover summary for medium/large (no endless chip strip).
- Resource timeline lane labels: primary physical pitch + subordinate segment rows (A/B/Gesamt). Drag/drop still uses canonical `resourceId`.

### FACILITY-MODEL-01 gap (documented, not fabricated)

- **Site → physical pitch → segment** is only as strong as tenant facility records: FCA target seed uses one facility row per physical pitch (Hauptplatz, Kunstrasen 2, …) with FULL/HALF resources inside.
- **Duplicate physical pitch facilities** (Hauptfeld + Hauptplatz) can appear when legacy HAUPTFELD-coded rows coexist with seeded STADION rows — see R2 table above.
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
