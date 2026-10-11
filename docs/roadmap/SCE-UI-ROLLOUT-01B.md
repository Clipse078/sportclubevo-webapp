# SCE-UI-ROLLOUT-01B — Universal Context Tabs

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01B` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **CLOSED** |
| **Branch** | `cursor/sce-ui-rollout-01b-universal-context-tabs` |
| **PR** | [#830](https://github.com/Clipse078/sportclubevo-webapp/pull/830) → `STAGE` |
| **Base** | `STAGE` @ `344353148b2688f28fd62ef2202a7e6117657a23` |
| **Feature HEAD (pre-merge)** | `22d10e7a9b04840b005cd3d8a3ede17c9a3477c9` |
| **Schema / PROD** | **No changes** |

---

## 1. Objective

Evolve SCE-ACTIVITY-NAV-01 into a **domain-agnostic Context Tabs architecture** without introducing a competing tab framework. Four activity shells prove the contract; a TEAM fixture proves non-activity genericity.

---

## 2. Implemented architecture

| Layer | Location |
|-------|----------|
| Generic types + URL + registry | `lib/context-tabs/*` |
| Dirty guard | `SceContextDirtyGuardProvider` (`lib/context-tabs/ContextDirtyNavigationContext.tsx`) |
| Tab state / navigation | `SceContextTabProvider`, `useContextDetailTab` |
| Panel | `SceContextTabPanel` |
| UI | `components/sce/context-tabs/SceContextTabs.tsx` |
| Boundary | `components/sce/context-tabs/SceContextTabsBoundary.tsx` |
| Activity registries | `lib/activity-navigation/configs.ts` → `buildActivityTabNavigationConfig` |
| Activity compatibility | `ActivityDetailNavigation*` thin wrappers; activity re-exports |

---

## 3. Contracts

### URL / deep link

- Query param: **`tab`** (unchanged for activities).
- Helpers: `buildContextTabHref`, `resolveContextTabFromSearchParams`, `readContextTabParam`.
- Activity aliases: `buildActivityTabHref`, `resolveActivityTabFromSearchParams` (unchanged URLs).

### Fallback

1. Valid visible tab from `?tab=`  
2. Else `defaultTab` if visible  
3. Else first visible tab in registry order  
4. Else `defaultTab` (edge case empty registry)

No blank panels; inaccessible tabs omitted from nav (backend still authoritative on content).

### Permissions

Domain adapters pass **boolean capability inputs** into `buildActivityTabNavigationConfig`. Generic components do not import permission constants.

### Dirty state

Single provider: `SceContextDirtyGuardProvider`. Tab clicks and programmatic `navigateToTab` call `confirmNavigationIfDirty()`.

### Responsive

Single-row primary tabs (`flex-nowrap`), horizontal scroll via `SCE_ACTIVITY_NAV_TABLIST_CLASS`, Mehr overflow unchanged.

### Accessibility (01B)

- Roles: `tablist` / `tab` / `tabpanel`
- Roving `tabIndex` (active `0`, others `-1`)
- **Automatic activation** on ArrowLeft/ArrowRight/Home/End (matches link navigation model; documented in [`SCE-CONTEXT-TABS-STANDARD.md`](../design/SCE-CONTEXT-TABS-STANDARD.md))
- Visible focus rings on tabs and Mehr trigger

### Mehr

Permission-filtered overflow tabs; menu pattern (`role="menu"` / `menuitem`).

---

## 4. Activity migration

| Domain | Shell | Navigation |
|--------|-------|------------|
| Match | `SpieleMatchRecordWorkspace` | `SceContextTabsBoundary` |
| Training | `TrainingSessionActivityTabShell` | `SceContextTabsBoundary` |
| Tournament | `TurniereTournamentActivityTabShell` | `SceContextTabsBoundary` |
| Club Event | `ClubEventActivityTabShell` | `SceContextTabsBoundary` |

Existing activity deep links (`?tab=uebersicht`, etc.) remain valid.

### Observed canonical tab language (PO visual UAT 2026-10-11)

| Domain | Primary tabs |
|--------|----------------|
| Training | Übersicht · Teilnahme · Planung · Kommunikation · Mehr |
| Match | Übersicht · Aufgebot · Teilnahme · Spielbetrieb · Kommunikation · Mehr |
| Tournament | Übersicht · Aufgebot · Teilnahme · Planung · Kommunikation · Mehr |
| Club Event | Übersicht · Teilnahme · Planung · Kommunikation · Mehr |

---

## 5. Non-activity proof

`lib/context-tabs/fixtures/example-team-context-tabs.ts` — TEAM-shaped registry (Übersicht · Kader · Programm · …) tested without product migration.

**Deferred:** `PersonDetailTabs`, `TeamCockpitNav` route tabs → **01L** per legacy register.

---

## 6. Automated validation

- `lib/context-tabs/__tests__/*`
- `components/sce/context-tabs/__tests__/SceContextTabs.test.tsx`
- Activity navigation regression tests (unchanged suite paths)
- Architecture guardrails: `context-tabs-architecture.test.ts`
- Design system: `lib/design-system/__tests__/sce-binary-control-standard.test.ts`
- `npm run build` (TypeScript + Next build)

---

## 7. PO Human UAT

| Field | Result |
|-------|--------|
| **Status** | **PASS** |
| **Date** | **2026-10-11** |
| **Scope** | Focused **visual** acceptance — Training, Match, Tournament, Club Event context navigation |

| Domain | Result | Notes |
|--------|--------|-------|
| **Training** | **PASS** | Canonical context navigation visible and consistent |
| **Match** | **PASS** | Canonical context navigation visible and consistent |
| **Tournament** | **PASS** | Canonical context navigation visible and consistent |
| **Club Event** | **PASS** | Canonical context navigation visible and consistent |

**Confirmed visually:** same navigation family; consistent tab placement and typography; restrained orange active indicator; single-row presentation; consistent Mehr placement; **no unintended page redesign** observed.

**Automated suite remains authoritative** for URL resolution, registry behaviour, keyboard behaviour, and activity navigation regression. PO UAT does not claim manual verification of every interaction in §7 checklist (deep link, back/forward, dirty-state prompt, permission matrix) unless separately exercised — closure relies on focused visual PASS plus automated regression evidence.

---

## 8. Deferred work

| Package | Item |
|---------|------|
| **01C** | Activity presentation DTO unification |
| **01L** | Person / route-tab entity migrations |
| **01M** | Product-wide a11y audit; focus move to panel on tab change |

---

## 9. Closure evidence (01B)

- Generic Context Tabs implemented (`lib/context-tabs/*`, `SceContextTabs`, `SceContextTabsBoundary`)
- Four canonical activity consumers migrated
- URL / deep-link compatibility preserved
- Deterministic fallback implemented
- Permission boundary implemented
- Dirty-state architecture implemented
- Responsive foundation implemented
- Keyboard / accessibility foundation implemented
- Design System navigation language documented ([`SCE-CONTEXT-TABS-STANDARD.md`](../design/SCE-CONTEXT-TABS-STANDARD.md))
- SCE Design System master specification established ([`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md))
- Future-module compliance contract established (including **Toggle First** binary control gate)
- **SCE Control Standard — Toggle First** documented
- Automated tests passed; build passed; CI passed (PR #830)
- PO Human UAT **PASS** (2026-10-11)
- PR **#830** merged to **STAGE**

**NEXT programme package:** [`SCE-UI-ROLLOUT-01C`](./SCE-UI-ROLLOUT-01.md) — Universal Activity Presentation Model (start from post-merge canonical `STAGE`).
