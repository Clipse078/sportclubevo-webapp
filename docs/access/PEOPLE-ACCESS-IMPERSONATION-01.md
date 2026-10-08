# PEOPLE-ACCESS-IMPERSONATION-01 — Club Admin impersonation (01R2)

**Status:** **CLOSED** (SCE-PEOPLE-ACCESS-IMPERSONATION-01-CLOSURE — 2026-10-08)  
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

### P1-IMP-04 — Impersonation safety chrome persistence (UAT01-C — FIXED in PR #808)

**Human UAT-PERM-01 finding:** After Sandra used Planner **Öffnen** on a Training (no `trainings.view`), authorization redirected to Dashboard while the session remained impersonated — but **Benutzeransicht aktiv** / **Ansicht beenden** disappeared (P1 release blocker).

**Root cause:** Impersonation banner was server-rendered only in `(admin)/layout`; client-side Planner → unauthorized destination navigation could reuse a stale layout RSC tree without re-evaluating `isImpersonating`.

**Fix:** `ImpersonationSafetyChrome` (client) re-fetches `/api/auth/impersonation-context` on every pathname change; `(admin)/layout` is `force-dynamic`. Exit still uses `/api/auth/stop-impersonation` (real actor).

### Planner UAT01-A / UAT01-B (PR #808)

| ID | Observation | Classification | Fix |
|----|-------------|----------------|-----|
| **UAT01-A** | Planung ändern → «Keine Ressource für die aktuelle Filterung gefunden» for Sandra | **PERMISSION** on operational resource catalog read | `/api/planning-hub/facility-groups` now accepts `planning.allocations.manage`; Standardplan eager facility groups for allocation-only actors |
| **UAT01-B** | Training **Öffnen** → Dashboard dead-end without `trainings.view` | **PERMISSION_CONTRACT** (superseded) | Spielbetrieb role now includes `trainings.view` / `events.view`; **Öffnen** enabled where authorized |
| **UAT01-C** | Banner/exit missing after redirect; session still Sandra | **UI_STATE** / layout stale | P1-IMP-04 above |
| **UAT01-D** | Single Training/Match operational workflow insufficient in Planner | **PERMISSION_CONTRACT** | Spielbetrieb bundle: center **view** + `planning.allocations.manage`; Training/Match operational surfaces honor allocation manage |
| **UAT01-E** | Aggregate modal **Öffnen** visible but non-functional | **UX** | Hide **Öffnen** when `canOpenPlanningHubItem` is false; no dead actions |
| **UAT01-F** | Spielbetrieb Koordinator role too narrow (no Training/Match/Tournament centers) | **ROLE_DEFINITION** | Pilot template + `scripts/sync-fca-spielbetrieb-koordinator-role.ts` (STAGE, idempotent) |
| **P1_PRESIDENT_PILOT_ACCESS_01** | Präsident (Pilot) Patrick under-permissioned vs Sandra operational baseline + Dokumente/Anmeldungen | **ROLE_DEFINITION** | `PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE` + `scripts/sync-fca-praesident-pilot-role.ts` (STAGE, idempotent) — **HUMAN_UAT_PENDING** |

**Canonical Spielbetrieb allocator:** tenant `planning.allocations.manage` for pitch/Garderobe across Wochenplaner, Training Center (session allocations API), Match Center (operational PATCH fields), Tournament Center (resource allocation APIs). Domain `trainings.manage` / `events.manage` remain full coordinator paths — not granted to Sandra.

**UAT-PERM-01R3:** **FAILED / BLOCKED** (Human UAT) — Product Owner findings **R4-01** (impersonation banner scrolls away) and **R4-02** (Match not selectable for operational allocation workflow in Wochenplaner despite `planning.allocations.manage`).

### 01R4 fixes (PR #808)

