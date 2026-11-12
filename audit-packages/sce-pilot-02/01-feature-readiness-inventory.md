# SCE-PILOT-02 — Feature Readiness Inventory

**Scope:** FC Allschwil STAGE pilot (`https://fcallschwil.sportclubevo.com`)  
**Source audit SHA:** `6eb551a37d1d7a88939f6b70bc6b4912a87635b4` (includes merged PR #773)  
**Evidence:** Code review on STAGE @ above SHA; runtime limited to public `/api/health/diag` (no authenticated browser session).

**Classification:** READY | MOCKED | INCOMPLETE | UNVERIFIED

---

## Planung — Wochenplaner (`/dashboard/planner/week`)

| Surface | Permission (route/API) | Sandra | Patrick | Class | Evidence |
|--------|-------------------------|--------|---------|-------|----------|
| Week grid + conflict display | `trainings.view` \|\| `trainings.manage` \|\| `events.view` \|\| `events.manage` | View+allocate* | View only | **READY** (code) | Page guard + `GET /api/facilities/availability` |
| Plan allocation POST/PATCH/DELETE | `trainings.manage` \|\| `events.manage` | Allocate* | Forbidden | **READY** (code) | `app/api/weekplanner/plans/.../allocations/*` |
| Create match/training/tournament from planner | `events.manage` / `trainings.manage` | **Coupled** if `trainings.manage` | Hidden | **INCOMPLETE** for Sandra scope | `createPermissions` in planner page |
| Alternative plan create/publish/delete | `trainings.manage` \|\| `events.manage`; publish also `wochenplan.manage` | **Coupled** | Hidden | **INCOMPLETE** | `WeekplannerPlanBar`, `/api/wochenplan/publish` |
| Legacy event pitch/Garderobe PATCH | `wochenplan.manage` \|\| `events.manage` | Needs `wochenplan.manage` without `events.manage` | Read-only | **READY** API / **UNVERIFIED** UI path | `PATCH /api/wochenplan/[eventId]/allocation` |

\*Allocation-only role **cannot** be expressed with existing keys alone without over-granting `trainings.manage` (see gap doc).

---

## Planung — Trainings (`/dashboard/training`)

| Surface | Permission | Sandra (target) | Patrick | Class | Evidence |
|--------|------------|-----------------|---------|-------|----------|
| Series list / sessions | `trainings.view` \|\| `trainings.manage` \|\| `trainings.delete` | **Over-grant** if `trainings.manage` | View with `trainings.view` | **READY** | Route + nav |
| Reschedule / series edit / submit | `trainings.manage` | **Forbidden in product scope** but granted by key | Forbidden | **INCOMPLETE** separation | Multiple `/api/training-*` routes |

**Pilot note:** Nav entry visible whenever `trainings.manage` is assigned — no allocation-only nav slice.

---

## Planung — Spiele / Turniere / Veranstaltungen

| Surface | Permission | Sandra | Patrick | Class |
|--------|------------|--------|---------|-------|
| Match list/detail read | `events.view` | Read | Read | **READY** |
| Match allocation UI on record | `events.manage` only (`canManageMappings`) | **Blocked** without `events.manage` | Read-only | **READY** guard / gap for Spielbetrieb |
| Create/delete matches | `events.manage` | Must not grant | Must not grant | **READY** |
| Tournament/Veranstaltungen manage | `events.manage` | Must not grant | Must not grant | **READY** |

---

## Aufgaben (`/dashboard/aufgaben`)

| Surface | Permission | Both pilots | Class | Evidence |
|--------|------------|-------------|-------|----------|
| Meine Aufgaben / participation inbox | Personal domain (linked `Person`) + optional `tasks.view` | **READY** | `requirePersonalActionsModuleAccess`, `personalActionsNavFallback` |
| Club-wide task management | `tasks.view`, `tasks.view_all`, `tasks.manage`, … | **Exclude** for pilot | **READY** | Task visibility helpers |
| Anforderungen management | `requirements.*` | **Exclude** unless recipient | **READY** | Requirement auth |

---

## Workspace / Dokumente (`/dashboard/workspace`)

| Surface | Permission | Both | Class | Evidence |
|--------|------------|------|-------|----------|
| Browse shared content | `workspace.view` + ACL/share | **READY** | `WORKSPACE-09-07` closure docs + ACL resolver |
| Tenant-wide manage | `workspace.manage` | **Exclude** | **READY** | `canWorkspaceManage` |

---

## Kommunikation

| Surface | Permission | Sandra / Patrick target | Class |
|--------|------------|-------------------------|-------|
| Hub `/dashboard/communication` | `users.manage_memberships` **or** inbox view keys | Inbox-only: `communication.inbox.view` | **READY** |
| Posteingang | `communication.inbox.view` (+ reply/manage/settings tiers) | `view` + `reply`; no `manage`/`settings` | **READY** |
| Mitteilungen/Kampagnen read | `communication.club.view` (no send) | Patrick read; Sandra optional read | **READY** |
| Mitteilungen/Kampagnen send | `communication.club.send` | **Exclude** | **READY** |
| Zielgruppen / E-Mail-Absender | `communication.zielgruppen.*`, tenant admin | **Exclude** | **READY** |

---

## Club domain (Organisation, Anmeldungen, …)

| Surface | Permission | Pilot | Class |
|--------|------------|-------|-------|
| Organisationseinheiten | `org.view` / `org.manage` | Patrick: `org.view` only | **READY** |
| Teams / Vereine read | `teams.view`, `org.view` | Patrick read | **READY** |
| Personen | `people.view` | **Exclude** (sensitive) | **READY** |
| Anmeldungen | `registrations.view` / `edit` | **Exclude** unless explicitly needed | **READY** |
| Mitglieder / Helfereinsätze / Trainer&Staff / Formulare / Vorfälle | `users.manage_memberships` | Hidden without key | **MOCKED** shell (`FutureModuleShell`) |

---

## Publizieren (Website CMS)

| Surface | Permission | Read-only pilot? | Class |
|--------|------------|------------------|-------|
| CMS / News / Pages | `news.manage`, `website.manage` | **No** read-only permission exists | **READY** editor / **GAP** read-only |
| Veröffentlichungen queue | `news.manage` \|\| `website.manage` | Full publish workflow | **READY** — not read-only |

**Publizieren read-only feasibility:** **Not supported** in-app without `news.manage` or `website.manage`. Public published news remains on `https://www.fcallschwil.ch` (outside admin app).

---

## Infoboard

| Surface | Permission | Pilot | Class |
|--------|------------|-------|-------|
| Admin boards | `infoboard.manage` \|\| `events.publish_infoboard` | **Over-grants** publish/manage | **READY** |
| Vorschau `/dashboard/infoboard/preview` | Same as above | Preview with real tenant data | **READY** (code) / **UNVERIFIED** runtime |
| Infoboard administration (create/delete boards) | `infoboard.manage` | **Exclude** | **READY** |

**Infoboard access for read-only president:** Only existing key that opens preview without full `infoboard.manage` is `events.publish_infoboard` — product copy describes display but API name implies publish authority (**permission gap**).

---

## Vereinsleitung / Führung (nav without `permissionKeys`)

| Route | Auth | Data | Class |
|-------|------|------|-------|
| `/vereinsleitung/*` meetings/targets/initiatives | **Login only** | DB-backed + visibility | **READY** but **INCOMPLETE** auth |
| `/vereinsleitung/finanzen`, `/material`, `/prozesse`, parts of `club-entwicklung` | Login only | **Demo-only** constants in page | **MOCKED** |
| Vereinsleitung meeting detail fallback | Login only | Legacy mock fallback in component | **MOCKED** partial |

**Critical:** Nav items for Meetings, Finanzen, Material, Club Entwicklung have **no** `permissionKeys` → visible to **every** authenticated club user (`hasAccess` returns true when `required` empty).

---

## Dashboard & personal tools

| Surface | Permission | Class |
|--------|------------|-------|
| Club dashboard | Authenticated club workspace | **READY** |
| Mein Konto `/dashboard/account` | Authenticated | **READY** |
| Personal calendar/widgets | Mixed; respects permissions for links | **READY** (code) / **UNVERIFIED** per-widget on STAGE |

---

## MOCKED / INCOMPLETE — hide from pilot navigation

Use existing permission model + **do not assign** keys that gate these modules; additionally block direct URLs where noted.

| Module | Why hide |
|--------|----------|
| Mitglieder, Helfereinsätze, Trainer&Staff, Formulare&Freigaben, Vorfälle&Disziplin | `FutureModuleShell` marketing surface |
| Vereinsleitung → Finanzen, Material, Prozesse (demo pages) | Explicit demo-only data in source |
| Website CMS (unless editorial read role added) | No read-only permission |
| Kampagnen composer / Zielgruppen / E-Mail-Absender | Send/admin permissions |
| Tenant Administration | `users.manage_memberships` and related |

**Direct URL risk:** `/vereinsleitung/finanzen` and similar remain reachable for any logged-in user until route guards are added (**implementation gap**).

---

## UNVERIFIED (no pilot login on STAGE)

- End-to-end allocation edit in Wochenplaner UI on live STAGE data  
- Infoboard Preview Studio rendering  
- Communication inbox with real mailboxes  
- Workspace document actions on shared folders for pilot persons  

---

## Existing equivalent roles (do not reuse as-is)

| Role key | Why unsuitable |
|----------|----------------|
| `match_coordinator` | Includes `events.manage`, `facilities.manage`, `infoboard.manage`, fixture publish |
| `trainer` | Includes `events.manage`; no training allocation keys |
| `viewer` | Includes `people.view`; no planning allocation |
| `club_admin__fc-allschwil` | Full tenant admin |
| Archived/custom roles | User instruction: do not reuse archived roles |
