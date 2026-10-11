# SCE-UI-ROLLOUT-01B — Universal Context Tabs

| Field | Value |
|-------|-------|
| **Canonical key** | `SCE-UI-ROLLOUT-01B` |
| **Programme** | [`SCE-UI-ROLLOUT-01+`](./SCE-UI-ROLLOUT-01.md) |
| **Status** | **IMPLEMENTATION COMPLETE / PO UAT PENDING** |
| **Branch** | `cursor/sce-ui-rollout-01b-universal-context-tabs` |
| **Base** | `STAGE` @ `344353148b2688f28fd62ef2202a7e6117657a23` |
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
- `npm run build` (TypeScript + Next build)

---

## 7. Human UAT checklist (PO — PENDING)

**Match / Training / Tournament / Club Event (each):**

- [ ] Open detail workspace
- [ ] Switch primary tabs
- [ ] Open **Mehr** and navigate to overflow tab
- [ ] Direct deep link `?tab=<operational-tab>`
- [ ] Browser Back / Forward retains tab

**Responsive:**

- [ ] Narrow viewport: tabs do not wrap; horizontal scroll usable

**Permissions:**

- [ ] Tabs without capability do not appear

**Dirty state:**

- [ ] Editable surface: tab switch prompts when dirty (where applicable)

**Accessibility sanity:**

- [ ] Keyboard focus visible; Arrow keys change tab

---

## 8. Deferred work

| Package | Item |
|---------|------|
| **01C** | Activity presentation DTO unification |
| **01L** | Person / route-tab entity migrations |
| **01M** | Product-wide a11y audit; focus move to panel on tab change |

---

## 9. Definition of done (01B implementation)

Implementation items for PO UAT are complete in code/docs/tests/build. **01B is not CLOSED** until PO Human UAT PASS.
