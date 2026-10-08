# PEOPLE-ACCESS-IMPERSONATION-01 — Club Admin impersonation (01R2)

**Status:** IMPLEMENTED / HUMAN_UAT_PENDING  
**Baseline STAGE:** `84c5e7acdce92d9efd256bf9b0ca1939ad101d27`  
**Implementation branch:** `cursor/people-access-impersonation-01-complete-ce84`  
**Historic PR #779:** MERGED (contained on STAGE — do not reopen)

This document reconciles diagnosis (01R1 / draft PR #807) with the 01R2 hardening delivery on current STAGE.

---

## Identity model (real vs effective)

| Concept | Source |
|---------|--------|
| **REAL ACTOR** | JWT `sub` / `session.user.actorUserId` |
| **EFFECTIVE ACTOR** | `session.user.id`, `effectiveUserId`, `permissionKeys` while impersonating |
| **ACTIVE TENANT (impersonation)** | **Pinned to REAL actor's active tenant** — never the target's default membership |
| **API authorization** | Live `EffectivePermissionResolver` on **effective** user + pinned tenant |
| **UI fast path** | JWT `permissionKeys`; refreshed on impersonation JWT callbacks and trusted `refreshEffectiveUserSession` |

Canonical modules:

- `lib/auth/trusted-session-state.ts` — trusted start/stop/refresh, tenant pin, live impersonation sync
- `lib/auth/session-context.ts` — `resolveSessionUserForTenant()` for pinned tenant assembly
- `lib/permissions/require-api-actor-tenant-permission.ts` — start API uses **real actor**
- `lib/admin/users/tenant-impersonation.ts` — membership gate + live actor permission helper
- `app/api/users/[userId]/impersonate/route.ts` — start (tenant Club Admin)
- `app/api/auth/stop-impersonation/route.ts` — exit (actor-based)

---

## 01R2 fixes

### P0-IMP-01 — Tenant pin (FIXED)

**Invariant:** impersonation never changes the real actor's active tenant.

At start:

1. `pinnedTenantId` = actor JWT `activeTenantId`
2. Target validated under `pinnedTenantId` (`assertCanImpersonateTenantMember`)
3. Session built via `resolveSessionUserForTenant(targetUserId, pinnedTenantId)`
4. `availableTenants` preserved from actor JWT (no target-driven tenant switch)

Tests: `trusted-session-state.test.ts` (multi-tenant pin), `session-context.test.ts` (`resolveSessionUserForTenant`).

### P1-IMP-01 — Actor-scoped start authorization (FIXED)

`POST /api/users/[userId]/impersonate` uses `requireApiActorTenantPermission(users.impersonate_tenant)`:

- Evaluates **real actor** + **actor active tenant**
- Rejects nested impersonation (`isImpersonating`)
- Target holding impersonate permission does **not** allow chained start

### P1-IMP-02 — Button visibility (FIXED)

**BUTTON_VISIBILITY_PERMISSION_SOURCE:** live DB via `actorHasImpersonateTenantPermission(actorUserId, tenantId)` on person detail SSR (`/dashboard/admin/users/[userId]`). Server start API remains authoritative.

Does **not** rely on stale JWT `hasPermission` for the **Als Benutzer ansehen** entry.

### P1-IMP-03 — Role / permission change during impersonation (FIXED)

**REFRESH_BOUNDARY:**

- **Server API:** always live resolver (unchanged — authoritative)
- **JWT while impersonating:** each Auth.js JWT callback reloads effective `permissionKeys` / `roleKeys` via `resolveSessionUserForTenant` (pinned tenant)
- **Explicit refresh:** `refreshEffectiveUserSession(actorUserId)` (e.g. profile PATCH on `/api/account/me`)

### P2-IMP-01 — Banner UX (IMPROVED)

German copy: **Benutzeransicht aktiv**; shows target + real actor; exit **Ansicht beenden**.

### P3-IMP-01 — Permission catalog label (FIXED)

`users.impersonate_tenant` → **Benutzeransicht** in `permission-metadata.ts`.

### P2-IMP-02 — Legacy route (DEFERRED)

`/dashboard/users/[userId]` still gates platform `users.impersonate` only. FCA Club Admin path uses People & Access person detail — documented; no routing redesign in 01R2.

---

## Mutation policy

**FULL_EFFECTIVE_USER_MUTATION** (unchanged): domain mutations authorize against **effective** user's live permissions. Real actor Club Admin permissions do **not** authorize normal mutations while impersonating.

---

## Audit

`logAction` / `logSecurityAction` preserve **real actor** when `isImpersonating`.  
Automated proof: `lib/audit/__tests__/log-action.test.ts`.

**Limitation:** domain audit rows store canonical actor in `actorUserId`; effective user in metadata when supplied — not a separate column on every entity audit. **NON_BLOCKING_FOR_FCA_UAT**.

---

## Persona UAT pack (prepare only — do not execute in 01R2)

| Case | Target / setup | Verify in Human UAT |
|------|----------------|---------------------|
| **UAT-PERM-01** | Sandra / Spielbetrieb Koordinator | Planner allowed ops; no Club Admin; no impersonation |
| **UAT-PERM-02** | Read-only Planner persona | View only; API mutations denied |
| **UAT-PERM-03** | Training-only persona | Training manage; planner allocation denied |
| **UAT-PERM-04** | Impersonated user; revoke permission X from separate admin | API denies immediately; JWT refresh reconciles UI; restore role after test |
| **UAT-PERM-05** | Facilities authority without planner allocation manage | Split module boundaries |

### Data safety (Human UAT)

- Record original role/permission state before UAT-PERM-04; restore immediately after
- Prefer reversible planner allocations / dedicated test data
- No user/role deletion required

---

## Automated test evidence (01R2)

Focused green:

- `lib/auth/__tests__/session-context.test.ts` (harness mock updated for resolver OR queries + overrides)
- `lib/auth/__tests__/trusted-session-state.test.ts` (tenant pin, live refresh, lifecycle)
- `app/api/auth/__tests__/impersonation-routes.test.ts`
- `lib/permissions/__tests__/require-api-actor-tenant-permission.test.ts`
- `lib/admin/users/__tests__/tenant-impersonation.test.ts`
- `lib/permissions/__tests__/rperm-04-require-permission.test.ts`
- `lib/audit/__tests__/log-action.test.ts`

Build: `NODE_OPTIONS=--max-old-space-size=8192 npm run build` — **PASS**

Database: migration `20260930180000_sce_users_impersonate_tenant` — **unchanged / no new migration**

---

## PR #807 handling

Diagnosis content from `cursor/people-access-impersonation-01-reconcile-ce84` incorporated into this canonical doc. Draft PR #807 may be closed/superseded by the 01R2 implementation PR.

---

## Remaining deferred items

| ID | Status |
|----|--------|
| P2-IMP-02 | Legacy platform user route — deferred |
| Hybrid read-only impersonation | Future hardening — not required for persona UAT |

---

## Roadmap

| Package | Status |
|---------|--------|
| SCE-PLANNER-UX-08-08 | CLOSED on STAGE |
| FACILITY-INTEGRITY-01 | CLOSED |
| PEOPLE-ACCESS-IMPERSONATION-01 | **IMPLEMENTED / HUMAN_UAT_PENDING** |
| Persona UAT UAT-PERM-01…05 | **Ready to execute** (Human) |
| Next after impersonation | Execute Human UAT; close package with evidence |
