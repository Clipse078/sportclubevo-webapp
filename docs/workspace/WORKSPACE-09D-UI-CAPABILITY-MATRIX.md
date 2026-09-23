# WORKSPACE-09D — UI capability matrix

**Baseline STAGE SHA:** `704a7c4571524bd0fd2dc10df238110a23a3201b`  
**States:** `COMPLETE` | `PARTIAL` | `HIDDEN` | `MISSING` | `PLACEHOLDER` | `INTENTIONALLY_NO_UI`

---

## Summary counts

| State | Count |
|-------|------:|
| **TOTAL** | **62** |
| COMPLETE | 22 |
| PARTIAL | 18 |
| HIDDEN | 8 |
| MISSING | 9 |
| PLACEHOLDER | 2 |
| INTENTIONALLY_NO_UI | 3 |

---

## Matrix

| CAPABILITY | DOMAIN | API / SERVICE | AUTHORIZATION | CURRENT_UI | LOCATION | DISCOVERABILITY | STATE | W09_PACKAGE |
|------------|--------|---------------|---------------|------------|----------|-----------------|-------|-------------|
| View folder tree | Folders | SSR `getWorkspaceFolderTree` | `workspace.view` + read where | Tree panel | Left column | Good | COMPLETE | — |
| Select folder | Folders | URL `?folder=` | VIEW | Tree links | Left | Good | COMPLETE | — |
| Create root folder | Folders | `createRootWorkspaceFolderAction`, `POST /folders` | `workspace.manage` | `CreateRootFolderDialog` | Tree header | Moderate | PARTIAL | W09-01 |
| Create subfolder | Folders | `createChildWorkspaceFolderAction` | `workspace.manage` | `CreateSubfolderForm` | Tree under selection | Hidden until selected | PARTIAL | W09-01 |
| Rename folder | Folders | `renameWorkspaceFolderAction` | manage + folder edit | `RenameFolderForm` | Inspector slot | Poor | PARTIAL | W09-05 |
| Move folder | Folders | `moveWorkspaceFolderAction`, move-impact API | manage + edit source/target | Form + tree DnD | Inspector + tree | DnD hidden | PARTIAL | W09-05 |
| Archive folder | Folders | archive action | manage + edit | `ArchiveFolderButton` | Inspector | Poor | PARTIAL | W09-05 |
| Restore archived folder | Folders | restore action | manage + edit | `RestoreFolderButton` | Page bottom list | Poor | PARTIAL | W09-05 |
| Trash folder subtree | Lifecycle | `folder-lifecycle-service`, subtree op | manage + edit | **None** | — | None | MISSING | W09-05 |
| Permanent delete folder | Lifecycle | delete action, subtree API | `workspace.delete` + subtree manage | `DeleteFolderButton` | Inspector | Too prominent | PARTIAL | W09-05 |
| Folder access summary | Access | `GET …/folders/…/access-summary` | VIEW | `WorkspaceAccessSummaryPanel` | Inspector | OK | PARTIAL | W09-04 |
| Manage folder grants | Access | `PUT …/access`, audiences API | resource MANAGE | Dialog | From summary | Moderate | COMPLETE | W09-04 |
| List documents | Documents | `listWorkspaceDocuments`, `GET /documents` | VIEW + read where | Table | Centre | Good | COMPLETE | — |
| Upload new document | Upload | `POST /documents` | folder EDIT | Button + dropzone | Header + overlay | Moderate | PARTIAL | W09-01 |
| Multi-file upload | Upload | sequential client loop | folder EDIT | Dropzone only | Drag/empty | Hidden | PARTIAL | W09-01 |
| Upload new version | Versions | `POST …/versions` | document EDIT | **None** | — | None | MISSING | W09-03 |
| Download document | Download | `GET …/download` | VIEW + scan gate | ⋮ menu, preview | Row/inspector | Hidden in menu | PARTIAL | W09-01 |
| Preview document | Preview | `GET …/preview` | VIEW + scan gate | `WorkspaceFilePreview` | Inspector | OK when selected | PARTIAL | W09-03 |
| Rename document | Documents | **None** | would EDIT | Disabled menu | ⋮ | PLACEHOLDER | PLACEHOLDER | W09-05 |
| Move document | Documents | **None** | would EDIT | Disabled menu | ⋮ | PLACEHOLDER | PLACEHOLDER | W09-05 |
| Copy internal link | Documents | N/A (client) | VIEW | ⋮ menu | Row | Hidden | PARTIAL | W09-01 |
| Version history | Versions | `GET …/versions` | VIEW | Dialog from ⋮ | Row | Hidden | PARTIAL | W09-03 |
| Restore version | Versions | `POST …/restore` | document EDIT | History dialog | Dialog | Hidden | PARTIAL | W09-03 |
| Archive document | Lifecycle | `POST …/archive` | manage + edit | ⋮ menu | Row | Hidden | PARTIAL | W09-05 |
| Trash document | Lifecycle | `POST …/trash` | manage + edit | ⋮ menu | Row | Hidden | PARTIAL | W09-05 |
| Restore archived doc | Lifecycle | `POST …/restore` | manage + edit | **None** | — | None | MISSING | W09-05 |
| Restore trashed doc | Lifecycle | `POST …/restore-trash` | manage + edit | **None** | — | None | MISSING | W09-05 |
| Permanent delete doc | Lifecycle | `DELETE …/permanent` | delete + manage | Delete control | ⋮ | Mixed with routine | PARTIAL | W09-05 |
| Document access summary | Access | access-summary API | VIEW | Panel | Inspector | OK | PARTIAL | W09-04 |
| Manage document grants | Access | PUT access | MANAGE | Dialog | ⋮ / summary | Hidden | COMPLETE | W09-04 |
| Deep link document | Navigation | `document-link-access` | VIEW | URL | Router | Power user | COMPLETE | — |
| Deep link version | Navigation | version link access | VIEW | URL `?version=` | Router | Hidden | PARTIAL | W09-03 |
| List favorites | Collaboration | `GET /favorites` | VIEW | Discovery panel | Top card | Low value | PARTIAL | W09-06 |
| Toggle favorite | Collaboration | `POST /favorites` | VIEW on target | **None** | — | None | MISSING | W09-06 |
| Recent items | Collaboration | `GET /recent` | VIEW | Discovery panel | Top card | Passive | PARTIAL | W09-06 |
| Related tasks (doc) | W07 Tasks | SSR panel | task visibility | `ContextRelatedTasksPanel` | Inspector | Only w/ URL doc | PARTIAL | W09-02 |
| Link task to version | W07 Tasks | aufgaben actions | task edit + ws VIEW | Aufgaben UI only | Other module | N/A workspace | HIDDEN | W09-02 |
| List req refs on doc | W07 Req | requirement service | req read + ws VIEW | **None** | — | None | MISSING | W09-02 |
| Link requirement version | W07 Req | requirement actions | req edit + ws VIEW | Aufgaben UI only | Other module | N/A | HIDDEN | W09-02 |
| Malware scan status | W08 | scan state on version | VIEW | **None** | — | None | MISSING | W09-03 |
| Blocked download UX | W08 | content-delivery-gate | VIEW | Generic error | API only | Poor | PARTIAL | W09-03 |
| Workspace audit read | W08 | `GET /audit` | `workspace.audit.view` | Audit page | Orphan URL | Hidden | HIDDEN | W09-06 |
| Break-glass sessions | W08 | governance API | break_glass | Break-glass page | Orphan URL | Hidden | HIDDEN | INTENTIONALLY_NO_UI |
| Governance holds | W08 | holds API | governance.manage | **None** | — | Ops | INTENTIONALLY_NO_UI | defer |
| Background jobs admin | W08 | health/requeue API | governance | **None** | — | Ops | INTENTIONALLY_NO_UI | defer |
| Trash retention purge | W08 | cron purge | system | **None** | — | N/A | INTENTIONALLY_NO_UI | — |
| Subtree op status | W08 | `GET subtree-operations/…` | actor | Async msg only | Delete dialog | Rare | PARTIAL | W09-06 |
| Storage provider swap | W08 | registry | system | Transparent | — | N/A | COMPLETE | — |
| Breadcrumbs | Nav | `buildWorkspaceBreadcrumbs` | VIEW | Breadcrumbs | Centre header | Good | COMPLETE | W09-01 |
| Archived view | Lifecycle | lifecycle/archived API | VIEW | Link + minimal list | Discovery | Weak | PARTIAL | W09-05 |
| Trash view | Lifecycle | lifecycle/trash API | VIEW | Link + minimal list | Discovery | Weak | PARTIAL | W09-05 |
| Command bar | UX shell | N/A | computed | **None** | — | None | MISSING | W09-01 |
| Selection action bar | UX shell | N/A | computed | **None** | — | None | MISSING | W09-01 |
| Context menu (row) | UX shell | mixed | per action | ⋮ menu | Row | Low | PARTIAL | W09-01 |
| Folder inspector hierarchy | UX shell | N/A | — | Flat destructive stack | Inspector | Poor | PARTIAL | W09-05 |
| Local sort | UX shell | client/query | VIEW | **None** | — | None | MISSING | W09-01 |
| Universal search | Search | roadmap | — | **None** | — | Deferred | INTENTIONALLY_NO_UI | post-mobile |
| Create task from workspace | Differentiation | aufgaben create | tasks.create + ws | **None** | — | None | MISSING | W09-02 |
| Create requirement from workspace | Differentiation | requirement create | req perms + ws | **None** | — | None | MISSING | W09-02 |
| Office preview | Preview | preview policy | VIEW | Fallback icon | Inspector | Weak | PARTIAL | W09-03 |
| PDF preview | Preview | preview route | VIEW | iframe | Inspector | OK | COMPLETE | W09-03 |
| Image preview | Preview | preview route | VIEW | img | Inspector | OK | COMPLETE | W09-03 |
| Empty state upload | Upload | POST documents | EDIT | Empty state dropzone | Centre | OK if permitted | COMPLETE | W09-01 |
| i18n consistency | UX | N/A | — | Mixed DE hardcoded | Discovery/copy link | — | PARTIAL | W09-06 |

