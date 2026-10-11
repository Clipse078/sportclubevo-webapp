# SCE Context Tabs Standard

> **Programme:** SCE-UI-ROLLOUT-01+  
> **Implementation gate:** **01B** (implemented — see [`SCE-UI-ROLLOUT-01B.md`](../roadmap/SCE-UI-ROLLOUT-01B.md))  
> **Foundation:** [`SCE-ACTIVITY-NAV-01`](../activity-navigation/SCE-ACTIVITY-NAV-01.md) (**CLOSED**)

---

## 1. Scope

### In scope — **context tabs**

Navigation within a **single entity/detail workspace** after the user has established context (activity header, entity title, etc.).

Examples (canonical today):

| Domain | Route pattern | Shell |
|--------|---------------|-------|
| Training | `/dashboard/training/sessions/[sessionId]/edit` | `TrainingSessionActivityTabShell` |
| Match | `/dashboard/matchcenter/[matchId]` | `SpieleMatchRecordWorkspace` |
| Tournament | `/dashboard/tournamentcenter/[tournamentId]/edit` | `TurniereTournamentActivityTabShell` |
| Club Event | `/dashboard/veranstaltungen/[eventId]/edit` | `ClubEventActivityTabShell` |

Future eligible domains (e.g. Team detail) may use domain-specific labels (Übersicht · Kader · Programm · …) but **same interaction model**.

### Out of scope — not context tabs

| Pattern | Example | Classification |
|---------|---------|----------------|
| Primary app navigation | `AppShellNavigation`, sidebar modules | **Primary nav** |
| List filters / view modes | Matchcenter `listView`, home/away filter rail | **Filters** |
| Workspace discovery | `WorkspaceDiscoveryTabs` (`?hub=`) | **View switcher** |
| Workspace lifecycle | `WorkspaceLifecycleNavigation` (`?view=archived`) | **View switcher** |
| Entity route tabs | `TeamCockpitNav` (path segments) | **Route tabs** — align visually, separate URL model |
| Segmented controls | `SceSegmentedControl` in Club Directory | **Filters** |
| Form enums | `HomeAwaySegmentedControl` on create forms | **Form control** |
| Local state tabs | `PersonDetailTabs`, registration drawer | **Legacy** — migrate or exempt with ADR |

---

## 2. Canonical implementation (01B)

| Concern | Location |
|---------|----------|
| **Generic contract** | `lib/context-tabs/types.ts`, `registry.ts`, `url.ts` |
| **Entry point** | `lib/context-tabs/index.ts` |
| Tab matrices (activity) | `lib/activity-navigation/configs.ts` — `buildActivityTabNavigationConfig` |
| URL / deep link | `buildContextTabHref` / `resolveContextTabFromSearchParams`; activity aliases in `lib/activity-navigation/url.ts` |
| Active tab state | `SceContextTabProvider`, `useContextDetailTab` |
| Dirty guard | `SceContextDirtyGuardProvider` |
| Panel | `SceContextTabPanel` (activity wrapper: `ActivityTabPanel`) |
| UI | `components/sce/context-tabs/SceContextTabs.tsx` |
| Boundary | `components/sce/context-tabs/SceContextTabsBoundary.tsx` |
| Activity compatibility | `ActivityDetailNavigation.tsx`, `ActivityDetailNavigationBoundary.tsx` |
| Layout class | `SCE_ACTIVITY_NAV_TABLIST_CLASS` in `lib/sce/workspace/sce-workspace-layout.ts` |

**Visual reference:** `TeamCockpitNav` (route-based sibling pattern).

**Do not** introduce parallel tab frameworks; extend `lib/context-tabs`.

---

## 3. Universal tab contract (01B MUST implement)

### 3.1 Selection & interaction

| State | Behaviour |
|-------|-----------|
| **Selected** | `aria-selected=true`, primary bottom border (`--sce-primary`), URL reflects tab |
| **Hover** | Text promote `--text-2` → `--foreground`; no layout shift |
| **Focus** | Visible focus ring on tab links; tab order follows visual order |
| **Disabled / inaccessible** | Tab **omitted** from nav when `visible: false`; not shown disabled-with-dead-link unless product explicitly requires explanation (prefer hide) |

### 3.2 URL & history

- Query param: **`tab`** with stable keys (`uebersicht`, `teilnahme`, `aufgebot`, …).
- **Default tab:** `uebersicht` when param absent or invalid.
- **Invalid tab:** fall back to default if hidden; else first visible tab (`resolveActivityTabFromSearchParams`).
- **Deep links:** `buildActivityTabHref(basePath, tabKey)` — preserve pathname, set/replace `tab`.
- **Browser back/forward:** Next.js `useSearchParams` drives active tab; no duplicate local-only state.
- **Direct URL load:** Server-rendered shell must render same default/resolved tab as client hydration.

