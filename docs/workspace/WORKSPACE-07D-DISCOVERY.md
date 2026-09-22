# WORKSPACE-07D — Tasks / Requirements ↔ immutable Workspace document version reference discovery

**Status:** Discovery complete — implementation contract for **WORKSPACE-07** (documentation only)  
**Baseline STAGE SHA:** `1530fea22010a18acd7cf0c2626a2ba914858e17`  
**Branch:** `cursor/workspace-07d-immutable-document-reference-discovery`  
**Date:** 2026-09-22  
**Prerequisites:** WORKSPACE-01–06 merged (PR #698); AUFGABEN-06D task document links; AUFGABEN-06G1–06G11 Requirements foundation

**Rule:** This document defines W07. **Do not implement W07 in 07D.**

Companion: `WORKSPACE-07D-BENCHMARK-RECORD.md`

---

## 1. Executive summary

WORKSPACE-05 established **immutable** `WorkspaceDocumentVersion` rows and the canonical reference shape `WorkspaceDocumentVersionRef { tenantId, documentId, versionId }`. WORKSPACE-06 added **lifecycle** (ACTIVE / ARCHIVED / TRASHED), **reference-safe permanent delete** (`TaskDocumentReference` → `ON DELETE RESTRICT`), **document row locking** (`FOR UPDATE`), and **`w07-readiness.ts`** export seams.

**Today:**

- **Tasks** already link **supporting** Workspace documents via `TaskDocumentReference`, but only at **`WorkspaceDocument.id`** (mutable “which document”, not “which version”). UI opens `/dashboard/workspace?document={id}` (implicit latest).
- **Requirements** have **no** document reference model; acknowledgements are **campaign-level** on `RequirementRecipient`, not tied to Workspace content.

**W07 must:**

1. Make **`WorkspaceDocumentVersion.id`** the durable business reference target for Task/Requirement links where immutability matters.
2. Preserve **dual authorization** (domain edit + workspace VIEW to link; domain read + current workspace VIEW to resolve).
3. Extend **deletion blockers** and **zero disclosure** without introducing a parallel attachment store.
4. Prepare **acknowledgement identity** so future “acknowledged version V” never silently becomes “latest”.

**Recommended approach:** Evolve **`TaskDocumentReference`** to version-scoped FK + add **`RequirementWorkspaceDocumentVersionReference`** (Option C/B hybrid) with shared resolver/DTO contract — see §9–10.

---

## 2. Canonical W06 baseline

| Check | Evidence |
|-------|----------|
| STAGE SHA | `1530fea22010a18acd7cf0c2626a2ba914858e17` |
| W06 migration | `prisma/migrations/20260922230000_workspace_06_lifecycle_collaboration/migration.sql` (checksum `0e04f4fe60fb1176650fb59a3b31d0dbd0c798cce7d9d5009b96280d54c75131`) |
| PR #698 | MERGED — WORKSPACE-06 implementation |
| PR #697 | MERGED (06D discovery); ancestry included in W06 programme |
| `TaskDocumentReference.documentId` | **`ON DELETE RESTRICT`** (W06) |
| Deletion registry | `lib/workspace/deletion/deletion-blockers.ts` |
| W07 seam | `lib/workspace/deletion/w07-readiness.ts` |

Preflight note: local checkout was **behind** `origin/STAGE` before hard reset to canonical SHA; no file changes until discovery branch created.

---

## 3. Current Task domain

### 3.1 Prisma & identity

| Item | Detail |
|------|--------|
| Core model | `Task` — `id` (cuid), `tenantId`, lifecycle `TaskStatus`, `contextType` / `contextId`, org/visibility, series/subtasks |
| Tenant | `tenantId` FK → `Tenant` CASCADE |
| Assignees | `TaskAssignee` (many); creator `createdByUserId` optional |
| Supporting docs | `TaskDocumentReference[]` |
| Primary document context | `TaskContextType.DOCUMENT` + `contextId` (single primary; distinct from supporting refs) |

**Key files:** `prisma/schema.prisma` (~2902–3033), `lib/tasks/task-service.ts`, `lib/tasks/workspace-service.ts`, `lib/tasks/task-access.ts`, `lib/tasks/task-authorization.ts`.

### 3.2 Lifecycle / status

`OPEN` → `IN_PROGRESS` → `DONE` | `CANCELLED`; completion sets `completedAt`. Recurrence via `TaskSeries` + `seriesOccurrenceKey`.

### 3.3 APIs & UI

| Surface | Location |
|---------|----------|
| Server actions | `app/(admin)/dashboard/aufgaben/actions.ts` — `linkTaskDocumentAction`, `unlinkTaskDocumentAction`, `searchTaskDocumentLinkCandidatesAction` |
| Service | `lib/tasks/task-document-reference-service.ts` |
| Task detail UI | `components/admin/aufgaben/TaskWorkspace.tsx` → `TaskDocumentReferencesSection.tsx` |
| Workspace reverse link | `ContextRelatedTasksPanel` on workspace page — **primary DOCUMENT context only**, not supporting refs |
| HTTP | No public task CRUD API; cron `app/api/cron/task-notifications/route.ts` |

### 3.4 Permissions

- Task: `tasks.view`, `tasks.create`, `tasks.assign`, `tasks.view_all`, `tasks.manage` (`lib/permissions/permissions.ts`).
- Document ref edit: `canEditTaskDocumentReferences` = manage **OR** (creator **and** `tasks.create`) — `task-document-reference-service.ts`.
- Task visibility: `requireVisibleTask` / `buildTaskVisibilityWhere` — **does not** use document refs for task read (sentinel R23).

### 3.5 Audit / events

`writeAuditRecord` on link/unlink: `TASK_DOCUMENT_LINKED` / `TASK_DOCUMENT_UNLINKED`, `afterJson: { documentId }` only (no filename). Timeline via `task-timeline-mapper.ts`.

---

## 4. Current TaskDocumentReference contract

### 4.1 Schema

```3015:3033:prisma/schema.prisma
model TaskDocumentReference {
  id              String   @id @default(cuid())
  tenantId        String
  taskId          String
  documentId      String
  createdByUserId String?
  createdAt       DateTime @default(now())
  document  WorkspaceDocument @relation(..., onDelete: Restrict)
  @@unique([taskId, documentId])
}
```

### 4.2 Exact semantics (repository truth)

| Question | Answer |
|----------|--------|
| References `WorkspaceDocument`? | **Yes** — `documentId` → `WorkspaceDocument.id` |
| References `WorkspaceDocumentVersion`? | **No** |
| Another document model? | **No** |
| Mutable target? | **Document pointer is stable id**, but **semantic content drifts** with `currentVersionId` / new uploads |
| Business-significant? | **Partially** — durable RESTRICT + audit; **not** version-pinned for evidence |
| Multiple docs per task? | **Yes** (unique per document) |
| Same doc on multiple tasks? | **Yes** |
| Reference removable? | **Yes** — `unlinkTaskDocument` → `deleteMany` |
| Who creates/removes? | Actor with `canEditTaskDocumentReferences` + visible task |
| Delete cascade | Task deleted → refs **CASCADE**; Document permanent delete → **RESTRICT** (W06) |

### 4.3 Link flow

1. `assertWorkspaceDocumentLinkable` — ACTIVE, not archived, tenant VIEW + resource VIEW (`canReadDocumentRow`).
2. Transaction: `SELECT … FOR UPDATE` on `WorkspaceDocument`, then `createMany` (skipDuplicates).
3. List: `resolveWorkspaceDocumentPresentations` → readable metadata or `{ access: "restricted", documentId }`.

### 4.4 Upload/download

No task-local blob storage. Readable links use workspace routes; restricted rows have **no href**.

---

## 5. Current Requirement domain

### 5.1 Models

| Model | Role |
|-------|------|
| `Requirement` | Campaign header — `DRAFT` \| `ACTIVE` \| `CLOSED` \| `CANCELLED` |
| `RequirementDraftAudience*` | Audience while DRAFT only |
| `RequirementRecipient` | Post-activation snapshot + per-person ACK state |

**No** `RequirementDocumentReference` or Workspace FK.

### 5.2 Version / publish semantics

- **Not** workspace-style versioning. Activation freezes **audience** (`RequirementRecipient` rows), not content history.
- **ACTIVE** allows mutating `title`, `description`, reminders (service rules); no historical content snapshot.

### 5.3 Acknowledgement

`RequirementRecipient`: `resolutionStatus`, `responseValue: ACKNOWLEDGED`, audit fields. Identity = **requirement + person**, not document version.

### 5.4 APIs / UI

| Surface | Path |
|---------|------|
| Management | `/dashboard/aufgaben/anforderungen/[requirementId]` — `RequirementDetailWorkspace.tsx` |
| Create | `/dashboard/aufgaben/anforderungen/neu` — `RequirementCreateClient.tsx` |
| Personal ACK | `/dashboard/aufgaben/anforderung/[recipientId]` — `PersonalRequirementExecutionWorkspace.tsx` |
| Actions | `requirement-actions.ts`, `personal-requirement-actions.ts` |
| Permissions | `requirements.view`, `.create`, `.manage`, `.view_aggregate` |

### 5.5 06G foundation (do not redesign)

Audience expansion (06G6), notifications (06G4/06G10), personal inbox (06G3/06G9), matrix (06G8), platform export (06G5). W07 **adds** document version references **alongside** existing ACK model.

---

## 6. Current Requirement document/reference contract

**None.** Content is inline `title` / `description` text. Tests (06G9/06G11) assert absence of requirement document models.

**Future W07:** Parallel to evolved task reference table; optional future binding between ACK campaigns and specific version ids (identity contract §19) — **not** replacing 06G recipient ACK in W07 unless explicitly scoped later.

---

## 7. Workspace W05/W06 integration foundation

### 7.1 W05 (version)

| Concept | Implementation |
|---------|----------------|
| Immutable version row | `WorkspaceDocumentVersion` — content via `storageKey` |
| Current pointer | `WorkspaceDocument.currentVersionId` (mutable operational latest) |
| Ref DTO | `WorkspaceDocumentVersionRef` / `toWorkspaceDocumentVersionRefDto` |
| Historical access | `document-version-access-service.ts` — explicit `versionId`; ACL from document |
| Restore | New version row; provenance in `changeNote` |
| Invariants | `docs/workspace/WORKSPACE-05-INVARIANTS.md` V1–V15 |

### 7.2 W06 (lifecycle & safety)

| Concept | Implementation |
|---------|----------------|
| Lifecycle | `deriveWorkspaceDocumentLifecycle` — ACTIVE / ARCHIVED / TRASHED |
| Permanent delete | `deleteWorkspaceDocumentPermanently` — row lock, blockers, cascade versions, post-commit blob delete |
| Task ref guard | `getWorkspaceDocumentDeletionBlockers` — `TASK_DOCUMENT_REFERENCE` |
| Stub kind | `WORKSPACE_DOCUMENT_VERSION_REFERENCE` — **declared, not queried** |
| Link lock | Task link + delete both `FOR UPDATE` document row |
| Direct links | `document-link-access.ts`, `internal-links.ts` — zero disclosure |
| Readiness barrel | `w07-readiness.ts` re-exports blockers, version ref DTO, lifecycle, direct link access |

### 7.3 Parallel pattern (Comms)

`CommunicationAttachment` with `sourceDocumentVersionId` — **snapshot/attachment** semantics for messaging, **not** the Task/Requirement reference model W07 should reuse.

---

## 8. W07 core invariant

**Business reference target:**

```
WorkspaceDocumentVersion.id  (+ tenant consistency via FK/service)
```

**Not valid as business identity:** latest document, `currentVersionId`, filename, storage URL/key, copied attachment binary.

**Stability scenarios (must hold):**

| Event | Reference behaviour |
|-------|---------------------|
| New version V+1 uploaded | Ref stays on **V** |
| Rename / move folder | Ref stays on **V** (document id + version id unchanged) |
| Archive / trash document | Ref row **remains**; resolution applies lifecycle + ACL |
| Restore old V1 as new V4 | Ref stays on **original V1** |
| User wants V4 | **Explicit** new/replace reference operation |

Validated against WORKSPACE-05 V13–V14 and SCE Requirements evidence/ACK direction.

---

## 9. Reference data-model options

### Option A — Generic `WorkspaceResourceReference`

Polymorphic owner (`TASK` \| `REQUIREMENT` \| …) + `versionId`.

| Pros | Cons |
|------|------|
| One deletion registry query | Weak Prisma typing; cross-domain coupling |
| Extensible | Harder tenant-isolation audits per domain |

### Option B — `TaskWorkspaceDocumentVersionReference` + `RequirementWorkspaceDocumentVersionReference`

Separate tables, same FK to `WorkspaceDocumentVersion`.

| Pros | Cons |
|------|------|
| Type safety, clear domain queries | Two migrations/services |
| Domain-specific uniqueness rules | Some duplicated resolver code |

### Option C — Evolve `TaskDocumentReference` + parallel Requirement table

Replace `documentId` with `workspaceDocumentVersionId` (or add version FK, drop document-only uniqueness).

| Pros | Cons |
|------|------|
| Preserves task UX/service investment | Migration from documentId → versionId |
| Matches existing RESTRICT story | Rename clarity (optional) |

### Evaluation matrix

| Criterion | A | B | C (evolved) |
|-----------|---|---|-------------|
| Referential integrity | Medium | **High** | **High** |
| Deletion blockers | Easy central | **Easy central** | **Easy central** |
| Type safety | Low | **High** | **High** |
| Migration from 06D | N/A | Medium | **Best** |
| Acknowledgement extensibility | OK | **Good** | **Good** |

---

## 10. Recommended data model

**Recommend Option C (evolved) + Requirement parallel table (B-style for Requirements):**

1. **`TaskDocumentReference`** (evolved): FK `workspaceDocumentVersionId` → `WorkspaceDocumentVersion` **`ON DELETE RESTRICT`**; `@@unique([taskId, workspaceDocumentVersionId])`; retain `tenantId`, audit fields. Optional denormalized `documentId` **discouraged** — derive via join for blockers.
2. **`RequirementWorkspaceDocumentVersionReference`** (new): `requirementId`, `workspaceDocumentVersionId`, `tenantId`, `createdByUserId`, `createdAt`; uniqueness `(requirementId, workspaceDocumentVersionId)`.
3. **Shared contract module** (W07 implementation): `WorkspaceDocumentVersionRef` DTO, batch resolver, zero-disclosure placeholder type — **not** a generic polymorphic DB table.

**Tenant integrity:** FK + service asserts `version.tenantId === task/requirement.tenantId === ctx.tenantId`.

**Permanent delete blockers:** Extend `getWorkspaceDocumentDeletionBlockers` to count refs where `version.documentId = :documentId` (both tables), emit kinds `TASK_DOCUMENT_REFERENCE` / `REQUIREMENT_WORKSPACE_DOCUMENT_VERSION_REFERENCE` (implement stub `WORKSPACE_DOCUMENT_VERSION_REFERENCE` or domain-specific kinds).

---

## 11. Task integration contract

| Operation | Contract |
|-----------|----------|
| **Create ref** | Visible task + `canEditTaskDocumentReferences` + `assertWorkspaceDocumentVersionLinkable` (VIEW on doc, version exists, tenant match, lifecycle policy for link — default ACTIVE-only picker) |
| **Persist** | Single transaction: lock document row `FOR UPDATE`; insert ref with **exact `versionId`** from client/server confirmation payload |
| **List** | Batch load refs → batch resolve presentations (document metadata + **version label** when authorized) |
| **Remove** | `deleteMany` on ref id; audit `versionId` (and documentId in audit only if needed for support — avoid filename) |
| **Primary DOCUMENT context** | Remains separate; prevent duplicate if same document already primary |
| **DTO** | Extend `TaskDocumentReferenceDto` with `versionId`, `versionNumber?`, `lifecycle?`, `access: readable \| restricted \| lifecycle_unavailable` |

---

## 12. Requirement integration contract

| Operation | Contract |
|-----------|----------|
| **Who may link** | `requirements.manage` (or create+manage rules mirroring task pattern — **manage** for ACTIVE edits) |
| **When** | **DRAFT:** full edit. **ACTIVE:** allow add/remove refs if product accepts mutable **relationship** while campaign live (align with title/description mutability); **CLOSED/CANCELLED:** read-only |
| **Recipient ACK** | Unchanged in W07 unless scoped: document refs are **management** surface; personal execution page shows linked docs when authorized |
| **DTO** | New section on `RequirementDetailWorkspace` + optional personal execution list |

Do **not** conflate `RequirementRecipient` ACK with document version ACK without explicit W07+ scope.

---

## 13. Reference creation authorization

**All required (AND):**

1. Server `tenantId` from session — never trust client tenant.
2. Domain permission to **mutate** Task/Requirement references.
3. Domain visibility of Task/Requirement (existing gates).
4. **`canWorkspaceView`** on target **document** (version’s parent document) at link time.
5. Tenant **`workspace.view`** capability.

**Explicit non-rules:**

- Task/Requirement permission **does not** grant Workspace access.
- Workspace VIEW **does not** grant Task/Requirement edit.
- **No admin ACL bypass** (`pureWorkspaceAclGrantsResourceAccess` remains false).
- **No creator bypass** beyond existing task ref rules.

---

## 14. Reference resolution authorization

**Durable reference does not grant access.**

| Actor can view domain? | Actor can VIEW workspace doc/version? | UI/API |
|------------------------|----------------------------------------|--------|
| Yes | Yes | Show title, version badge, lifecycle badge, authorized open/download |
| Yes | No | **Restricted placeholder** — e.g. “Referenziertes Dokument nicht verfügbar” — **no** title, filename, path, creator, MIME, size, version number if sensitive |
| No | — | Domain 404/forbidden (existing zero disclosure) |

Use **`resolveWorkspaceDocumentPresentations`** / version-aware extension; never expose denial reason (ACL vs trash vs tenant).

Open/download: existing version download/preview services with explicit `versionId`.

---

## 15. ACL-change semantics

No ACL snapshot on reference row. If user loses Workspace VIEW after linking:

- Reference **remains** attached structurally.
- Resolution uses **current** ACL only.
- No cached title/path/storage locator on reference row for bypass.

---

## 16. Lifecycle semantics

| Lifecycle | Reference row | Resolution |
|-----------|---------------|------------|
| **ACTIVE** | Valid | Normal metadata + open |
| **ARCHIVED** | Valid | Authorized users: resolve with archived context; picker may exclude by default |
| **TRASHED** | Valid | Policy: authorized VIEW may open from trash context **or** lifecycle-unavailable for standard task/requirement viewers — **W07-05 must pick one product rule**; default align with `document-version-access-service` (trash allowed when VIEW holds) |
| **Permanent delete** | **Blocked** while refs exist | W06 `RESOURCE_REFERENCED`; refs must not silently disappear |

Link picker default: **ACTIVE only** (today’s `canReadDocumentRow` behaviour).

---

## 17. Exact-version semantics

Proof obligation for W07 tests:

1. Link task to **V1** (`versionId = v1`).
2. Upload **V2**, **V3** — task still **v1**.
3. Restore V1 content as **V4** — task still **v1**.
4. Replace reference → explicit user action creating new row or update policy.

**Version selection race:** Client sends chosen `versionId`; server re-validates version belongs to document + tenant in same transaction as insert (after document `FOR UPDATE`). Reject if version not found or superseded row invalid.

---

## 18. Reference mutability

| Layer | Mutable? |
|-------|----------|
| **Target version id** | **Immutable** once stored (never auto-rewrite) |
| **Relationship row** | **Mutable** while domain editable — add/remove/replace link |
| **Acknowledgement (future)** | Immutable tuple pointing at **specific versionId** |

---

## 19. Acknowledgement identity readiness

When document acknowledgement is added (future programme):

```
(tenantId, requirementId | taskId, workspaceDocumentVersionId, actorPersonId | actorUserId, acknowledgedAt)
```

- Must **never** resolve “latest document version”.
- May coexist with 06G **campaign ACK** on `RequirementRecipient` — separate concerns until product merges them explicitly.

W05 `version-reference.ts` already documents this boundary.

---

## 20. Existing-data migration analysis

**Current rows:** `TaskDocumentReference { documentId, createdAt }` only.

| Class | Criteria |
|-------|----------|
| **A — Deterministic** | Document has **exactly one** version ever → map to that `version.id` |
| **B — Ambiguous** | Multiple versions where `createdAt` of ref **>** first version — intent was “document at link time” but **currentVersion at T** not stored |
| **C — Legacy/non-Workspace** | **None** — all FKs are WorkspaceDocument |
| **D — Orphaned** | Should not exist while RESTRICT holds |

**Strategy (W07 implementation, not 07D):**

1. Schema add `workspaceDocumentVersionId` nullable → backfill A → flag B for manual review or heuristic (max version with `version.createdAt <= ref.createdAt`) **only with explicit product sign-off**.
2. **Never silent map all B → `currentVersionId`** without audit.

**Live DB inspection:** **Not required for 07D** — schema/code semantics sufficient.

---

## 21. Task UX

| Element | Recommendation |
|---------|----------------|
| Placement | Keep `TaskDocumentReferencesSection` below context, above activity |
| Add | “Dokument hinzufügen” → shared picker |
| Display | Document name + **Version n** + lifecycle badge when readable |
| Actions | Open (internal link with `version=`), download, remove |
| Inaccessible | Same as today: restricted label, no link |
| Ordering | `createdAt asc` (current) |
| Mobile | Stable ids in DTO; actions as URLs |

---

## 22. Requirement UX

| Element | Recommendation |
|---------|----------------|
| Placement | New block on `RequirementDetailWorkspace` (management) — after description, before audience/matrix |
| DRAFT | Link/unlink like task |
| ACTIVE | Link/unlink if policy confirms; show refs on personal execution when authorized |
| Display | Mirror task reference row pattern |
| ACK UI | Do not imply ACK covers linked doc until explicit future feature |

---

## 23. Picker / version-selection UX

1. Search/select **document** (ACTIVE, ACL-filtered — existing search).
2. On select: show **current version** default with explicit **“Version X · date · filename”**.
3. **“Andere Version wählen”** → version list from `getDocumentVersions` (authorized).
4. Confirm saves **`versionId`**, not just document id.
5. Copy: **“Verknüpft mit Version 4 von …”** not merely “Dokument X”.

Prevent ambiguous strings in list previews and notifications.

---

## 24. Zero-disclosure contract

Surfaces requiring restricted handling:

- Task detail list, Requirement detail, management list previews (if any ref snippet)
- Picker/autocomplete (must not include unreadable docs — already filtered)
- Direct API / server actions returning ref DTOs
- Counts of inaccessible refs (**count allowed**, no metadata)
- Error messages (generic link failure)
- Deletion blocker preview (may cite **task/requirement ids**, not restricted doc titles)
- Historical/archived/trash resolution

**Forbidden leak for unauthorized workspace VIEW:** title, filename, version filename, folder path, creator, size, MIME, lifecycle detail, timestamps that identify content.

---

## 25. Tenant-isolation contract

- FK `tenantId` on reference tables matches parent + version.tenantId validated in service.
- Picker queries scoped to `ctx.tenantId`.
- Cross-tenant version id → treat as not found / validation error.
- Resolver batch queries include tenant predicate.

---

## 26. Concurrency contract

| Scenario | Contract |
|----------|----------|
| Create ref vs permanent delete | Document `FOR UPDATE` ordering: link tx and delete tx serialize; RESTRICT backstop |
| Replace vs delete | Unlink removes blocker; delete may proceed if last ref |
| Remove vs delete | Same |
| New version vs create ref | User-selected `versionId` validated inside lock; no read-then-write of `currentVersionId` alone |

---

## 27. Deletion-blocker integration

**Smallest scalable contract:**

- Keep **`getWorkspaceDocumentDeletionBlockers(client, tenantId, documentId)`** as single registry.
- W07 adds queries for requirement refs + evolved task refs (join version → documentId).
- Optional: register `{ kind, countRefs(documentId) }` adapters array — **only if** third module repeats; avoid event framework.

Permanent delete API unchanged: `RESOURCE_REFERENCED` + blocker list.

---

## 28. Query / performance considerations

- Task/Requirement detail: one query refs + one batch version/document presentation (reuse `resolveWorkspaceDocumentPresentations` extended for version).
- Avoid N+1: map by `versionId` → documentId for ACL batch.
- Authorization correctness **over** blind caching of metadata.

---

## 29. Mobile readiness

DTO fields: `referenceId`, `versionId`, `documentId` (only when readable), `access`, `lifecycle`, `versionNumber`, `openUrl`, `downloadUrl` (when allowed).

Platform export: extend `lib/requirements/platform.ts` / future task platform mirror in W07-03.

---

## 30. Universal Search readiness

Expose stable relationships:

- `Task` → `[workspaceDocumentVersionId…]`
- `Requirement` → `[workspaceDocumentVersionId…]`

Search indexer must re-check Workspace ACL; W07 does not build index.

---

## 31. W08 boundary

W07 **does not** implement retention purge, legal hold, malware scanning, governance audit programme, orphan cleanup jobs, Swiss-hosting portability.

W07 may emit existing audit records (`writeAuditRecord`) on link/unlink.

---

## 32. Explicit exclusions

No W07 implementation of: schema/migrations in 07D, acknowledgement workflow (unless later scoped), approvals, signatures, external sharing, retention engine, Mobile app, Universal Search, AI search, Performance programme, Google Drive migration.

---

## 33. Proposed implementation packages

| Package | Scope |
|---------|--------|
| **W07-01** | Schema: evolved task ref + requirement ref; tenant FKs; RESTRICT; migration + backfill plan |
| **W07-02** | Task service/actions/DTOs; deletion blockers; concurrency lock |
| **W07-03** | Requirement service/actions/UI block |
| **W07-04** | Shared picker + version selector UX component |
| **W07-05** | Authorization resolver, lifecycle gates, zero-disclosure tests |
| **W07-06** | Acknowledgement identity types + blocker kinds + audit fields seam |
| **W07-07** | Regression, security sentinels, benchmark acceptance |

Refined from 06D/06G/W06 test patterns (`aufgaben-06d-security-sentinels`, `w06-sentinel`).

---

## 34. Acceptance gates

- [ ] All business refs store **`WorkspaceDocumentVersion.id`**
- [ ] No automatic latest upgrade
- [ ] Dual authorization tests pass
- [ ] Zero-disclosure sentinels extended
- [ ] Permanent delete blocked with refs
- [ ] Migration classification documented for production
- [ ] Mobile DTO contract documented
- [ ] 06G Requirement behaviour unchanged except new optional refs section

---

## 35. Risks / open questions

1. **Ambiguous 06D backfill** for multi-version documents — need product decision on heuristic vs manual.
2. **TRASHED resolution UX** — open from trash vs unavailable for task viewers.
3. **ACTIVE requirement** — allow ref mutation while recipients ACK campaign-level only?
4. **Primary DOCUMENT context** — upgrade to version-pinned context or leave document-level?
5. **PR #697 merged** vs brief “may be open” — merged; no action.

---

## 36. Recommended W07 scope

Implement **version-pinned supporting references** for Tasks and Requirements, shared picker/resolver, deletion registry extension, and acknowledgement **identity seam** — **without** new attachment subsystem, **without** 06G redesign, **without** W08 governance.

---

## Preflight record (WORKSPACE-07D)

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Repo | Clipse078/sportclubevo-webapp | Match | PASS |
| Branch | STAGE @ SHA | Reset to `1530fea2…` | PASS |
| origin/STAGE | `1530fea2…` | Match | PASS |
| Worktree | clean | clean | PASS |
| PR #698 | MERGED | MERGED | PASS |
| W06 migration | present + checksum | Match | PASS |
| PR #697 | discovery / W06 ancestry | MERGED (note) | PASS* |

*Brief allowed OPEN; repository shows merged 06D — acceptable.
