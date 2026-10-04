# SCE-PLANNER-UX-08-04 — Permission-aware drag/drop & rescheduling

**Status:** IN PROGRESS (engineering + automated gates; Human UAT not yet run)

**Base:** STAGE `595cd1fbe95e999be9ad35f5483f5a0dcf9e8159` (08-01…08-03 merged)

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

## Dependencies

- **08-01** — perspectives, URL state, shared manipulation provider
- **08-02** — resource timeline semantics (`timeTarget: resourceOccupancy`)
- **08-03** — activity rescheduling (`timeTarget: activity`), SFV authority
- **SCE-ACTIVITY-DESIGN-01E** — capabilities-only (no role-name checks)

## Deferred

- Undo snackbar (“Änderung übernommen · Rückgängig”) — roadmap 08+
- **SCE-COLLAB-01** — collaboration; not part of 08-04

---

## Canonical contract (stored roadmap)

From [`SCE-PLANNER-UX-08-01-FOUNDATION.md`](./SCE-PLANNER-UX-08-01-FOUNDATION.md) and [`SCE-ACTIVITY-DESIGN-01.md`](../roadmap/SCE-ACTIVITY-DESIGN-01.md):

- **08-04** = Permission-aware drag/drop & rescheduling
- Permission-aware direct manipulation; server never trusts client; optimistic UI reconciles; no role-name authorization
- **Kalender** = sporting activity time; **Spielfeld/Garderobe** = resource reservation time (hard invariant preserved)

---

## Gap matrix (pre-implementation audit)

| Perspective | Interaction | 08-02/08-03 baseline | 08-04 gap |
|-------------|-------------|----------------------|-----------|
| Kalender | drag / resize / Termin ändern | COMPLETE pipeline | PARTIAL → server domain gate + allocations-only UX |
| Spielfeld | resource DnD / Planung ändern | COMPLETE | PARTIAL → validate route manage gate + allocations-only enable |
| Garderobe | same as Spielfeld | COMPLETE | same |
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

## Human UAT plan (permission-focused)

| ID | Actor | Expect |
|----|-------|--------|
| A | Club admin | Authorized Kalender/Spielfeld/Garderobe operations |
| B | Spielbetrieb koordinator | Effective permissions only (no extra admin powers) |
| C | Read-only | View; no DnD/resize/Termin/Planung; API rejected |
| D | SFV match | Non-reschedulable despite other privileges |
| E | Read-only | Activity Detail still opens |
| F | Authorized | Non-DnD equivalent to DnD |
| G | Any | Rejected mutation leaves no phantom card position |

**HUMAN_UAT:** NOT YET PASSED

---

## Tests

- `lib/planning-hub/__tests__/sce-planner-ux-08-04-permission-aware-manipulation.test.ts`
- Validate route tests under `app/api/planning-hub/*/validate/__tests__/`
- Regression: existing 08-02 / 08-03 planning-hub test suites

---

## Performance

No per-card permission API calls. Actor flags computed once per planner page load; validate uses one live resolver call per confirm (acceptable at mutation boundary).
