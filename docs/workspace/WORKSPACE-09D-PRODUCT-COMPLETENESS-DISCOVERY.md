# WORKSPACE-09D — Product completeness & command-surface discovery

**Status:** Discovery complete — **W09-07 final reconciliation** in `WORKSPACE-09-07-MOBILE-READY-FINAL-ACCEPTANCE.md` (Document Workspace product closure)  
**Baseline STAGE SHA:** `704a7c4571524bd0fd2dc10df238110a23a3201b`  
**Branch:** `cursor/workspace-09d-product-completeness-ux-discovery`  
**Date:** 2026-09-23  
**Prerequisites:** WORKSPACE-01–08 merged; W08 closure `docs/workspace/WORKSPACE-08-STAGE-CLOSURE.md`

**Rule:** This document defines W09 product/UX completion. **Do not implement W09 in 09D.**

Companions:

- `WORKSPACE-09D-UI-CAPABILITY-MATRIX.md`
- `WORKSPACE-09D-COMMAND-ACTION-MODEL.md`
- `WORKSPACE-09D-BENCHMARK.md`
- `WORKSPACE-09D-IMPLEMENTATION-PLAN.md`

---

## 1. Executive summary

After W01–W08, the Workspace is **technically mature** (ACL, private storage, immutable versions, lifecycle, W07 exact-version references, W08 audit/governance/malware/subtree scale) but **product-incomplete** for daily club document work.

**Verified vs product-owner observations (STAGE `704a7c45`):**

| Observation | Verification |
|-------------|--------------|
| No obvious upload | **Partially outdated:** `WorkspaceUploadButton` in centre header when `canWorkspaceEdit` on folder; not a persistent command bar |
| No drag/drop | **Partially outdated:** `WorkspaceUploadDropzone` + shell drag handlers; overlay only visible **during drag** (`pointer-events: none` when idle) — easy to miss |
| No create folder at workspace level | **Partially true:** `CreateRootFolderDialog` in tree header; `CreateSubfolderForm` only when folder selected — no **+ Neu** menu |
| Rename/move “DEMNÄCHST” | **Confirmed:** `WorkspaceDocumentActions` disabled + `comingSoon` i18n |
| Requirements not visible | **Confirmed:** W07 backend + Aufgaben UI only; **no** workspace inspector section |
| Destructive folder actions prominent | **Confirmed:** folder inspector slot stacks rename/move with **Archive** + **Permanent delete** in same vertical block |
| Huge unused centre space | **Confirmed:** table height follows row count; no adaptive preview/empty drop affordance when list is short |
| Archiviert/Papierkorb wide strip | **Confirmed:** `WorkspaceDiscoveryPanel` full-width card above grid |

**W09 mission:** Reach **Dropbox/OneDrive/SharePoint-class discoverability and action hierarchy** while **differentiating** via Tasks, Requirements, org-scoped access, immutable versions, lifecycle/governance, and club workflows — without weakening W06/W08 security invariants.

---

## 2. Preflight record

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Repo | `Clipse078/sportclubevo-webapp` | Match | PASS |
| `LOCAL_STAGE` | `704a7c45…` | `704a7c4571524bd0fd2dc10df238110a23a3201b` | PASS |
| `ORIGIN_STAGE` | prefix `704a7c45` | `704a7c4571524bd0fd2dc10df238110a23a3201b` | PASS |
| `LOCAL == ORIGIN` | yes | yes | PASS |
| Worktree | clean | clean at branch create | PASS |
| W08 closure doc | present | `WORKSPACE-08-STAGE-CLOSURE.md` | PASS |

**Database safety (09D):** No schema changes, migrations, migration commands, or STAGE DB writes.

---

## 3. Current product shell (as implemented)

### 3.1 Layout topology

```
PageShell (full width)
  PageHeader — eyebrow/title/description
  WorkspaceDiscoveryPanel — lifecycle links + favorites/recents (client fetch)
  [optional lifecycle banner for deep-linked archived/trashed doc]
  grid lg: [220px tree | 1fr list | 300px inspector]
```

Evidence: `app/(admin)/dashboard/workspace/page.tsx`, `WorkspaceClientShell.tsx`.

### 3.2 Centre panel (folder selected)

- Breadcrumbs + document count + ephemeral upload success chip
- **Upload:** primary button top-right (single-file input on button; multi only via dropzone hidden input)
- Document table OR empty state (empty includes expanded dropzone when `canUpload`)
- Drag overlay: dashed full-area overlay when dragging files

