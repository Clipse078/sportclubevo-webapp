# SCE-CD-04R6 PKG-06 — Vorhaben inline create + Rückblick chain links

**Status:** Implemented · **PR:** [#985](https://github.com/Clipse078/sportclubevo-webapp/pull/985) (open — do not merge until PO review)  
**Depends on:** PKG-05 consolidated workspaces (STAGE)  
**Code ledger:** `lib/club-development/sce-cd-04r6-pkg-06-handoff.ts`

## Selected roadmap item

Close the last **modal-free create gap** in consolidated **Vorhaben & Umsetzung** and strengthen the **Umsetzungsphasen → Rückblick** step in the product chain:

`Strategie → Ziele/Kennzahlen → Vorhaben → Aufgaben → Umsetzungsphasen → Rückblick`

## Verified Ready preview (commit `b3d4ce40`)

| Field | Value |
|-------|--------|
| Commit | `b3d4ce40d05d9e712d2d1b63155a5f108597a3f2` |
| Vercel status | **Ready** (PR #985 deployment) |
| Preview URL | `https://sportclubevo-webapp-stage-git-curs-87ffcf-mds-projects-462da62c.vercel.app` |

Preview uses the shared STAGE Neon database (`SCE_DATA_ENVIRONMENT=STAGE`, fingerprint `acd3b37682911890`). No production promotion in this package.

## STAGE migration reconciliation (read-only, PKG-05 dependency)

Reconciled `20261115150000_sce_cd_05_club_strategy_authoring` against intended STAGE via `scripts/sce-cd-05-pkg-05-stage-migration-verify-readonly.ts` — **no `migrate deploy` executed**.

| Check | Result |
|-------|--------|
| Fingerprint / host fragment | Match (`acd3b37682911890`) |
| Migration applied | Yes (`finishedAt` 2026-11-15T16:21:42.561Z UTC) |
| Checksum vs repo | Match |
| `ClubStrategy` + `ClubStrategyDocumentKind` | Present |
| `writePerformed` | `false` |

Operator reference: `docs/planning/SCE-CD-05-PKG-05-MIGRATION-HANDOFF.md`.

## Umsetzungsphasen planning policy (parent-task-only)

Recorded in completion matrix and `PKG_06_PARENT_TASK_ONLY_PHASE_PLANNING_POLICY`:

- **Umsetzungsphasen** schedule **root tasks only** (`searchClubDevelopmentTaskCandidates` defaults `rootsOnly: true`, `parentTaskId: null`).
- **Unteraufgaben** remain managed **under the parent task** in the Aufgaben workspace (max depth 1). They are **not** independently assigned to phases unless PKG-04 explicitly changes `rootsOnly` with product sign-off.

## Inline Vorhaben create — normal + Prioritäten

| View | Route query | Create surface | Modal? |
|------|-------------|----------------|--------|
| **Vorhaben** (default) | `ansicht=vorhaben` | `CreateInitiativeWorkspaceCollapsibleCard` in `VorhabenAufgabenWorkspace` | No — `inline-collapsible` + `InitiativeForm` |
| **Prioritäten** | `ansicht=vorhaben&prioritaeten=1` | `InitiativeBacklogCreateCard` in `InitiativeBacklogWorkspace` | No — inline collapsible (backlog priority fields) |

Neither consolidated lens uses `CreateInitiativeComposerDialog`. Legacy modal-first list routes remain in the governance inventory (`sce-contextual-create-governance.ts`).

Optional `?targetId=` on the **Vorhaben** lens loads `filterTarget` and auto-links after create via `POST …/initiative-links` (`CreateInitiativeWorkspaceCollapsibleCard`).

## PO acceptance links (relative paths + preview base)

Replace `{targetId}` and `{sprintSlug}` with tenant data on STAGE. Absolute URLs: preview base + path (`buildPkg06PoAcceptanceAbsoluteUrl`).

| Scenario | Path |
|----------|------|
| Inline Vorhaben create | `/vereinsleitung/vorhaben-und-umsetzung?ansicht=vorhaben` |
| Inline create (Prioritäten) | `/vereinsleitung/vorhaben-und-umsetzung?ansicht=vorhaben&prioritaeten=1` |
| Ziel filter + auto-link on create | `/vereinsleitung/vorhaben-und-umsetzung?ansicht=vorhaben&targetId={targetId}` |
| Umsetzungsphasen (board + Rückblick entry) | `/vereinsleitung/vorhaben-und-umsetzung?ansicht=umsetzungsphasen` |
| Aufgabenboard (per ACTIVE/COMPLETED phase) | `/vereinsleitung/sprints/{sprintSlug}/board` |
| Rückblick (per ACTIVE/COMPLETED phase) | `/vereinsleitung/sprints/{sprintSlug}/rueckblick` |

**Example (preview):**  
`https://sportclubevo-webapp-stage-git-curs-87ffcf-mds-projects-462da62c.vercel.app/vereinsleitung/vorhaben-und-umsetzung?ansicht=vorhaben`

## Acceptance criteria

| Criterion | Evidence |
|-----------|----------|
| Vorhaben lens (`ansicht=vorhaben`) offers inline collapsible Vorhaben create for `initiatives.manage` | `CreateInitiativeWorkspaceCollapsibleCard` in `VorhabenAufgabenWorkspace` |
| Prioritäten lens inline create (no modal) | `InitiativeBacklogCreateCard` in `InitiativeBacklogWorkspace` |
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