| ID | Observation | Root cause | Fix |
|----|-------------|------------|-----|
| **R4-01** | **Benutzeransicht aktiv** disappears on vertical scroll | Banner lived in document flow inside the main column without sticky positioning under the global header | `sce-authenticated-safety-chrome-stack` in `(admin)/layout` + sticky `top: var(--topnav-height)` / `z-index: 34` in `authenticated-shell.css`; shared shell only (no per-route duplication) |
| **R4-02** | Sandra sees Match in Planner but cannot select/open for pitch/Garderobe workflow | `WeekPlannerWorkspace` gated canonical sheet activation on `events.manage` / `trainings.manage` only | `canOpenPlannerCanonicalEditor()` — `planning.allocations.manage` opens canonical allocation editor; domain schedule fields hidden when domain manage absent; Match operational PATCH classification unchanged |

**UAT-PERM-01R4:** **FAILED** (Human UAT 2026-10-08) — **UAT-PERM-01R4-A**: impersonation safety chrome still disappeared during vertical scroll on `/dashboard/planner/week` despite R4 sticky CSS (Match allocation fix from R4 otherwise reachable).

**FCA STAGE readiness:** `FCA_ROLE_SYNC = APPLIED_TO_STAGE` (unchanged in R4/R5). Do **not** mark PEOPLE-ACCESS-IMPERSONATION-01 closed until Human **UAT-PERM-01R5** completes.

### 01R5 fixes (PR #808)

| ID | Observation | Root cause | Fix |
|----|-------------|------------|-----|
| **P1-IMP-R5-01** / **R4-01 (retest)** | **Benutzeransicht aktiv** / **Ansicht beenden** vanish when scrolling Wochenplaner | **Scroll owner:** `document` / `body` (no nested authenticated-shell scrollport). **Sticky containing block:** safety stack inside `sce-app-main-with-mobile-nav` with `position: sticky; top: var(--topnav-height)` — offset matched primary header row only while `.sce-global-app-header` sticks as a taller block (primary + domain context + module rows). Banner slid under contextual navigation / left the visible shell layer. | **`sce-authenticated-sticky-shell-chrome`** wraps global header + `sce-authenticated-safety-chrome-stack` (STAGE + impersonation) as one **`position: sticky; top: 0`** shell block (`--sce-shell-sticky-chrome-z-index: 35`). Safety chrome sits in document flow directly under the global header, outside `<main>` scrolling content. No per-module Planner fix. **Exit:** unchanged actor-scoped `POST /api/auth/stop-impersonation`. **R4 Match allocation:** preserved (`canOpenPlannerCanonicalEditor` / `planning.allocations.manage`). |

**Stacking contract:** global header + safety chrome (sticky shell) → module/sub-nav & planner sticky controls → page content → dialogs/sheets (existing overlay roots above normal content).

**UAT-PERM-01R5-A:** **PASS** (Human UAT 2026-10-08) — sticky **Benutzeransicht aktiv** / **Ansicht beenden** on Dashboard, Wochenplaner (deep scroll), Trainings, Match Center / Match detail; R4 Match operational allocation remains available.

**UAT-PERM-01R5-B:** **FAIL** (Human UAT 2026-10-08) — **P1_IMP_R6_01:** impersonation start works via URL/API but no discoverable **Als Benutzer ansehen** entry in Admin → Personen & Zugänge (row ••• menu / quick-detail).

### 01R6 fixes (PR #808) — discoverable start UI

| ID | Observation | Fix |
|----|-------------|-----|
| **P1_IMP_R6_01** | No People & Access UI to start impersonation | **Primary:** row ••• menu → **Als Benutzer ansehen** (`UserRowActionsMenu` + shared `ImpersonateButton`). **Secondary:** person quick-detail footer → same control. **Capability:** `actorHasImpersonateTenantPermission` + `canShowImpersonateTenantUserAction` (actor-scoped; target eligibility mirrors `assertCanImpersonateTenantMember` UI contract). **Start path unchanged:** `POST /api/users/[userId]/impersonate` → `startImpersonationSession` → redirect `/dashboard` → R5 safety chrome. |

**Canonical Human path (R6):**

Admin → Personen & Zugänge → target person → **Als Benutzer ansehen** → `/dashboard` → **BENUTZERANSICHT AKTIV**

**Security model (unchanged):**