### 3.3 Inspector (right)

**No document selected:** access summary → folder name block embedding **entire** `folderManagementSlot` (rename, move, archive, permanent delete) → description → timestamps.

**Document selected:** preview card → access summary → `ContextRelatedTasksPanel` (only if `?document=` resolved server-side).

**Missing inspector regions:** Requirements, version summary strip, scan state, activity/governance, explicit primary actions (download/new version live in row ⋮ menu only).

### 3.4 Document row actions

All routine actions live behind **⋮** (`WorkspaceDocumentActions`): download, access (if manage), rename/move (disabled), version history, copy link, archive/trash, permanent delete (tenant delete cap).

No selection-driven **command bar** above the table.

### 3.5 Lifecycle navigation

- Discovery panel links: `?view=archived`, `?view=trash` — minimal list sections (also separate bottom “archived folders” list with restore/delete)
- Trash/archived **document** restore: API exists; **no** first-class UI in trash view

---

## 4. Systemic UX model (target)

### 4.1 Problem statement

Capabilities are **backend-complete** but **interaction-scattered**: tree vs header upload vs row menu vs inspector forms vs page-bottom archived strip vs orphan governance URLs. Users must infer affordances; destructive operations share visual weight with routine management.

### 4.2 Target information architecture

1. **Persistent command bar** — context state machine (see `WORKSPACE-09D-COMMAND-ACTION-MODEL.md`) above document list.
2. **Inspector as read + deep detail** — preview, access “why”, tasks/requirements, version metadata; **not** primary home for rename/move/delete.
3. **Lifecycle as secondary navigation** — compact segmented control or tabs; not a large discovery card competing with workspace.
4. **Progressive disclosure** — overflow for low-frequency/safe-destructive; **irreversible delete** only in trash/destructive context with strong confirmation.
5. **SCE differentiation surfaced** — + Aufgabe / + Anforderung adjacent to upload; exact-version semantics in link flows.

### 4.3 Textual wireframe (refined contract)

```
┌─ Workspace ─────────────────────────────────────────────────────────────┐
│ Breadcrumb: Dashboard › Dokumente › …                                     │
│ [ Aktiv | Archiviert | Papierkorb ]          (secondary, compact)         │
├───────────────────────────────────────────────────────────────────────────┤
│ 📁 Ordnerpfad …                                    [★] [inspektor toggle] │
├───────────────────────────────────────────────────────────────────────────┤
│ [+ Neu ▾] [Hochladen] [+ Aufgabe] [+ Anforderung]  │ Sort ▾ View ▾ […] │
├──────────┬────────────────────────────────────────────┬───────────────────┤
│ Tree     │  Document list (min-height, drop hint)      │ Inspector tabs:   │
│ (resize) │  — selection drives command bar              │ Preview | Details │
│          │  — row hover: quick download               │ Access | Tasks    │
│          │  — keyboard multi-select (if in scope)     │ Anforderungen     │
│          │                                            │ Versionen         │
└──────────┴────────────────────────────────────────────┴───────────────────┘
```

**Document-selected command bar (target):**  
`[Herunterladen] [Neue Version] [+ Aufgabe] [+ Anforderung] [Verschieben] […]`  
Overflow: Umbenennen, Link kopieren, Versionsverlauf, Zugriff, Archivieren, Papierkorb.

**Folder-selected (no doc):**  
`[+ Neu ▾] [Hochladen] [+ Aufgabe] [+ Anforderung]` — folder-level task/requirement = CREATE_AND_LINK to folder context where domain supports; document actions disabled.

---

## 5. Drag & drop — target contract

### 5.1 Current implementation

| Aspect | Evidence |
|--------|----------|
| Drop target | Centre content + `WorkspaceUploadDropzone` overlay |
| Destination | Current `folderId` from page/shell |
| Multi-file | Dropzone + empty state: sequential `uploadWorkspaceFile` loop |
| Auth | `canUpload` = folder EDIT (`canWorkspaceEdit`) |
| Progress | Per-file sequential; partial failure messaging in dropzone |
| Button upload | **Single file** only (`WorkspaceUploadButton` input no `multiple`) |
| Scan | Post-upload async malware job (W08); **no** user-facing scan chip in UI |

### 5.2 Target (W09)

