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

- **Initial load:** section-level `aria-busy` skeletons; sr-only status text.
- **Empty vs error:** existing `PersonalAttention` / feed empty states; degraded attention uses partial-empty copy (not zeroed counts).
- **Read-model path:** `react` `cache()` dedupes core projection between sections on the same request.

## Inventory (not migrated in this package)

| Area | Gap |
|------|-----|
| Admin modules | Route shells via `SceModuleRouteLoading` neutral copy only |
| Infoboard | Separate pipeline |
| Mein Programm calendar | Route-level neutral loading |
| Task workspace lists | Row-level loading not unified |

Governance: `SCE_LOADING_HIERARCHY` in `lib/design-system/sce-feedback-status-foundation.ts`.