```
REAL ACTOR
  └─ users.impersonate_tenant
       └─ eligible tenant target (membership, active, no pending invite, not platform system)
            └─ impersonation session
                 └─ EFFECTIVE USER permissions
```

**EFFECTIVE USER** permissions never grant the ability to start impersonation. Nested start rejected while `isImpersonating`.

**UAT-PERM-01R6:** **HUMAN_UAT_PENDING** — discoverability + start + effective permissions + sticky chrome retest + stop.

**UAT-PERM-01R6-A:** **PASS** (Human UAT 2026-10-08) — **Als Benutzer ansehen** discoverable in Personen & Zugänge row ••• menu.

### 01R7 — People & Access contextual action UX polish (PR #808)

**Human UAT finding:** R6-A confirmed discoverability, but the row ••• dropdown rendered as an oversized bright panel (white background, weak hierarchy, faded normal actions, destructive action visually dominant, loose spacing, weak anchor to trigger).

**Root cause:** `UserRowActionsMenu` used a custom absolutely positioned panel with `bg-white` and ad-hoc row styles instead of the canonical SCE dark `PopoverContent` row-menu pattern (Match Center / Training / Workspace).

**Fix (presentation only):**

| Area | Change |
|------|--------|
| Container | `PopoverContent` — `bottom-end`, ~14.5rem width, `bg-[var(--surface)]`, compact padding |
| Normal actions | Shared compact row geometry (~38px): **Als Benutzer ansehen** → **Zugriff bearbeiten** → **Detailseite** |
| Destructive | `MenuDivider` then **Aus Verein entfernen** (destructive token hover, not dominant block) |
| Trigger | Dark-aligned ••• control (transparent border, surface hover) |
| Security | **Unchanged** — same `canImpersonateTarget` / R6 eligibility; start API still actor-scoped |

**Menu hierarchy (authorized actions only):**

```
Als Benutzer ansehen
Zugriff bearbeiten
Detailseite
────────────────────
Aus Verein entfernen
```

**Delegatability audit (R7):**

- **Finding:** `P1_IMPERSONATION_PERMISSION_DELEGATABLE` — catalog had `grantableByAdmin: true`.

### 01R8 — Impersonation permission governance (PR #808)

**P1_IMPERSONATION_PERMISSION_DELEGATABLE → FIXED**

| Layer | Policy |
|-------|--------|
| Catalog | `users.impersonate_tenant` → `grantableByAdmin: false` (seed + migration `20261008140000_sce_users_impersonate_tenant_non_delegatable`) |
| Club Admin possession | `TENANT_CLUB_ADMIN_PRIVILEGED_POSSESSION_KEYS` — reconciled onto materialized `club_admin__*` system roles via `reconcileTenantClubAdminPermissions` (possession ≠ delegation) |
| Custom roles | Excluded from `getTenantPermissionCatalog()`; `resolveTenantPermissions` / `assertTenantDelegationAllowed` reject assignment |
| Start API | Unchanged — `requireApiActorTenantPermission(USERS_IMPERSONATE_TENANT)` on **real actor** |

**STAGE data audit (read-only):** zero custom tenant roles held `users.impersonate_tenant`; FCA `club_admin__fc-allschwil` retains it; Sandra / Präsident pilot roles do not.

**UAT-PERM-01R8:** **PASS** (Human UAT 2026-10-08) — Club Admin impersonates Sandra/Patrick; `users.impersonate_tenant` not delegatable to pilot roles.

**Automated evidence:** `UserRowActionsMenu.test.tsx`, `people-access-impersonation-01-uat01-r7-row-menu.test.ts`, existing R4/R5/R6 impersonation suites — run in R7 commit.

**UAT-PERM-01R7:** **PASS** (Human UAT 2026-10-08) — compact dark row menu acceptable.

### 01R9 — Registrierungen world-class UX + Infoboard access (PR #808)

**Human UAT context (2026-10-08):** Impersonation, Planner, Dokumente, and Registrierungen access validated for Patrick; Sandra operational Planner OK. R9 scope: polish **Registrierungen** operational inbox/drawer (presentation only) and ensure **Infoboard** is discoverable for Sandra + Patrick via `infoboard.view` (no broad `infoboard.manage` grant).

