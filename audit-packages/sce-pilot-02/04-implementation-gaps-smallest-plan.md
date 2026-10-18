# SCE-PILOT-02 — Kleinster Implementierungsplan (bestätigte Lücken)

Read-only audit — **no code changes in this package**. Ordered by minimum scope to unblock safe pilot role assignment.

---

## 1. Allocation-only permission split (blocker for Sandra)

**Problem:** Weekplanner writes require `trainings.manage` OR `events.manage` (`app/api/weekplanner/plans/[planId]/allocations/route.ts`). `trainings.manage` also gates TrainingCenter mutation APIs (`reschedule`, series submit, session PATCH, …).

**Smallest change:**
1. Add DB permission rows (seed + reconciliation script pattern):
   - `planning.allocations.view` (PermissionModule.PLANNING or TRAININGS)
   - `planning.allocations.manage`
2. Extend `PERMISSIONS` in `lib/permissions/permissions.ts`.
3. Replace `MANAGE_PERMISSIONS` on allocation routes only (weekplanner + training-session allocations + legacy `wochenplan/[eventId]/allocation`) to accept `planning.allocations.manage` alongside existing keys (backward compatible).
4. Planner page: set `canManagePlans` / override editors from **allocation manage**, not full `trainings.manage`.
5. TrainingCenter routes: **do not** add new key to series/session manage endpoints.

**Validation:** API tests denying `trainings.manage`-only on series reschedule; allowing allocation POST with `planning.allocations.manage` only.

---

## 2. Wochenplan publication decoupling (blocker if Sandra must not publish)

**Problem:** `wochenplan.manage` authorizes `POST /api/wochenplan/publish`.

**Smallest change:**
- Split: keep `wochenplan.manage` for publication **or** introduce `wochenplan.publication.manage` used only by publish route + UI publish bar.
- Allocation PATCH keeps narrower key from §1.

---

## 3. Match record allocation UI (optional path)

**Problem:** Match detail uses `canManageMappings = events.manage` only.

**Smallest change:** Allow `planning.allocations.manage` OR `wochenplan.manage` to enable operational allocation section read/write (without event metadata edits).

---

## 4. Read-only publishing & infoboard (blocker for Patrick CMS/Infoboard scope)

**Problem:** Nav requires `news.manage` / `website.manage` / `infoboard.manage` / `events.publish_infoboard`.

**Smallest change:**
1. Add `news.view`, `website.view`, `infoboard.view` permission rows.
2. Nav-config: preview/read routes accept view keys; manage routes unchanged.
3. API routes for list/preview GET: `requireAnyPermission([*.view, *.manage])`.
4. PublishingCenter remains manage-only.

**Fallback without implementation:** Pilot reads news on public website only; skip in-app Publizieren/Infoboard admin.

---

## 5. Vereinsleitung & demo routes (navigation + security)

**Problem:** Nav items without `permissionKeys` are visible to all authenticated users; demo finance/material pages are reachable.

**Smallest change:**
1. Add `permissionKeys` to Führung nav entries (e.g. `targets.view` / existing strategic keys, or dedicated `vereinsleitung.view` if product wants separation).
2. Route guards on `/vereinsleitung/finanzen`, `/material`, `/prozesse` → redirect or 404 unless platform admin flag **or** hide via feature flag `PILOT_HIDE_DEMO_LEADERSHIP=1` (tenant-scoped config preferred over email checks).

**Pilot workaround (no code):** Do not communicate demo URLs; accept direct-link risk until §5 ships.

---

## 6. Navigation & widget filtering (feature readiness, not RBAC)

**Mechanism:** Existing `getVisibleNavSections` + dashboard quick-access catalog (`lib/dashboard/quick-access/build-catalog.ts`) — permission-driven, no per-email hacks.

**Action:** After role keys finalized, verify explorer/mobile domain lists for zero orphan manage links.

---

## 7. Server authorization checklist (post-implementation)

| Area | Files to touch |
|------|----------------|
| Weekplanner allocations | `app/api/weekplanner/plans/**/allocations/**` |
| Training allocations | `app/api/training-sessions/**/allocations/**` |
| Legacy match allocation | `app/api/wochenplan/[eventId]/allocation/route.ts` |
| Availability read | `app/api/facilities/availability/route.ts` (add `planning.allocations.view`) |
| Planner UI flags | `app/(admin)/dashboard/planner/week/page.tsx`, `PlannerWeekDataSection` |
| Role editor metadata | `lib/roles/permission-metadata.ts` |

---

## 8. Validation before assign roles

1. Automated: extend `lib/permissions/__tests__/security-01k-live-authorization.test.ts` pattern for new keys.
2. STAGE: two test users with proposed roles — attempt forbidden APIs (event POST, training reschedule, wochenplan publish) → expect 403.
3. Manual: Wochenplaner allocation happy path + conflict display (authenticated session on STAGE).

---

## Out of scope (deferred per user)

- Performance work (PR #773 merged — no further perf tasks here)
- PROD setup
- Creating roles, memberships, invitations in this audit