- **Mandatory** `Hochladen` in command bar (multi-file picker aligned with dropzone).
- **Idle drop hint** in empty/short lists: subtle “Dateien hier ablegen → {Ordner}” (not only on drag).
- **Permission gating:** hide/disable with tooltip explaining missing EDIT.
- **Scan pending:** badge on row + inspector; block download/preview per `content-delivery-gate` with friendly copy.
- **Duplicate filename:** surface `WORKSPACE_UPLOAD_CONFLICT` with rename/replace policy (server truth first).
- **Accessibility:** command bar upload + file input; drop hint not sole path.
- **No** folder-upload unless product accepts browser folder API + server batch semantics (defer — not required for parity).

---

## 6. Create folder — target contract

| Current | Target |
|---------|--------|
| Root: icon dialog in tree header | **+ Neu → Ordner erstellen** in command bar (modal or inline) |
| Child: “+ Unterordner” under selected tree node | Same **+ Neu** when folder selected; tree retains shortcut |
| Auth | `WORKSPACE_MANAGE` tenant cap for create actions today — **retain**; creation target = current folder |
| UX | Modal with name + optional description; confirm inheritance note |

---

## 7. Tasks & requirements quick actions

### 7.1 Backend (W07 — verified on STAGE)

| Domain | Reference model | Auth pattern |
|--------|-----------------|--------------|
| Tasks | `TaskDocumentReference` + optional `workspaceDocumentVersionId`, `versionBinding` EXACT | Task edit rules + workspace VIEW to link |
| Requirements | `RequirementWorkspaceDocumentVersionReference` → **exact** `WorkspaceDocumentVersion.id` | Requirement edit + workspace VIEW |

Server actions: `app/(admin)/dashboard/aufgaben/actions.ts`, `requirement-actions.ts`.  
Picker: `WorkspaceDocumentVersionReferencePicker.tsx`.

### 7.2 Current workspace UI

| Surface | Tasks | Requirements |
|---------|-------|----------------|
| Inspector | `ContextRelatedTasksPanel` — **primary DOCUMENT context only** | **None** |
| Command bar | **None** | **None** |
| Deep link | `?document=` enables tasks panel | **None** |

### 7.3 Target quick-action semantics

| Context | + Aufgabe | + Anforderung |
|---------|-----------|---------------|
| Current folder, no selection | **NAVIGATE_TO_DOMAIN_CREATION** with folder context **or** CREATE_AND_LINK if product adds folder-scoped refs (today: document/version only — **default: open Aufgaben create with pre-filled context where supported**) | Same pattern; requirement refs are **version-pinned** — require document selection or picker |
| Document selected (current version) | **CREATE_OR_LINK** — picker defaults `currentVersionId` with EXACT binding | **CREATE_OR_LINK** — **must** pass `workspaceDocumentVersionId` |
| Historical version (version history / `?version=`) | Link with EXACT binding to that version | Same |
| Archived/trashed doc | **Disabled** or link-only read — follow lifecycle + VIEW rules | Same |

**Invariant:** Never substitute document id where W07 requires version id for Requirements.

---

## 8. Destructive action hierarchy

### 8.1 Lifecycle contract (server)

| State | User transitions | Permanent purge |
|-------|------------------|-------------------|
| ACTIVE | archive, trash | Only via trash + eligibility (W08 retention/holds/refs) |
| ARCHIVED | restore | Not direct from active UI target |
| TRASHED | restore-trash | `DELETE …/permanent` + confirm; folder subtree via async op |

Permanent delete requires `WORKSPACE_DELETE` + resource MANAGE (documents) / subtree MANAGE (folders).

### 8.2 Current UI problems

- Folder inspector: **Endgültig löschen** adjacent to rename/archive without visual de-emphasis.
- Document: permanent delete inside same ⋮ menu as download.
- Folder **trash** subtree: **no UI** (backend/async only).

### 8.3 Target

- **Routine:** Archivieren / In Papierkorb — command bar or overflow, neutral styling.
- **Restore:** only in Archiviert/Papierkorb contexts + inspector banner on deep link.
- **Permanent delete:** Trash view + explicit destructive section; typed confirmation for folders; async messaging (`DeleteFolderButton` already has `asyncScheduled` — extend pattern).
- **Blocked by refs/holds:** show reference-safe messaging from deletion registry — no silent failure.

---

## 9. Folder inspector redesign contract

**Priority order (target):**