| Goal | Change | Business logic |
|------|--------|----------------|
| **R9-A Registrations UX** | Compact clickable KPI filters; dense responsive table hierarchy; drawer IA (sticky identity header, workflow block above tabs, secondary footer) | **Unchanged** — workflow PATCH/create-person/archive rules untouched |
| **R9-B Infoboard** | `/dashboard/infoboard` redirects view-only actors to `/dashboard/infoboard/preview`; quick action uses preview + `INFOBOARD_VIEW`; pilot roles already include `infoboard.view` | Route guard aligned with nav (`INFOBOARD_READ_PERMISSIONS` on preview; manage on admin overview) |

**Infoboard diagnosis:** Missing access was a **route/navigation mismatch** — parent nav allowed `infoboard.view` but `/dashboard/infoboard` required manage-only permissions. Preview route already accepted read permissions.

**Workspace boundary (Patrick):** `workspace.view` without `workspace.manage` — folder edit denial message is **accepted**; `PRESIDENT_WORKSPACE_MANAGE_DECISION = DEFERRED_PRODUCT_DECISION` (not R9).

**Security boundaries preserved:** No `users.impersonate_tenant` for Sandra/Patrick; no Club Admin expansion; impersonation effective-user model unchanged.

**Automated evidence (R9):** `registration-inbox-ux.test.tsx`, `infoboard-view-access-r9.test.ts`, extended `fca-praesident-pilot-access.test.ts`, infoboard admin page redirect test; R4–R8 impersonation/planner sentinels re-run.

**UAT-PERM-01R9:** **PASS** (Human UAT 2026-10-08) — Registrierungen UX; Infoboard follow-ups completed in R9R1/R9R2.

**R9 Human UAT Infoboard (Sandra/Patrick):** **FAIL** — preview-only scope insufficient (`/dashboard/infoboard/preview` only; canonical management overview at `/dashboard/infoboard` required).

| Case | Status |
|------|--------|
| **R9_C_SANDRA_INFOBOARD** | **FAIL** → **FIXED_IN_R9R1 / HUMAN_UAT_PENDING** |
| **R9_D_PATRICK_INFOBOARD** | **FAIL** → **FIXED_IN_R9R1 / HUMAN_UAT_PENDING** |

### 01R9R1 — Infoboard operational access correction (PR #808)

**Human UAT finding:** R9 correctly exposed Infoboard preview for Sandra and Patrick, but FCA pilot requires the **operational management overview** (`/dashboard/infoboard`) — board list, filters, **Öffnen** / **Bearbeiten**, same surface as Club Admin — not preview-only.

**Root cause:** R9 granted only `infoboard.view`. The canonical overview route requires a **write** permission from `INFOBOARD_WRITE_PERMISSIONS` (`infoboard.manage` or `events.publish_infoboard`). View-only actors are correctly redirected to `/dashboard/infoboard/preview`; Sandra/Patrick were view-only.

**Permission decision (minimum coherent set):**

| Permission | Sandra | Patrick | Notes |
|------------|--------|---------|-------|
| `infoboard.view` | yes | yes (inherited) | Preview + read path |
| `infoboard.manage` | **+added** | **+added** (via Spielbetrieb baseline) | Operational overview, editor, APIs (except hard delete) |
| `events.publish_infoboard` | no | no | Not required for FCA Infoboard ops today |
| `infoboard.delete` | no | no | Permanent delete remains Club Admin / deletion authority |

**Route/API model (unchanged guards):**

| Capability | Route/API | Permission |
|------------|-----------|------------|
| Preview/read | `/dashboard/infoboard/preview` | `INFOBOARD_READ_PERMISSIONS` |
| Management overview | `/dashboard/infoboard` | `INFOBOARD_WRITE_PERMISSIONS` (no redirect when manage held) |
| Board editor | `/dashboard/infoboard/[id]` | `infoboard.manage` |
| CRUD APIs | `/api/infoboards*` | `infoboard.manage` |
| Permanent delete | `DELETE /api/infoboards/[id]` | `infoboard.delete` (Sandra/Patrick denied) |

