# PEOPLE-ACCESS-IMPERSONATION-01 — Diagnosis & reconciliation (01R1)

**Status:** DIAGNOSED / IMPLEMENTATION_PENDING  
**Baseline STAGE:** `84c5e7acdce92d9efd256bf9b0ca1939ad101d27`  
**Diagnosis date:** 2026-10-08  

This document reconciles historic work (PR #779, branch `cursor/fca-admin-ux-impersonation-01`) against current STAGE, records live FCA STAGE database evidence (read-only), and defines the smallest completion path for persona UAT (UAT-PERM-01 … 05).

---

## Historic state vs current reality

| Item | Historic notes | Verified 2026-10-08 |
|------|----------------|---------------------|
| PR #779 | Reported OPEN | **MERGED** 2026-09-30 (`c003ca662e54f50bdf378e2dff43cdcb67ab8a88`) |
| Branch `cursor/fca-admin-ux-impersonation-01` | HEAD `f9497ff` | Still exists; **0 commits ahead of STAGE** (fully merged) |
| Application impersonation UI on STAGE | Previously absent | **Present** on STAGE (merged via #779) |
| Migration `20260930180000_sce_users_impersonate_tenant` | Applied on STAGE DB | **Applied** (see Database section) |

**Do not resume or merge the historic branch.** It is a stale pointer at merged commits; STAGE has moved forward (Planner 08-08, Facility Integrity, etc.).

---

## Current STAGE architecture (auth / impersonation)

### Identity model

| Concept | Storage / resolution |
|---------|----------------------|
| **REAL ACTOR** | JWT `sub` / `session.user.actorUserId` (canonical Club Admin who signed in) |
| **EFFECTIVE ACTOR** | JWT `id`, `effectiveUserId`, `permissionKeys`, tenant context while impersonating |
| **ACTIVE TENANT** | `session.user.activeTenantId` from target membership context after impersonation start |
| **Effective permissions (API boundary)** | `requireApiPermission` / `requireApiAnyPermission` → `getEffectivePermissions({ userId: effectiveUserId, tenantId })` |
| **Effective permissions (UI fast path)** | `hasPermission(session, key)` → JWT `permissionKeys` (stale until login / trusted refresh) |
| **Session storage** | Auth.js JWT + trusted one-use capabilities (`lib/auth/trusted-session-state.ts`) |
| **Server request resolution** | `getActorContext(session.user.id, tenantId)` hydrates org/target groups for **effective** user id |
| **Client exposure** | `session` via `auth()` / `getRequestAuthSession`; banner when `isImpersonating` |

Canonical modules:

- Who is logged in (real): `token.sub` / `actorUserId`
- Whose permissions apply for product APIs: `effectiveUserId` (via require-* gates)
- Impersonation lifecycle: `auth.ts` → `startImpersonationSession` / `stopImpersonationSession`
- Start gates: `app/api/users/[userId]/impersonate/route.ts` + `lib/admin/users/tenant-impersonation.ts`

### Security invariants (code review + tests)

| Invariant | Classification | Evidence |
|-----------|----------------|----------|
| REAL_ACTOR_PRESERVED | **PASS** | `sub` never taken from client update payload; trusted intent only |
| EFFECTIVE_ACTOR_RESOLVED | **PASS** | `applyEffectiveUserState` loads target via `loadLiveSessionUser` |
| TARGET_PERMISSIONS_ENFORCED | **PASS** | API gates use `effectiveUserId`; test API-05 in `rperm-04-require-permission.test.ts` |
| ADMIN_PRIVILEGES_NOT_INHERITED | **PASS** | Session `permissionKeys` replaced with target's resolver output |
| TENANT_BOUNDARY (membership gate) | **PASS** | `assertCanImpersonateTenantMember` requires active membership in **actor's** `activeTenantId` |
| TENANT_BOUNDARY (session tenant pin) | **GAP** | Start uses target's default tenant (`joinedAt` earliest), not actor's active tenant — see FINDINGS |
| START_PERMISSION_GATE | **PASS** (with caveat) | `users.impersonate_tenant` or platform `users.impersonate`; API uses effective id (equals actor when not impersonating) |
| NESTED_IMPERSONATION | **PASS** | Route rejects `isImpersonating`; low-perm effective user also fails API permission |
| EXIT_SAFETY | **PASS** | `stop-impersonation` uses `actorUserId`, no permission check on effective user |
| TARGET_DEACTIVATION | **PASS** | JWT callback returns `null` if effective user ineligible; trusted start validates membership |
| SESSION_EXPIRY / actor password change | **PASS** | `isActorSessionCurrent` invalidates token |

---

## Database (FCA STAGE, read-only)

| Check | Result |
|-------|--------|
| Migration `20260930180000_sce_users_impersonate_tenant` | **Present**, `finished_at` 2026-09-30T13:09:36Z |
| Permission `users.impersonate_tenant` | **Exists**, scope TENANT, `grantableByAdmin=true` |
| `club_admin__fc-allschwil` | **Has** permission |
| Custom FCA roles (e.g. Spielbetrieb Koordinator, Präsident) | **None** hold `users.impersonate_tenant` |
| `it@fcallschwil.ch` | Active; role `club_admin__fc-allschwil`; **has** `users.impersonate_tenant` via role |
| Migration history vs repo | **Aligned** — single migration file in repo matches applied row |

---

## PR #779 inventory (git evidence)

- **State:** MERGED  
- **Base:** STAGE  
- **Head:** `f9497ff476a035e185932ac403669dcc159fd5ff` (2 commits + merge)  
- **Unique commits vs STAGE today:** 0 (branch is ancestor)  
- **Impersonation-related files since merge (`c003ca66..HEAD`):** no diff (unchanged)  
- **Migrations in PR:** `20260930180000_sce_users_impersonate_tenant`  
- **Tests added:** tenant gate, impersonation routes, trusted session, person detail, 01R1 release sentinels  
- **Docs in PR:** none dedicated; planning note exists separately  

---

## Patch reconciliation (PR #779 vs STAGE)

| Class | Items |
|-------|--------|
| **ALREADY_IN_STAGE** | All 31 files from PR #779, including UX, API, migration, tests |
| **STILL_RELEVANT_CLEAN** | Core impersonation stack (unchanged since merge) |
| **STILL_RELEVANT_STALE** | None in impersonation core; historic branch itself is stale |
| **SUPERSEDED** | N/A — no duplicate implementation on STAGE |
| **CONFLICTING** | None at merge; historic branch **would** revert 08-08 / Facility Integrity if merged today |
| **DROP** | Entire branch tip as merge candidate |

---

## UX (current STAGE)

| Area | Behavior |
|------|----------|
| Entry point | Person detail under **Personen & Zugänge** — `/dashboard/admin/users/[userId]` |
| Target selection | Current person; no separate picker |
| Label | **Als Benutzer ansehen** (button); banner title still **Impersonation aktiv** (technical DE) |
| Visibility gate | `canImpersonate` via JWT `hasPermission`; target must be `accessStatus.isFullyActive` (blocks pending invite) |
| Active banner | `ImpersonationBanner` + `StopImpersonationButton` in admin layout |
| Real actor visibility | Preserved server-side; **not shown in banner** (only effective display name) |
| Exit | POST `/api/auth/stop-impersonation` → redirect people-access |
| Compatibility | Aligns with current person-detail UX from #779; broader People & Access list redesign **out of scope** |

**Observed UAT gap (08-04 doc):** Club Admin could not use impersonation on preview — likely **JWT stale `permissionKeys`** (permission added post-login) and/or target not `isFullyActive`. DB confirms admin **does** hold permission today.

---

## Mutation & audit policy (as implemented)

- **No read-only impersonation mode** — effective user can mutate wherever APIs allow.
- **Audit:** `logAction` / `logSecurityAction` rewrite `actorUserId` to real actor when `isImpersonating` (`lib/audit/log-action.ts`).
- **Recommendation:** **HYBRID_WITH_BLOCKED_HIGH_RISK_ACTIONS** for production comfort, but **FULL_EFFECTIVE_USER_MUTATION** is acceptable for FCA persona UAT if audit attribution is verified during UAT.

---

## Persona UAT matrix (deferred from 08-08)

| Case | Persona (FCA) | Permission shape (illustrative) | Visible / allowed | Denied | Impersonation |
|------|---------------|----------------------------------|-------------------|--------|---------------|
| **UAT-PERM-01** | Sandra / Spielbetrieb Koordinator | Planner allocation manage, Teams view; **not** full training admin | Garderobe / planner ops per role | DnD without allocation manage | **Required** |
| **UAT-PERM-02** | Read-only coach | Calendar view only | View Kalender | Drag / mutate | **Required** |
| **UAT-PERM-03** | Training-only manager | Training manage; **not** planner conflict apply | Training surfaces | Conflict apply / planner privileged writes | **Required** |
| **UAT-PERM-04** | Any impersonated persona | Role changed while session live | Retry after change | Stale grant must fail safe | **Required** + refresh path (`refreshEffectiveUserSession` on `/api/account/me` only today) |
| **UAT-PERM-05** | Facilities admin vs planner view-only | Split facility PATCH vs planner view | Each module per true role | Cross-module privilege bleed | **Required** |

**READY_WITH_CURRENT_IMPLEMENTATION:** **PARTIAL** — core stack on STAGE; human UAT blocked until operational verification (login refresh, entry point, tenant-pin fix if multi-tenant targets exist).

---

## Test coverage summary

| Area | Status |
|------|--------|
| Start / stop / nested / tenant gate | **COVERED_CURRENTLY** |
| Effective permissions on API | **COVERED_CURRENTLY** |
| Trusted session / exit | **COVERED_CURRENTLY** |
| Tenant session pin on start | **MISSING** |
| UI banner / People entry | **PARTIAL** (component tests; no E2E) |
| Stale JWT permissionKeys for button | **MISSING** |
| Mutation audit attribution (E2E) | **MISSING** |
| Cross-tenant multi-membership target | **MISSING** |

---

## Security findings

### P0

| ID | Area | Summary |
|----|------|---------|
| P0-IMP-01 | Tenant boundary | Impersonation start does not pin `activeTenantId` to actor tenant; multi-membership targets could load wrong tenant context while gate checked another membership. **RELEASE_BLOCKER** for multi-tenant targets; low risk for single-tenant FCA personas. |

### P1

| ID | Area | Summary |
|----|------|---------|
| P1-IMP-01 | Start authorization | `requireApiAnyPermission` keys off `effectiveUserId`; safe today but should explicitly use **real actor** for start permission. |
| P1-IMP-02 | UX / UAT | `hasPermission` uses stale JWT — Club Admin may not see **Als Benutzer ansehen** until re-login or session refresh. |
| P1-IMP-03 | Stale permissions | No global refresh when roles change during impersonation (UAT-PERM-04); only profile PATCH triggers refresh. |

### P2

| ID | Area | Summary |
|----|------|---------|
| P2-IMP-01 | UX | Banner uses **Impersonation aktiv** vs product term **Als Benutzer ansehen**; real actor not shown in banner. |
| P2-IMP-02 | UX | Legacy route `/dashboard/users/[userId]` gates on platform `users.impersonate` only — avoid for FCA Club Admin flows. |

### P3

| ID | Area | Summary |
|----|------|---------|
| P3-IMP-01 | Copy | Permission DB name **Benutzer imitieren (Verein)** vs UI **Als Benutzer ansehen**. |

---

## Reuse strategy for PR #779

**Recommendation: STRATEGY_C — NEW_BRANCH_REIMPLEMENT_FROM_CURRENT_STAGE**

**Rationale:** PR #779 is **already merged**; historic branch is not ahead of STAGE and would destroy newer Planner/Facility work if merged. Completion work is **hardening + UAT**, not re-applying #779.

**Retain from #779 (already on STAGE):** migration, tenant gate, trusted session, routes, UX entry, unit tests.

**Do not reuse:** branch `cursor/fca-admin-ux-impersonation-01` as a merge source.

---

## Next implementation package (01R2 proposal)

| Field | Value |
|-------|--------|
| **PACKAGE** | PEOPLE-ACCESS-IMPERSONATION-01R2 — security hardening + persona UAT enablement |
| **BRANCH_TO_USE** | `cursor/people-access-impersonation-01-complete-ce84` (new, from STAGE) |
| **STARTING_BASE** | `84c5e7acdce92d9efd256bf9b0ca1939ad101d27` |
| **SCOPE** | Pin tenant on impersonation start; actor-scoped start permission; session refresh for permissionKeys / role changes; banner UX; automated tests for gaps; execute UAT-PERM-01…05 |
| **NON_SCOPE** | People & Access list redesign; PROD deploy; new permission; nested impersonation product feature |
| **MIGRATIONS_REQUIRED** | None expected |
| **TESTS_REQUIRED** | Tenant pin, stale JWT UI gate, UAT-PERM-04 refresh, audit spot checks |
| **HUMAN_UAT_REQUIRED** | UAT-PERM-01 … 05 as Club Admin via impersonation |
| **PR_STRATEGY** | Single implementation PR after 01R2; leave historic #779 closed/merged |

Optional split **01R3** only if UX polish must ship separately after security fixes land.

---

## Tests run (01R1 diagnosis)

```bash
npm test -- --run \
  lib/admin/users/__tests__/tenant-impersonation.test.ts \
  lib/admin/users/__tests__/sce-fca-admin-ux-impersonation-01r1-release.test.ts \
  app/api/auth/__tests__/impersonation-routes.test.ts \
  lib/auth/__tests__/trusted-session-state.test.ts \
  lib/auth/__tests__/session-context.test.ts \
  lib/permissions/__tests__/rperm-04-require-permission.test.ts \
  lib/permissions/__tests__/require-platform-api-permission.test.ts
```

**Result:** 87 passed, 3 failed — failures in `session-context.test.ts` (incomplete prisma mock for `userPermissionOverride`), **not** impersonation-specific regressions.

---

## Roadmap pointers

| Package | Status |
|---------|--------|
| SCE-PLANNER-UX-08-01 … 08-08 | **CLOSED** |
| FACILITY-INTEGRITY-01 | **CLOSED / PASS** |
| PEOPLE-ACCESS-IMPERSONATION-01 | **DIAGNOSED / IMPLEMENTATION_PENDING** |
| Persona UAT (UAT-PERM-01…05) | **Blocked on 01R2** |
| After impersonation | Close impersonation package; attach UAT evidence to 08-08 doc or release record |
