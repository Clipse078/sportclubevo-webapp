# WORKSPACE-07D — Tasks / Requirements ↔ immutable Workspace version benchmark record

**Benchmark date:** 2026-09-22  
**Baseline STAGE SHA:** `1530fea22010a18acd7cf0c2626a2ba914858e17` (WORKSPACE-06 merged, PR #698)  
**Branch:** `cursor/workspace-07d-immutable-document-reference-discovery`  
**Sources:** Microsoft Learn / SharePoint Q&A (version URLs, `_vti_history`, permissions), Microsoft Support (versioning & draft visibility), Dropbox API spec (`rev:` path, `FileMetadata.rev`), Dropbox Help (version history & rollback).

This record supports `WORKSPACE-07D-DISCOVERY.md`. It is **not** a feature-parity checklist.

---

## Pattern summary (document reference / version identity)

| Pattern | Mature product behaviour | Why it exists | SCE | Notes |
|--------|---------------------------|---------------|-----|-------|
| **Canonical file URL** | SharePoint canonical path always serves **latest** head revision | Simple navigation | **DIFFER for business refs** | SCE business references must bind **`WorkspaceDocumentVersion.id`**, not navigational “open document” |
| **Revision / history URL** | SharePoint `_vti_history/{M*512+m}/…` addresses **one** revision; head revision often lacks history URL until superseded | Deep links to evidence | **ADOPT concept** | SCE uses stable **`versionId`** in internal routes (`?document=&version=`) — no path encoding |
| **Revision identity (Dropbox)** | API `rev` string identifies **one** file revision; download via `path: rev:…` | Conflict detection, exact fetch | **ADOPT** | Aligns with immutable version row + storage locator |
| **Permissions after link** | SharePoint: link does not bypass library/item permissions; “View Versions” is separate permission | Least privilege | **ADOPT** | Reference creation requires **both** domain edit + workspace VIEW; resolution uses **current** ACL (W05 V9) |
| **Broken / inaccessible link** | Deleted items → recycle / 404; sharing links fail after purge | Security clarity | **ADOPT** | Zero disclosure placeholder; no title/filename leak |
| **Link to “current” when saving** | Products often default UI to latest while user expects “what I saw” | UX convenience | **ADOPT UX, DIFFER persistence** | Default picker to **current version** but **persist exact `versionId`** at save |
| **Restore / rollback** | Dropbox “Roll back” replaces head; SharePoint restore adds version | Recovery | **ADOPT (W05)** | Restore-as-new-version; references stay on original version ids |
| **Delete file = delete versions** | Benchmark products purge all revisions with file delete | Storage | **DIFFER until referenced** | SCE **blocks permanent delete** while durable refs exist (W06); W07 extends registry |
| **Acknowledgement / compliance** | Mature ECM binds attestations to **specific revision** or published snapshot | Legal evidence | **ADOPT** | Requirement ACK today is campaign-level; W07 prepares **document version identity** for future combined semantics |
| **Attachment copy vs reference** | Email/comms often **copy bytes** | Transport | **REJECT for W07** | Tasks/Requirements use **reference**, not new attachment pipeline |
| **Search index of linked docs** | Cloud suites index content with independent auth | Discovery | **DEFER** | W07 exposes FK relationships only; Universal Search enforces auth separately |

---

## SharePoint / OneDrive

**Stable identity:** Item id / sharing link GUID survives rename/move within site; **canonical URL content** changes when new versions upload.

**Version-specific access:** Historical revisions use **`_vti_history`** URLs; permissions still apply; draft/minor version visibility is library-configured.

**SCE ADOPT:** ID-based internal links; explicit version parameter; permission check at resolve time.

**SCE DIFFER:** Business references stored as **`WorkspaceDocumentVersion.id`** in application DB (not URL-derived revision math); no ACL snapshot on link row.

**SCE DEFER:** Document ID service / anonymous sharing links / Purview retention (W08).

**SCE REJECT:** Path-only references; using canonical “open document” as acknowledgement identity.

---

## Dropbox Business

**Stable identity:** File `id` + per-revision `rev` string; `rev` sufficient to download without path.

**Version history:** Plan-limited window; rollback replaces current file content (new head).

**SCE ADOPT:** Treat **`WorkspaceDocumentVersion.id`** like **`rev`** — immutable pointer to bytes via `storageKey`.

**SCE DIFFER:** No automatic “upgrade reference to latest rev”; restore creates **new** version row (SharePoint-style) rather than overwriting history.

**SCE DEFER:** Extended version history SKUs / legal hold (W08).

**SCE REJECT:** Using Dropbox-style “always latest file” semantics for Requirement evidence.

---

## Requirements / document-control (pattern level)

| Pattern | Typical ECM | SCE W07 |
|---------|-------------|---------|
| Published snapshot | Fixed revision for controlled docs | Use **exact version id** at publish/link time |
| Acknowledgement record | Person + revision + timestamp | Prepare tuple: tenant, task/requirement, **versionId**, actor, `acknowledgedAt` |
| Obsolete revision | Still readable for audit | Historical version remains addressable while document lifecycle permits |

---

## Deliberate SCE decisions (W07)

1. **TARGET_IDENTITY** = `WorkspaceDocumentVersion.id` (see WORKSPACE-05 invariants V13–V14).
2. **No second attachment system** — reuse Workspace storage + ACL.
3. **Dual authorization domain** — Task/Requirement permissions ≠ Workspace permissions.
4. **Zero disclosure** on restricted references (already proven on Task document list).
5. **Deletion blockers** extended via central registry (`getWorkspaceDocumentDeletionBlockers`), not ad-hoc per route.
6. **06G Requirement programme unchanged** — add document version references without redesigning audience/ACK campaign model.

---

## WORKSPACE-07 benchmark gate

| Gate | Result |
|------|--------|
| Stable document identity understood | PASS |
| Version-specific reference pattern validated | PASS |
| Permissions-after-linking pattern validated | PASS |
| Lifecycle + delete interaction documented | PASS |
| Acknowledgement identity boundary defined | PASS |
| ADOPT / DIFFER / DEFER / REJECT recorded | PASS |

**Verdict:** World-class benchmark gate **PASS** — ready to implement W07 with intentional SCE stronger immutability invariant.
