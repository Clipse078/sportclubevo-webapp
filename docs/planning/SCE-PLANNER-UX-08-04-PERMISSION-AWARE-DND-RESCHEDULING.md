# SCE-PLANNER-UX-08-04 — Permission-aware drag/drop & rescheduling

**Status:** CLOSED

**Human UAT:** PASS (authenticated FCA Club Admin, Vercel Preview — closure recorded 2026-10-04)

**Base:** STAGE `595cd1fbe95e999be9ad35f5483f5a0dcf9e8159` (08-01…08-03 merged)

**Feature HEAD (pre-merge):** `6bb79a5d3c5782355eea0a99dd8dac67e6006104`

**PR:** #801 → STAGE

## Package title & objectives

Harden the Planning Hub manipulation layer so every drag/drop, resize, reschedule, **Termin ändern**, and **Planung ändern** path is:

- capability-aware (UI)
- permission- and authority-aware
- server-enforced on validate + underlying mutation APIs
- consistent across Kalender / Spielfeld / Garderobe
- accessible without drag (non-DnD parity)
- safe when permissions change while the page is open (stale UI)
- tenant-scoped (payload IDs untrusted)

**Gap-closure only** — reuses 08-02 resource manipulation and 08-03 activity rescheduling; does not replace those pipelines.

## Boundaries

| In scope | Out of scope |
|----------|----------------|
| Domain split: activity time vs resource reservation permissions | 08-05 conflict resolution UX |
| Server gates on planning-hub validate routes | 08-07 responsive hardening |
| Stale-permission recovery (revert phantom optimistic state) | SCE-COLLAB-01 (planned, non-urgent) |
| Affordance consistency (no draggable UI without capability) | Rewriting 08-02/08-03 apply pipelines |
| Focused automated matrix + regression hooks | Full Human UAT repetition of 08-02/08-03 |
| Human UAT (Club Admin perspectives) | SCE-PLANNER-UX-AGGREGATION-01, SCE-PLANNER-UX-LIST-01 (discovered follow-ups) |

## Dependencies

- **08-01** — perspectives, URL state, shared manipulation provider
- **08-02** — resource timeline semantics (`timeTarget: resourceOccupancy`)
- **08-03** — activity rescheduling (`timeTarget: activity`), SFV authority
- **SCE-ACTIVITY-DESIGN-01E** — capabilities-only (no role-name checks)

## Deferred

- Undo snackbar («Änderung übernommen · Rückgängig») — roadmap 08+
- **SCE-COLLAB-01** — collaboration; not part of 08-04 — **PLANNED / NON-URGENT**

---

## Canonical contract (stored roadmap)

From [`SCE-PLANNER-UX-08-01-FOUNDATION.md`](./SCE-PLANNER-UX-08-01-FOUNDATION.md) and [`SCE-ACTIVITY-DESIGN-01.md`](../roadmap/SCE-ACTIVITY-DESIGN-01.md):

- **08-04** = Permission-aware drag/drop & rescheduling
- Permission-aware direct manipulation; server never trusts client; optimistic UI reconciles; no role-name authorization
- **Kalender** = sporting activity time; **Spielfeld/Garderobe** = resource reservation time (hard invariant preserved)

### Hard invariants (closure reconfirmed)

| Perspective | Domain |
|-------------|--------|
| **Kalender** | Sporting **activity time** |
| **Spielfeld** | Primary **resource reservation** |
| **Garderobe** | Supporting **resource reservation** |

**RESOURCE RESERVATION TIME ≠ SPORTING ACTIVITY TIME**

---

## Gap matrix (pre-implementation audit)

| Perspective | Interaction | 08-02/08-03 baseline | 08-04 gap |
|-------------|-------------|----------------------|-----------|
| Kalender | drag / resize / Termin ändern | COMPLETE pipeline | CLOSED → server domain gate + allocations-only UX |
| Spielfeld | resource DnD / Planung ändern | COMPLETE | CLOSED → validate route manage gate + allocations-only enable |
| Garderobe | same as Spielfeld | COMPLETE | CLOSED |
| Liste | explicit edit | NOT_APPLICABLE (no timeline DnD) | COMPLETE (unchanged) |
| All | stale permission | PARTIAL (API 403 only) | CLOSED → revert draft + refresh |
| All | tenant isolation on validate | MISSING | CLOSED |
| SFV match | activity move | COMPLETE (08-03) | COMPLETE (unchanged) |

---

## Capability model

Shared module: `lib/planning-hub/manipulation-server-authorization.ts`

| Flag | Activity time (Kalender) | Resource reservation (Spielfeld/Garderobe) |
|------|--------------------------|---------------------------------------------|
| `canManageTrainings` | Training | Training allocations |
| `canManageEvents` | Match/Tournament | Event allocations |
| `canManageAllocations` | — | All supported allocation types |

