# SCE-CD-04R6 PKG-06 — UX consistency completion matrix (PR #985)

Structural/runtime verification only (no browser UAT). Maps to nine PO screenshot surfaces.

| # | Surface | Status | Evidence |
|---|---------|--------|----------|
| 1 | Vorhaben lens — inline create + list layout | **Done** | `CreateInitiativeWorkspaceCollapsibleCard` full-width shell; `pkg-06-ux-consistency.test.ts` |
| 2 | Prioritäten lens — shared create + toolbar | **Done** | Same card `variant="prioritaeten"`; `VorhabenWorkspaceToolbar` |
| 3 | Ziel-filtered Vorhaben view | **Done** | `VorhabenZielFilterChip` + `initiative-links` retry on create card |
| 4 | Contextual Ziel → Vorhaben create | **Done** | `CreateInitiativeContextualCollapsibleCard` full-width + `InitiativeForm` |
| 5 | Vorhaben normal workspace chrome | **Done** | Shared toolbar, loading text, card list tokens |
| 6 | Vorhaben Prioritäten workspace chrome | **Done** | Aligned filters/copy (`Verantwortlich` text filter label) |
| 7 | Umsetzungsphasen consolidated list | **Done** | `DevelopmentSprintList` record rows + board/Rückblick links (unchanged semantics) |
| 8 | Phase Planung / Aufgabenboard | **Done** | Shared shell header + `SceSegmentedControl` nav; board sans redundant title/Kanban copy |
| 9 | Phase Rückblick | **Done** | Shared breadcrumbs/shell; existing review workspace under shell |

## Remaining gaps

| Gap | Notes |
|-----|--------|
| Authenticated PO visual sign-off | PKG-03 / PO-owned |
| jsdom does not prove pixel layout | Full-width enforced via structural markers + governance only |
| Legacy `/vereinsleitung/initiativen/backlog` route | Redirects to consolidated workspace; not restyled separately |

## Verification commands

```bash
npm run test -- --run lib/club-development/__tests__/pkg-06-ux-consistency.test.ts
npm run test -- --run lib/club-development/__tests__/pkg-06-vorhaben-create-rueckblick.test.ts
npm run test:design-system
APPLY_DATABASE_MIGRATIONS=false npm run build
```