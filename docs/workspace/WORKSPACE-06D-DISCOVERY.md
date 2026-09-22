# WORKSPACE-06D — Collaboration, internal links & reference-safe document lifecycle

**Status:** Discovery complete — implementation contract for **WORKSPACE-06** (documentation only)  
**Baseline STAGE SHA:** `2b4f34ff4ec8a88d9f4f6af01836c8654c862097`  
**Branch:** `cursor/workspace-06d-collaboration-links-lifecycle-discovery`  
**Date:** 2026-09-22  
**Prerequisite:** WORKSPACE-01 through WORKSPACE-05 merged (PR #696)

**Rule:** This document defines W06. **Do not implement W06 in 06D.**

Companion: `WORKSPACE-06D-BENCHMARK-RECORD.md`

---

## 1. Executive summary

WORKSPACE-01–05 delivered tenant-scoped folders, documents, immutable versions, resource ACL (VIEW < EDIT < MANAGE), private storage, and version hardening with `WorkspaceDocumentVersionRef` readiness. Lifecycle today is **partial**: document **archive/restore** and **permanent delete** exist; folder **archive/restore** and **permanent delete** exist; there is **no trash/recycle bin**, **no archived-document UX**, **no copy-link product**, and **no reference-safe permanent delete**.

W06 must define a **world-class but minimal** layer:

1. **Explicit lifecycle algebra** (ACTIVE / ARCHIVED / TRASHED / PERMANENTLY_DELETED) for folders and documents, with **versions always subordinate** to document lifecycle.
2. **Stable internal ID links** (never path-based; never authorization-bearing).
3. **Lightweight collaboration UX** (copy link, favorites, recent) without becoming SharePoint.
4. **Reference-safe deletion** so W07 can attach Tasks/Requirements to `WorkspaceDocumentVersion.id` without silent data loss.

Governance retention, auto-purge, legal hold, and malware enforcement remain **W08**.

---

## 2. Preflight record

| Check | Expected | Actual | Result |
|--------|----------|--------|--------|
| Repo | `Clipse078/sportclubevo-webapp` | Match | PASS |
| Branch start | `STAGE` | `STAGE` (local was behind; fast-forwarded to canonical SHA before branch) | PASS |
| Local HEAD | `2b4f34ff…` | `2b4f34ff…` | PASS |
| `origin/STAGE` | `2b4f34ff…` | `2b4f34ff…` | PASS |
| Worktree | clean | clean at branch create | PASS |
| PR #696 | MERGED | MERGED 2026-09-22 | PASS |
| W05 on STAGE | present | `docs/workspace/WORKSPACE-05-*`, version services | PASS |

---

## 3. Exact W01–W05 baseline (repository-evidenced)

### 3A. Resource model

| Entity | Key fields / behaviour | Source |
|--------|------------------------|--------|
| **WorkspaceFolder** | `id` (cuid), `tenantId`, `parentId` (SetNull on parent delete), `name`, `archivedAt`, `accessInheritanceMode`, grants | `prisma/schema.prisma` |
| **WorkspaceDocument** | Stable `id`, `folderId` (SetNull), `status` ACTIVE\|ARCHIVED, `archivedAt`, `currentVersionId`, inheritance | schema |
| **WorkspaceDocumentVersion** | Immutable row per blob; `versionNumber`, CURRENT\|SUPERSEDED, `storageKey`, cascade delete with document | schema |
| **Hierarchy** | Folder tree via `parentId`; documents belong to ≤1 folder (nullable = root placement) | schema, `folder-service` |
| **currentVersionId** | Canonical pointer to latest logical content | W05 invariants V5 |
| **Archive semantics** | Document: `status=ARCHIVED` + `archivedAt`. Folder: `archivedAt` only (no enum) | schema, services |
| **Permanent delete** | Document: row delete → cascade versions → best-effort blob delete. Folder: subtree folder deleteMany; documents **remain**, `folderId` nulled | `document-delete-service`, `folder-delete-service` |
| **Storage locators** | `workspace/tenants/{tenantId}/documents/{documentId}/versions/{versionId}/…` + legacy keys | `storage-locator.ts` |
| **Version identity** | `WorkspaceDocumentVersion.id` authoritative; ref DTO `{ tenantId, documentId, versionId }` | `version-domain.ts`, W05 invariants |

**Outbound references (critical for W06/W07):**

- `TaskDocumentReference.documentId` → `onDelete: Cascade` (document permanent delete **removes** task links).
- `CommunicationAttachment.sourceDocumentId` / `sourceDocumentVersionId` → `onDelete: SetNull`.

**Note:** `document-delete-service.ts` header comment claiming “no outbound FK” is **stale** relative to schema.

### 3B. Authorization (W02–W03)

| Topic | Contract |
|-------|----------|
| Levels | VIEW < EDIT < MANAGE on `WorkspaceAccessGrant` |
| Inheritance | Folder chain + document folder chain; RESTRICTIVE child overrides |
| Audiences | ORGANISATION, ORG_UNIT, TEAM, ROLE (functionKey), PERSON; dynamic membership at read time |
| Tenant capabilities | `workspace.view`, `workspace.manage`, `workspace.delete` — **separate** from resource ACL |
| Admin bypass | **None** for resource ACL (`pureWorkspaceAclGrantsResourceAccess` always false) |
| Zero disclosure | Unauthorized resources → null / 404; graph loaded per tenant |
| Query boundary | `buildWorkspaceReadWhere` — ACTIVE docs, non-archived folders, authorized ID sets |
| Edit/manage gates | Resource EDIT/MANAGE require tenant `workspace.manage` **and** effective resource level |

### 3C. Storage (W04)

- Provider-neutral `WorkspaceStorageProvider`; Vercel private blob implementation.
- Upload compensation on failure; restore-as-new-version copies bytes to **new** key.
- Download/preview: VIEW on document; historical version uses same document ACL (W05 V9).
- Archive does **not** touch storage (`document-archive-service`).

### 3D. Versioning (W05)

- Append-only versions; restore creates new version with `RESTORED_FROM_VERSION:` provenance in `changeNote`.
- No per-version delete API.
- Historical download blocked when document not ACTIVE/non-archived (`document-version-access-service`).

---

## 4. Current lifecycle implementation map

### 4.1 Document

| Action | Implemented? | Service / route | Auth (actual) |
|--------|--------------|-----------------|---------------|
| Archive | Yes | `archiveWorkspaceDocument`, `POST …/archive` | Tenant `workspace.manage` + **resource EDIT** |
| Restore from archive | Yes | `restoreWorkspaceDocument`, `POST …/restore` | Same |
| Trash | **No** | — | — |
| Permanent delete | Yes | `deleteWorkspaceDocumentPermanently`, `DELETE …/permanent?confirm=` | Tenant `workspace.delete` via `hasTenantDeletionAuthority` + **resource MANAGE**; two-step impact preview |
| List archived | **No UI/API list** | Lists filter ACTIVE only | — |
| Open archived by link | **No** | `canReadWorkspaceDocument` rejects archived | — |

Archive leaves all versions and blobs intact. Permanent delete removes DB rows (cascade versions) then deletes storage keys best-effort.

### 4.2 Folder

| Action | Implemented? | Location | Auth (actual) |
|--------|--------------|----------|---------------|
| Archive | Yes | `archiveWorkspaceFolderAction` in `actions.ts` | Tenant **`workspace.manage` only** — **no resource-level check** |
| Restore | Yes | `restoreWorkspaceFolderAction` | Same; requires active parent |
| Trash | **No** | — | — |
| Permanent delete | Yes | `deleteWorkspaceFolderPermanently` + server action | Tenant **`workspace.delete` only** — **no resource MANAGE** |
| Archived list | Yes | `getArchivedWorkspaceFolders` — **all tenant archived folders**, shown to anyone with `workspace.manage` | **No ACL filter** (zero-disclosure gap for restricted folders) |

Archive rules today: cannot archive if **active child folders** exist; documents in folder **stay active** and remain listed.

### 4.3 Version

| Action | Implemented? |
|--------|--------------|
| Append / supersede | Yes (upload) |
| Restore as new version | Yes (`restoreWorkspaceDocumentVersion`) |
| Delete single version | **No** |
| Archive/trash version independently | **No** (correct) |

### 4.4 UI actions (Workspace dashboard)

- Document: archive, restore (via actions/API), version history, permanent delete (if `workspace.delete`), download, access management.
- Folder: create/rename/move, archive, restore (archived section), permanent delete.
- **No** “Copy link”, favorites, recent, trash view, archived documents section.

---

## 5. Current API / service / UI map

| Endpoint / action | Method | Purpose |
|-------------------|--------|---------|
| `/api/workspace/documents/[id]/archive` | POST | Archive document |
| `/api/workspace/documents/[id]/restore` | POST | Unarchive document |
| `/api/workspace/documents/[id]/permanent` | DELETE | Impact / permanent delete |
| `/api/workspace/documents/[id]/download` | GET | Current or `?version=` historical |
| `/api/workspace/documents/[id]/preview` | GET | Preview |
| `/api/workspace/documents/[id]/versions` | GET | Version list |
| `/api/workspace/documents/[id]/versions/[versionId]/restore` | POST | Restore content as new version |
| `/api/workspace/folders` | GET/POST | Tree / create (W03) |
| Folder archive/restore/delete | Server actions | Not REST parity |

Deep link today: `/dashboard/workspace?document={documentId}` (requires ACTIVE + VIEW; requires `folderId` for page shell).

---

## 6. Current schema / storage map

See §3. Lifecycle-related columns:

- `WorkspaceDocument.status`, `archivedAt`
- `WorkspaceFolder.archivedAt` (no status enum)
- No `trashedAt`, `deletedAt`, `lifecycleState`, or tombstone tables.

Storage: delete on permanent document delete only; folder delete does not delete document blobs.

---

## 7–8. Benchmarks

See **`WORKSPACE-06D-BENCHMARK-RECORD.md`** for Dropbox vs SharePoint/OneDrive patterns, adoption matrix, and deliberate SCE differences.

**Gate result:** PASS — archive vs trash distinction, recycle retention (deferred policy to W08), ID-stable links, and reference-safe delete requirements are documented.

---

## 9. W06 capability classification

| Capability | Class | Rationale |
|------------|-------|-----------|
| Lifecycle state model (incl. TRASHED) | **MUST W06** | Foundation for links, search, W07 |
| Document archive/restore hardening | **MUST W06** | Align auth, zero disclosure, archived views |
| Folder archive/restore/trash semantics | **MUST W06** | Fix ACL gaps, descendant rules |
| Trash + restore from trash (manual) | **MUST W06** | User-facing delete recovery without W08 scheduler |
| Permanent delete contract | **MUST W06** | Reference-aware; storage ordering |
| Stable internal links + copy UX | **MUST W06** | Core “collaboration” for SCE |
| Favorites (starred) | **SHOULD W06** | High value / low complexity |
| Recent documents (per user) | **SHOULD W06** | Mobile-ready navigation |
| Archived / trash admin views (ACL-safe) | **SHOULD W06** | Operational necessity |
| Reference tombstones + delete guards | **MUST W06** (package 05) | W07 blocker if missing |
| Task link picker lifecycle rules | **DEFER W07** | Extend `document-access.ts` for version refs |
| Shared-with-me aggregation | **DEFER W07** | Needs cross-module UX |
| Comments / mentions / presence | **DEFER LATER** | Other domains |
| Activity feed | **DEFER W08** | Governance |
| Recycle retention auto-purge | **DEFER W08** | Policy engine |
| External / anonymous sharing | **REJECT W06** | Benchmark only |
| Share-link DB entity with tokens | **REJECT W06** | Canonical routes suffice internally |
| Universal Search | **DEFER LATER** | Post-Mobile programme |
| Google Drive import | **REJECT** | Removed from scope |

---

## 10. Internal-link contract

### 10.1 Canonical identity

| Resource | Canonical URL (tenant session context) | Stable across rename/move? |
|----------|----------------------------------------|----------------------------|
| Document | `/dashboard/workspace?document={documentId}` | Yes |
| Folder | `/dashboard/workspace?folder={folderId}` | Yes |
| Exact version | `/dashboard/workspace?document={documentId}&version={versionId}` | Yes (version id immutable) |

Optional future API resolver: `GET /api/workspace/resolve?documentId=&versionId=` → redirect or 404 (zero disclosure).

### 10.2 Rules

1. **ID-based only** — never encode folder path or filename in canonical links.
2. **Tenant binding** — resolution uses session `activeTenantId`; cross-tenant IDs → 404.
3. **Authorization at resolution** — VIEW required for open/download/preview; link does **not** grant access.
4. **No expiring internal tokens** in W06 — expiry belongs to hypothetical external sharing (later).
5. **Copy link** = copy canonical URL string (+ clipboard UX) — **not** a permission grant, **not** a new DB entity.
6. **Archived documents:** authorized VIEW may open via direct link (W06 **should** allow; today **blocked** — gap).
7. **Trashed documents:** authorized VIEW+trash scope only; hidden from default lists.
8. **Permanent delete:** link returns 404; W07 reference UI shows **tombstone** (metadata only).

---

## 11. Collaboration contract

### In scope (W06)

- Copy internal link (document, folder; version link from history dialog).
- User-scoped **favorites** (tenant + person/user key).
- User-scoped **recent** (last N viewed/downloaded with ACL re-check on display).
- ACL-safe **archived** and **trash** lists for managers/editors as appropriate.

### Out of scope (W06)

- Co-authoring, real-time presence, @mentions, document comments.
- Shared-with-me dashboard (defer W07).
- Notifications / activity feed (W08 or comms domain).
- External sharing links.

Design principle: **smallest coherent layer** — navigation aids only, no second social platform.

---

## 12. Folder lifecycle contract (recommended)

| State | Meaning | List in default tree? | Descendants |
|-------|---------|----------------------|-------------|
| **ACTIVE** | Normal | Yes (if VIEW) | — |
| **ARCHIVED** | Cold; hidden from default tree | No (archived view only) | W06 **must define**: either cascade archive to documents or block archive if active docs — **recommend:** allow archive with **optional cascade** flag default **false**, documents stay ACTIVE but hidden from folder list when folder archived (documents orphan-visible at tenant root **rejected** — prefer **inherited archived visibility** via folder chain) |
| **TRASHED** | Recoverable delete | Trash view only | **Trash subtree atomically** (folder + descendants + contained documents) |
| **PERMANENTLY_DELETED** | Terminal | No | Subtree folder rows removed; documents follow document lifecycle rules |

**Restore:** require MANAGE on folder (or tenant delete capability for trash restore — **recommend MANAGE**); parent must be ACTIVE (existing rule preserved).

**Permanent delete folder:** require `workspace.delete` + **resource MANAGE on root folder**; documents in subtree → **trash or block** if references exist — **recommend:** move documents to trash with folder trash event, not silent `folderId` null (fixes current orphan behaviour).

---

## 13. Document lifecycle contract (recommended)

| State | Blob storage | Version rows | List default? | Link open (authorized)? |
|-------|--------------|--------------|---------------|-------------------------|
| ACTIVE | Retained | All retained | Yes | Yes |
| ARCHIVED | Retained | All retained | No (archived list) | **Yes** (VIEW) — change from today |
| TRASHED | Retained | All retained | No (trash list) | **Yes** (VIEW + trash context) |
| PERMANENTLY_DELETED | Delete best-effort | Removed (cascade) | No | 404 / tombstone |

**Archive vs trash:** Archive = operational hide without implying deletion intent. Trash = user delete with recovery path.

**Who can:**

| Operation | Resource level | Tenant capability |
|-----------|----------------|-------------------|
| Archive | EDIT | `workspace.manage` |
| Restore archive | EDIT | `workspace.manage` |
| Trash | EDIT | `workspace.manage` |
| Restore trash | EDIT | `workspace.manage` |
| Permanent delete | MANAGE | `workspace.delete` |

Align folder operations to same matrix (fix current folder gaps).

---

## 14. Version lifecycle contract

- Versions **inherit** document lifecycle; no independent ARCHIVED/TRASHED.
- **Never** delete individual version rows in W06.
- Permanent document delete removes **all** versions — permitted only if **reference check passes** (W06-05).
- Historical access on ACTIVE document: VIEW on document (unchanged).
- On ARCHIVED/TRASHED document: historical `versionId` in URL still resolves if VIEW passes (same bytes).

---

## 15. Access / lifecycle authorization matrix

| Operation | VIEW | EDIT | MANAGE | Tenant caps |
|-----------|------|------|--------|-------------|
| Open/copy link | ✓ | ✓ | ✓ | `workspace.view` |
| Favorite / unfavorite | ✓ | ✓ | ✓ | `workspace.view` |
| Recent list self | ✓ | ✓ | ✓ | `workspace.view` |
| Archive / trash | — | ✓ | ✓ | `workspace.manage` |
| Restore | — | ✓ | ✓ | `workspace.manage` |
| Move / rename | — | ✓ | ✓ | `workspace.manage` |
| Permanent delete | — | — | ✓ | `workspace.delete` |
| Access grant changes | — | — | ✓ | `workspace.manage` |

Unauthorized: **404** (not 403) for single-resource endpoints; lists omit IDs (no counts leaking existence).

---

## 16. Zero-disclosure contract

W06 must close known gaps:

1. **`getArchivedWorkspaceFolders`** — filter to folders actor may VIEW (or MANAGE for trash admin).
2. **Folder archive/delete actions** — enforce resource EDIT/MANAGE like documents.
3. **Trash/archived list endpoints** — never return names/IDs outside authorized set.
4. **Impact preview** on permanent delete — already requires auth before impact (document route); extend to folder + reference counts without leaking other tenants.
5. **Favorites/recent** — store IDs per user; re-resolve with ACL; drop silently if no access (do not show “restricted” placeholder that confirms existence to unrelated users — **prefer omit** from lists; single-item resolve may use restricted presentation like `document-access.ts` for task picker).

---

## 17. Storage lifecycle contract

| Event | DB | Private objects |
|-------|-----|-----------------|
| Archive | Metadata only | **Retain all** |
| Trash | Metadata only | **Retain all** |
| Restore | Metadata | **Reuse existing keys** (no re-upload) |
| Permanent delete | Delete document (+ versions cascade) | Delete each `storageKey` best-effort **after** DB commit (keep current ordering) |
| Failed blob delete | — | Log warning; orphan acceptable (W08 governance cleanup) |
| Version restore (content) | New version row | **New object** (existing W05) |

Do not couple lifecycle to Vercel-specific APIs beyond provider interface.

---

## 18. Immutable reference safety analysis

| # | Question | W06 recommendation |
|---|----------|-------------------|
| 1 | Archive referenced document? | **Yes** — references remain valid; W07 resolver returns archived state |
| 2 | Trash referenced document? | **Yes** with trash flag; block permanent purge until refs cleared or tombstone |
| 3 | Permanent delete referenced document? | **Block** or **legal tombstone retain blob** — default **block** with clear admin override path in W08 |
| 4 | After permanent delete, durable refs? | **Tombstone** `{ tenantId, documentId, versionId, deletedAt }` — no byte access |
| 5 | Reference checks before permanent delete? | **Yes** (W06-05); incl. `TaskDocumentReference` + future W07 version FK |
| 6 | Referenced versions non-deletable? | **Yes** indirectly — document permanent delete blocked |
| 7 | Refs survive archive/trash? | **Yes** |
| 8 | Resolver for archived version? | **Yes** for authorized VIEW |
| 9 | Tombstones in UI? | **Yes** — “Document removed” + version id for audit |
| 10 | W07 integration gates | Reference registry, tombstone API, blocked delete, archived/trash resolver semantics |

**Current danger:** `deleteWorkspaceDocumentPermanently` cascade-deletes versions and blobs **without reference checks** — **must not ship W07** until W06-05 lands.

---

## 19. W07 readiness requirements

Before Tasks/Requirements bind to `WorkspaceDocumentVersion.id`:

1. W06 lifecycle states persisted and exposed in APIs.
2. Reference-aware permanent delete (or tombstone retain mode).
3. Authorized version resolver endpoint shared by Workspace + Aufgaben.
4. Tombstone presentation in task/requirement UI (contract only in W06).
5. Document archive/trash must not break picker semantics — W07 extends `document-access` / new `version-access` seam.

---

## 20. W08 boundary

W06 provides: states, manual transitions, storage delete on permanent, seams (`trashedAt`, `purgeAfter` nullable without scheduler).

W08 provides: retention duration, auto-purge jobs, legal hold, orphan blob sweeps, lifecycle audit exports, malware block on restore.

---

## 21. Multi-tenant requirements

- All link resolution, favorites, recent, trash, archive scoped by `tenantId`.
- Cross-tenant ID in URL → 404.
- No tenant slug in canonical URLs (use cuid ids only).
- Storage keys already tenant-scoped — permanent delete must not cross tenants.

---

## 22. Concurrency / transaction requirements

| Operation | Requirement |
|-----------|-------------|
| Trash folder subtree | Single transaction: folder states + document states; avoid partial “active doc in deleted folder” |
| Restore subtree | Transactional; validate parent ACTIVE |
| Permanent delete | DB transaction then async/best-effort storage; reference check **inside** transaction with row lock |
| Move/rename | Existing move validation + lifecycle check (cannot move into trashed folder) |
| Archive | Idempotent; row-level `update` with status preconditions |

Avoid loading full tenant tree on every request — use targeted queries + existing graph for ACL (W02 pattern).

---

## 23. Mobile readiness

- Stable string IDs and lifecycle enum in DTOs.
- REST parity for lifecycle (prefer migrating folder server actions to API routes over time).
- Copy link produces absolute path relative to app origin.
- Tombstone + archived/trash flags in document summary DTO.

---

## 24. Universal Search readiness

- Index only ACTIVE (and optionally ARCHIVED if product chooses) — **not TRASHED** or PERMANENTLY_DELETED.
- Lifecycle field filterable.
- Authorization via same readable ID sets as W02 — no search-specific bypass.

---

## 25. Explicit exclusions

No implementation in W06 of: W07 task version refs, acknowledgements, approvals, signatures, semantic diff, auto-purge, malware scan, public/anonymous sharing, external guests, Mobile app, Universal Search engine, AI search, Performance programme, Google Drive migration.

---

## 26. Proposed W06 implementation packages

| Package | Scope | Notes |
|---------|-------|-------|
| **W06-01** | Lifecycle domain: enums/fields (`trashedAt`, unified lifecycle helpers), DTOs, invariants doc | Schema migration allowed in W06 impl |
| **W06-02** | Archive/trash/restore/permanent-delete services + API parity; folder ACL fixes; subtree rules | Fixes orphan docs on folder delete |
| **W06-03** | Canonical links, copy-link UX, version deep links, resolver hardening | No token entities |
| **W06-04** | Favorites + recent (Prisma tables), ACL-safe queries, minimal UI | |
| **W06-05** | Reference registry, delete guards, tombstones, Communication/Task integration hooks | Blocks W07 until done |
| **W06-06** | Sentinels, zero-disclosure tests, benchmark acceptance, regression | |

Split is **appropriate**; reorder so **W06-01 → W06-02 → W06-05** before heavy UX (03/04) if W07 schedule is tight.

---

## 27. Acceptance gates (WORKSPACE-06 programme)

1. All lifecycle transitions enforce matrix §15 with zero-disclosure §16.
2. Folder/document trash restore works for nested subtree.
3. Copy link produces stable URLs; rename/move does not break.
4. Permanent delete blocked when references exist (tests with `TaskDocumentReference` fixture).
5. Archived document opens for authorized VIEW via deep link.
6. No admin/creator/link bypass of resource ACL.
7. Storage: archive/trash retain blobs; permanent delete removes keys after DB.
8. Docs updated; no regression in W02–W05 sentinels.

---

## 28. Risks / open questions

| Risk | Severity | Mitigation |
|------|----------|------------|
| Folder permanent delete orphans documents today | High | W06-02 trash cascade |
| Archived folder list leaks names to any manager | Medium | ACL filter in W06-02 |
| TaskDocumentReference cascade on doc delete | High | W06-05 reference gate |
| Document-delete-service stale comment | Low | Fix in W06-06 hygiene |
| Archive vs trash user confusion | Medium | UX copy + separate views |
| Recycle retention without W08 | Low | Manual permanent delete only until W08 |

**Open product question:** Should folder archive auto-hide contained documents without trashing them? **Recommendation:** mark documents **archived-by-folder** virtual visibility or cascade `archivedAt` on documents when folder archived — pick one in W06-01 design review (prefer **cascade document archive** for simplicity).

---

## 29. Recommended final W06 scope

**Ship in W06:** lifecycle state foundation; trash + restore; hardened archive; reference-safe permanent delete; internal ID links + copy link; favorites + recent; ACL-safe archived/trash views; folder lifecycle aligned with documents; zero-disclosure fixes; storage contract unchanged from W04/W05 principles.

**Do not ship in W06:** external sharing, share tokens, comments, activity feed, retention automation, W07 version binding UI, search index.

---

## Appendix A — File index (discovery references)

| Area | Paths |
|------|-------|
| Schema | `prisma/schema.prisma` (Workspace* models) |
| Document lifecycle | `lib/workspace/document-archive-service.ts`, `document-restore-service.ts`, `document-delete-service.ts` |
| Folder lifecycle | `app/(admin)/dashboard/workspace/actions.ts`, `lib/workspace/folder-delete-service.ts` |
| Version | `lib/workspace/document-version-*`, `lib/workspace/version/*` |
| ACL | `lib/workspace/access/*`, `lib/workspace/workspace-resource-guards.ts` |
| Storage | `lib/workspace/storage/*`, `lib/workspace/upload-storage.ts` |
| UI | `app/(admin)/dashboard/workspace/page.tsx`, `components/admin/workspace/*` |
| W05 contract | `docs/workspace/WORKSPACE-05-INVARIANTS.md` |
