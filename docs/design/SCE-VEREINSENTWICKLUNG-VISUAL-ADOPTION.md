# Vereinsentwicklung visual standard — adoption tracker

Canonical reference: `/vereinsleitung/club-entwicklung` (`ClubDevelopmentOverview`). Primitives: `SceClubDevelopmentSectionShell`, `SceClubDevelopmentEmptyState`, `sce-club-development-surface-styles.ts`.

Governance: `SCE-DS-GOV-CD-VISUAL-001` (`lib/club-development/sce-vereinsentwicklung-visual-governance.ts`).

## Migrated (this package)

| Surface | Route / component |
|---------|-------------------|
| Übersicht | `ClubDevelopmentOverview`, governance stale copy |
| Strategie & Ziele | `StrategieUndZieleWorkspaceClient`, `StrategyAuthoringPanel`, `ZieleWorkspacePanel` |
| Vorhaben & Umsetzung | `vorhaben-und-umsetzung/page.tsx`, `VorhabenUndUmsetzungWorkspaceClient`, `VorhabenAufgabenWorkspace`, `InitiativeBacklogWorkspace`, `DevelopmentSprintList` |
| Ziel / Vorhaben workspace cards | Existing collapsible cards (unchanged behaviour; shared panel tokens) |

## Remaining adoption (intentionally out of scope)

| Area | Notes |
|------|--------|
| `/vereinsleitung/meetings` list & detail | Align section shells when meetings package is touched; keep meeting-specific composition |
| `/vereinsleitung/prozesse` | Demo surface — adopt after CD-PROCESS persistence |
| `/vereinsleitung/initiativen/[slug]` full detail chrome | Partial inline sections already SCE; page shell pass deferred |
| `/vereinsleitung/targets/[id]` edit form layout | Form-first; avoid dashboard KPI grids |
| `/vereinsleitung/sprints/[slug]/*` sprint workspace | Board/planning semantics dominate; section headers only where lists repeat |
| Governance pending card (`GovernancePendingCard`) | Legacy slate radii — align with `SceClubDevelopmentSectionShell` in a Vereinsleitung chrome pass |
| List-workspace modal creates (`Create*ComposerDialog`) | Valid until list routes migrate to inline create |

Do **not** copy Übersicht KPI strips or shortcut grids onto unrelated admin modules.