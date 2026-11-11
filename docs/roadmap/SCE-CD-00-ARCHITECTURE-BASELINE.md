# SCE-CD-00 — Club Development 2.0 Architecture & Implementation Baseline

**Programme:** SCE-CD-00  
**Status:** Architecture review (no feature implementation)  
**Repository:** Clipse078/sportclubevo-webapp  
**Base branch:** STAGE @ `e0ce400fa8215f1e3e841ee841376f14097ed4f1` (includes merged PR #956, SCE-UX-01A/B composer shell)

**Product principle:** *Simple understanding. Shallow navigation. Deep capability.*

---

## Executive summary

Club Development (Vereinsentwicklung) has **three production domains** — **Ziele**, **Initiativen**, and **Sitzungen** — with REST APIs, visibility, governance stages, and SCE-UX-01A/B composer workflows. **Operational Aufgaben** are mature under `/dashboard/aufgaben` with meeting context integration only.

The largest gaps for 2.0 are: **demo-only** overview (`/vereinsleitung/club-entwicklung`), **demo-only Prozesse**, **no Process persistence**, **split work systems** (Initiative vs Aufgaben vs `MeetingAction`), **no scoped goals** (club / OrgUnit / team), **no calculated metrics**, and **meeting sub-entity UI** despite complete APIs.

**Recommended first build:** **SCE-CD-01 — Real Vereinsentwicklung overview hub** (permission-aware aggregates from existing queries; no new KPI fiction).

---

## Phase A — Preflight (verified)

| Check | Result |
|-------|--------|
| Origin | `Clipse078/sportclubevo-webapp` |
| Working tree | Clean at branch creation |
| `origin/STAGE` | Fast-forwarded to `e0ce400fa` |
| PR #956 | Merged 2026-11-11; commit on STAGE |
| Baseline SHA | Contained in STAGE |
| Open PR deps | No open PRs block CD review; NAV-IA-V2 and DASHBOARD-UX-01 are adjacent but not hard blockers |

**Reuse from PR #956:** `SceClubDevelopmentComposerShell`, `ClubDevelopmentFormWorkflowShell`, dirty-close guards on Target / Initiative / Meeting forms.

---

## Phase B — Current state by area

### B.1 Pläne & Ziele (`Target`)

| Aspect | State |
|--------|--------|
| **Working** | Full CRUD (`/api/targets/*`), metrics + datapoints, review stage, JSON links to initiatives/meetings, visibility (`VisibilityScope` + allowlists for roles/users/org units/target groups), list/detail/edit, composer + `/new` deep links |
| **Partial** | Metrics: `PERCENTAGE`, `NUMERIC`, `CURRENCY`, `BOOLEAN` only; manual `currentValue`; `nudgeJson` field exists, **no UI or writers** |
| **Missing** | Scope level (club / OrgUnit / team), hard vs soft enforcement, inherited standards + exceptions, auto-calculated metrics, expanded measurement types (ratio, duration, date, frequency, rating), comparison operators, metric owners/sources, team/person visibility UI (`visibleTeamRefs` / `visiblePersonRefs` in schema only) |
| **Reuse** | `TargetForm`, `TargetMetricProgress`, `TargetDataPointForm`, `TargetLinksPanel`, `TargetStageActions`, `lib/targets/queries.ts`, `lib/visibility/*` |
| **Permissions** | `targets.view` / `targets.manage` / `targets.delete`; `VEREINSLEITUNG_STRATEGIC_VIEW_PERMISSIONS` for nav |

### B.2 Initiativen (`Initiative`)

| Aspect | State |
|--------|--------|
| **Working** | CRUD, slug URLs, governance, visibility, progress field (manual %), composer parity with targets |
| **Partial** | Owner is free text, not canonical person/role selector |
| **Missing** | `TaskContextType.INITIATIVE`, contextual Aufgaben panel, tasks/subtasks under initiative, computed progress from linked work, FK links (only target→initiative JSON refs) |
| **Reuse** | `InitiativeForm`, list/detail pages, same visibility/governance patterns as Target |

### B.3 Aufgaben & subtasks (`Task`)

| Aspect | State |
|--------|--------|
| **Working** | Canonical domain at `/dashboard/aufgaben`; subtasks (`parentTaskId`, depth 1); series; assignees; org unit on task; context types: MATCH, TRAINING, TOURNAMENT, CLUB_EVENT, **MEETING**, REGISTRATION, TEAM, PERSON, DOCUMENT |
| **Partial** | Meeting detail has `ContextRelatedTasksPanel` + contextual create |
| **Missing** | Initiative/target/process context; unified progress rollup for CD-WORK; strategic tasks not grouped under Vereinsentwicklung nav |
| **Reuse** | `task-service`, contextual panels, `AufgabenFullCreateClient`, DS2 form shells |

### B.4 Prozesse & Richtlinien

| Aspect | State |
|--------|--------|
| **Working** | None persisted |
| **Demo** | `/vereinsleitung/prozesse` — static `DEMO_*` data, disabled create, `requireVereinsleitungDemoAccess()` |
| **Missing** | Entire CD-PROCESS domain: model, draft/publish, steps, responsibilities, version history, read-only documentation UX |
| **Note** | Product direction: **documentation-first**, execution optional later — do not conflate with Aufgaben checklist demo |

### B.5 Sitzungen 2.0 (`Meeting` + children)

| Aspect | State |
|--------|--------|
| **Working** | Meeting CRUD, visibility, governance; **API-complete** for agenda, decisions, actions, participants |
| **Partial** | Detail page loads DB sub-entities when meeting exists; cards fall back to MOCK when no DB row; metadata edit via `MeetingForm` |
| **Missing** | In-app editors for agenda/decisions/actions/participants; lifecycle *Vorbereiten → Durchführen → Protokoll genehmigen → Nachverfolgen*; formal Protokoll artifact; recurring meetings; merge `MeetingAction` → `Task` (noted as AUFGABEN-04 follow-on) |
| **Reuse** | Meeting cards, composers, `getMeetingSubEntities`, REST sub-routes under `/api/meetings/[id]/*` |

### B.6 Vereinsentwicklung overview

| Surface | Data |
|---------|------|
| `/vereinsleitung` (Vereinsleitung hub) | **Live** — targets, meetings, initiatives, `governance-overview`, operative KPI counts |
| `/vereinsleitung/club-entwicklung` (nav “Club Entwicklung”) | **Demo** — `DEMO_PROCESSES`, invented KPI strip |
| `/vereinsleitung/kpis` | **Demo** — static numbers |

**Gap:** Nav points users to the demo hub; the live governance summary already exists one level up (`/vereinsleitung`).

### B.7 Organisation units & teams

- Strategic entities use **visibility allowlists** (`visibleOrgUnitRefs`), not **ownership scope** on the entity.
- **Tasks** carry `orgUnitId` and TEAM context for operational work.
- No inheritance path from club-wide target → OrgUnit → team.

### B.8 Cross-cutting

| Layer | Owner paths |
|-------|-------------|
| Nav | `lib/nav/nav-config.ts` — label “Club Entwicklung”; V2 target label **Vereinsentwicklung** (`SCE-NAV-IA-V2-01`) |
| IA matrix | `lib/nav/nav-ia-v2/target-ia-matrix.ts` — L2 Vereinsentwicklung: hub, Ziele, Initiativen, Prozesse |
| Permissions | `lib/nav/vereinsleitung-access.ts` — strategic vs demo permission sets |
| Linking | `lib/linking/helpers.ts` — phase-1 JSON refs |
| UX contract | `docs/ux/SCE-UX-01-interaction-workflow-audit.md`, `components/sce/club-development/*` |

**Sprints:** No agile “Sprint” entity in Vereinsentwicklung; omit from nav until real functionality exists.

---

## Phase C — Target architecture (capability map)

Capabilities are numbered for implementation packages; **none are implemented in SCE-CD-00**.

### CD-GOALS — Pläne & Ziele

**Intent:** Goals at **club**, **OrgUnit**, and **team** levels with inherited standards and explicit exceptions; **hard** (mandatory) vs **soft** (aspirational) targets; rich measurements including auto-calculated metrics from club data.

**Current foundation:** `Target` + `TargetMetric` + `TargetDataPoint`; categories, periods, directions.

**Architecture (incremental, not a rules engine):**

1. **Scope** — Add `scopeType` (`CLUB` | `ORG_UNIT` | `TEAM`) + `scopeId` (nullable for club). Visibility remains separate from scope.
2. **Enforcement** — `metricKind: HARD | SOFT` on `TargetMetric` (or target-level default). Hard breaches surface status labels (e.g. *Vorgabe nicht erfüllt*); soft breaches use nudges only.
3. **Measurement catalog v1** — Small set of **computed** metrics via dedicated evaluators (e.g. eligible trainers vs players per team), not a generic DSL. Each evaluator declares: inputs, missing-data behaviour (**no false warnings**), comparison, recommended action text.
4. **Manual metrics** — Extend `TargetMetricType` gradually (ratio, date deadline, duration) only when UI can render them reliably; keep ISO 4217 on currency fields.
5. **Nudging** — Use existing `nudgeJson` + new read models for: personal dashboard widgets, team cockpit strips, OrgUnit views, central goals overview. Permission-filtered like list queries.
6. **Inheritance** — Phase 2: club-defined templates pushed to OrgUnits/teams with `exceptionReason` on overrides.

**Do not rebuild:** Existing CRUD, metrics UI, datapoints, stage workflow, composer shell.

### CD-WORK — Vorhaben & Aufgaben

**Intent:** One user-facing workspace unifying **Initiativen** and related **Aufgaben** while preserving domain tables.

**Architecture:**

1. Add `TaskContextType.INITIATIVE` (and optionally `TARGET` later) with registry entries mirroring MEETING pattern.
2. New route under Vereinsentwicklung: **Vorhaben & Aufgaben** (split from demo “Prozesse & Aufgaben” label in nav).
3. **Initiative detail:** contextual task panel + progress = rollup of linked tasks (weighted by status) alongside manual `progress` during transition.
4. Deep links: initiative ↔ target ↔ meeting (retain JSON refs; optional FK migration in later package).
5. Keep `/dashboard/aufgaben` as the global task inbox; CD-WORK is a **filtered lens**, not a fork.

### CD-PROCESS — Prozesse & Richtlinien

**Intent:** Separate **documentation** feature; read without starting workflows.

**Architecture:**

1. New Prisma models: `Process` (title, category, status DRAFT|PUBLISHED, visibility), `ProcessStep` (order, responsibility ref, body, links), `ProcessVersion` (immutable snapshot on publish).
2. Read-first UI: collapsible cards, step list, attachments via workspace links.
3. Permissions: new `processes.view` / `processes.manage` (or reuse strategic bundle initially).
4. **No** checkbox execution or auto-task generation in v1.

### CD-MEETINGS — Sitzungen 2.0

**Intent:** Full meeting lifecycle on top of existing API.

**Architecture:**

1. **UI package:** Agenda / decisions / actions / participants editors on meeting detail (inline cards + full-page for bulk edit).
2. **Lifecycle states** — Map `MeetingStatus` + `reviewStage` to user-visible phases; optional `minutesApprovedAt` field.
3. **Protokoll** — Structured export from agenda notes + decisions (PDF/HTML later); approval = stage transition.
4. **Follow-up** — Prefer canonical `Task` with `MEETING` context over duplicating `MeetingAction` long term; bridge sync in intermediate package.
5. **Recurring** — Optional `MeetingSeries` after core UI stable.

### CD-OVERVIEW — Vereinsentwicklung

**Intent:** Replace demo hub with permission-aware real data.

**Architecture:**

1. Rebuild `/vereinsleitung/club-entwicklung` (or rename route in NAV-IA follow-up) using:
   - `getTargets`, `getInitiatives`, `getMeetings`, `getOperativeStrategicCounts`, `governance-overview` helpers
   - Sections: unmet hard targets (once CD-GOALS-1 exists), assigned responsibilities (from tasks + initiatives), active initiatives, upcoming meetings, overdue meeting actions/tasks
2. **No invented KPI counts** — show only query-backed numbers or empty states.
3. Align sidebar child **Übersicht** → this hub; move **Sitzungen** under Vereinsentwicklung L2 when NAV-IA-V2 implements taxonomy (meetings currently L1 sibling in v1 nav).

---

## Phase D — UX & navigation (target)

Under **VEREIN → VEREINSENTWICKLUNG** (V2 label; routes stable in v1):

| L2 destination | Route (preserved) | Notes |
|----------------|-------------------|--------|
| Übersicht | `/vereinsleitung/club-entwicklung` | Replace demo content (CD-OVERVIEW) |
| Pläne & Ziele | `/vereinsleitung/targets` | Existing |
| Sitzungen | `/vereinsleitung/meetings` | Move under V2 L2; keep href |
| Vorhaben & Aufgaben | TBD (`/vereinsleitung/vorhaben` or split tasks lens) | CD-WORK; rename nav away from demo prozesse |
| Prozesse & Richtlinien | `/vereinsleitung/prozesse` → persisted list | CD-PROCESS |
| Sprints | — | **Omit** until supported |

**Interaction patterns (SCE-UX-01 + DS2):**

- Collapsible cards + inline edit for meeting sub-entities and process steps
- Full-page + `ClubDevelopmentFormWorkflowShell` for create/complex edit (already on targets/initiatives/meetings)
- Drawers for contextual links (goals ↔ work ↔ meetings)
- Modals: composer workspace only where already established

**Reuse:** `SceClubDevelopmentComposerShell`, `ListPagePattern` / `DetailPagePattern`, `AllowlistPanel`, `VisibilityScopeSelect`, `ReviewStageBadge`, contextual Aufgaben components.

---

## Phase E — Implementation packages (prioritized)

| ID | Name | Reuse | User-visible outcome | Data/API | Permissions | Depends on |
|----|------|-------|----------------------|----------|-------------|------------|
| **CD-01** | Real overview hub | `VereinsleitungDashboard` patterns, governance queries | Demo hub shows real goals, initiatives, meetings, attention items | None | Existing strategic view | — |
| **CD-02** | Meeting sub-entity UI | Meeting cards, existing REST | Edit Traktanden, Beschlüsse, Massnahmen, Teilnehmer in UI | None | `meetings.manage` | — |
| **CD-03** | Initiative ↔ Aufgaben | Task context registry, meeting panel pattern | Tasks on initiatives; Vorhaben lens | `INITIATIVE` in `TaskContextType` + migration | `tasks.*` + `initiatives.view` | — |
| **CD-04** | Nav & labelling patch | NAV config + IA matrix tests | “Vereinsentwicklung”, split Prozesse vs Vorhaben labels | None | — | CD-01, CD-03 route |
| **CD-05** | Goals scope v1 | Target CRUD | Pick club / OrgUnit / team on target | `scopeType`, `scopeId` on `Target` | `targets.manage` | — |
| **CD-06** | Hard/soft + metric catalogue v1 | Target metrics UI | One computed metric (trainer ratio) + hard status | `metricKind`, evaluator service | `targets.view` | CD-05 (team scope) |
| **CD-07** | Process documentation v1 | Visibility pattern from Target | Published procedures readable | `Process`, `ProcessStep`, APIs | New or strategic bundle | — |
| **CD-08** | Meeting lifecycle & Protokoll | Review stage machinery | Approve minutes, follow-up queue | Optional `minutesApprovedAt` | `meetings.manage` | CD-02 |
| **CD-09** | MeetingAction → Task bridge | Task service | Single follow-up system | Sync job or dual-write | `tasks.*`, `meetings.*` | CD-02, CD-03 |
| **CD-10** | Goal inheritance | Org templates | Club standards with team exceptions | Template tables or scoped copies | `targets.manage` | CD-05, CD-06 |

### Acceptance & test focus (per package)

| Package | Acceptance (summary) | Tests |
|---------|----------------------|-------|
| CD-01 | Hub shows 0-state without permissions leakage; counts match DB | Server query unit tests; optional Playwright smoke |
| CD-02 | CRUD round-trip for each sub-entity via UI | API tests exist; add component/integration |
| CD-03 | Create task from initiative; list filtered | Extend `aufgaben-06f*` context tests |
| CD-05–06 | Scoped target visible only in correct cockpit; evaluator silent when data missing | Prisma migration + evaluator unit tests |
| CD-07 | Publish immutability; draft not visible to readers | API + visibility tests |

### Recommended first build: **SCE-CD-01**

**Why:** Smallest diff, no schema migration, immediately fixes the worst product inconsistency (demo nav destination), reuses proven `/vereinsleitung` queries, unblocks NAV-IA-V2 labelling without inventing metrics.

**Out of scope for CD-01:** Prozesse persistence, calculated metrics, meeting editors, new permissions.

---

## Phase F — Dependencies & risks

| Risk | Mitigation |
|------|------------|
| Duplicate work systems (`MeetingAction` vs `Task`) | Document bridge in CD-09; use Task for new follow-ups in CD-02 UI |
| Demo permission gate on `/prozesse` | Replace with real permissions when CD-07 ships; until then keep demo banner on page |
| JSON entity links vs FKs | Keep JSON for CD-01–03; plan FK migration in CD-10+ |
| NAV-IA-V2 moves Meetings under Vereinsentwicklung | Coordinate with NAV programme; hrefs unchanged |
| Over-engineering metrics | Catalogue of named evaluators only; no rules DSL in v1 |

---

## Appendix — Key file index

| Area | Paths |
|------|--------|
| Routes | `app/(admin)/vereinsleitung/**` |
| APIs | `app/api/targets/**`, `app/api/initiatives/**`, `app/api/meetings/**` |
| Queries | `lib/targets/queries.ts`, `lib/initiatives/queries.ts`, `lib/meetings/queries.ts` |
| Schema | `prisma/schema.prisma` (`Target`, `TargetMetric`, `Initiative`, `Meeting*`, `Task`) |
| Composer UX | `components/sce/club-development/*` |
| Aufgaben context | `lib/tasks/task-context-types.ts`, `lib/tasks/context-registry.ts` |
| Demo surfaces | `club-entwicklung/page.tsx`, `prozesse/page.tsx`, `kpis/page.tsx` |

---

*SCE-CD-00 delivers assessment and plan only. Implementation tracked as SCE-CD-01+.*