UI matrix: `getSchedulerManipulationCapabilities` in `manipulation-capabilities.ts` (uses actor flags + 08-03 authority for calendar).

Server: live effective permissions via `resolveLiveManipulationActorPermissions` on validate routes (not session cache).

---

## UI vs server

- Client capabilities = affordances only (cursor, handles, Termin/Planung actions).
- **POST** `/api/planning-hub/activity-rescheduling/validate` — activity drafts; tenant + activity-domain + authority.
- **POST** `/api/planning-hub/resource-manipulation/validate` — resource occupancy drafts; requires manage permissions; rejects activity drafts.
- Apply paths unchanged (training `/reschedule`, match PATCH, allocation APIs) — already permission-gated.

Stale permission: on 403 from validate/apply, confirmation and preview drafts cleared; `router.refresh()`; user message without permission keys.

---

## Regression invariants

- **08-02:** resource move/resize does not change activity `startAt`/`endAt` on Standardplan.
- **08-03:** activity move uses activity-time pipeline; buffers preserved; SFV provider-managed matches blocked.

---

## Human UAT evidence (Preview)

**HUMAN_UAT = PASS**

Manual authenticated Human UAT — **FCA Club Admin**:

| Area | Result | Notes |
|------|--------|-------|
| **Kalender** | **PASS** | Club Admin retains activity-time manipulation; **Termin verschieben** shows VON → NACH and resource consequences; activity time vs resource occupancy distinction visible |
| **Spielfeld** | **PASS** | **Planung ändern** allows reservation-time / resource changes; sporting activity time explicitly unchanged (e.g. Spielzeit 14:00–16:00 unverändert while reservation changed) |
| **Garderobe** | **PASS** | **Planung ändern** for dressing-room reservations; sporting activity time unchanged |
| **Liste** | **PASS** (functional) | Readable; substantial UX improvement captured as **SCE-PLANNER-UX-LIST-01** (not 08-04 blocker) |

**Kalender aggregation (non-blocker):** mixed cluster card vs inspector mismatch captured as **SCE-PLANNER-UX-AGGREGATION-01**.

### Not manually tested (this session)

- Sandra / read-only impersonation personas — **«Als Benutzer ansehen»** unavailable for Club Admin during this Human UAT (**PEOPLE-ACCESS-IMPERSONATION-01**).

**Reason:** impersonation flow not available in Human UAT environment; tracked separately; **not** an 08-04 authorization blocker because server / capability coverage exists.

### Automated / regression evidence (closure)

| Scenario | Result |
|----------|--------|
| Allocation-only manager (resources without activity-time mutation) | **PASS** |
| Read-only negative behavior | **PASS** |
| Stale permission / 403 recovery | **PASS** |
| Tenant isolation on validate | **PASS** |
| Provider / SFV authority | **PASS** |
| Training vs event domain separation | **PASS** |
| DnD and non-DnD equivalent authorization semantics | **PASS** |
| No role-name-string authorization | **PASS** |
| UI capability checks ≠ security authority | **PASS** (server validate + apply gates) |

---

## Discovered roadmap follow-ups (08-04 closure)

| Id | Status |
|----|--------|
| **SCE-PLANNER-UX-AGGREGATION-01** — Mixed Activity Cluster Presentation | **PLANNED** — [`SCE-PLANNER-UX-AGGREGATION-01-MIXED-ACTIVITY-CLUSTER-PRESENTATION.md`](./SCE-PLANNER-UX-AGGREGATION-01-MIXED-ACTIVITY-CLUSTER-PRESENTATION.md) |
| **SCE-PLANNER-UX-LIST-01** — Operational List Experience | **PLANNED** — [`SCE-PLANNER-UX-LIST-01-OPERATIONAL-LIST-EXPERIENCE.md`](./SCE-PLANNER-UX-LIST-01-OPERATIONAL-LIST-EXPERIENCE.md) |
| **PEOPLE-ACCESS-IMPERSONATION-01** — Club Admin impersonation availability | **OPEN / SEPARATE** — [`PEOPLE-ACCESS-IMPERSONATION-01-CLUB-ADMIN-IMPERSONATION.md`](./PEOPLE-ACCESS-IMPERSONATION-01-CLUB-ADMIN-IMPERSONATION.md) |
| **SCE-COLLAB-01** | **PLANNED / NON-URGENT** (unchanged) |

---

## Tests

- `lib/planning-hub/__tests__/sce-planner-ux-08-04-permission-aware-manipulation.test.ts`
- `app/api/planning-hub/activity-rescheduling/validate/__tests__/route.test.ts`
- `app/api/planning-hub/resource-manipulation/validate/__tests__/route.test.ts`
- Regression: 08-02 / 08-03 planning-hub suites (see closure test matrix in delivery report)

---

## Performance

No per-card permission API calls. Actor flags computed once per planner page load; validate uses one live resolver call per confirm (acceptable at mutation boundary).
