# WORKSPACE-09-01 — Command surface + upload architecture

**Implementation branch:** `cursor/workspace-09-product-completion-ux`  
**Discovery ancestry:** W09D via `9017bdfd50ca85f62e136e2e9cab6a4d9985459f`  
**STAGE base:** `704a7c4571524bd0fd2dc10df238110a23a3201b`

## Implemented command model

- `WorkspaceCommandBar` — persistent toolbar above the document list.
- Context model in `lib/workspace/command/workspace-command-context.ts` (client visibility only).
- `stubWorkspaceAvailableActions` — W09-07 server DTO placeholder.

### Active folder (no document selection)

- **Primary:** `+ Neu` → Ordner erstellen, `Hochladen` (multi-file).
- **Deferred (W09-02):** `+ Aufgabe`, `+ Anforderung` — not rendered (no fake controls).

### Document selected

- **Primary:** Herunterladen, Versionsverlauf.
- **Overflow:** Link kopieren.
- Row `…` menu retained as secondary route.

### Archived / trash views

- Command bar shows read-only hint; upload/create hidden.

## Upload

- Shared orchestration: `useWorkspaceUploadBatch` + `WorkspaceUploadProvider`.
- Command bar and drag/drop use the same sequential upload path (`uploadWorkspaceFile`).
- Multi-file file input (`multiple`) on provider.
- Progress: `WorkspaceUploadProgress` with batch counts and per-file errors.
- Scan gating unchanged (server authoritative; no “fully usable” claim added in W09-01).

## Drag & drop

- `WorkspaceUploadDropzone` overlay on list area (pointer-events none when idle).
- Empty folder hint references destination + command bar Hochladen.

## Folder creation

- `CreateWorkspaceFolderDialog` — root (tree) and child (command bar) share validation/actions.
- Destination context shown for subfolders.

## Lifecycle navigation

- `WorkspaceLifecycleNavigation` — Aktiv / Archiviert / Papierkorb (`?view=`).
- Favorites/recents demoted to `WorkspaceQuickDiscoveryPanel` (no lifecycle strip).

## Destructive hierarchy

- Active folder inspector: archive + permanent delete in separated section, subtle styling.
- Permanent delete on active folders remains server-governed but no longer visually dominant.

## Permission behavior

- Upload / subfolder create: folder **EDIT** (`canUploadSelectedFolder`).
- Root folder create: **WORKSPACE_MANAGE** (unchanged).
- UI flags mirror server; no client authority.

## Tests

- `lib/workspace/__tests__/w09-01-command-surface.test.ts`
- `lib/workspace/__tests__/upload-orchestration.test.ts`
- `components/admin/workspace/__tests__/WorkspaceCommandBar.test.tsx`
- Extended upload controls tests (provider multi-file).

## Known gaps (W09-02+)

- Task/requirement command bar entries and inspector tabs (W09-02).
- Malware badges / blocked download UX (W09-03).
- Document rename/move (W09-05).
- Sort/view controls when server sort exists (W09-01 slots only).
- Favorite toggle (W09-06).
- Mobile `WorkspaceAvailableActionsDto` (W09-07).

## Security invariants

- No schema changes.
- No weakened authorization.
- RSC boundary: serializable props only (W08-07A preserved).
