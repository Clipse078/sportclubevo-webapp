# SCE-CD-03 — Connected Club Development

**Status:** Implemented on feature branch (STAGE target)  
**Depends on:** SCE-CD-02 (PR #959)

## Scope delivered

- `TaskContextType.MEETING_DECISION` and `INITIATIVE` with registry, resolution, and contextual Aufgaben panels.
- Meeting workspace: Traktandum ↔ Beschluss (`sourceAgendaItemId`), Beschluss ↔ Aufgabe (create/link API + UI).
- Initiative detail: **Sitzungen & Traktanden**, related Beschlüsse/Aufgaben, contextual task panel.
- Task workspace: **Entstanden aus** provenance for decision-backed tasks.

## Follow-up (Pläne & Ziele)

Strategic goals remain linked via existing `Target.linkedInitiativeRefs` JSON. Optional FK from Initiative → Target is deferred; use target link editor until CD-GOALS scope linking lands.
