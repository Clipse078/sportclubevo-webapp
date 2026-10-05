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

## Planner manipulation architecture (canonical product decision — R4)

**Core principle:** Direct manipulation is allowed where the visual perspective clearly represents the domain property being changed. Kalender, Spielfeld, and Garderobe share **canonical Planner manipulation infrastructure** but have **different mutation semantics** — not three unrelated drag-and-drop systems.

| Perspective | Domain question | Mutation class (future packages) |
|-------------|-----------------|----------------------------------|
| **Kalender** | *Wann findet es statt?* — activity scheduling | **Activity rescheduling** → **SCE-PLANNER-UX-08-03** |
| **Spielfeld** | *Wo findet es statt?* — primary physical-resource allocation | **Resource manipulation** → **SCE-PLANNER-UX-08-02** |
| **Garderobe** | *Welche Nebenressourcen werden benötigt?* — supporting-resource allocation | **Resource manipulation** → **SCE-PLANNER-UX-08-02** (proven first in Garderobe on this branch) |
| **Liste** | High-density operational list | Explicit edit actions; no timeline DnD |

**08-01 scope (PR #797):** foundation perspectives, URL/state, adaptive timelines, pitch grouping/disclosure, **existing Garderobe resource manipulation**, conflict presentation, capabilities-gated UI — **not** generalized Spielfeld DnD or Kalender activity reschedule (08-02 / 08-03).

### Shared manipulation flow (architecture target for 08-02 / 08-03)

```
DIRECT MANIPULATION
  → PROPOSED MUTATION
  → IMPACT / CONFLICT VALIDATION (server-authoritative)
  → USER CONFIRMATION
  → SERVER-AUTHORITATIVE MUTATION
  → SUCCESS / ERROR RECOVERY
```

Reuse Garderobe interaction language (e.g. **Planung ändern**, VON/NACH, unchanged activity time line, conflict summary, Abbrechen / Änderung übernehmen).

### Resource vs activity time (08-02)

Resource allocation time and sporting-activity time are **separate concepts**. Moving or resizing a pitch or Garderobe reservation must **not** silently change training time, match kickoff, tournament time, or event time unless a future explicitly confirmed workflow requests activity mutation.

Resource mutations may change: `facilityResourceId`, allocation/reservation start, allocation/reservation end.

### Activity rescheduling (08-03)

Calendar manipulation is **not** merely resource manipulation. Kalender horizontal/day movement changes activity date; vertical/time movement changes activity start; resize changes duration/end where permitted. Requires **impact analysis** before mutation (allocations, participants, authority, notifications, read models, etc.) — see package 08-03 below.

### Permissions, affordances, conflicts, undo

- **Capabilities only** — no role-name-string authorization; UI visibility ≠ authorization; coordinate with **SCE-ACTIVITY-DESIGN-01E**.
- **Affordances:** clean block by default; subtle grab/resize on hover/focus; accessible **Planung ändern**; keyboard-equivalent workflow — DnD never the only path.
- **Conflict validation:** server-authoritative; client visualization is never authoritative.
- **Undo / recovery:** lightweight confirmation and safe optimistic UI where appropriate; short-lived “Änderung übernommen · Rückgängig” is a **future** requirement (not 08-01).

### External / SFV authority (08-03)

Distinguish SCE-owned, imported, synchronized, and read-only authoritative activities. 08-03 defines allowed / overridable / proposal-only / blocked actions — never silent divergence from authoritative external fixtures.

**Current branch mutations:** server-authoritative via `canonical-planning-mutations` / `operational-planning-mutations`; UI gates from `manipulation-capabilities.ts`.

## R3 — Human-UAT closure (hierarchy, disclosure, invariants)

- **Expanded pitch hierarchy:** group header stays semibold; Gesamt/A/B lanes use segment styling (indent, muted type, subtle surface) without increasing row height.
- **Disclosure hardening:** manual expand/collapse resets on day change and pitch↔garderobe category change; `resFilter` auto-expands every physical group touched by the filter (including multi-pitch subsets); manual collapse yields to scope auto-expand.
- **Collapsed overview:** child-segment activities remain on the synthetic overview row with `Gesamt ·` / `A ·` / `B ·` hints; no DnD drop target on `__collapsed__*` ids (mutations still use canonical segment ids on expanded lanes).
- **Tests:** R3 matrix in `PlanningHubResourcePitchGroupsR3.test.tsx` + extended `pitch-group-disclosure.test.ts`.

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

**Migration implications (future FACILITY-MODEL-01):** pick one facility name/code set per physical pitch; merge duplicate facility ids; map `HAUPTFELD*` allocations to surviving `STADION*` (or vice versa) with audit; enforce single FULL_PITCH per physical pitch at site level; **inspect actual STAGE data before mutation**; re-point existing training/event/weekplanner/infoboard allocations safely; retire duplicate resources only after reference migration and verification.

**Observed FCA Human UAT (R2/R3):** Hauptfeld and Hauptplatz simultaneously appear as separate physical pitch groups — consolidation is **FACILITY-MODEL-01**, not planner UI aliasing.

### Canonical location presentation (Matchcenter / management)

| Observation | Diagnosis | R3 action |
|-------------|-----------|-----------|
| `FC Allschwil - Im Brüel, Allschwil, - 3` | `Event.location` / SFV `playgroundName` stored verbatim; compact line is `tenantClub - venueName` (`formatSportingActivityCompactAgendaClubLocationLine`) — trailing `, - 3` is import tail artifact, not a separate formatter field | Generic presentation sanitizer strips trailing `, - <digits>` in `sanitizeImportedVenuePresentation`; full canonical site/address model remains **FACILITY-MODEL-01** |

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
| **08-01** | Unified Planning Foundation — Kalender / Spielfeld / Garderobe / Liste, URL state, adaptive timelines, pitch hierarchy & disclosure, Garderobe manipulation, conflicts, a11y/responsive foundation (**PR #797**, this branch) |
| **08-02** | **Canonical Resource Manipulation** — see [`SCE-PLANNER-UX-08-02-CANONICAL-RESOURCE-MANIPULATION.md`](./SCE-PLANNER-UX-08-02-CANONICAL-RESOURCE-MANIPULATION.md) |
| **SCE-ICONS-02** | **Premium Navigation Icons** — Club (shield v1) + Spiele (VS circle v4); ASAP after 08-02, before 08-03 — see [`SCE-ICONS-02-PREMIUM-NAVIGATION-ICONS.md`](../roadmap/SCE-ICONS-02-PREMIUM-NAVIGATION-ICONS.md) |
| **08-03** | **Activity Rescheduling** — primarily Kalender; activity date/time/duration semantics; impact-aware confirmation (allocations, teams, trainers, authority, comms, Infoboard, Dashboard, SFV sync); not silent dependent propagation |
| **08-04** | Permission-aware drag/drop & rescheduling — **CLOSED** (see dedicated doc) |
| **08-05** | Conflict resolution & operational actions — **CLOSED** (PR #802 → STAGE) — [`SCE-PLANNER-UX-08-05-CONFLICT-RESOLUTION-OPERATIONAL-ACTIONS.md`](./SCE-PLANNER-UX-08-05-CONFLICT-RESOLUTION-OPERATIONAL-ACTIONS.md) |
| **08-06** | List / search / bulk operational UX |
| **08-07** | Responsive / tablet hardening |
| **08-08** | Integration / Human UAT / release hardening |

Detail for **08-02** and **08-03** is canonical in this document (R4); **08-04…08-08** meanings match [`docs/roadmap/SCE-ACTIVITY-DESIGN-01.md`](../roadmap/SCE-ACTIVITY-DESIGN-01.md) and are unchanged by R4.

**Product principle:** The planner is an **operational cockpit** — optimise scanability, conflicts, resources, and manipulation; do not reproduce consumer Mein Programm density.

## SCE-PLANNER-UX-08-02 — Canonical Resource Manipulation (roadmap)

**Purpose:** Generalize the resource manipulation model already proven by Garderobe on 08-01. Applies initially to **Spielfeld** and **Garderobe**; designed for future physical resources (pitches, halls, rooms, referee rooms, meeting rooms, other allocatable club resources).

**Canonical semantics (resource timeline):**

| Gesture | Effect |
|---------|--------|
| Horizontal move | Reservation time shift; duration preserved |
| Vertical move | `FacilityResource` allocation change |
| Resize start/end | Reservation start/end change |

**Example confirmation copy (reuse Garderobe patterns):**

> Planung ändern  
> VON Kunstrasen 3 A · Reserviert 17:00–18:30  
> NACH Kunstrasen 2 B · Reserviert 17:15–18:45  
> Trainingszeit 17:00–18:30 unverändert  
> ✓ Keine neuen Ressourcenkonflikte  

**Architecture target:** `PlanningResourceManipulation` with resource classes `PITCH`, `DRESSING_ROOM`, `HALL`, `ROOM`, `OTHER_RESOURCE`. Introduce shared abstraction in 08-02 only where it falls out naturally — not required in 08-01/R4.

**Conflict checks (resource):** overlap, incompatible whole/half pitch allocation, team overlap where relevant, facility availability, reservation constraints.

---

## SCE-PLANNER-UX-08-03 — Activity Rescheduling (roadmap)

**Purpose:** Kalender-first **sporting activity** reschedule — more consequential than resource allocation moves.

| Gesture | Effect |
|---------|--------|
| Horizontal / day | Activity date |
| Vertical / time | Activity start time |
| Resize | Activity duration/end where type permits |

**Impact layer (required before mutation):** canonical activity date/time; pitch and dressing-room allocations; other reservations; meeting/arrival; participant availability; team/trainer conflicts; notifications; Infoboard; public presentation; Mein Programm / calendar projections; imported SFV authority; sync state.

**Example interaction concept (08-03 implementation):**

> Spiel verschieben — 2. Mannschaft vs FC Bubendorf  
> VON So. 04.10.2026 14:00–16:00  
> NACH So. 04.10.2026 15:00–17:00  
> AUSWIRKUNGEN: Spielzeit geändert; Spielfeld-/Garderobenreservation prüfen; …  
> [Abbrechen] [Änderung prüfen]

**Authority:** For externally authoritative/imported activities, 08-03 defines allowed, locally overridable, proposal-only, and blocked/read-only actions — no silent divergence from authoritative fixtures.

---

## R4 — roadmap capture & closure (no scope expansion)

- Documented canonical manipulation architecture and 08-02 / 08-03 packages (this file + activity-design roadmap).
- **PR #797** remains **08-01 only** — no Kalender/Spielfeld DnD expansion, no 08-02/08-03 implementation, no merge, no PROD.
- **Human UAT** on Preview: required before final closure; not substituted by automated regression.
- **FACILITY-MODEL-01** boundary unchanged — no Hauptfeld/Hauptplatz merge in #797.

**Related packages (explicit backlog):**

| Id | Scope |
|----|--------|
| **SCE-ACTIVITY-DESIGN-01E** | Permission & navigation hardening |
| **ACTIVITY-DESIGN-02** | Management card composition (Trainings, Matchcenter, Tournamentcenter, Veranstaltungen): information grids, horizontal space, role-aware primary actions, context density |
| **FACILITY-MODEL-01** | Site → physical pitch → segment; Hauptfeld/Hauptplatz consolidation; HAUPTFELD*/STADION* migration; safe allocation re-pointing; canonical location presentation; malformed tails like `Allschwil, - 3`; no fabricated hierarchy |
| **STATUS-DESIGN-01** | Separate activity identity colours from operational status semantics |
| **PERFORMANCE-INFRA-01** | Vercel ↔ Neon runtime/latency verification |
| **BUILD-PERF** | Default `npm run build` memory / OOM |
| **SCE-PLANNER-UX-AGGREGATION-01** | Mixed activity cluster presentation (08-04 UAT discovery) — PLANNED |
| **SCE-PLANNER-UX-LIST-01** | Operational list experience (08-04 UAT discovery) — PLANNED |
| **PEOPLE-ACCESS-IMPERSONATION-01** | Club Admin impersonation availability (08-04 UAT observation) — OPEN / SEPARATE |
