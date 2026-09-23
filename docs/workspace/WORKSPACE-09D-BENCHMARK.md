# WORKSPACE-09D — World-class benchmark record

**Baseline STAGE SHA:** `704a7c4571524bd0fd2dc10df238110a23a3201b`  
**Sources:** Official help/design documentation (2025–2026), not pixel parity claims.

| Product | Primary sources |
|---------|-----------------|
| Dropbox Business | [Uploading files](https://help.dropbox.com/create-upload/add-files), [Dropbox homepage / action bar](https://help.dropbox.com/installs/homepage), [Team file system](https://help.dropbox.com/plans/business-team-changes) |
| OneDrive / SharePoint modern libraries | [Upload files and folders to a library](https://support.microsoft.com/en-us/sharepoint/documents-and-library/upload-files-and-folders-to-a-library), [Command bar customization keys](https://learn.microsoft.com/en-us/sharepoint/dev/declarative-customization/view-commandbar-formatting) |

**Classification:** ADOPT | ADAPT | DIFFERENTIATE | REJECT | DEFER

---

## Pattern matrix

| Pattern | Dropbox Business | OneDrive / SharePoint | SCE W09 stance | Class |
|---------|------------------|----------------------|----------------|-------|
| **Command bar** | Upload, Create, Create folder in action bar above file list | `UploadCommand`, `newComposite`, share, sync in library command bar | Introduce `WorkspaceCommandBar` with Neu/Hochladen/Aufgabe/Anforderung | ADOPT |
| **Upload button** | Upload under search / action bar; File + Folder | Upload → Files or Folder | Hochladen mandatory; multi-file | ADOPT |
| **Drag & drop** | Drag to destination folder; visible drop area | Highlight library on hover; Edge/Chrome folder upload | Enhance idle hint + folder name; keep auth gates | ADOPT |
| **Create folder** | Create → folder; team space requires folder target | `newFolder` command key | + Neu → Ordner erstellen | ADOPT |
| **Selection actions** | Share, preview, open in row context | Command bar updates on selection | Selection-driven bar for document | ADOPT |
| **Context menu** | Right-click / overflow | Context menu + `more` | Keep ⋮ as overflow aligned with bar | ADAPT |
| **Details pane** | Preview + details side panel | Properties / details | Tabbed inspector (Preview, Access, Tasks, …) | ADAPT |
| **Preview** | In-browser preview common formats | Preview command | Keep server-authorized preview; improve Office fallback | ADAPT |
| **Version history** | Rewind / version history (plan-dependent) | Version history command (SharePoint) | Immutable versions + restore = new current — **DIFFERENTIATE** copy | DIFFERENTIATE |
| **Move/rename** | Move/rename in UI; team folder rename global | Move to / Rename in bar | Implement doc rename/move APIs + bar | ADOPT |
| **Access/sharing** | Sharing dialog; team policies | Share command + permissions | Org/Team/Role/Person grants — **DIFFERENTIATE** | DIFFERENTIATE |
| **Archive/trash** | Deleted files recovery window | Recycle bin + restore | ARCHIVED vs TRASHED + retention (W08) — **DIFFERENTIATE** | DIFFERENTIATE |
| **Tasks/requirements on files** | Not native | Not native | Primary commands + inspector — **DIFFERENTIATE** | DIFFERENTIATE |
| **Favorites/star** | Starred section | Pin / quick access | Implement toggle — ADOPT | ADOPT |
| **Recent** | Recent files | Recent in OneDrive | Keep; improve presentation | ADAPT |
| **Universal search** | Global search prominent | Microsoft Search | **DEFER** post-mobile SEARCH programme | DEFER |
| **Folder upload** | Supported on web | Supported modern browsers | **DEFER** until batch/folder API justified | DEFER |
| **Online create Office** | Dropbox templates / integrations | newWordDocument keys | **REJECT** — not in SCE storage model | REJECT |
| **Enterprise ribbon** | N/A | Classic ribbon complexity | Avoid multi-row ribbon | REJECT |
| **Public links/anonymous** | Shared links | Anyone links | **REJECT** — internal ACL only | REJECT |
| **Break-glass / audit** | Admin consoles | Purview / audit | Governance pages — not consumer parity | DIFFERENTIATE |
| **Malware/quarantine** | Not user-visible in help | Defender integration | User-friendly scan badges — ADAPT | ADAPT |
| **Responsive** | Mobile apps separate | Mobile SharePoint | Web tablet contract only in W09; native mobile MOBILE-05 | DEFER |
| **Accessibility** | Help mentions keyboard | Microsoft a11y baseline | Keyboard command bar + upload alternative | ADOPT |

---

## SCE differentiation summary (must remain visible in W09)

1. **Tasks & Requirements** with **exact version** references (W07).
2. **Organizational access** (Organisation, Org Unit, Team, Role, Person) with inheritance explanation.
3. **Immutable version history** and restore semantics (new current version).
4. **Lifecycle** ARCHIVED vs TRASHED + reference-safe permanent delete.
5. **Governance** audit, holds, retention, malware enforcement (surfaced appropriately, not hidden failures).

---

## ADOPT / ADAPT / DIFFERENTIATE / REJECT / DEFER counts

| Class | Count |
|-------|------:|
| ADOPT | 9 |
| ADAPT | 8 |
| DIFFERENTIATE | 7 |
| REJECT | 3 |
| DEFER | 4 |

---

## Result

Benchmark closed: SCE adopts mainstream **command bar + upload + drag/drop + folder create + selection actions**, adapts details/preview/recents, differentiates on **club workflow, ACL model, versioning, lifecycle, tasks/requirements**, rejects **online Office creation and anonymous sharing**, defers **universal search, folder upload, native mobile**.
