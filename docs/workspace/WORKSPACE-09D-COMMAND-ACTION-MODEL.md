# WORKSPACE-09D — Workspace command & action model

**Baseline STAGE SHA:** `704a7c4571524bd0fd2dc10df238110a23a3201b`

This document defines the **context-aware command architecture** for W09. UI permission state mirrors server rules; **server remains authoritative**.

---

## 1. Command surface inventory

### 1.1 Current

| Surface | Contents |
|---------|----------|
| Page header | Marketing title/description only |
| `WorkspaceDiscoveryPanel` | Archiviert, Papierkorb, favorites, recents |
| Tree header | Create root folder (if manage) |
| Centre header | Breadcrumbs, count, **single-file upload button** |
| Row | ⋮ context menu (all document actions) |
| Inspector | Preview/access/tasks; folder mgmt forms + destructive buttons |
| Tree | Hidden drag-move handle on hover |

**Gap:** No unified **command bar**; primary workflows require discovery across three columns.

### 1.2 Target

Persistent **WorkspaceCommandBar** immediately below breadcrumbs / lifecycle segment, above document list.

Secondary cluster right-aligned: **Sortieren**, **Ansicht**, **Weitere Aktionen** (overflow).

---

## 2. Context states

### A. NO SELECTION / CURRENT FOLDER (active lifecycle view)

**When:** Folder selected; no document row selected; `view=active` (default).

| Tier | Actions |
|------|---------|
| **PRIMARY** | `+ Neu` (menu), `Hochladen`, `+ Aufgabe`, `+ Anforderung` |
| **SECONDARY** | Sortieren, Ansicht (list density), Inspektor ein/aus |
| **OVERFLOW** | Ordner umbenennen, Ordner verschieben, Zugriff verwalten (if MANAGE), Link zu Ordner kopieren (future) |
| **DESTRUCTIVE** | **None in primary bar** — Archivieren / In Papierkorb only in overflow → confirm |
| **PERMISSION_RULES** | Upload/+Neu: folder EDIT; +Aufgabe/+Anforderung: domain create + folder context policy; Manage access: folder MANAGE |
| **DISABLED_RULES** | Disable with tooltip: missing EDIT/MANAGE; archived/trash mode switches state E/F |

**+ Neu menu (minimum):**

- Ordner erstellen
- *(No online Word/Excel — not supported by SCE storage model)*

**Hochladen:**

- Multi-file file picker
- Same authorization as `POST /api/workspace/documents`
- Does not bypass scan enqueue

---

### B. ONE DOCUMENT SELECTED (active)

| Tier | Actions |
|------|---------|
| **PRIMARY** | Herunterladen, Neue Version, + Aufgabe, + Anforderung, Verschieben |
| **SECONDARY** | Vorschau vergrössern (if previewable) |
| **OVERFLOW** | Umbenennen, Link kopieren, Versionsverlauf, Zugriff verwalten, Archivieren, In Papierkorb |
| **DESTRUCTIVE** | Endgültig löschen — **only if** lifecycle=TRASH **or** explicit “advanced” overflow with extra confirm; never adjacent to Download |
| **PERMISSION_RULES** | Download/preview: VIEW + scan CLEAN; Neue Version/archive/trash/move/rename: EDIT; Zugriff: MANAGE; Permanent: DELETE+MANAGE |
| **DISABLED_RULES** | Scan pending → download/preview disabled with explanation; infected/blocked → all delivery actions disabled |

**+ Aufgabe / + Anforderung:**

- Open create/link flow with **`currentVersionId` preselected** for Requirements (mandatory)
- Tasks: support EXACT vs LATEST binding per existing `TaskDocumentReferenceVersionBinding` — default EXACT for new links from version history context

---

### C. MULTIPLE DOCUMENTS SELECTED

**Recommendation:** **DEFER** in W09-01 unless row multi-select is already trivial; if implemented in W09-05:

| PRIMARY | Herunterladen (zip sequential or multi-download), Verschieben, In Papierkorb |
| OVERFLOW | Archivieren |
| DISABLED | Mixed permissions → disable action unless all selected pass check |

---

### D. FOLDER SELECTED (inspector focus — tree selection same as A)

When user explicitly focuses folder metadata (same as state A). Tree selection **does not** change command bar away from folder context unless document selected.

Folder-specific overflow: same as A.

---

### E. ARCHIVED ITEM (folder or document)