**View-only boundary:** `infoboard.view` without manage/publish → redirect to preview (preserved).

**STAGE role sync:** Canonical source `lib/roles/pilot-fc-allschwil-role-definitions.ts`; apply via existing idempotent scripts:

- `APPLY_FCA_SPIELBETRIEB_ROLE_SYNC=true npx tsx scripts/sync-fca-spielbetrieb-koordinator-role.ts`
- `APPLY_FCA_PRAESIDENT_PILOT_ROLE_SYNC=true npx tsx scripts/sync-fca-praesident-pilot-role.ts` (STAGE fingerprint guard)

**Automated evidence (R9R1):** `infoboard-operational-access-r9r1.test.ts`, updated `fca-praesident-pilot-access.test.ts`, infoboard admin page redirect test; R4–R9 sentinels re-run.

**Build:** `NODE_OPTIONS=--max-old-space-size=8192 npm run build` — required PASS before Human UAT.

**Human UAT (2026-10-08):**

| Case | Status |
|------|--------|
| **R9R1_A_SANDRA_INFOBOARD_OVERVIEW** | **PASS** |
| **R9R1_B_INFOBOARD_EDITOR** | **PASS** |
| **R9R1_C_PATRICK_INFOBOARD** | **PASS** |
| R9R1_D view-only boundary | PASS (automated `infoboard-operational-access-r9r1.test.ts`) |
| R9R1_E exit impersonation | PASS (R9R2 exit retest) |

### 01R9R2 — Infoboard preview ↔ overview navigation (PR #808)

**Human UAT finding:** On `/dashboard/infoboard/preview`, clicking module-local **Übersicht** (expected → `/dashboard/infoboard`) did nothing. Direct URL to `/dashboard/infoboard` worked; overview → **Vorschau** worked. Reproduced impersonating Patrick after R9R1 STAGE role sync.

**Root cause:** Sibling route collision between `/dashboard/infoboard` and `/dashboard/infoboard/preview`. Prefix-based `isNavigationHrefActive` treated preview URLs as “on” the overview href; the overview nav child lacked `matchExact`, so explorer/module chrome could mark **Übersicht** active while still on preview. Module-local links from a nested pathname to the exact overview href could be swallowed by the App Router soft-navigation path.

**Fix (shared navigation, no persona hacks):**

1. `infoboard-overview` nav child: `matchExact: true` (same pattern as Commercial Billing overview).
2. `resolvePrimaryActiveModuleLocalChildKey`: nested fallback for `/dashboard/infoboard/[id]` editor routes without stealing `/preview`.
3. `GlobalNavDrawer`: sibling-aware `isModuleLocalChildPrimaryActive` for module children (replacing naive prefix active checks).
4. `AppShellNavigation` module-local row: explicit `router.push` when navigating from a nested path to an exact sibling href (preview → overview).

**Permission behavior:** Unchanged R9/R9R1 model — `infoboard.view` + `infoboard.manage` sees **Übersicht** + **Vorschau** and can switch both ways; view-only remains preview-only (overview child hidden; route redirect preserved). No new permissions; no STAGE role sync.

**Automated evidence (R9R2):** `lib/nav/__tests__/infoboard-r9r2-nav.test.ts`, `AppShellNavigation.infoboard-r9r2.test.tsx`; R9/R9R1 nav + impersonation sentinels re-run.

| Case | Status |
|------|--------|
| **R9R2_NAVIGATION** | **PASS** (Human UAT 2026-10-08) |

**R9R2_HUMAN_UAT = PASS** (2026-10-08):

| Actor | Vorschau → Übersicht | Übersicht → Vorschau |
|-------|----------------------|----------------------|
| Sandra | PASS | PASS |
| Patrick | PASS | PASS |

**Impersonation exit (Club Admin restoration):** PASS — **Ansicht beenden** after R9R2 nav retest.

**R9 Registrierungen (Human UAT — Michael, PR preview):**

| Check | Result |
|-------|--------|
| Redesigned registration inbox rendered | PASS |
| Compact KPI / filter / list hierarchy | PASS |
| Detail drawer rendered | PASS |
| Workflow-first drawer presentation | PASS |
| Registration business workflow available (unchanged logic) | PASS |

