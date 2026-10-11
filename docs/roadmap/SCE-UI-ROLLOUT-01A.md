# SCE-UI-ROLLOUT-01A — Product-wide UI Inventory & Canonical UX Architecture

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01A` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **CLOSED** (architecture / inventory only — no product migration) |
| **Branch** | `cursor/sce-ui-rollout-01a-product-wide-ui-architecture` |
| **Base** | `STAGE` @ `a5eadd4b4a69186a90af5a0d49fcba57efd501fc` |
| **Schema / PROD** | **No changes** |

---

## 1. Purpose

Before migrating SCE product UI, establish an **evidence-based map** of how activities, tabs, and workspace surfaces are implemented today, and specify **contracts** that packages **01B–01N** implement against.

01A answers:

1. How SCE represents Training, Match, Tournament, and Club Event activities.
2. Where those representations live (files, routes, data sources).
3. Which implementations are canonical vs duplicated vs legacy.
4. Which detail workspaces use contextual tabs vs other navigation.
5. Which shared primitives can evolve into the unified experience system.
6. Which view-model / formatter inconsistencies block uniform presentation.
7. How incremental migration avoids a big-bang rewrite.

**Non-goals:** visual rewrite, mechanical component replacement, parallel design systems, 01B–01N implementation, Sponsor, Mobile, PROD.

---

## 2. Inventory methodology

1. **Repository-wide search** — domain types (`Event.type`, `TRAINING`, `MATCH`, `TOURNAMENT`, club events), home/away fields, `?tab=`, `useSearchParams`, route builders, card/list/calendar surfaces (not filename-only).
2. **Follow imports** — from canonical modules (`lib/activity-navigation`, `lib/sporting-activity-presentation`, `lib/sporting-activity-design`) to consumers.
3. **Classify each finding** — `CANONICAL` | `PARTIAL` | `LEGACY` | `NOT_APPLICABLE`.
4. **Match invariant audit** — every match presentation checked against PO order: **HOME NAME | HOME LOGO | VS | AWAY LOGO | AWAY NAME**.
5. **Cross-check docs** — [`SCE-ACTIVITY-NAV-01`](../activity-navigation/SCE-ACTIVITY-NAV-01.md), [`SCE-UI-STANDARD-01`](../design/SCE-WORKSPACE-SURFACE-STANDARD.md), [`SCE-ACTIVITY-DESIGN-01`](./SCE-ACTIVITY-DESIGN-01.md), [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md).

Deliverables: see §8.

---

## 3. Executive findings

### 3.1 One SCE — current state

| Layer | Canonical anchor | Adoption |
|-------|------------------|----------|
| Atmospheric background + workspace surface | `SceWorkspaceSurface`, `SCE-UI-STANDARD-01` | **PARTIAL** — activity detail + communication reference; many management hubs still legacy chrome |
| Context header + tabs | `ActivityDetailNavigation` + `lib/activity-navigation` | **CANONICAL** for 4 activity types only |
| Activity identity (cards/rows) | `lib/sporting-activity-design` + `components/sporting-activity` | **PARTIAL** — Mein Programm / some management rows; Matchcenter/Infoboard/Wochenplan duplicates remain |
| Presentation read-model | `lib/sporting-activity-presentation` | **PARTIAL** — programme/calendar adapters; not all surfaces consume it |

### 3.2 Context tabs

**Existing canonical implementation:** SCE-ACTIVITY-NAV-01 (`lib/activity-navigation/*`, `ActivityDetailNavigation.tsx`). Four production shells: Training session edit, Match record, Tournament record, Club Event edit.

**Parallel tab systems (not wrong, but not unified):** Team route-segment tabs (`TeamCockpitNav`), workspace `?hub=` / `?view=`, management filter rails (Matchcenter list modes), Person detail local state tabs, registration drawer tabs.

**01B target:** Extract/evolve NAV-01 into reusable **context tab primitives** for eligible entity detail pages; do **not** replace with a second framework.

### 3.3 Activity presentation

**Strongest existing stack:**

- Read-model: `SportingActivityPresentation` (`lib/sporting-activity-presentation/types.ts`)
- Visual/design: `lib/sporting-activity-design/` (`buildMatchClubIdentityPair`, density, organiser identity)
- UI primitives: `components/sporting-activity/*` (`MatchClubPair`, `SportingActivityIdentity`, detail shell)
- Consume routes: `lib/sporting-activity-detail/href.ts` → `/dashboard/activity/...`
- Manage routes: module-specific (`/dashboard/matchcenter/...`, training edit URLs, etc.)

**Duplication hotspots:** Matchcenter row/card crest layouts (~10+ inline layouts vs ~6 `MatchClubPair` call sites), status mappers per domain (`matchcenter`, `tournaments`, `training`, `personal-agenda`), Infoboard legacy tenant/opponent row when `matchPresentation` absent.

### 3.4 Match home/away invariant

| Verdict | Count (representative) |
|---------|------------------------|
| **PASS** | Management + detail paths using `buildMatchClubIdentityPair` / explicit home-left-away-right |
| **PARTIAL** | Text-only `fixtureLine` surfaces (semantically home–away but no crest model) |
| **FAIL** | Infoboard Screen1 fallback + Screen2 tenant/opponent layout (own team left on away fixtures) |
| **UNKNOWN** | Surfaces with incomplete DTOs at runtime — mitigated when loaders set `matchPresentation` |

See [`SCE-ACTIVITY-PRESENTATION-INVENTORY.md`](../design/SCE-ACTIVITY-PRESENTATION-INVENTORY.md) § Match audit.

### 3.5 Training location hierarchy

Canonical semantic chain **club/host → venue → resource** exists in `SportingActivityLocation` and `lib/sporting-activity-presentation/location.ts`. **PARTIAL adoption:** compact surfaces often show venue or resource only; management rows vary. Density-aware compression is required, not dropping semantics at the resolver layer.

### 3.6 Authorization

Tab visibility is **capability-flag driven** in `buildActivityTabNavigationConfig` (caller supplies flags; tabs hidden when destination meaningless). Backend authorization remains authoritative; UI hiding is not security. Risk: duplicated permission checks at shell vs API — document per surface in legacy register.

---

## 4. Architecture decisions (programme ADRs)

Recorded in [`docs/design/SCE-UI-ROLLOUT-ADRS.md`](../design/SCE-UI-ROLLOUT-ADRS.md) (ADR-01 … ADR-10).

---

## 5. Migration strategy (01B–01N)

Validated baseline from [`SCE-UI-ROLLOUT-01.md`](./SCE-UI-ROLLOUT-01.md) §7 — **no boundary changes** required by repository evidence:

| Package | Scope |
|---------|--------|
| **01B** | Universal Context Tabs — extract NAV-01; extend to eligible non-activity entities |
| **01C** | Universal Activity Presentation Model — unify adapters + canonical resolver |
| **01D–01G** | Match / Training / Tournament / Club Event card families (density variants) |
| **01H** | Core planning surfaces (Matchcenter, Trainings, Tournamentcenter, Veranstaltungen) |
| **01I** | Dashboard + Mein Programm |
| **01J** | Team / programme / calendar / related-activity |
| **01K** | Communication / notifications / cross-module references |
| **01L** | Remaining eligible detail pages → context tabs |
| **01M** | Responsive + a11y hardening |
| **01N** | Integrity UAT + legacy removal |

**Dependency order:** Tab contract → presentation model → card families → surface adoption → cross-module → responsive/a11y → legacy removal.

**Blockers identified:** Card migration blocked without 01C; Infoboard FAIL paths blocked without 01D + loader guarantees; legacy formatters removable only after consumer migration (see legacy register).

---

## 6. Risks

| Risk | Mitigation |
|------|------------|
| Big-bang temptation on Matchcenter cards | Enforce 01C before 01D; one density at a time |
| Tab proliferation (filters labeled as tabs) | Contract distinguishes context tabs vs filters vs view switchers |
| Home/away regression on tenant-centric surfaces | Central `MatchClubPair`; CI invariant tests in 01D |
| Permission drift in shared components | Pass capability DTOs from server shells; no duplicated policy engines in UI |
| Schema pressure for presentation | **STOP** — presentation stays derived; 01A found no schema requirement |

---

## 7. Definition of done — programme (01N)

Measurable closure for the full **SCE-UI-ROLLOUT-01+** programme:

- All **eligible** contextual detail pages use canonical context tabs; no competing tab architecture where canonical applies.
- Training, Match, Tournament, Club Event presentation **canonical** across SCE (four domains, one visual family, preserved semantics).
- Match **home/away ordering invariant** holds on every surface.
- Duplicated activity formatting removed or explicitly justified in legacy register.
- Activity navigation uses **canonical route/deep-link builders** (`buildSportingActivityDetailHref`, `buildActivityTabHref`, unified manage-route policy).
- Responsive density variants intentional; accessibility contract met (tabs + cards + workspace).
- Legacy register: zero unresolved **MUST-MIGRATE** entries.
- Tests/build green; representative Human UAT PASS; **PROD untouched** until separately authorized.

---

## 8. Deliverables (01A)

| Doc | Path |
|-----|------|
| This package | `docs/roadmap/SCE-UI-ROLLOUT-01A.md` |
| Activity presentation inventory | [`docs/design/SCE-ACTIVITY-PRESENTATION-INVENTORY.md`](../design/SCE-ACTIVITY-PRESENTATION-INVENTORY.md) |
| Context tabs standard | [`docs/design/SCE-CONTEXT-TABS-STANDARD.md`](../design/SCE-CONTEXT-TABS-STANDARD.md) |
| Activity presentation standard | [`docs/design/SCE-ACTIVITY-PRESENTATION-STANDARD.md`](../design/SCE-ACTIVITY-PRESENTATION-STANDARD.md) |
| Legacy register | [`docs/design/SCE-UI-LEGACY-REGISTER.md`](../design/SCE-UI-LEGACY-REGISTER.md) |
| Programme ADRs | [`docs/design/SCE-UI-ROLLOUT-ADRS.md`](../design/SCE-UI-ROLLOUT-ADRS.md) |

---

## 9. Definition of done — 01A

- [x] Preflight on canonical STAGE; feature branch created.
- [x] Product-wide inventory documented with file evidence.
- [x] Context tab contract specified for 01B.
- [x] Activity presentation contract specified for 01C.
- [x] Card family / density architecture specified for 01D–01G.
- [x] Legacy register with migration targets.
- [x] Dependency graph and package plan validated.
- [x] Baseline tests + build green; **NEW_FAILURES = 0**.
- [x] No schema, PROD, or broad UI rewrite.

---

## 10. Next package gate

**NEXT:** `SCE-UI-ROLLOUT-01B` — Universal Context Tabs architecture (implementation).

**Branch from:** `STAGE` after 01A merge.

**Do not start** 01B in the same PR as 01A.

**MERGE_NOW:** Product Owner decision after review of inventory accuracy.
