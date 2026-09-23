# WORKSPACE-09-02 — Document inspector + Tasks + Requirements

**Branch:** `cursor/workspace-09-product-completion-ux`  
**Baseline STAGE:** `704a7c4571524bd0fd2dc10df238110a23a3201b`

## Inspector information architecture

Selected **documents** render `WorkspaceDocumentInspectorView` with compact header identity (name, size, current version, folder) and wrapped tab navigation:

| Tab | Content |
|-----|---------|
| **Vorschau** | Compact preview (image/PDF/text/office fallback) |
| **Details** | Name, type, size, folder, changed/uploaded, current version |
| **Versionen** | Current version label + entry to version history dialog |
| **Zugriff** | Existing `WorkspaceAccessSummaryPanel` + manage entry (W09-04 expands) |
| **Aufgaben** | Canonical related tasks (DOCUMENT context) |
| **Anforderungen** | Canonical W07 exact-version requirement references |

**Folders** keep the separate folder inspector (no Aufgaben/Anforderungen — document-version domain only).

## Task contract

- **List/count:** `loadContextRelatedTasksPanel(ctx, TaskContextType.DOCUMENT, documentId)`  
- **Create:** `ContextualTaskCreateTrigger` / `createContextualAufgabeAction` with DOCUMENT context (primary context semantics).  
- **Version hint:** Supporting `TaskDocumentReference` rows show user-facing version labels; primary DOCUMENT context shows current version label when applicable.  
- **Authorization:** Workspace document readability **and** Tasks domain permissions (`tasks.view` for list/count metadata, `tasks.create` + context validation for create). No OR shortcut.

## Requirement contract

- **Model:** `RequirementWorkspaceDocumentVersionReference` (immutable `workspaceDocumentVersionId`).  
- **List/count:** `listRequirementsForWorkspaceDocument` — tenant-safe, authorization-filtered rows only.  
- **Create/link:** `createRequirementLinkedToWorkspaceDocumentAction` → `createRequirementDraft` + `linkRequirementDocumentReference` (current version when version id omitted).  
- **Presentation:** Linked row shows `Dokumentversion: vN` without exposing storage/version UUIDs in UI.  
- **Authorization:** Workspace document readability **and** Requirements permissions. Unauthorized actors receive **`visible: false`** (no tab, no count — zero disclosure).

## Command bar workflow actions

When a **document** is selected:

- **+ Aufgabe** — only if `resolveDocumentWorkflowCapabilities().canCreateTask`  
- **+ Anforderung** — only if `canCreateRequirement` and document readable  

No disabled teaser buttons. Same canonical flows as inspector sections.

## DTOs

- `WorkspaceDocumentInspectorPayloadDto` (`lib/workspace/document-inspector/document-inspector-dto.ts`)  
- Loaded server-side via `loadWorkspaceDocumentInspectorPayload`  
- Client inspector view consumes serializable DTOs only (W08-07A).

## Tests

- `lib/workspace/__tests__/w09-02-document-inspector.test.ts`  
- Updated W09-01 / W08-07A / AUFGABEN-06F2 workspace integration sentinels

## Security invariants

- No cross-tenant references in list paths  
- Requirement/task counts omit inaccessible rows  
- No function props from workspace page into client shell (except established server actions from client dialogs)  
- No `currentVersionId` retargeting of existing references  
- No public storage URLs in inspector

## Deferred (W09-03+)

- W09-03: full preview/malware/new-version UX  
- W09-04: access inheritance redesign  
- W09-05: rename/move/lifecycle completion  
- W09-06: responsive/resizable inspector hardening  
- W09-07: mobile DTO/API package

## No-document / folder decision

Tasks and Requirements actions appear **only with a selected document** (version-bound W07 domain). Folder-level quick actions are **not** shown.
