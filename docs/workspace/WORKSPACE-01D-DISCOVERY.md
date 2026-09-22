# WORKSPACE-01D — Canonical Workspace Domain + Access Discovery

**Status:** Discovery complete (architecture contract only)  
**Baseline:** `cefbdbe0c9378d6c0417eeffec998cb4f123dea0` (STAGE, PR #690 / AUFGABEN-06G11 merged)  
**Branch:** `cursor/workspace-01d-domain-access-discovery`  
**Date:** 2026-09-22  

This document is the implementation contract input for **WORKSPACE-01**. No product ACL implementation is included in 01D.

---

## Executive summary

The repository already has a **solid document/folder/version/storage foundation**, but **resource-level visibility and inheritance are not implemented**. Authorization today is **tenant-wide RBAC** (`workspace.view` / `workspace.manage` / `workspace.delete`) with **no persisted grants** despite Prisma enums (`WorkspaceAccessSubjectType`, `WorkspaceAccessLevel`) and architecture docs referencing `WorkspaceAccessGrant`.

The Aufgaben domain (**TaskVisibilityScope** + **TaskAccessGrant** + `buildTaskReadWhere` / `canReadTask`) is the **canonical SCE pattern to mirror conceptually**, not via foreign keys.

Product direction for new content: **open by default (CLUB), restrictable by creator** — must **not** broaden any future restricted records; today there are **no restricted records in schema**, but effective access is already “all `workspace.view` holders see all tenant documents.”

---

## 1. Preflight record

| Check | Result |
|--------|--------|
| Repo | `Clipse078/sportclubevo-webapp` |
| `origin/STAGE` | `cefbdbe0c9378d6c0417eeffec998cb4f123dea0` |
| Local STAGE before FF | **Behind** (`560b4a3f…`); fast-forwarded to baseline before branch |
| Worktree | Clean at discovery start |
| PR #690 | **MERGED** (`cefbdbe0…`, AUFGABEN-06G11) |
| Unmerged Workspace ACL on STAGE | **None found** — grants/enums partially planned, models absent |

---

## 2. Current domain map

| Concept | Implementation today |
|---------|----------------------|
| **WORKSPACE ROOT** | Implicit **tenant root**: `WorkspaceFolder.parentId = null`. No `WorkspaceContainer` model (still in `docs/WORKSPACE_ARCHITECTURE.md` / `docs/workspace/PRISMA_FOUNDATION.md` only). |
| **FOLDER** | `WorkspaceFolder` — tenantId, parentId (self-ref), name, description, displayOrder, archivedAt, created/updated by user. |
| **DOCUMENT** | `WorkspaceDocument` — stable id, tenantId, optional folderId, name, status (ACTIVE/ARCHIVED), currentVersionId, archivedAt, audit users. |
| **BINARY** | `WorkspaceDocumentVersion` — storageKey, optional storageUrl, mimeType, sizeBytes, checksum, filename; immutable rows. |
| **VERSION** | **Yes** — append-only `versionNumber`, `CURRENT` / `SUPERSEDED`; restore/upload creates new version (`document-version-service`, upload routes). |
| **PARENT / CHILD** | Folders: `parentId` tree. Documents: single `folderId` (nullable = root-level doc without folder — UI deep-link currently requires folderId). |
| **TENANT** | Mandatory `tenantId` on folder, document, version; queries normalize tenant from session. |
| **CREATOR** | `createdByUserId` on folder/document/version; not used for authorization. |
| **OWNER** | **No ownership model**; `WorkspaceAccessLevel.OWNER` enum exists but unused. |
| **STORAGE** | Dedicated private Vercel Blob store (`lib/workspace/upload-storage.ts`, `access: "private"` on put/get). |
| **METADATA** | Postgres on document + version rows (no separate metadata table). |
| **ACCESS** | **Not persisted** — RBAC permissions only. |
| **ACTIVITY** | Partial — `writeAuditRecord` on upload/archive/restore; `logAction` on folder server actions; no access-change audit. |
| **SOFT DELETE** | Documents: `status=ARCHIVED` + `archivedAt`. Folders: `archivedAt`. Permanent delete: separate `workspace.delete` + `/permanent` routes. |

**Related but separate bounded contexts:** `PersonDocument`, `TeamDocument`, `MediaAsset` / `MediaFolder` (public CMS DAM) — not Workspace ACL.

**Cross-links:** `TaskDocumentReference` → `WorkspaceDocument` (AUFGABEN-06D); `CommunicationAttachment` may snapshot `WORKSPACE_DOCUMENT_VERSION`.

---

## 3. Current authorization map

| Operation | Enforcement |
|-----------|-------------|
| **Central helpers** | `requireApiPermission` / `requirePermission` / `requireAnyPermission`; **`lib/workspace/document-access.ts`** (Task-link + deep-link seam; tenant RBAC only). |
| **List folders** | `WORKSPACE_VIEW` → `getWorkspaceFolderTree(tenantId)` — **all active folders**, no resource filter. |
| **Read document metadata** | API GET documents: `WORKSPACE_VIEW` + tenant + folderId filter only. |
| **Download / preview** | `WORKSPACE_VIEW` + tenant document lookup — **no resource ACL**. |
| **Create folder/doc/upload** | `WORKSPACE_MANAGE` (+ tenant validation). |
| **Edit / rename / archive / restore** | `WORKSPACE_MANAGE` (API + server actions). |
| **Move folder** | `moveWorkspaceFolderAction` — `WORKSPACE_MANAGE`; **no access inheritance check**. |
| **Delete permanent** | `workspace.delete` via `EffectivePermissionResolver` (tenant-scoped; Super Admin holds platform grant — **not** resource bypass). |
| **Manage access** | **Not implemented**. |
| **Search** | No tenant-wide Workspace search API; Task picker uses `searchWorkspaceDocumentsForTaskLink` — tenant + name + **`workspace.view` only**. |
| **Deep link** | `?document=` on page: `canReadWorkspaceDocument` → same as view permission + active doc; **404 if not readable**. |
| **UI-only gaps** | Nav hides “Dokumente” without view/manage (RPERM-05); **folder tree and lists are not filtered** — any viewer sees full tenant tree. |

Services (`document-service`, `folder-service`, `queries`) **explicitly defer authorization to API/UI boundary**.

---

## 4. RBAC inventory

| Key | Scope | Typical grant | Resource-scoped? |
|-----|-------|---------------|------------------|
| `workspace.view` | TENANT | Club roles via seed/sync | **No** — tenant capability |
| `workspace.manage` | TENANT | Admin/coach roles | **No** |
| `workspace.delete` | TENANT | Club Admin + platform super_admin | **No** |
| `workspace.upload` / `workspace.edit` | — | **Not in seed** — docs only; **manage** covers upload/edit today |

**Gap vs target VIEW/EDIT/MANAGE:** Map **VIEW** → `workspace.view` + resource grant; **EDIT** → new `workspace.edit` *or* manage+grant (recommend **split**: manage = tenant admin ops, edit = content change on granted resources); **MANAGE** → resource access administration + move/delete per policy.

---

## 5. Current visibility & inheritance

| Question | Answer |
|----------|--------|
| Persisted visibility? | **No** |
| Default effective access | Any user with `workspace.view` (or manage) → **entire tenant Workspace** |
| Org unit support | **No** |
| Specific people | **No** |
| Multi-org grants | **No** |
| Inheritance | **No** — enums/types planned, zero runtime |

**Note:** Legacy `docs/WORKSPACE_ARCHITECTURE.md` states “Private by Default”; SCE programme principle is **OPEN BY DEFAULT, RESTRICTABLE** for new content. WORKSPACE-01 must **update normative docs** and implement the programme principle without retroactively widening confidential data (see migration).

---

## 6. Storage security

| Topic | Finding |
|-------|---------|
| Provider | Vercel Blob (private store, separate token/storeId) |
| Public blobs | Upload uses `access: "private"` |
| URL model | `storageUrl` may be persisted on version row from Blob `put`; **not exposed** in list/download DTOs/tests |
| Download auth | **Authenticated proxy** — API reads blob with server token after `WORKSPACE_VIEW` |
| ACL bypass risk | **Medium:** direct Blob URL (if leaked from DB/logs) could bypass app ACL; mitigated by private store + no client exposure today |
| Follow-up | WORKSPACE-04: signed short-lived URLs, never persist public URLs in client payloads, rotation, download audit |

---

## 7. Task access architecture (reuse guidance)

**Implemented pattern (AUFGABEN-06F2+):**

- `Task.visibilityScope`: `CLUB` | `ORG_UNIT` | `ASSIGNEES_ONLY`
- `TaskAccessGrant` / `TaskSeriesAccessGrant`: `ORG_UNIT` or `USER` subjects
- `canReadTask` + `buildTaskReadWhere` — creator/assignee exceptions; **no admin bypass** on restricted tasks
- Org readability from `orgReadableUnitIds` / role assignments

**Reuse for Workspace:**

| Reuse | Approach |
|-------|----------|
| Visibility scope enum concept | **CLUB / ORG_UNIT / SPECIFIC_PEOPLE** (map `ASSIGNEES_ONLY` → SPECIFIC_PEOPLE; Workspace may omit assignee semantics) |
| Grant table shape | **New** `WorkspaceAccessGrant` (folder and/or document resourceType + resourceId) — **do not FK to Task** |
| Query predicates | Mirror `buildTaskReadWhere` → `buildWorkspaceReadWhere` with hierarchy |
| Creator always read? | **Explicit product rule needed** — Tasks: creator always reads; recommend Workspace creator **retains MANAGE** on resource until transfer |
| Admin bypass | Tasks: manage does not bypass ASSIGNEES_ONLY; recommend same for restricted Workspace resources |

**Do not couple:** Task grants, Task visibility fields, Requirement recipients.

---

## 8. Target access model (evaluation)

### Visibility scopes

| Scope | Fit |
|-------|-----|
| **CLUB** | Users with tenant `workspace.view` **and** resource effective CLUB (or inherited) |
| **ORG_UNIT** | Grant rows + membership expansion (multi-org via multiple grant rows) |
| **SPECIFIC_PEOPLE** | USER grants; sufficient for “private to selected users” without separate ASSIGNEES_ONLY unless product needs assignee-linked visibility (not evidenced for documents) |

### Access levels (VIEW / EDIT / MANAGE)

Recommend:

1. **Tenant capabilities** (existing + minor additions): `workspace.view`, `workspace.edit`, `workspace.manage`, `workspace.delete` (keep delete separate).
2. **Resource grants** with levels **VIEW | EDIT | MANAGE** stored on grant (map legacy enum DOWNLOAD/UPLOAD into EDIT for implementation simplicity, or keep granular levels in DB but expose three UX tiers).

Effective permission = **tenant capability AND resource grant level** (plus inheritance).

### Role vs resource

- Role answers: “May this user participate in Workspace at all / administer tenant defaults?”
- Grant answers: “On **this** folder/document, what can they do?”

---

## 9. Inheritance contract (target)

**Representation:** Persist **explicit visibility scope + optional grants** on each resource; compute **effective scope** by walking **folder ancestry** (document inherits from folder chain to tenant root).

| Rule | Semantics |
|------|-----------|
| Root folder | Default **CLUB** for **new** resources after WORKSPACE-01 |
| Default child | **Inherit** effective boundary |
| More restrictive child | Allowed — child scope/grants ⊆ parent effective audience |
| Broader child | **Reject** on write (create/move/access change) |
| Parent change | Recompute effective for descendants; **stale child grants must not widen** — clamp or require explicit child update |
| Move to restricted parent | Child effective access **narrows** to intersection; validate before commit |
| Move to broader parent | **Forbidden** if child has explicit narrower scope that would become invalid — or auto-keep child override (still ⊆ new parent) |
| Explicit vs inherited | Persist `visibilityScope` + `inheritAccessFromParent: boolean` **or** null scope = inherit; API returns `effective`, `explicit`, `inheritedFromFolderId` |

Prefer **computed effective access** at read/query time with **cached ancestry path** (`materializedPath` or closure table) if depth/scale warrants — start with **recursive CTE** for 01 if tree depth modest.

---

## 10. Query & search security (future)

**List strategy:** `buildWorkspaceReadWhere(ctx)` joining:

- tenantId
- actor user id
- org unit memberships
- grant tables
- folder ancestry for inheritance

Never load-all + JS filter.

**Search:** No global Workspace search yet; when added, **same WHERE** as list, applied in SQL before returning names/snippets.

**Indexes:** `(tenantId, folderId)`, `(tenantId, resourceId, subjectType, subjectId)` on grants, ancestry `(tenantId, parentId)`, optional `(tenantId, path)`.

---

## 11. Document versioning & Requirements

| Topic | State |
|-------|--------|
| Versioning exists | **Yes** — `WorkspaceDocumentVersion.id` is stable immutable identity |
| Requirement reference | **Not in schema** — `RequirementResponseMode` only `ACKNOWLEDGE`; no `WORKSPACE_DOCUMENT_VERSION` dependency row |
| Integration boundary | Requirement auth stays on **RequirementRecipient**; document auth on **Workspace**; acknowledgement flow must decide: require live VIEW vs pinned snapshot / communication attachment pattern |
| Aufgaben changes in 01 | **None** |

Future reference target: **`WorkspaceDocumentVersion.id`** (+ document id for context).

---

## 12. Mobile readiness

Place canonical logic in **`lib/workspace/access/`** (new) consumed by:

- App routes (`app/api/workspace/**`)
- Server actions
- Future mobile API (same services, session/tenant context)

No ACL in React except presentation of effective access labels.

**Offline seam:** respect tenant id, grant revocation, signed URL TTL, do not treat cached metadata as authorization.

---

## 13. Audit

Reuse `writeAuditRecord` / `logAction`. Future events: access changed, move, restricted download (policy), grant CRUD.

---

## 14. Scale tradeoffs

| Approach | When |
|----------|------|
| Recursive CTE on folder tree | < ~1k folders, moderate depth |
| Materialized path / closure table | Deep trees, frequent list queries |
| Materialized effective ACL | 10k+ documents, heavy grant fan-out — **later** (WORKSPACE-08) |

Avoid N+1 per row: batch ancestry resolution.

---

## 15. Migration / backfill

**Current data:** All documents/folders visible to all `workspace.view` holders.

**Safe strategy:**

1. Add columns/tables with **legacy effective = CLUB** (matches today’s practical effect for viewers) **OR** explicit `visibilityScope = CLUB` on all existing rows.
2. **Do not** run a migration that sets restricted resources to CLUB — **none exist in DB**.
3. Flag `accessModelVersion = 1` on tenant or resource for future diagnostics.
4. New resources after cutover: default CLUB per programme principle; creator can restrict immediately.

**Broadening risk:** Low for stored ACL (greenfield); **medium** for user expectations if some clubs relied on “only admins have workspace.view” — that remains tenant RBAC, unchanged.

---

## 16. Security risks (top)

1. **S1:** Tenant RBAC-only — any `workspace.view` user reads all documents.  
2. **S2:** Persisted `storageUrl` — potential direct blob access if URL leaks.  
3. **S3:** Folder/document move with no ACL validation (future widening vector once ACL exists).  
4. **S4:** Architecture doc “private by default” vs programme “open by default” — documentation drift.  
5. **S5:** Super Admin `workspace.delete` is tenant operational — must not imply read bypass on restricted content (align with Tasks).

---

## 17. Proposed roadmap (repository-adjusted)

| Pkg | Focus |
|-----|--------|
| **WORKSPACE-01** | Domain ACL schema: visibility scope, grants, inheritance rules, backfill, creator defaults — **no full UI** |
| **WORKSPACE-02** | `canRead/Edit/Manage` + `buildWorkspaceReadWhere`; enforce on all routes/actions/queries |
| **WORKSPACE-03** | Access management UX + explicit/inherited display |
| **WORKSPACE-04** | Storage hardening (signed URLs, URL persistence policy) |
| **WORKSPACE-05** | Version workflow polish (restore UX, immutability guarantees for Requirements) |
| **WORKSPACE-06** | Collaboration (favourites, links, cross-module — as needed) |
| **WORKSPACE-07** | Requirement ↔ document/version reference + acknowledgement seam |
| **WORKSPACE-08** | Audit, scale (path/closure), performance |
| **WORKSPACE-09** | Security regression + penetration-style tests |
| **WORKSPACE-10** | Acceptance / **DOCUMENT WORKSPACE CLOSED — MOBILE READY** |

Defer **WorkspaceContainer** until product requires multi-root navigation (optional sub-milestone).

---

## 18. WORKSPACE-01 implementation contract

### Scope (IN)

- Prisma: `WorkspaceVisibilityScope` enum (CLUB, ORG_UNIT, SPECIFIC_PEOPLE); `WorkspaceAccessGrant` (resourceType FOLDER|DOCUMENT, resourceId, subjectType USER|ORG_UNIT, accessLevel VIEW|EDIT|MANAGE); folder/document fields: `visibilityScope`, `inheritVisibility` (or equivalent), indexes.
- Migration backfill: existing rows → CLUB + inherit true; **no narrowing/broadening surprises**.
- Pure domain services: effective access resolution, validation (no broadening child), move validation hooks (stub calls OK if moves enforced in 02).
- Extend `document-access.ts` contract types (implementation may be minimal if 02 owns enforcement).
- Tests: inheritance validation unit tests, backfill assumptions.

### Scope (OUT)

- UI access panels, query enforcement in all routes, search, storage changes, Requirement integration, Mobile API, permission sync scripts (unless new keys approved separately).

### Auth (01 foundation)

- Define types and persistence only; **route enforcement lands in WORKSPACE-02**.

### Default new content

- **CLUB** visibility, creator granted **MANAGE** (recommended).

### Existing content

- **CLUB** effective visibility; document in migration section.

### Tests

- Schema migration tests; effective-access pure function tests; no broadening property tests.

---

## 19. Frozen baseline confirmation

| Area | Touched in 01D? |
|------|-----------------|
| Aufgaben / Requirements | **No** |
| Production code | **No** |
| Production DB | **No** |
| Mobile | **No** |
| Billing SIX | **No** |

---

## Verdict

**WORKSPACE-01D DISCOVERY COMPLETE — READY FOR WORKSPACE-01 IMPLEMENTATION**
