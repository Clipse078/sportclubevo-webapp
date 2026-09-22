# WORKSPACE-06D — Collaboration / links / lifecycle benchmark record

**Benchmark date:** 2026-09-22  
**Baseline STAGE SHA:** `2b4f34ff4ec8a88d9f4f6af01836c8654c862097` (PR #696 / WORKSPACE-05 merged)  
**Sources:** Dropbox Help (Oct 2025), Microsoft Learn SharePoint data deletion & retention, Microsoft Support recycle-bin guidance, SharePoint Document ID / sharing-link Q&A (2024–2026).

This record supports `WORKSPACE-06D-DISCOVERY.md`. It is not a feature-parity checklist.

---

## Pattern summary

| Pattern | Mature product behaviour | Why it exists | SCE adopt? | SCE deliberate difference | Target slice |
|--------|---------------------------|---------------|------------|---------------------------|--------------|
| **Archive vs trash** | SharePoint: *archive* (library/site) vs *delete* → recycle bin. Dropbox: delete → recovery window (not “archive”). | Separates “hide from daily work” from “recoverable deletion”. | **Adopt distinction** | SCE already uses **archive** for documents/folders; **no trash bin** yet. Introduce explicit **TRASHED** lifecycle in W06; retention duration in W08. | W06 primitives; W08 policy |
| **Recycle / recovery window** | SharePoint: 93-day clock from original delete (stages 1+2). Dropbox Business: 180–365 days by plan. | Mistake recovery, compliance buffer. | **Adopt concept** | Default window **configurable in W08**; W06 defines states + restore API only. | W06 seam; W08 engine |
| **Permanent delete** | Explicit admin/user “delete forever”; irreversible after purge. | Storage cost, GDPR right-to-erasure (with holds). | **Adopt with guards** | Must not break immutable `WorkspaceDocumentVersion.id` references (W07). Reference-aware delete in W06-05. | W06-02 / W06-05 |
| **Nested folder delete** | SharePoint: subtree to recycle bin; structure preserved in bin. | Avoid orphan paths / broken hierarchy. | **Partial adopt** | Today: folder permanent delete removes folder rows; documents **orphan to root** (`folderId` SetNull). W06 must unify trash/archive semantics for subtrees. | W06-02 |
| **Stable internal links** | SharePoint sharing links (GUID) survive rename/move within site; path URLs break. Document ID redirect URLs for collection-scoped stability. | Deep links in tasks, email, wikis. | **Adopt ID-based canonical routes** | No anonymous/share-token links in W06; URL never grants access. | W06-03 |
| **Link after archive/delete** | Sharing links typically fail or require restore; deleted items in recycle still restorable. | Security + UX clarity. | **Adopt** | Archived: resolve for authorized VIEW with explicit lifecycle gate. Trashed: same with trash view. Permanent delete: **404 / tombstone** at reference resolver. | W06-03 / W06-05 |
| **Version history vs delete** | Dropbox extended version history; delete removes file but versions tied to file lifecycle. SharePoint versions tied to item until purge. | Audit + restore content. | **Strong differ** | SCE: **versions never independently deleted** in W06; document permanent delete removes all versions + blobs today — **unsafe for W07** without reference checks. | W06-05 |
| **Favorites / recent** | OneDrive Recent + Favorites; SharePoint “Follow”. | Personal navigation velocity. | **Adopt lightweight** | Per-user, tenant-scoped, ACL-filtered lists — not social graph. | W06-04 |
| **Shared with me** | Cloud suites aggregate ACL grants + shared links. | Discovery across libraries. | **Defer** | W02 already computes effective access; dedicated UX after Mobile/Search. | W07+ / post-Search |
| **Comments / co-authoring** | SharePoint comments; M365 co-authoring. | Real-time collaboration. | **Reject for W06** | Out of scope; Communication/Tasks have own comment models. | Later |
| **External / anonymous sharing** | SharePoint “Anyone" links; Dropbox shared links. | B2B/B2C distribution. | **Reject W06** | Private tenant workspace; benchmark only. Optional guest model **later** with separate programme. | Defer later |
| **Activity feed** | Unified audit/activity streams. | Compliance + awareness. | **Defer** | Partial audit today (`writeAuditRecord`, `logAction`); full feed = W08 governance. | W08 |
| **Retention / legal hold** | Microsoft Purview retention, preservation hold library. | Legal/compliance. | **Defer** | W08 owns policy engine; W06 exposes lifecycle states only. | W08 |

---

## Archive vs trash (decision)

**SCE W06 recommendation:**

- **ARCHIVED** — operational “cold storage”: hidden from default tree/lists/search visibility; still addressable by ID link for authorized users; **no blob deletion**; descendants policy defined per resource type (see discovery §12–13).
- **TRASHED** — user-intent deletion: hidden from active UI; **recoverable** until permanent purge; blobs retained until permanent delete; enters W08 retention clock when implemented.
- **PERMANENTLY_DELETED** — terminal for workspace resource row; storage delete best-effort; **reference tombstones** for external pointers (Tasks/W07).

Dropbox conflates “delete” with trash+recovery; SharePoint separates delete→bin from archive. SCE aligns closer to **SharePoint’s two-stage delete** but keeps a distinct **archive** lane already present in schema for documents.

---

## Link stability (decision)

| Link type | Benchmark | SCE W06 |
|-----------|-----------|---------|
| Path-based (`/folder/x/file.pdf`) | Breaks on move/rename | **Reject** as canonical |
| Sharing token URL | Grants access in some modes | **Reject** (no URL auth) |
| Resource ID route | SharePoint GUID / DocId redirect | **Adopt:** `/dashboard/workspace?document={id}` (+ optional `version={versionId}`) |
| Move/rename | Stable if ID-based | **Stable** — IDs immutable |
| Cross-tenant ID | N/A | **Fail closed** — 404 zero disclosure |

---

## Immutable version reference implications (benchmark)

SharePoint/Dropbox treat file delete as deleting all versions. SCE **Tasks/Requirements will reference `WorkspaceDocumentVersion.id`** (W05 invariants V13–V14). Therefore:

- Benchmark “delete file = delete all versions” is **acceptable only after reference accounting**.
- W06 must add **reference-safe permanent delete** (block or legal tombstone + retained blob) before W07 production linkage.

---

## Intentional SCE differences (summary)

1. **No public or anonymous sharing** in W06 (private club workspace).
2. **No per-version delete** — history is immutable unless whole document lifecycle permits purge.
3. **Resource ACL** always evaluated server-side; tenant `workspace.manage` / `workspace.delete` are **capabilities**, not resource bypass (`admin-bypass.ts`).
4. **Trash retention policy** deferred to W08 — W06 defines states and manual restore/permanent delete only.
5. **No SharePoint-scale social** (comments, presence, co-authoring) in Workspace W06.

---

## Deferred to later programmes

| Item | Programme |
|------|-----------|
| Retention schedules, legal hold, auto-purge | W08 |
| Task/Requirement exact version FK + acknowledgement UX | W07 |
| Universal Search visibility rules | Post-Mobile Search |
| External guest sharing | Separate security programme |
| Malware scan gates on restore | W08 |

---

## WORKSPACE-06 implementation gate (2026-09-22)

**Branch:** `cursor/workspace-06-collaboration-links-lifecycle`

### ADOPTED

- Archive distinct from trash (`TRASHED` + `trashedAt`, folder trash subtree)
- Recoverable trash primitive (manual restore; no auto-purge)
- Stable ID internal links + copy-link UX
- Reference-safe permanent delete (`RESOURCE_REFERENCED` / `TaskDocumentReference` guard)
- Favorites + recent (tenant/user scoped, ACL re-check at read)
- Lifecycle-aware archived/trash lists (authorized ID sets only)

### INTENTIONAL SCE DIFFERENCES

- No anonymous sharing or link-based authorization
- No per-version delete endpoint
- No SharePoint-scale collaboration suite in W06
- Stricter immutable-reference safety before W07 version binding

### DEFERRED

- Automatic purge / retention duration → W08
- Governance / legal hold → W08
- Activity feed → later
- Comments / mentions / presence / co-authoring → later
- External guest sharing → later (explicit approval only)