---

## File / folder action completeness (§22)

| ACTION | DOMAIN_EXISTS | API_EXISTS | UI_EXISTS | CURRENT_LOCATION | TARGET_LOCATION | AUTH | W09_PACKAGE |
|--------|---------------|------------|-----------|------------------|-----------------|------|-------------|
| DOWNLOAD | yes | yes | yes | ⋮ menu | Command bar + row hover | VIEW + scan | W09-01 |
| UPLOAD | yes | yes | partial | Header button | Command bar + drop | folder EDIT | W09-01 |
| NEW VERSION | yes | yes | no | — | Command bar + inspector | doc EDIT | W09-03 |
| RENAME | folder yes / doc no | folder yes / doc no | folder yes / doc placeholder | Inspector / ⋮ | Command bar + overflow | EDIT | W09-05 |
| MOVE | folder yes / doc no | folder yes / doc no | folder yes / doc placeholder | Inspector / tree | Command bar | EDIT | W09-05 |
| COPY LINK | yes | n/a | yes | ⋮ | Overflow | VIEW | W09-01 |
| VERSION HISTORY | yes | yes | yes | ⋮ dialog | Command bar + tab | VIEW | W09-03 |
| RESTORE VERSION | yes | yes | yes | History dialog | History + overflow | EDIT | W09-03 |
| ACCESS | yes | yes | yes | Summary + dialog | Inspector tab | MANAGE | W09-04 |
| ARCHIVE | yes | yes | yes | ⋮ / folder inspector | Overflow / lifecycle | EDIT | W09-05 |
| RESTORE | yes | yes | partial | Folder list only | Archiviert/Papierkorb views | EDIT | W09-05 |
| TRASH | yes | yes | partial | ⋮; folder missing | Command bar / lifecycle | EDIT | W09-05 |
| PERMANENT DELETE | yes | yes | yes | ⋮ / folder inspector | Trash context only | delete+MANAGE | W09-05 |
| CREATE FOLDER | yes | yes | partial | Tree | + Neu command bar | manage | W09-01 |
| FAVORITE | yes | yes | read-only list | Discovery | Star on row/folder | VIEW | W09-06 |
| TASK | yes | yes (link) | partial | Inspector tasks | Command bar + tab | dual | W09-02 |
| REQUIREMENT | yes | yes (link) | no | — | Command bar + tab | dual | W09-02 |
