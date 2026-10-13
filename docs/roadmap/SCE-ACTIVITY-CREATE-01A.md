# SCE-ACTIVITY-CREATE-01A — Unified Activity Creation — Research & Architecture

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-ACTIVITY-CREATE-01A` |
| **Programme** | [`SCE-ACTIVITY-CREATE-01`](./SCE-ACTIVITY-CREATE-01.md) |
| **Status** | **IMPLEMENTED_PENDING_ARCHITECTURE_REVIEW** |
| **STAGE baseline** | `d61782b8c8f7d54f74746fa9bdb62ee71b789a9a` |
| **Branch** | `cursor/sce-activity-create-01a-research-architecture` |
| **Predecessor** | [`SCE-CLUB-EVENT-AUDIENCE-01`](./SCE-CLUB-EVENT-AUDIENCE-01.md) **CLOSED** (PR #837 merged) |
| **Successor (if gate passes)** | `SCE-ACTIVITY-CREATE-01B+` |
| **01H** | **NOT_STARTED** — boundary documented below |

## Preflight (executed)

| Check | Result |
|-------|--------|
| `origin/STAGE` | `d61782b8c8f7d54f74746fa9bdb62ee71b789a9a` |
| PR #837 | **MERGED** |
| SCE-CLUB-EVENT-AUDIENCE-01 | **CLOSED** (R1 + R1.1) |
| SCE-UI-ROLLOUT-01H | **NOT_STARTED** |
| Feature branch | `cursor/sce-activity-create-01a-research-architecture` |
| STAGE drift | None requiring `STAGE_DRIFT_REVIEW_REQUIRED` |
| Product code | **Not implemented** (`SceActivityComposer` absent) |
| DB | **No** schema/migration |

---

## 1. Product objective

Establish feasibility for **`SceActivityComposer`**: one creation UX family for **Training**, **Match**, **Tournament**, and **Club Event**, with:

- Desktop / large tablet: large contextual composer overlay
- Narrow / mobile: full-screen composer (same draft/components)
- Deep link / bookmark: canonical full-page `/new` shell

Principle: **one creation language, domain-specific workflows** — not four duplicate forms or one JSON CRUD generator.

Primary product value: **contextual continuity** (user stays in planning context; filters/scroll restored after success).

---

## 2. Deep audit — creation flows

### CLUB_EVENT

| Area | Findings |
|------|----------|
| **Entry points** | `VeranstaltungenManagementWorkspace` (+ empty state), `VeranstaltungenManagementQuickAccess`, `PlanningHubCreateMenu` |
| **Routes** | `GET /dashboard/veranstaltungen/new`; `?tab=` (`uebersicht` · `gueltigkeit` · `termin` · `ressourcen` · `publikation`) |
| **Form architecture** | `VeranstaltungCreateForm` (client state) inside `PlanningEditorShell` + `ClubEventCreateWorkflowShell` → `SceContextTabsBoundary` |
| **Validation** | `computeClubEventCreateTabErrors` / `firstInvalidClubEventCreateTab`; submit sets tab via `router.push(buildContextTabHref(...))` |
| **Submit** | `POST /api/events` (`type: OTHER`, audience, recurrence, `facilityResourceIds`) |
| **Permissions** | Page: `PERMISSIONS.EVENTS_MANAGE` (`requirePermission`) |
| **Resources** | Pitch/hall, dressing room, other via `PlanningSingleResourceAssignment` + `GET /api/facilities/availability` |
| **Recurrence** | `ClubEventSeries` + materialized occurrences; `VeranstaltungRecurrenceFields` (SwitchThumb) |
| **Publication** | `VeranstaltungAusspielungFields` / website-homepage-wochenplan toggles |
| **Child interactions** | `ClubEventOrganisationalAudienceEditor`: segmented scope + **`SceChipMultiSelectorField` → Sheet selector** |
| **Post-create** | Navigate to `/dashboard/veranstaltungen/{id}/edit` or list `?submitted=1`; `router.refresh()` |
| **Responsive** | Full-page; sticky actions via planning editor patterns |
| **a11y** | Context tabs + form labels; switches not checkboxes |
| **Dirty state** | `SceContextDirtyGuardProvider` on shell |
| **Tests** | `club-event-create-workflow.test.ts`, `VeranstaltungCreateWorkflowR1_1.test.ts`, field tests |

### TRAINING

| Area | Findings |
|------|----------|
| **Entry points** | `TrainingManagementWorkspace`, `TrainingManagementQuickAccess`, `TrainingCreateMenu`, `PlanningHubCreateMenu` |
| **Routes** | `/dashboard/training/new` |
| **Form architecture** | `TrainingSeriesCreateForm` — **guided numbered sections** (single scroll surface), not context tabs |
| **State** | Local React state; `TeamSeasonSearchablePicker` |
| **Validation** | Inline before submit; collapsible guided steps |
| **Submit** | `POST /api/training-series` with `facilityResourceIds` (atomic server allocation) |
| **Permissions** | `requireAnyPermission(TRAININGS_MANAGE \| TRAININGS_VIEW)`; create gated by `TRAININGS_MANAGE` via `canValidateDirectly`; teams filtered by `planning-authorization-policy.getWritableTeamIds(..., "training")` |
| **Resources** | Same availability hook as other domains |
| **Recurrence** | Binary Ja/Nein radiogroup + end date; derives single weekday from initial date |
| **Publication** | `PlanningPublicationPanel` / team publication sections when permitted |
| **Child interactions** | Inline combobox pickers — **no Dialog** on create path |
| **Post-create** | `/dashboard/training/sessions/{firstSessionId}/edit` or series edit |
| **Shell** | `TrainingRecordWorkspaceShell` |
| **Tests** | Planning UX sentinels, training create tests |

### MATCH

| Area | Findings |
|------|----------|
| **Entry points** | `SpieleManagementQuickAccess`, header menu, `MatchcenterOverview`, `PlanningHubCreateMenu` |
| **Routes** | `/dashboard/matchcenter/new` (legacy `/dashboard/events/matches/new` + `MatchEventCreateForm` still exists separately) |
| **Form architecture** | `MatchCreateForm` — guided steps (8 sections including review copy) |
| **State** | Client; lazy `fetch /api/seasons`, `/api/planning/writable-teams?domain=match` |
| **Submit** | `orchestrateMatchCreation` → `POST /api/events` + `PATCH /api/matchcenter/:id` for pitch/dressing codes |
| **Permissions** | `EVENTS_MANAGE \| EVENTS_VIEW`; direct-create copy uses publish permissions |
| **Resources** | HOME only — availability fetch; AWAY skips facilities |
| **Recurrence** | **Not supported** on create |
| **Publication** | `MatchPublicationToggles` |
| **Child interactions** | `ExternalClubPicker` (inline search), `HomeAwaySegmentedControl`, writable team picker |
| **Post-create** | List `?submitted=1` or link to match record |
| **Shell** | `SpieleRecordWorkspaceShell` |
| **Tests** | `MatchCreateForm.test.tsx`, planning sentinels |

### TOURNAMENT

| Area | Findings |
|------|----------|
| **Entry points** | `TournamentCenterWorkspace` create href, `PlanningHubCreateMenu` |
| **Routes** | `/dashboard/tournamentcenter/new` |
| **Form architecture** | `TournamentCreateForm` — large guided surface inside `TurniereRecordWorkspaceShell` sections |
| **Submit** | `orchestrateTournamentCreation` — multi-step client orchestration (partial failure possible) |
| **Permissions** | `EVENTS_MANAGE \| EVENTS_VIEW`; facilities time standards via `FACILITIES_MANAGE` |
| **Resources** | Multi resource + per-participant dressing rooms (HOME) |
| **Recurrence** | **Not supported** |
| **Publication** | `TournamentPublicationToggles` |
| **Child interactions** | `TournamentParticipantAddWorkflow`, `ExternalClubPicker`, `StaticOptionSearchablePicker`, organizer field |
| **Post-create** | List `?submitted=1` or edit route; partial failure banner |
| **Shell** | `PageShell` + tournament record sections |
| **Tests** | Tournament create/orchestration tests |

### Structural equivalence

**Not equivalent.** Club Event is the only domain with **Universal Context Tabs** on create. Training/Match/Tournament share **guided-step scroll UX** (01B–01F must converge on tab contract without losing domain semantics).

---

## 3. Nested dialog risk register

| DOMAIN | INTERACTION | CURRENT_PATTERN | COMPOSER_RISK | RECOMMENDED_PATTERN |
|--------|-------------|-----------------|---------------|---------------------|
| CLUB_EVENT | Org audience multi-select | `SceChipMultiSelectorField` → `SceListSelectorPanel` **Sheet** | **High** — sheet + modal lifecycle on top of composer overlay | Inline discover panel, combobox, or composer-embedded selector host (no second portal stack) |
| CLUB_EVENT | Date/time | Native inputs | Low | Keep inline |
| TRAINING | Team/season | `TeamSeasonSearchablePicker` combobox | Low | Keep inline |
| MATCH | Team | Writable teams fetch + select UI | Low | Keep inline |
| MATCH | Opponent | `ExternalClubPicker` dropdown | Low | Keep inline |
| MATCH | HOME resources | Inline assignment | Low | Keep inline |
| TOURNAMENT | Participants | Inline add workflow | Medium (complex layout) | Keep inline; ensure composer body scroll |
| TOURNAMENT | External club | `ExternalClubPicker` | Low | Keep inline |
| ALL | Facility pickers | Inline `PlanningResourcePicker` / assignment rows | Low | Keep inline |
| ALL | Publication | Toggle rows | Low | Keep inline |

**BLOCKERS:** None absolute — **Club Event audience Sheet** is the primary **conditional** blocker for overlay adoption.

**RECOMMENDED_REPLACEMENTS:** Refactor audience target picking to a composer-safe pattern in **01C** before enabling overlay from Veranstaltungen list.

---

## 4. Shared architecture proposal

| Topic | Recommendation |
|-------|----------------|
| **PROPOSED_PRIMITIVE** | `SceActivityComposer` — modes `overlay` \| `page` \| `fullscreen` |
| **CREATION_CONTRACT** | `SceActivityCreateDefinition` orchestrating domain tab config + adapters (see design doc) |
| **CONTAINER_STRATEGY** | Host selects mode; domain content agnostic |
| **DOMAIN_COMPONENT_STRATEGY** | Extract tab panels from existing forms; no generic field renderer |
| **UNIVERSAL_TABS_REUSE** | **Yes** — extend `lib/context-tabs`; Club Event config is reference |
| **DIRTY_GUARD_REUSE** | **Yes** — extend for close/backdrop/Escape in composer wrapper |
| **RESOURCE_ENGINE_REUSE** | **Yes** — `getFacilitiesForTenant`, `/api/facilities/availability`, allocation POST paths unchanged |
| **DOMAIN_API_REUSE** | **Yes** — no `POST /api/activity`; keep domain endpoints |

### Container responsibilities

**Shell:** focus, scroll lock, backdrop, header/footer, responsive mode, origin restoration.

**Domain:** fields, validation, tabs, submit adapters, error retention on failure.

### Desktop overlay feasibility

**FEASIBLE** using existing `SceModalOverlay`, workspace dialog max width (~1160px desired cap in tokens), `--sce-dialog-max-height`, sidebar-aware content viewport.

Constraints: z-index via overlay root; planner must expose `data-sce-modal-background`; toasts remain above overlay; avoid `Dialog` size="md" for composer body.

### Mobile / narrow

**FEASIBLE:** same component tree; composer switches to `fullscreen` using full viewport panel (reuse sheet/dialog full-height patterns from globals.css breakpoints).

Breakpoint source: `lib/shell/responsive-layout.ts` + `app/globals.css` SCE responsive tokens (align with existing admin mobile nav collapse).

### Full-page shared rendering

**FEASIBLE:** Club Event already separates `VeranstaltungCreateForm` from page shell. Training/Match/Tournament require extracting body from page-only headers into shared inner component consumed by `/new` and composer.

### Context restoration

**FEASIBLE** with **`SceActivityCreateOriginContext`** (proposed):

- Capture: pathname, search params, scroll key (optional sessionStorage), hub filter state
- On success: close composer → `router.replace(origin)` + refresh + toast
- Do not persist UI state to DB

Today all domains **navigate away to edit** — composer product value requires changing default when `origin` is planning.

---

## 5. Proposed domain tab maps (hypothesis → audit-adjusted)

| Domain | Proposed tabs | Rationale vs hypothesis |
|--------|---------------|-------------------------|
| **CLUB_EVENT** | Übersicht · Gültigkeit · Termin · Ressourcen · Publikation | **Matches STAGE** — reference implementation |
| **TRAINING** | Übersicht · Team · Termin · Wiederholung · Ressourcen · Publikation | Split recurrence from Termin (guided step 3); team isolated (step 1) |
| **MATCH** | Übersicht · Teams · Termin · Ressourcen · Spielbetrieb | «Spielbetrieb» holds home/away, opponent, location, publication/review copy — not identical to training «Publikation» alone |
| **TOURNAMENT** | Übersicht · Teams · Termin · Ressourcen · Publikation | Teams tab includes participants + dressing drafts; matches hypothesis |

Uniformity = shared **interaction** (tabs, footer, validation), not identical tab labels.

---

## 6. Permissions

| DOMAIN | VIEW (reach surface) | CREATE / MANAGE | SCOPE NOTES |
|--------|----------------------|-----------------|-------------|
| CLUB_EVENT | N/A for create page | `EVENTS_MANAGE` | Full club event authority |
| TRAINING | `TRAININGS_VIEW` can load page | Effective create: `TRAININGS_MANAGE` + writable team seasons | Team-scoped via policy |
| MATCH | `EVENTS_VIEW` | Create via `EVENTS_MANAGE` + writable teams API | Publish copy uses publish permissions |
| TOURNAMENT | `EVENTS_VIEW` | `EVENTS_MANAGE` | Participant/orchestration unchanged |

**DIRECT_ROUTE_GUARD:** Server `requirePermission` / `requireAnyPermission` on `/new` pages — **keep**.

**COMPOSER_TRIGGER_GUARD:** Must mirror same checks client-side (hide trigger) + server on submit — ADR-09.

---

## 7. Recurrence

| Domain | Supported | Model | UI |
|--------|-----------|-------|-----|
| CLUB_EVENT | Yes | `ClubEventSeries` + materialized `Event` | Natural language + SwitchThumb |
| TRAINING | Yes | `TrainingSeries` weekday schedules | Ja/Nein + end date |
| MATCH | No | — | — |
| TOURNAMENT | No | — | — |

**SHARED_UI_FEASIBILITY:** Presentation primitives (summary, bounded preview) can be shared; **persistence models must not merge**.

---

## 8. Resource integrity

| Item | Source |
|------|--------|
| **CANONICAL_RESOURCE_SOURCE** | `getFacilitiesForTenant` + admin facilities |
| **CONFLICT_ENGINE** | `/api/facilities/availability` + server validation on create |
| **DOMAIN_INCONSISTENCIES** | Match persists pitch/dressing via **legacy codes** on PATCH matchcenter; Training/Tournament/Club Event use resource IDs — documented for 01H/facility work, not composer-specific |

---

## 9. API / transaction boundaries

| Domain | Boundary |
|--------|------------|
| Club Event | Single `POST /api/events` (atomic recurrence + resources) |
| Training | Single `POST /api/training-series` (atomic) |
| Match | Client orchestration: event POST + match PATCH |
| Tournament | Multi POST orchestration — partial failure UX must remain in composer |

Composer calls **existing adapters** — no generic activity API.

---

## 10. Performance

- Lazy-load seasons/writable teams/clubs on tab focus where possible
- Club directory: search-on-demand (never full directory eager load)
- Facility groups: server-provided on open (acceptable); cache per composer session
- Avoid refetch loops when switching tabs — keep draft in composer state

---

## 11. Failure / recovery

| Failure | Behaviour |
|---------|-----------|
| Validation | Stay open; first invalid tab |
| Network/server | Keep draft; show domain error string |
| Tournament partial orchestration | Keep composer open; show existing partial banner pattern |
| Resource conflict | Actionable server message; no close |

---

## 12. Toggle First audit

| Domain | Notes |
|--------|-------|
| CLUB_EVENT | PASS — SwitchThumb; multi-select audience legitimate |
| TRAINING | Recurrence uses radiogroup (binary) — align to `SceSegmentedControl` in adoption |
| MATCH | Segmented + publication toggles — PASS |
| TOURNAMENT | Publication toggles — PASS |

**BINARY_CONTROL_COMPLIANCE_TARGET:** PASS before each domain migrates to composer.

---

## 13. Accessibility gate

| Requirement | Assessment |
|-------------|------------|
| Dialog semantics (overlay) | Reuse `SceModalOverlay` + labelled header |
| Focus trap / restore | **EXISTING** modal lifecycle |
| Escape / dirty close | **NEW_REQUIRED** wiring to dirty guard |
| Keyboard tabs | **EXISTING** `SceContextTabs` |
| SR validation | Field errors + tab labels with `•` marker |
| Reduced motion | Follow global SCE prefs |

**RESULT:** **FEASIBLE** if composer uses canonical modal infrastructure — not `position:fixed` alone.

---

## 14. ADR-11 summary

See [`SCE-UI-ROLLOUT-ADRS.md`](../design/SCE-UI-ROLLOUT-ADRS.md) **ADR-11**.

| Option | Score (summary) |
|--------|-----------------|
| A — Full-page only | Fails contextual continuity (primary PO value) |
| B — Domain modals | High maintenance; duplicates shell |
| C — Adaptive composer + `/new` | Best alignment; conditional on selector + UX convergence |
| D — Forced wizard | Rejected — contradicts Club Event + free tab navigation |

**RECOMMENDATION:** **Option C**

---

## 15. Feasibility gates

| Gate | Result |
|------|--------|
| OVERLAY_FEASIBLE | **YES** (tokens + overlay exist) |
| FULLSCREEN_MOBILE_FEASIBLE | **YES** |
| FULL_PAGE_SHARED_RENDERING_FEASIBLE | **YES** (refactor required for 3 domains) |
| NESTED_DIALOG_RISK_ACCEPTABLE | **CONDITIONAL** — audience Sheet must be replaced/embedded |
| CONTEXT_RESTORATION_FEASIBLE | **YES** with origin context contract |
| SHARED_CREATION_CONTRACT_FEASIBLE | **YES** |
| DOMAIN_API_REUSE_FEASIBLE | **YES** |
| ACCESSIBILITY_FEASIBLE | **YES** |
| RESPONSIVE_FEASIBLE | **YES** |

### ACTIVITY_COMPOSER_ARCHITECTURE_GATE: **CONDITIONAL_PASS**

**Prerequisites:**

1. Composer-safe org-audience selector (no Sheet-on-overlay)
2. Extract shared create bodies from Training/Match/Tournament for dual container render
3. Composer dirty-close parity (X, backdrop, Escape)
4. Define `SceActivityCreateOriginContext` + success contract for planning launches
5. PO approval of tab maps per domain

---

## 16. Proposed implementation packages

### 01B — Activity Composer Foundation

| | |
|-|-|
| **OBJECTIVE** | `SceActivityComposer` shell, modes, origin context, creation contract types, dirty-close |
| **IN_SCOPE** | Overlay/page/fullscreen, focus/scroll, footer slot, tests A–H |
| **OUT_OF_SCOPE** | Domain migration |
| **DEPENDENCIES** | 01A approval |
| **MIGRATION_RISK** | Low — additive |
| **AUTOMATED_GATES** | Shell a11y, focus trap, responsive mode tests |
| **PO_UAT_TARGET** | Shell prototype on sce-preview route (optional) |

### 01C — Club Event reference adoption

| | |
|-|-|
| **OBJECTIVE** | First domain on composer; overlay from Veranstaltungen |
| **IN_SCOPE** | Wire `VeranstaltungCreateForm` / tabs; audience selector refactor |
| **OUT_OF_SCOPE** | Edit flow changes |
| **DEPENDENCIES** | 01B |
| **MIGRATION_RISK** | Medium — selector refactor |
| **PO_UAT** | Contextual create from filtered list |

### 01D — Training adoption

| | |
|-|-|
| **OBJECTIVE** | Tabbed create + composer + retain atomic POST |
| **IN_SCOPE** | Guided → tab panels; team/recurrence/resources |
| **DEPENDENCIES** | 01B, 01C patterns |
| **MIGRATION_RISK** | High — largest UX restructure |

### 01E — Match adoption

| | |
|-|-|
| **OBJECTIVE** | Tabbed create; HOME/AWAY resource rules preserved |
| **DEPENDENCIES** | 01B |
| **MIGRATION_RISK** | Medium |

### 01F — Tournament adoption

| | |
|-|-|
| **OBJECTIVE** | Tabbed create; partial failure UX in composer |
| **DEPENDENCIES** | 01B |
| **MIGRATION_RISK** | Medium–high (orchestration) |

### 01G — Planning-surface integration & closure

| | |
|-|-|
| **OBJECTIVE** | Wochenplaner, hub menus, highlight/new row, success toasts |
| **IN_SCOPE** | Origin context wiring, cache invalidation |
| **OUT_OF_SCOPE** | 01H card/grid migrations |
| **DEPENDENCIES** | 01C–01F as available |

---

## 17. Boundary with 01H and 01I

| Package | Responsibility |
|---------|----------------|
| **ACTIVITY-CREATE** | How activities are **created** (composer + `/new`) |
| **01H** | How activities are **presented/managed** on core planning surfaces (cards, grids, audience-aware list behaviour) |
| **Overlap prevention** | 01G wires **create triggers + return context**; 01H adopts **presentation** of newly created items — no duplicate form migration |
| **01I (future)** | Team Programme launches same composer with `origin=TEAM_PROGRAMME`, `teamId` + season prefilled — no separate Team create UX |

---

## 18. Mobile roadmap

Reuse: creation contract, validation, API adapters, activity identity, permission flags. Native shell later — **not 01A scope**.

---

## 19. Test architecture (future)

Minimum coverage listed in prompt §29 — implement in 01B+ (not bulk-added in 01A).

**01A guardrail:** `lib/planning/__tests__/sce-activity-create-01a-architecture-gate.test.ts` — docs + no premature composer implementation.

---

## 20. Validation (this package)

| Item | Result |
|------|--------|
| RUNTIME_CODE_CHANGED | Guardrail test only |
| TESTS | Architecture gate test |
| BUILD | Optional — docs-only |
| MANUAL_UAT_BY_CURSOR | **SKIPPED_PO_OWNED** |
| SCREENSHOTS_BY_CURSOR | **SKIPPED_PO_OWNED** |

---

## 21. Safety confirmation

| Rule | Status |
|------|--------|
| PROD | Untouched |
| DB_MUTATION | No |
| ACTIVITY_COMPOSER_IMPLEMENTED | No |
| 01H_STARTED | No |
| 01B_STARTED | No |

**NEXT_DECISION:** PO architecture review