1. Identity — name (read-only headline) + breadcrumb path
2. **Zugriff** — effective summary + “Verwalten” entry
3. Description / club context
4. Metadata — created/updated
5. **Verwalten** (collapsed) — rename, move
6. **Lebenszyklus** (collapsed) — archive → trash
7. **Destruktiv** (trash context only) — permanent delete

Rename/move **also** in command bar when folder selected (single mental model).

---

## 10. Document inspector — complete contract

**Target tabs/sections (progressive disclosure):**

| Section | Content |
|---------|---------|
| Preview | Image/PDF/text inline; Office/other fallback card with type icon + metadata + actions |
| Details | Name, type, size, modified, version #, scan badge |
| Versionen | Current + link to full history; **Neue Version** CTA |
| Zugriff | WHO/WHAT/WHY — inherited vs explicit (`access-summary` DTO extended in W09-04) |
| Aufgaben | Count + list + link to task; + Aufgabe |
| Anforderungen | Count + list + link; + Anforderung; **exact-version badge** on linked rows |
| Aktivität | Defer full feed; optional “Letzte Änderung” until W08 audit UX productized |

---

## 11. Versioning UX

| Capability | Backend | UI today | W09 target |
|------------|---------|----------|------------|
| List versions | `GET …/versions` | Version history dialog | Command bar + inspector tab |
| Upload new version | `POST …/versions` | **Missing** | **Neue Version** → same upload pipeline, new version row |
| Download historical | `GET …/download?versionId=` | In history dialog | Same + inspector |
| Preview historical | preview route with version | Limited | History + optional `?version=` deep link |
| Restore version | `POST …/restore` | History dialog | Overflow + history |
| W07 pins | EXACT refs | Aufgaben picker | Show “Version n” on links |

---

## 12. Preview UX

**MIME support today:** `WorkspaceFilePreview` — image, PDF (iframe), text fetch; office/video/generic fallback icons.

| Class | Target |
|-------|--------|
| IMAGE | Inline preview + expand |
| PDF | iframe + full-screen |
| TEXT | Monospace snippet |
| OFFICE | High-quality fallback + download; no public URL; optional future server render **defer** |
| OTHER | Identity card + download + new version |
| UNSUPPORTED / scan blocked | Explain scan state; no bypass |

---

## 13. Access management UX

Current summary: flat list “Organisation · Lesen” (`WorkspaceAccessSummaryPanel`).

**Target “Zugriff” panel:**

- Effective level for current user
- Table of audiences (Org, Org Unit, Team, Role, Person) with VIEW/EDIT/MANAGE
- Inheritance indicator + source folder
- Entry to `WorkspaceAccessManagementDialog` when `canWorkspaceManage`

---

## 14. Archive / trash navigation

**Reject:** full-width discovery card as primary lifecycle nav.

**Adopt (adapt):** compact **segmented control** under breadcrumb: Aktiv | Archiviert | Papierkorb — filters main list/tree or switches mode.

**Trash/archived views:** proper lists with restore + move to active; bulk actions defer.

---

## 15. Folder tree

| Topic | Current | Target |
|-------|---------|--------|
| Width | fixed ~220px | resizable 200–360px |
| Subfolder create | selected node only | retain + command bar |
| Move | drag handle (hover-only ⋮⋮) | retain for power users; **do not** rely as sole move |
| External file drop on tree | not supported | optional future — **defer** |
| Responsive | fixed column | drawer overlay <1024px |

---

## 16. Document table

Columns **NAME, GEÄNDERT, GRÖSSE, VERSION** — **keep**. Add optional scan/status icon column if malware UX lands in W09-03.

Selection: single today; **multi-select defer** unless bulk trash/download justified in W09-05.

Row click selects; double-click **defer** (open preview full-screen optional).

---

## 17. Empty space / large displays

- `min-h` on list region + integrated drop hint
- Resizable inspector (320–480px)
- Preview expand consumes centre space when requested
- Calm empty state — no decorative dashboard cards

---

## 18. Upload experience (full)

See matrix + command model. Unify button/dropzone multi-file; per-file progress list; toasts; scan-pending row state; no silent success on partial batch.

---

## 19. Search / sort / filter

**Universal Search:** explicitly **out of scope** (post-mobile SEARCH-01..05).

**Local list:** sort by name/date/size/version — **ADOPT** lightweight client or query param sort (W09-01) without search index.

---

## 20. Loading / feedback / error UX

Standardize: pending buttons, inline errors, toast on success, **no false “deleted”** on async subtree — poll `subtree-operations/[id]` or show “Vorgang wird ausgeführt…”.

