# SCE-CD-04R6 PKG-06 — Vorhaben inline create + Rückblick chain links

**Status:** Implemented  
**Depends on:** PKG-05 consolidated workspaces (STAGE)

## Selected roadmap item

Close the last **modal-free create gap** in consolidated **Vorhaben & Umsetzung** and strengthen the **Umsetzungsphasen → Rückblick** step in the product chain:

`Strategie → Ziele/Kennzahlen → Vorhaben → Aufgaben → Umsetzungsphasen → Rückblick`

## Acceptance criteria

| Criterion | Evidence |
|-----------|----------|
| Vorhaben lens (`ansicht=vorhaben`) offers inline collapsible Vorhaben create for `initiatives.manage` | `CreateInitiativeWorkspaceCollapsibleCard` in `VorhabenAufgabenWorkspace` |
| No `CreateInitiativeComposerDialog` on consolidated Vorhaben workspace | Governance + unit test |
| Optional `targetId` filter auto-links new Vorhaben to Ziel | `initiative-links` POST after create |
| Consolidated Umsetzungsphasen list deep-links **Aufgabenboard** and **Rückblick** | `DevelopmentSprintList` |

## Remaining gaps (out of scope)

| Gap | Track |
|-----|--------|
| Authenticated PO UAT | PKG-03 |
| `linkedInitiativeRefs` JSON backfill | PKG-03 optional |
| Prozesse persistence | CD-PROCESS |
| Legacy list-route modal creates | Inventory in `sce-contextual-create-governance.ts` |