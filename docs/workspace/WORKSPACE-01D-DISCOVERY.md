# WORKSPACE-01D — Canonical Workspace Domain + Access Discovery

**Status:** Discovery complete — contract finalized (architecture / documentation only)
**Baseline:** `cefbdbe0c9378d6c0417eeffec998cb4f123dea0` (STAGE, PR #690 / AUFGABEN-06G11 merged)
**Branch:** `cursor/workspace-01d-domain-access-discovery`
**Date:** 2026-09-22
**Closure:** WORKSPACE-01D-A1 (approved audience-model + programme clarifications)

This document is the implementation contract input for **WORKSPACE-01**. No product ACL implementation is included in 01D or 01D-A1.

---

## Executive summary

The repository already has a **solid document/folder/version/storage foundation**, but **resource-level visibility and inheritance are not implemented**. Authorization today is **tenant-wide RBAC** (`workspace.view` / `workspace.manage` / `workspace.delete`) with **no persisted grants** despite Prisma enums (`WorkspaceAccessSubjectType`, `WorkspaceAccessLevel`) and architecture docs referencing `WorkspaceAccessGrant`.

The Aufgaben domain (**TaskVisibilityScope** + **TaskAccessGrant** + `buildTaskReadWhere` / `canReadTask`) is the **canonical SCE pattern to mirror conceptually**, not via foreign keys.

Product direction for new content: **open by default (CLUB / organisation-wide), restrictable by creator** — must **not** broaden any future restricted records; today there are **no restricted records in schema**, but effective access is already “all `workspace.view` holders see all tenant documents.”

**Approved programme model (01D-A1):** WORKSPACE-01 must design resource access for audiences **Organisation / CLUB**, **Org unit**, **Team**, **Role**, and **Specific person**, with **dynamic membership** for org unit / team / role — not a narrow CLUB | ORG_UNIT | SPECIFIC_PEOPLE-only enum decision in 01D.

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
| Org unit audience | **No** |
| Team audience | **No** |
| Role audience | **No** |
| Specific person audience | **No** |
| Multi-subject grants | **No** |
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
| Provider portability | **Architectural requirement:** Workspace business/domain logic must **not** become permanently dependent on Vercel Blob. The storage layer must remain **replaceable** so SCE can later move binary storage toward planned **Swiss-hosted** infrastructure without redesigning Workspace ACL or domain semantics. |

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
| Visibility / audience (original 01D hypothesis) | Early mirror of Tasks: **CLUB / ORG_UNIT / SPECIFIC_PEOPLE** — **superseded** by approved SCE programme model (see §8) |
| Grant table shape | **New** grant model (folder and/or document resourceType + resourceId) — **do not FK to Task**; exact subject types and visibility representation **designed in WORKSPACE-01** |
| Query predicates | Mirror `buildTaskReadWhere` → `buildWorkspaceReadWhere` with hierarchy |
| Creator always read? | **Explicit product rule needed** — Tasks: creator always reads; recommend Workspace creator **retains MANAGE** on resource until transfer |
| Admin bypass | Tasks: manage does not bypass ASSIGNEES_ONLY; recommend same for restricted Workspace resources |

**Do not couple:** Task grants, Task visibility fields, Requirement recipients.

---

## 8. Target access model (approved SCE programme contract)

WORKSPACE-01 must **investigate and design** the complete approved SCE Workspace **audience** model. This is a **product requirement** for the Workspace programme.

### 8.1 Original discovery hypothesis (superseded as definitive model)

Initial discovery compared Tasks and suggested roughly **CLUB | ORG_UNIT | SPECIFIC_PEOPLE**. That remains useful context but is **not** the approved implementation contract.

### 8.2 Approved audience capabilities (WORKSPACE-01 must design)

| Audience capability | Meaning (conceptual) |
|---------------------|----------------------|
| **Organisation / CLUB** | Tenant-wide boundary aligned with holders of tenant `workspace.view` **and** resource effective organisation-wide access |
| **Org unit** | Members of a canonical organisational unit (e.g. Vorstand) |
| **Team** | Members of a canonical SCE team (e.g. Team F2) |
| **Role** | Holders of a canonical **organisational / business role** (e.g. Trainer) — **not** a tenant RBAC permission key |
| **Specific person** | Explicit grant to an individual — canonical identity (**Person vs User**) decided in WORKSPACE-01 |

**Do not** prematurely decide that all five concepts must appear as five visibility enum values. WORKSPACE-01 selects the cleanest canonical representation.

### 8.3 Resource visibility / boundary vs access subject / audience

Distinguish two layers:

| Layer | Question |
|-------|----------|
| **A. Resource visibility / boundary** | What is the effective access envelope of this folder or document (including inheritance)? |
| **B. Access subject / audience** | Who is included via grants (org unit, team, role, specific person, organisation)? |

Implementation may converge on a model conceptually similar to:

```
resource
  → visibility / access policy
  → one or more grants
  → subject type
  → subject id
  → access level (VIEW | EDIT | MANAGE)
```

WORKSPACE-01 determines the **canonical** schema and naming; 01D does **not** lock Prisma shape.

### 8.4 Dynamic membership (required contract)

Org unit, team, and role audiences must resolve through **current canonical SCE membership / relationship data** where appropriate.

**We do not** copy all current users into static Workspace grants when access is granted to an org unit, team, or role.

| Example | Behaviour |
|---------|-----------|
| Folder *Trainer → Saison 2026/27*, audience **Trainer** role | A newly eligible trainer gains effective access via canonical role relationship; someone who ceases to satisfy the role loses effective access |
| Folder *F2 → Trainerunterlagen*, audience **Team F2** | Use canonical team membership — not a manually maintained list of every trainer as independent person grants |

All resolution remains **tenant-scoped**. **Do not implement** membership resolution in 01D. WORKSPACE-01 must inspect exact canonical Team / Role / Org membership models before selecting grant schema.

### 8.5 Specific person — Person vs User (deferred design decision)

Early discovery noted TaskAccessGrant uses **USER**. That is **not** sufficient justification for Workspace.

WORKSPACE-01 must **deliberately** determine canonical identity for **specific person** access by inspecting:

- `Person`, `User`, `Person.userId`
- Tenant membership
- People & Access architecture
- Team / org membership and role assignment

**Questions WORKSPACE-01 must resolve:**

- Is Workspace access granted to a **Person** or authenticated **User**?
- Can a Person **without** User login be selected?
- If yes, when does access become **usable**?
- What happens when a Person is later linked to a User?
- What identity survives account replacement / linking?
- Alignment with People & Access and future **Mobile** consumption?

**Do not** simply copy `TaskAccessGrant.USER` without analysis.

### 8.6 Role access — tenant RBAC vs organisational role audience

WORKSPACE-01 must distinguish:

| Type | Example | Must not conflate |
|------|---------|-------------------|
| **A. Tenant RBAC capability** | `workspace.view`, `workspace.manage` | Technical permission keys |
| **B. Workspace audience from organisational role** | All active Trainers of Team F2; a defined club role | Business role / person assignment |

A role-based resource audience must **not** mean “everyone possessing some technical permission key.” Determine canonical SCE role / person assignment. Avoid accidental security coupling between business roles and technical permissions.

### 8.7 Team access

WORKSPACE-01 must inspect **canonical Team relationships**. Determine representation for audiences such as **Team F2** or **Trainers of F2**. **Do not** invent a parallel Workspace team-membership table. Reuse canonical SCE Team / member / role relationships through **dynamic authorization** where appropriate.

### 8.8 Access levels (VIEW / EDIT / MANAGE)

Retain target **resource** access levels: **VIEW**, **EDIT**, **MANAGE** — separate from tenant capabilities.

Effective authorization requires **both**:

1. Tenant / domain capability (e.g. `workspace.view`), **and**
2. Resource-level **effective** access (including inheritance and dynamic audience resolution).

Do not implement in 01D.

### 8.9 Admin bypass

Retain discovery recommendation: **no silent restricted-resource bypass** for Super Admin, Club Admin, `workspace.manage`, `people.manage`, or other broad tenant roles.

If SCE later needs break-glass access, it must be **explicit**, **exceptional**, **audited**, and **separately designed**. Do not implement break-glass in 01D.

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
| Dynamic audience subset | When parent audience is **Team F2** and child is **specific F2 trainers**, **valid** if child effective audience ⊆ parent effective audience. Parent **Team F2**, child **CLUB** → **invalid**. WORKSPACE-01 must define subset validation when audiences are **dynamic** (team/role/org membership changes over time) |
| Explicit vs inherited | Persist policy + optional `inheritAccessFromParent`; API must eventually explain **explicit access**, **effective access**, **inherited access**, **`inheritedFrom`** |

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
| Versioning exists | **Yes** — `WorkspaceDocumentVersion` is **append-only / immutable**; restore creates another version |
| Canonical identity | **`WorkspaceDocumentVersion.id`** — stable immutable reference |
| WORKSPACE-01 constraint | **Must not** redesign this working version architecture unnecessarily |
| WORKSPACE-05 | May harden / version-proof for acknowledgement evidence |
| Requirement reference | **Not in schema today** — future integration targets **immutable version identity**, not merely mutable `WorkspaceDocument.id` |
| Integration boundary | Requirement auth stays on **RequirementRecipient**; document auth on **Workspace**; no Requirement changes in 01D |

Future reference target: **`WorkspaceDocumentVersion.id`** (+ document id for context).

---

## 11A. Google Drive migration boundary (programme decision)

FC Allschwil currently uses **Google Drive**. Existing Drive content may remain the **historical / archive source** during initial SCE Workspace rollout. Migrating historical Drive content is **not a blocker** for establishing the canonical SCE Workspace.

Future migration / import capability must preserve where possible:

- Folder hierarchy
- Document metadata
- Timestamps / provenance where available
- File versions where available / meaningful
- Access classification decisions
- Migration auditability

**Do not** build Google Drive import in WORKSPACE-01D. **Do not** couple the canonical Workspace model to Google Drive (**WORKSPACE-08**).

---

## 11B. Access explanation / provenance (future requirement)

Future Workspace authorization must be **explainable**. The platform should eventually answer:

**Why can this user access this resource?**

Examples: whole organisation; member of Org Unit Vorstand; member of Team F2; active Trainer role; specifically granted access; inherited from parent folder X.

**Why can this user EDIT / MANAGE rather than only VIEW?**

Important for security debugging, access-management UX, audit, future Mobile, and support.

WORKSPACE-01 should ensure the domain model **can support** this; UX lands in **WORKSPACE-03**. Query-time enforcement in **WORKSPACE-02**.

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
| Materialized effective ACL | 10k+ documents, heavy grant fan-out — **later** (WORKSPACE-09 scale hardening) |

Avoid N+1 per row: batch ancestry resolution.

---

## 15. Migration / backfill

**Current data:** All documents/folders visible to all `workspace.view` holders.

**Safe strategy:**

1. Add columns/tables with **legacy effective = CLUB** (matches today’s practical effect for viewers) **OR** explicit `visibilityScope = CLUB` on all existing rows.
2. **Do not** run a migration that sets restricted resources to CLUB — **none exist in DB**.
3. Flag `accessModelVersion = 1` on tenant or resource for future diagnostics.
4. New resources after cutover: default **CLUB / organisation-wide** per programme principle; creator can restrict immediately.
5. **Do not broaden** who receives `workspace.view` — migration changes **resource-policy representation**, not tenant RBAC assignment.

**Broadening risk:** Low for stored ACL (greenfield); **medium** for user expectations if some clubs relied on “only admins have workspace.view” — that remains tenant RBAC, unchanged.

---

## 16. Security risks (top)

1. **S1:** Tenant RBAC-only — any `workspace.view` user reads all documents.
2. **S2:** Persisted `storageUrl` — potential direct blob access if URL leaks.
3. **S3:** Folder/document move with no ACL validation (future widening vector once ACL exists).
4. **S4:** Architecture doc “private by default” vs programme “open by default” — documentation drift.
5. **S5:** Super Admin `workspace.delete` is tenant operational — must not imply read bypass on restricted content (align with Tasks).

---

## 17. Workspace programme roadmap (approved sequence)

Planning contract only — **do not start** these packages during 01D / 01D-A1.

| Pkg | Focus |
|-----|--------|
| **WORKSPACE-01** | Canonical folder / document / version domain + access policy / grant schema + inheritance foundations + safe legacy backfill |
| **WORKSPACE-02** | Authorization + dynamic audience resolution + secure query / list / search enforcement |
| **WORKSPACE-03** | Access-management UX + effective / inherited access explanation |
| **WORKSPACE-04** | Storage / upload / download / preview security + storage-provider abstraction / hardening |
| **WORKSPACE-05** | Document-version hardening + immutable acknowledgement readiness |
| **WORKSPACE-06** | Document collaboration + links + workflow / lifecycle |
| **WORKSPACE-07** | Requirements / Tasks ↔ immutable `WorkspaceDocumentVersion` integration |
| **WORKSPACE-08** | Google Drive migration / import capability + migration tooling |
| **WORKSPACE-09** | Audit + governance + scale + Swiss-hosting portability hardening |
| **WORKSPACE-10** | Final security / regression / release acceptance |

**Hard milestone:** **DOCUMENT WORKSPACE CLOSED — MOBILE READY**

Defer **WorkspaceContainer** until product requires multi-root navigation (optional sub-milestone).

---

## 18. WORKSPACE-01 implementation contract

### Scope (IN)

- **Design** canonical access policy / grant schema supporting approved audiences: **Organisation / CLUB**, **Org unit**, **Team**, **Role**, **Specific person** — with **dynamic membership** for org unit / team / role subjects.
- **Design** Person vs User for specific-person grants (see §8.5).
- **Design** inheritance + subset validation for dynamic audiences (see §9).
- Prisma implementation of chosen model; migration backfill: existing rows → **CLUB-equivalent effective visibility** (matches today’s practical effect); **no invented historical restrictions**.
- Pure domain services: effective access resolution, validation (no broadening child), move / parent-change validation hooks (enforcement may land in 02).
- Extend `document-access.ts` contract types as needed.
- Tests: inheritance validation, backfill assumptions, no-broadening properties.

### Scope (OUT)

- UI access panels, full route query enforcement, search, storage changes, Requirement integration, Mobile API, Google Drive import, permission sync scripts (unless new keys approved separately), break-glass admin bypass.

### Auth (01 foundation)

- Persistence + domain types; **route enforcement lands in WORKSPACE-02** with **query-time** dynamic audience resolution.

### Default new content

- **CLUB / organisation-wide** visibility for new root resources; creator granted **MANAGE** (recommended).

### Existing content

- **CLUB-equivalent** effective visibility; preserve current behaviour for all `workspace.view` holders.

### Tests

- Schema migration tests; effective-access pure function tests; no broadening property tests.

---

## 18A. Discovery closure checklist (01D-A1)

| Item | Recorded |
|------|----------|
| Current Workspace models | §2 |
| Existing immutable versions | §2, §11 |
| Existing RBAC-only security | §3, §4 |
| Missing resource ACL | §2, §3, §5 |
| CLUB default for new root resources | §9, §18 |
| Safe CLUB-equivalent legacy backfill | §15, §18 |
| Org unit / Team / Role / Specific person audiences | §8 |
| Dynamic membership principle | §8.4 |
| Person-vs-User deferred to WORKSPACE-01 | §8.5 |
| VIEW / EDIT / MANAGE | §8.8 |
| Inheritance; child cannot broaden parent | §9 |
| Move / parent-change security | §9 |
| No silent admin bypass | §8.9 |
| Access explanation / provenance | §11B |
| Query-time enforcement (future) | §10, §11B |
| Storage URL concern; provider portability | §6 |
| Immutable `WorkspaceDocumentVersion.id` | §11 |
| Requirement boundary | §11 |
| Google Drive migration boundary | §11A |
| Mobile / client-agnostic domain | §12 |
| Programme roadmap + hard milestone | §17 |

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

Approved SCE audience model (Organisation, Org unit, Team, Role, Specific person), dynamic membership, Person-vs-User analysis, access provenance, storage portability, Google Drive boundary, and programme roadmap are **frozen in this contract**. Next step: **WORKSPACE-01** — canonical Workspace domain + access policy / grants + inheritance foundation (no 01D implementation).
