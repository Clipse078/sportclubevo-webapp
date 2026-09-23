# WORKSPACE-09-01 — Command surface + upload architecture

**Implementation branch:** `cursor/workspace-09-product-completion-ux`  
**Discovery ancestry:** W09D via `9017bdfd50ca85f62e136e2e9cab6a4d9985459f`  
**STAGE base:** `704a7c4571524bd0fd2dc10df238110a23a3201b`  
**W09-01A acceptance HEAD (pre-push):** `7ffc0e84f59ce1417a3e36b56a6092c17348e86f`  
**PR:** #704 (OPEN, DRAFT, base STAGE, not merged)

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
- `components/admin/workspace/__tests__/WorkspaceCommandBar.test.tsx` — EDIT/VIEW/MANAGE, lifecycle, document selection, deferred controls
- `components/admin/workspace/__tests__/WorkspaceUploadDropzone.test.tsx` — overlay pointer-events, multi-file drop, shared orchestration
- `components/admin/workspace/__tests__/WorkspaceUploadControls.test.tsx` — button + multi-file input, partial failure paths
- `components/admin/workspace/__tests__/CreateRootFolderDialog.test.tsx` — root tree creation flow
- Extended upload controls tests (provider multi-file).

## W09-01A regression baseline (2026-09-23)

### Exact-head CI (starting HEAD `7ffc0e84…`)

| Check | Result |
|-------|--------|
| Vercel | SUCCESS |
| Vercel Preview Comments | SUCCESS |

### Discovery vs W09-01 comparison

Compared `9017bdfd50ca85f62e136e2e9cab6a4d9985459f` (W09D) vs `7ffc0e84f59ce1417a3e36b56a6092c17348e86f` (W09-01) using isolated worktree + shared `node_modules` (no commit mutations).

| TEST_FILE | TEST_NAME | DISCOVERY | W09-01 | IDENTICAL | RELATED_TO_W09-01 |
|-----------|-----------|-----------|--------|-----------|-------------------|
| `lib/tasks/__tests__/aufgaben-03-workspace.test.ts` | A — loads visible subtasks… | FAIL | FAIL (pre-repair) | yes | no |
| `lib/tasks/__tests__/aufgaben-03-workspace.test.ts` | H — exposes series recurrence… | FAIL | FAIL (pre-repair) | yes | no |

**Error signature (both SHAs, pre-repair):** `TypeError: prisma.tenant.findUnique` / incomplete Prisma mock after AUFGABEN-06G7 assignee/creator enrichment (`task-assignee-display.ts`, `task-creator-display.ts`).

**NEW_W09_01_REGRESSIONS:** 0 (failures reproduced identically on discovery HEAD).

### Task workspace failure classification

| Field | Value |
|-------|-------|
| Root cause | **STALE_TEST_MOCK** — `aufgaben-03-workspace.test.ts` Prisma stub missing `tenant`, `person.findMany`, `user.findMany` required by 06G7 enrichment |
| Production defect | **No** |
| Test defect | **Yes** |
| Repaired in W09-01A | **Yes** — narrow mock extension only (no production semantic change) |

### W07 / Workspace sentinel baseline

| Suite | W09D discovery | W09-01 HEAD | Notes |
|-------|----------------|-------------|-------|
| `lib/workspace/__tests__/w07-sentinel.test.ts` | 48/48 PASS | 48/48 PASS | No drift |
| `lib/workspace/__tests__/w07-a1-acceptance.test.ts` | (included in workspace suite) | PASS | Unchanged |

No W07 TS/mock failures observed at either SHA in sentinel runs; W09-01 did not introduce Workspace/W07 regressions.

### Command acceptance (automated)

| Actor / state | Coverage |
|---------------|----------|
| EDIT + active folder | `+ Neu`, `Hochladen`; picker + create-folder dialog |
| VIEW | No upload/create; permission hint |
| MANAGE | Upload/create; no primary permanent-delete promotion in command bar |
| Document selected | Download + version history only |
| Archived / trash | Read-only hint; no mutations |
| Fake / deferred | No Aufgabe, Anforderung, DEMNAECHST, Sortieren, Ansicht in command bar source/tests |

### Upload / create-folder acceptance (automated, no live storage)

- Button single/multi, drop single/multi (dropzone + orchestration hook), progress/partial failure, permission gating via `canUpload` / provider — covered in `WorkspaceUploadControls`, `upload-orchestration`, `WorkspaceUploadDropzone`, `WorkspaceUploadContext` tests.
- Root + subfolder creation — `CreateRootFolderDialog` + command-bar `CreateWorkspaceFolderDialog` child mode.

### Security / RSC

- W08-07A runtime boundary sentinel re-run: PASS (`WorkspaceFolderTreePanel.runtime-boundary.test.tsx`).
- Command visibility remains client convenience; server authorization unchanged (W01–W08 invariants preserved in workspace + W07 suites).

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