### 3.3 Permission model

- Callers pass capability flags into `buildActivityTabNavigationConfig` (`matchSquadAvailable`, `communicationAvailable`, …).
- **Hidden** when user lacks destination or destination is meaningless (e.g. Aufgebot without squad context).
- Authorization for **content** remains on APIs and server components; tab hide is UX-only.

### 3.4 Dirty-state blocking

- `ActivityDirtyNavigationProvider` + `confirmNavigationIfDirty()` on programmatic navigation.
- Link clicks intercepted when dirty; user confirms before `router.push`.
- **01B gap to close:** keyboard activation paths must use same guard.

### 3.5 Async tab content

- Panels mount per tab; loading/error inside panel workspace (not tab bar).
- Switching tabs does not unmount provider; preserve form state where shells already do.

### 3.6 Overflow & responsive

- Primary tabs: **single row**, `flex-nowrap`, horizontal scroll on narrow viewports (`SCE_ACTIVITY_NAV_TABLIST_CLASS`).
- **Must not wrap** into arbitrary multi-row tab bars.
- Overflow destinations: **Mehr** `<details>` menu (existing pattern).

### 3.7 Mobile

- Same overflow/scroll strategy; touch targets ≥44px vertical padding on tabs.
- Mehr menu remains reachable without hover.

### 3.8 Keyboard & ARIA

| Requirement | Behaviour (01B) |
|-------------|-----------------|
| Tablist | `role="tablist"`, `aria-orientation="horizontal"` on primary row |
| Tab | `role="tab"`, roving `tabIndex`, `aria-selected`, `aria-controls` → panel id |
| Panel | `SceContextTabPanel` — `role="tabpanel"`, `aria-labelledby` |
| Arrow keys | **Implemented:** ArrowLeft/ArrowRight cycle primary tabs; **automatic activation** (router navigation, same as click) |
| Home / End | First / last primary tab |
| Mehr menu | `role="menu"` / `menuitem` — not part of tablist arrow cycle |

### 3.9 Badges / counts

- Optional `count` on tab definition; rendered as suffix in label when provided.
- No decorative badges without semantic meaning.

---

## 4. Other tab implementations (inventory)

| ID | Files | Model | Classification |
|----|-------|-------|----------------|
| NAV-ACT-001 | `lib/activity-navigation/*` | `?tab=` | **CANONICAL** |
| NAV-TEAM-001 | `TeamCockpitNav.tsx` | Path segments | **PARTIAL** — visual canon, URL differs |
| NAV-WS-001 | `WorkspaceDiscoveryTabs.tsx` | `?hub=` | **NOT_APPLICABLE** (view switcher) |
| NAV-WS-002 | `WorkspaceLifecycleNavigation.tsx` | `?view=` | **NOT_APPLICABLE** |
| NAV-PERSON-001 | `PersonDetailTabs.tsx` | `useState` | **LEGACY** — no deep link |
| NAV-REG-001 | `RegistrationDrawerTabShell.tsx` | Local | **LEGACY** |
| NAV-MC-001 | `lib/matchcenter/navigation.ts` | List hub params | **FILTER** not context tabs |
| NAV-ROLE-001 | `RolesAdminTabs.tsx` | Path | Route tabs — candidate for 01L |

---

## 5. Registry pattern (implemented)

- Generic lists: `listVisiblePrimaryTabs`, `listVisibleOverflowTabs`, `listAllVisibleTabs` in `lib/context-tabs/registry.ts`.
- Activity: `buildActivityTabNavigationConfig` supplies domain tab matrices from capability flags.
- Non-activity example: `lib/context-tabs/fixtures/example-team-context-tabs.ts`.

---

## 6. Accessibility gaps (remaining)

1. ~~Arrow-key tab navigation~~ — **closed in 01B** on `SceContextTabs`.
2. Overflow **Mehr** uses `<details>` — focus trap behaviour documented; full audit in **01M**.
3. Deep-link focus: no move-focus-to-panel on tab change (**01M** candidate).

---

## 7. Related documents

- [`SCE-WORKSPACE-SURFACE-STANDARD.md`](./SCE-WORKSPACE-SURFACE-STANDARD.md)
- [`SCE-ACTIVITY-NAV-01.md`](../activity-navigation/SCE-ACTIVITY-NAV-01.md)
- [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md) — `LEGACY-TABS-*`