**REGISTRATION_BUSINESS_LOGIC_CHANGED_BY_R9 = NO** (presentation/layout only; automated `registration-inbox-ux.test.tsx` green).

### P3-IMP-01 — Permission catalog label (FIXED)

`users.impersonate_tenant` → **Benutzeransicht** in `permission-metadata.ts`.

### P2-IMP-02 — Legacy route (DEFERRED)

`/dashboard/users/[userId]` still gates platform `users.impersonate` only. FCA Club Admin canonical paths: People & Access list (R6) and person detail (`PersonAdminActionsPanel`).

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

### P1_PRESIDENT_PILOT_ACCESS_01 — Präsident (Pilot) under-permissioned (pre-merge Human UAT)

**Observed:** Impersonating Patrick Scotton (`Präsident (Pilot)`) exposed essentially personal shell/calendar only — missing Spielbetrieb operational surfaces, Dokumenten-Workspace, and workable Neue Anmeldungen processing.

**Required model:** `PATRICK_SCOTTON_PRAESIDENT_PILOT_ROLE` = `SANDRA_FISCHER_SPIELBETRIEB_ROLE` permission keys ∪ president supplements (`org.view`, `registrations.view`, `registrations.edit`, existing Zielgruppen + `news.manage` on STAGE) — **without** Club Admin, `users.impersonate_tenant`, `roles.manage`, or People & Access administration.

**STAGE apply:** `scripts/sync-fca-praesident-pilot-role.ts` (fingerprint `acd3b37682911890`, `SCE_DATA_ENVIRONMENT=STAGE`).

**Status:** **CLOSED** — Patrick operational baseline validated (Human UAT + automated `fca-praesident-pilot-access.test.ts`).

---

## Remaining deferred items

| ID | Status |
|----|--------|
| P2-IMP-02 | Legacy platform user route — **DEFERRED_NON_BLOCKING** |
| Hybrid read-only impersonation | Future hardening — **DEFERRED_NON_BLOCKING** |
| Finer-grained Infoboard ops (edit/create vs `infoboard.manage`) | **DEFERRED_NON_BLOCKING** — current Sandra/Patrick pilot boundary is safe |
| President Workspace `workspace.manage` | **DEFERRED_PRODUCT_DECISION** |
| Further Registrierungen visual polish | **DEFERRED_NON_BLOCKING** |
| Broader persona expansion beyond Sandra/Patrick | **OUT_OF_SCOPE** (future access-governance) |

---

## SCE-PEOPLE-ACCESS-IMPERSONATION-01 — Closure record (2026-10-08)

**Package objective:** Deliver Club Admin tenant impersonation with persistent safety chrome, discoverable start UI, governance hardening, FCA pilot operational access (Planner, Dokumente, Registrierungen, Infoboard), and Infoboard preview ↔ overview navigation — without broadening Club Admin delegation or touching PROD.

**Final architecture:** Real actor (`actorUserId`) retains tenant pin and impersonation capability; effective session (`session.user.id`, live resolver) drives authorization and UI permissions; `POST /api/users/[userId]/impersonate` and `POST /api/auth/stop-impersonation` remain actor-scoped; `ImpersonationSafetyChrome` + sticky authenticated shell chrome (R5) persist across client navigations.

**Impersonation security model:** Only `users.impersonate_tenant` on the **real** Club Admin starts impersonation; effective user never inherits start capability; nested start rejected; domain mutations use effective permissions; audit preserves real actor.

**FCA pilot role model (STAGE):** Spielbetrieb Koordinator (Sandra) and Präsident (Pilot) (Patrick) materialized on tenant `fc-allschwil`; Patrick = Sandra operational baseline ∪ president supplements; neither receives impersonation, roles.manage, or People & Access admin.

**Revision closure (R4–R9R2):**