---

## 21. Malware UX mapping

| State | User copy (target) |
|-------|-------------------|
| NOT_SCANNED / PENDING / SCANNING | “Sicherheitsprüfung ausstehend” — download/preview disabled |
| CLEAN | no badge |
| INFECTED / BLOCKED | “Datei gesperrt — Support kontaktieren” |
| SCAN_FAILED | “Prüfung fehlgeschlagen — erneut versuchen” (ops may requeue) |

---

## 22. Async subtree UX (W08-07)

States: queued, running, partially blocked, failed, succeeded — surface in folder delete/trash dialogs; **no job IDs**; allow dismiss + background notification pattern.

---

## 23. Responsive contract (input for MOBILE-05)

| Breakpoint | Tree | Command bar | Inspector | Table |
|------------|------|-------------|-----------|-------|
| Large desktop | visible + resizable | full primary set | side panel | all columns |
| Laptop | visible | overflow earlier | side panel | all columns |
| Small laptop | narrow tree | icon + labels truncate | collapsible drawer | hide size |
| Tablet | drawer | bottom sheet actions | full-screen overlay | name + modified |

---

## 24. Accessibility contract

- Command bar: roving tabindex, arrow navigation, visible focus
- Row selection: Enter/Space (exists)
- Drag/drop: upload button + keyboard file picker mandatory
- Destructive: focus trap in dialogs; announce async completion
- Icon buttons: `aria-label` (audit ⋮ menu — good pattern to extend)

---

## 25. Visual design direction

Preserve SCE tokens (`--surface`, `--blue`, calm borders). **Premium calm density** — reduce nested bordered cards in inspector; destructive = outline/ghost in overflow, not full-width red in inspector. Restrained motion on drag/upload success.

**Avoid:** ribbon complexity, card soup, permanent red inspector buttons, hiding upload behind permission with no explanation.

---

## 26. Mobile-ready domain contract (DTO gaps)

**Needed for MOBILE-05 (define in W09, implement APIs in W09-07):**

| DTO | Purpose |
|-----|---------|
| `WorkspaceFolderSummaryDto` | tree + breadcrumb |
| `WorkspaceDocumentSummaryDto` | list row + scan badge |
| `WorkspaceDocumentDetailDto` | inspector aggregate |
| `WorkspaceAvailableActionsDto` | server-computed action flags per context state |
| `WorkspaceVersionSummaryDto` | history list |
| `WorkspaceAccessSummaryDto` | extend with inheritance provenance |
| `WorkspaceTaskReferenceDto` / `WorkspaceRequirementReferenceDto` | linked items without raw ids in UI |
| `WorkspacePreviewCapabilityDto` | mime class + allowed operations |
| `WorkspaceLifecycleDto` | active/archived/trashed + restore eligibility |
| `WorkspaceAsyncOperationDto` | subtree job status for polling |

**Security:** DTOs reflect authorization outcomes; never leak unauthorized resource metadata.

---

## 27. Security invariants (non-negotiable)

All W09 UI must preserve W01–W08:

- Tenant isolation; resource ACL; dynamic audiences; inheritance intersection
- No creator bypass; no broad admin bypass on resource ACL
- Break-glass read-only where scoped; malware enforcement on delivery
- Private storage only; exact W07 version references; reference-safe delete
- Retention/holds; async subtree safety

---

## 28. Milestone — DOCUMENT WORKSPACE CLOSED — MOBILE READY

| Dimension | Objective criteria |
|-----------|-------------------|
| Technical | W01–W08 suites green; W09 sentinels for UI/API contracts |
| Product | Command bar + upload/dnd discoverable; no DEMNÄCHST on rename/move/new version |
| Actions | Matrix ≥95% COMPLETE for core file/folder actions |
| Security | No new bypass; action DTO matches server |
| Accessibility | WCAG-oriented keyboard paths on command bar + table |
| Responsive | Tablet contract implemented |
| Mobile API | DTOs documented + routes or BFF endpoints stubbed |
| Quality | Zero known P0/P1 in workspace UX |

---

## 29. Verdict

**WORKSPACE-09D DISCOVERY PASS** — full W01–W08 capability map, systemic UX model, command architecture, benchmark alignment, and W09 package sequence are defined in companion docs.

**Recommended first package:** **WORKSPACE-09-01** — Workspace command surface + upload/drag-drop parity + create-folder + selection action architecture.
