# SCE-DS2-06 — Unified page & interaction architecture

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-06` |
| **Predecessor** | `SCE-DS2-05B` |
| **Successor** | `SCE-DS2-07` |
| **Reference** | `/dashboard/finance` (`SceWorkspaceChrome`) |

## Objective

Finance establishes the canonical page hierarchy (breadcrumb → eyebrow → title → tabs → content). List/detail patterns and planning surfaces adopt the same contract. Wochenplaner editing uses a **light contextual side panel**, not a dark centered modal.

## Primitives (`components/sce/page`)

| Component | Role |
| --- | --- |
| `ScePageHeader` | Workspace title block (Barlow Condensed + Inter) |
| `ScePageTabs` | Horizontal `SceContextTabs` |
| `ScePageContent` | Width-mode content shell |
| `SceSectionHeader` | In-page section label |
| `SceContentPanel` | Functional white panel |
| `SceInlineEditor` | In-context expandable editor |
| `SceExpandablePanel` | Accordion disclosure |

## Subpackages

- **A** — Shared page primitives + pattern shells (`ListPagePattern`, `DetailPagePattern`)
- **B** — Dashboard + Organisation (light organigram canvas)
- **C** — Teams, Vereine, Persons, Competitions via unified list/detail patterns
- **D** — Wochenplaner contextual planning editor (`contextualPanel` on `Sheet`)
- **E** — Modal migration inventory (`sce-ds2-06-modal-migration-inventory.ts`)
- **F** — Authenticated routes inheriting patterns (ongoing sweep into DS2-07)

## Automated verification

- `lib/design-system/__tests__/sce-ds2-06-unified-page-architecture.test.ts`
- `npm run test:design-system`
- `npm run lint`
- `npm run build`
