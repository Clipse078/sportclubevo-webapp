# WORKSPACE-09-05 — Resource management & lifecycle UX

## Action model

| State | Primary | Overflow / inspector |
|-------|---------|----------------------|
| Active document | Download, Neue Version, +Aufgabe, +Anforderung | Umbenennen, Verschieben, Archivieren, In Papierkorb, Link kopieren |
| Active folder | Upload, Unterordner | Umbenennen, Verschieben, Archivieren, In Papierkorb, Zugriff |
| Archiviert / Papierkorb | Read-only command bar hint | Wiederherstellen; endgültig löschen nur im Papierkorb |

Server authorization (`canWorkspaceEdit` / `canWorkspaceManage`) and lifecycle state determine availability — not client role alone.

## Rename

- **Document:** `renameWorkspaceDocument` → `POST /api/workspace/documents/[id]/rename` with `{ name }`.
- **Folder:** existing `renameWorkspaceFolderAction`.
- Validation: `validateWorkspaceDocumentName` / folder name rules (trim, max 120, duplicate name in folder scope).
- Audit: `WORKSPACE_DOCUMENT_RENAMED`, `WORKSPACE_FOLDER_RENAMED`.
- Does not mutate versions, Task/Requirement refs, or ACL rows.

## Move

- **Document:** `moveWorkspaceDocument` + `evaluateWorkspaceDocumentMove` → `POST …/move`, preflight `POST …/move-impact`.
- **Folder:** existing folder move + move-impact API.
- Guards: cross-tenant, edit on source/destination, **no effective-access widening** (W02/W03).
- After move: access summary refetches via `router.refresh()` / server revalidation.
- Audit: `WORKSPACE_DOCUMENT_MOVED`, `WORKSPACE_FOLDER_MOVED`.

## Lifecycle

Canonical states: **ACTIVE**, **ARCHIVED**, **TRASHED** (UI: Aktiv, Archiviert, Papierkorb).

| Transition | Document API | Folder |
|------------|--------------|--------|
| → Archiviert | `POST …/archive` | `archiveWorkspaceFolderAction` |
| Archiviert → Aktiv | `POST …/restore` | `restoreWorkspaceFolderAction` |
| → Papierkorb | `POST …/trash` | `trashWorkspaceFolderAction` (sync/async subtree) |
| Papierkorb → Aktiv | `POST …/restore-trash` | `restoreWorkspaceFolderFromTrashAction` |
| Endgültig löschen | `DELETE …/permanent` (trash only UI) | `DeleteFolderButton` (trash / destructive) |

Restore from trash returns documents to ACTIVE or ARCHIVED depending on preserved `archivedAt` (W06).

## Reference-safe permanent delete

Blocked when purge eligibility reports Task/Requirement references. UI shows safe message without leaking unauthorized blocker metadata.

## Subtree / async

Large folder trash uses W08 `requestWorkspaceFolderTrash` with user-facing “Ordner wird verschoben …” messaging — no job IDs in UI.

## Security

- Zero-disclosure 404 on unauthorized edit/move/rename APIs.
- No client-side `parentId` / lifecycle writes.
- No creator/admin bypass beyond resource ACL + tenant caps.

## Tests

- `lib/workspace/__tests__/w09-05-resource-management.test.ts`
- Existing W06/W08/W09 regression suites.

## Deferred (W09-06+)

- Server-computed `WorkspaceAvailableActionsDto` (replace stub).
- Bulk selection / bulk trash.
- Mobile BFF action payloads.
