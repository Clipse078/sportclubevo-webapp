# SCE personal dashboard loading pattern

Personal `/dashboard` uses **progressive section Suspense** with skeletons that match the ClubDevelopmentOverview section hierarchy:

1. Benötigt meine Aufmerksamkeit (full width)
2. Heute & als Nächstes + Meine Aufgaben (paired grid, `items-start`)
3. Meine Bereiche (quick access)
4. News & Aktivitäten (`PersonalDashboardSecondary`)

## Primitives

| Surface | Component |
|---------|-----------|
| Route `loading.tsx` | `SceModuleRouteLoading` + `PersonalDashboardCommandCenterLoadingSurface` |
| In-page Suspense | `PersonalDashboardCommandCenterLoadingSurface` modes (`attention`, `programme`, `tasks`, `quick-access`, `full`) |
| Shared bones | `SCE_SKELETON_BONE_CLASS` (respects `prefers-reduced-motion`) |

## Readiness semantics

| State | Meaning | UI |
|-------|---------|-----|
| **pending** | Suspense fallback active | `PersonalDashboardSectionPendingFallback` (skeleton + slow hint after 8s) |
| **ready** | Authorised section with data | Section shell + content |
| **empty** | Authorised, supported, zero rows | `SceWorkspaceEmptyState` / attention empty copy — not an error |
| **unavailable** | Not supported or not authorised | Programme unsupported copy; attention/tasks hidden or programme unavailable panel |
| **degraded** | Partial upstream failure with retained rows | Attention `operationalSourcesDegraded` partial-empty copy |
| **failed** | Section loader threw | `PersonalDashboardSectionRetry` → `router.refresh()` (other sections unchanged) |

**Read-model path:** Suspense streams sections, but programme/work/secondary share one cached `getPersonalCommandCenterData` call per request (`readPersonalDashboardCoreCached`) — not independent backend fetches. Legacy aggregation uses independent programme vs work loaders.

**Refresh:** Stale projection reads still return `success` with last good payload until rebuild; failed sections retry without replacing sibling sections.

## Inventory (not migrated in this package)

| Area | Gap |
|------|-----|
| Admin modules | Route shells via `SceModuleRouteLoading` neutral copy only |
| Infoboard | Separate pipeline |
| Mein Programm calendar | Route-level neutral loading |
| Task workspace lists | Row-level loading not unified |

Governance: `SCE_LOADING_HIERARCHY` in `lib/design-system/sce-feedback-status-foundation.ts`.