| PRIMARY | Wiederherstellen, Herunterladen (if doc + allowed) |
| OVERFLOW | Zugriff (read-only summary), Link kopieren |
| DESTRUCTIVE | In Papierkorb (if policy allows) — not permanent delete |
| DISABLED | Upload, Neue Version, +Anforderung create on archived unless product allows linking to archived versions (default: **allow link read**, **disable new version**) |

**Navigation:** User arrives via lifecycle segment or deep link banner.

---

### F. TRASHED ITEM

| PRIMARY | Wiederherstellen |
| OVERFLOW | Herunterladen (if retention + scan allows), Link kopieren (internal, shows trash state) |
| DESTRUCTIVE | Endgültig löschen (DELETE+MANAGE, reference/hold checks) |
| DISABLED | Upload, rename, move |

**Async folder purge:** show status chip if subtree operation running — poll `subtree-operations/[operationId]`.

---

## 3. Top command bar layout (German labels)

```
[ + Neu ▾ ] [ Hochladen ] [ + Aufgabe ] [ + Anforderung ]     [ Sortieren ▾ ] [ Ansicht ▾ ] [ … ]
```

**Hierarchy evidence:**

- Upload/create are highest frequency (Dropbox/SharePoint pattern) — ADOPT
- Task/Requirement — DIFFERENTIATE (competitors lack) — primary visibility
- Sort/view — ADAPT local list only (not universal search)

---

## 4. Drag & drop interaction model

| Property | Target behavior |
|----------|-----------------|
| DROP_TARGET | Centre list area + empty state (min-height) |
| DESTINATION | Current folder name shown in overlay copy |
| MULTI_FILE | Yes — sequential uploads with aggregate progress |
| PERMISSION_GATING | No overlay when !canUpload; show disabled Hochladen tooltip |
| PROGRESS | Per-file row in toast/panel; command bar spinner on batch |
| SUCCESS | Toast + list refresh; select last uploaded optional |
| PARTIAL_FAILURE | Keep successes; list failures with retry |
| ERROR | Inline alert + aria-live |
| DUPLICATE_FILENAME | Map server conflict code → user choice (rename local file / cancel) |
| SCAN_PENDING | Row badge after upload; command bar download disabled until clean |
| CANCEL | Defer true cancel (upload streams) — W09-01 note “not supported v1” if API cannot abort |

**Accessibility:** `Hochladen` always available; drop is enhancement.

---

## 5. Destructive placement rules

1. **Never** full-width destructive primary buttons in inspector.
2. **Archivieren / Papierkorb** — neutral, overflow or lifecycle section.
3. **Endgültig löschen** — trash context or nested under “Weitere → Gefährliche Aktionen” with typed confirm.
4. **Folder permanent delete** — retain impact preview dialog; async messaging mandatory.

---

## 6. Action duplication policy

| Action | Primary entry | Secondary entry |
|--------|---------------|-----------------|
| Rename folder | Command overflow | Inspector collapsed |
| Move folder | Command overflow | Tree DnD (power) |
| Rename/move doc | Command overflow | — |
| Download | Command bar | Preview card, history |
| Access | Inspector tab | Overflow |
| Version history | Inspector tab | Overflow |

Avoid third entry points (menu + bar + inspector button) for same action.

---

## 7. Server action contract (future `available-actions`)

```typescript
// Illustrative — implement in W09-07 for mobile
type WorkspaceCommandContext =
  | { kind: "FOLDER"; folderId: string; lifecycle: "ACTIVE" | "ARCHIVED" | "TRASHED" }
  | { kind: "DOCUMENT"; documentId: string; lifecycle: ...; selectedVersionId?: string }
  | { kind: "MULTI_DOCUMENT"; documentIds: string[] };

type WorkspaceAvailableActionsDto = {
  primary: string[];
  secondary: string[];
  overflow: string[];
  destructive: string[];
  disabledReasons: Record<string, string>;
};
```

Computed server-side from `canWorkspace*` + lifecycle + scan + deletion blockers.

**W09-07 implemented:** `WorkspaceResourceAvailableActionsDto` in `lib/workspace/command/workspace-available-actions.ts` (canonical booleans) plus legacy tier mapping in `available-actions-stub.ts`. Embedded on SSR document list rows and inspector DTOs.

---

## 8. Result

**TARGET:** Single coherent command surface with six context states, aligned to Dropbox/OneDrive discoverability and SCE task/requirement differentiation.
