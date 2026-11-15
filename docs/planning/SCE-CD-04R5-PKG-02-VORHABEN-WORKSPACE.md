# SCE-CD-04R5 PKG-02 — CD-WORK Vorhaben & Aufgaben workspace

**Branch:** `cursor/sce-strategy-backlog-sprints-01`  
**Baseline:** `4048dc1b5cf6aa1524ca2ddb4eb236dae157e1ff`  
**Architecture:** CD-WORK filtered lens (`docs/roadmap/SCE-CD-00-ARCHITECTURE-BASELINE.md`)

## Intent

Replace `/vereinsleitung/vorhaben` navigation-only hub with a **real workspace** that:

- Connects **Vorhaben** and **Aufgaben** via `INITIATIVE` context, `primaryInitiativeId`, and (on initiative focus) `MEETING_DECISION` links through Traktanden
- Applies visibility and task read rules from existing services — **no duplicate task store**
- Lists **root tasks only** (`parentTaskId: null`); Unteraufgaben remain in Aufgaben workspace
- Preserves deep links to Vorhaben detail, Aufgaben workspace (`returnTo`), Strategie/Ziele, Backlog, Umsetzungsplanung, global Aufgaben inbox

## Implementation evidence

| Area | Path |
|------|------|
| Read model | `lib/club-development/vorhaben-workspace.ts` |
| API (client filters) | `app/api/club-development/vorhaben-workspace/route.ts` |
| UI | `components/admin/club-development/VorhabenAufgabenWorkspace.tsx` |
| Route | `app/(admin)/vereinsleitung/vorhaben/page.tsx` |
| Copy | `lib/club-development/product-copy.ts` (`CD_VORHABEN_WORKSPACE_COPY`) |
| Tests | `lib/club-development/__tests__/vorhaben-workspace.test.ts`, `app/(admin)/vereinsleitung/vorhaben/__tests__/page.test.tsx` |

## Automated checks (not PO UAT)

- Association OR filters match `initiative-associated-tasks`
- `parentTaskId: null` on task queries
- Permission gate: no data load without `initiatives.view` / `tasks.view` (restricted message)
- `requireStrategicApiContext` on workspace API

## Deferred (unchanged)

- PKG-03 authenticated PO UAT, optional `linkedInitiativeRefs` backfill
- PKG-04 subtask sprint picker (`rootsOnly: false`)
- PKG-05 Strategiekonzeption authoring slice

## Next package (PKG-05)

See completion matrix: optional **Strategische Begründung** on Target detail, workspace document links, Strategie empty states — **no new framework**.