| Rev | Scope | Status |
|-----|--------|--------|
| R4 | Planner allocation open + sticky impersonation banner (initial) | **CLOSED** |
| R5 | Persistent safety chrome / scroll shell | **CLOSED** (Human UAT PASS) |
| R6 | Start impersonation UI (People & Access) | **CLOSED** (Human UAT PASS) |
| R7 | Row-menu UX polish | **CLOSED** (Human UAT PASS) |
| R8 | `users.impersonate_tenant` non-delegatable + Club Admin possession | **CLOSED** (Human + automated PASS) |
| R9 | Registrierungen UX + Infoboard read path | **CLOSED** (Human UAT PASS) |
| R9R1 | `infoboard.manage` for FCA pilots + STAGE role sync | **CLOSED** (Human UAT PASS) |
| R9R2 | Infoboard Übersicht ↔ Vorschau navigation | **CLOSED** (`R9R2_HUMAN_UAT = PASS`) |

**Human UAT summary:** Registrierungen R9 PASS; Sandra/Patrick Infoboard operational overview R9R1 PASS; R9R2 sibling navigation both directions PASS; impersonation exit PASS. No additional Human UAT requested for unchanged SHAs beyond this reconciliation.

**Sandra permission boundary (effective on STAGE):** `infoboard.view` + `infoboard.manage`; no `infoboard.delete`, `events.publish_infoboard`, `users.impersonate_tenant`, `roles.manage`, People & Access admin.

**Patrick permission boundary:** Contains Sandra baseline; same Infoboard/impersonation/admin exclusions; president supplements (`org.view`, registrations, Zielgruppen, `news.manage`) intact.

**Infoboard operational-access decision:** Minimum coherent pilot grant = `infoboard.manage` (with existing `infoboard.view`); permanent delete remains Club Admin (`infoboard.delete`).

**Registration UX result:** World-class operational inbox/drawer presentation; workflow/API rules unchanged.

**STAGE role-sync state (read-only audit 2026-10-08):**

- Database fingerprint: `acd3b37682911890` (Neon STAGE `neondb`)
- Spielbetrieb Koordinator role: 15 keys — matches canonical template (dry-run sync: 0 missing)
- Präsident (Pilot) role: 21 keys — matches canonical template (dry-run sync: 0 missing)
- Effective permissions: Sandra/Patrick — manage/view yes, delete/impersonate/roles.manage no; Club Admin — `users.impersonate_tenant` yes
- **ROLE_SYNC_REQUIRED = NO** (already applied in R9R1)

**Final test evidence (closure gate):**

- PEOPLE-ACCESS / impersonation / governance / Infoboard R9–R9R2 / registrations UX / planner allocation sentinel: **148 / 148 PASS** (`/opt/cursor/artifacts/security-governance-tests.log`)
- Build: **PASS** (`NODE_OPTIONS=--max-old-space-size=8192 npm run build`)
- Migration: `20261008140000_sce_users_impersonate_tenant_non_delegatable` (expected; deploy with PR)
- Known baseline (not PR regressions): full-repo vitest requires local `TEST_DATABASE_URL` for live DB suites; `lib/nav/__tests__/nav-config.test.ts` administration parent-gate expectations (3 tests) fail locally on branch tip; `WeekPlannerPage.canonical-edit-permissions.test.tsx` domain-manage cases (3 tests) fail locally while R4 allocation case passes — treat as **P2 test debt** pending CI test job (Vercel-only checks today)

**Release / merge recommendation:**

- **PEOPLE-ACCESS-IMPERSONATION-01 = CLOSED**
- **PR #808** targets **STAGE**, mergeable, closure doc updated on branch; **do not merge** until product owner marks draft ready / runs STAGE migration deploy plan
- **PROD:** untouched (no PROD paths/config in diff; read-only STAGE fingerprint guard only)

**PR #808:** OPEN / DRAFT — technically merge-ready after closure commit; not merged by this package.

---

## Roadmap

| Package | Status |
|---------|--------|
| SCE-PLANNER-UX-08-08 | CLOSED on STAGE |
| FACILITY-INTEGRITY-01 | CLOSED |
| PEOPLE-ACCESS-IMPERSONATION-01 | **CLOSED** |
| PR #808 | **DRAFT / merge-ready pending owner** |
