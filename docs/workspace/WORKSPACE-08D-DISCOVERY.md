# WORKSPACE-08D — Governance, audit, retention, scanning, scale & Swiss-hosting portability discovery

**Status:** Discovery complete — implementation contract for **WORKSPACE-08** (documentation only)  
**Baseline STAGE SHA:** `7987a9650f760085117a261709411bbd19905e44`  
**Branch:** `cursor/workspace-08d-governance-scale-portability-discovery`  
**Date:** 2026-09-23  
**Prerequisites:** WORKSPACE-01–07 merged (PR #700); W07 migration `20260922240000_workspace_07_immutable_document_version_references` (checksum `ff3533efb930a9fca8d674f8e85c028c148621e5187be160e29e4abdcfba9f12`)

**Rule:** This document defines W08. **Do not implement W08 in 08D.**

Companion: `WORKSPACE-08D-BENCHMARK-RECORD.md`

---

## 1. Executive summary

WORKSPACE-01–07 delivered tenant-scoped **resource ACL** (no admin bypass), **private storage**, **immutable versions**, **lifecycle** (ACTIVE / ARCHIVED / TRASHED / permanent delete), **reference-safe deletion** (Tasks + Requirements → exact `WorkspaceDocumentVersion.id`), and **collaboration primitives** (favorites, recents, internal ID links).

**W08 must close the governance gap** before W09 release acceptance:

1. **Durable security/governance audit contract** — distinct from product recents and technical logs; minimal metadata; tenant isolation.
2. **Tamper-evident posture** proportionate to child/family-sensitive multi-tenant SaaS — without over-engineering.
3. **Retention & purge** — user trash retention, optional governance retention, legal/governance **hold seam**; **reference-aware** rules integrated with W07.
4. **Malware / file-safety** — async quarantine scan; **NOT_SCANNED ≠ CLEAN** invariant preserved.
5. **Background jobs** — scan, purge, cleanup retries, large destructive operations.
6. **Scale hardening** — subtree operations, audit growth, ACL/query pressure points.
7. **Storage & residency portability** — complete `WorkspaceStorageProvider` decoupling; Swiss S3-compatible target documented.

**W09** remains final security/regression/release acceptance — not a bucket for unfinished W08 architecture.

---

## 2. Preflight record

| Check | Expected | Actual | Result |
|-------|----------|--------|--------|
| Repo | `Clipse078/sportclubevo-webapp` | Match | PASS |
| Start branch | `STAGE` | `STAGE` (local was at parent `1530fea2…`; hard reset to canonical merge SHA) | PASS |
| Local HEAD | `7987a965…` | `7987a965…` | PASS |
| `origin/STAGE` | `7987a965…` | `7987a965…` | PASS |
| Worktree | clean | clean at branch create | PASS |
| PR #700 | MERGED @ `7987a965…` | MERGED; parents `1530fea2…`, `3cd768bd…` | PASS |
| W07 migration | present + checksum | `20260922240000_workspace_07…` / `ff3533ef…` | PASS |
| PR #699 | may be open | **MERGED** (07D discovery) — closure not required | PASS* |

\*Brief allowed supersede-close of #699; repository shows merged — no action.

**Database safety (08D):** No schema changes, no migrations, no migration commands, no STAGE DB writes, no production access.

---

## 3. W01–W07 foundation map (post-W07)

### 3.1 Access (W01)

| Item | Evidence |
|------|----------|
| Models | `WorkspaceFolder`, `WorkspaceDocument`, `WorkspaceAccessGrant` |
| Levels | VIEW < EDIT < MANAGE (`lib/workspace/access/resource-level.ts`) |
| Audiences | ORGANISATION, ORG_UNIT, TEAM, ROLE (`functionKey`), PERSON |
| Inheritance | `accessInheritanceMode`, folder chain + document folder chain |
| Tenant caps | `workspace.view`, `workspace.manage`, `workspace.delete` — **separate from resource ACL** |
| Admin bypass | **`pureWorkspaceAclGrantsResourceAccess` → always false** (`admin-bypass.ts`) |

### 3.2 Authorization (W02–W03)

| Item | Evidence |
|------|----------|
| Effective access | `effective-access.ts`, `resource-graph.ts` |
| Zero disclosure | Unauthorized → null / 404; `buildWorkspaceReadWhere` |
| Query boundary | ACTIVE docs + non-trashed/non-archived folder rules + authorized ID sets |
| Edit/manage | Tenant `workspace.manage` **and** resource EDIT/MANAGE |
| Permanent delete | Tenant `workspace.delete` **and** resource MANAGE (documents); folder destructive auth in `folder-destructive-authorization.ts` |
| Access management UI | `access-management-service.ts`, grant mutations audited inconsistently (gap → W08) |

### 3.3 Storage (W04)

| Item | Evidence |
|------|----------|
| Interface | `WorkspaceStorageProvider` in `upload-types.ts` |
| Implementation | `VercelBlobWorkspaceStorageProvider` in `upload-storage.ts` |
| Locator | `storage/storage-locator.ts`, canonical key `workspace/tenants/{tenantId}/documents/{documentId}/versions/{versionId}/…` |
| Limits | 100 MiB; MIME allowlist; blocked extensions (`upload-policy.ts`) |
| Scan seam | `content-security-status.ts` — **no DB persistence**; `NOT_SCANNED` default |
| Invariant | `NOT_SCANNED` must never be interpreted as `CLEAN` |

### 3.4 Versions (W05)

| Item | Evidence |
|------|----------|
| Immutable rows | `WorkspaceDocumentVersion`; CURRENT / SUPERSEDED |
| Restore | New version with provenance in `changeNote` |
| Reference shape | `WorkspaceDocumentVersionRef { tenantId, documentId, versionId }` |
| Access | Historical download gated by document lifecycle + VIEW (`document-version-access-service.ts`) |

### 3.5 Lifecycle (W06)

| Item | Evidence |
|------|----------|
| Document states | `WorkspaceDocumentStatus`: ACTIVE, ARCHIVED, TRASHED |
| Folder signals | `archivedAt`, `trashedAt` (no document-style enum) |
| Trash / restore | `document-trash-service.ts`, `folder-lifecycle-service.ts` |
| Permanent delete | `document-delete-service.ts`, `folder-delete-service.ts` — **atomic subtree**, blob cleanup best-effort |
| Collaboration | `WorkspaceFavorite`, `WorkspaceRecentAccess` — **product activity**, not security audit |
| Deletion blockers | `deletion/deletion-blockers.ts` |
| Internal links | `internal-links.ts`, `document-link-access.ts` |

### 3.6 References (W07)

| Item | Evidence |
|------|----------|
| Task refs | `TaskDocumentReference` + `workspaceDocumentVersionId`, `versionBinding` |
| Requirement refs | `RequirementWorkspaceDocumentVersionReference` |
| FK semantics | Version/document **ON DELETE RESTRICT** |
| Services | `task-document-reference-service.ts`, `requirement-document-reference-service.ts` |
| Audit | `TASK_DOCUMENT_*` / `REQUIREMENT_DOCUMENT_*` on **`AuditLog`** (moduleKey tasks/requirements) — stores version id, not filenames |
| Acknowledgement seam | `acknowledgement/document-version-acknowledgement-identity.ts` — **identity only** |

### 3.7 Audit & async today

| Layer | Current state |
|-------|----------------|
| Security audit (partial) | `writeAuditRecord` — workspace upload/archive/trash/version events; transactional with mutation |
| Security audit (partial) | W07 link/unlink via domain services |
| Best-effort audit | `logAction` / `audit-log.ts` governance wrapper — **failure does not fail mutation** |
| Product activity | `WorkspaceRecentAccess`, favorites |
| Technical logs | `console.error`, application errors — not audit |
| Jobs | Vercel crons for tasks/billing/SFV — **no workspace cron** |
| TODO | `audit-log.ts` — async queue (Inngest/BullMQ) not implemented |

### 3.8 Provider leakage (summary)

| Area | Classification |
|------|----------------|
| `WorkspaceStorageProvider` interface | PORTABLE |
| Default export from `upload-storage.ts` | PARTIALLY_PORTABLE |
| `provider: "vercel-blob"` in locator | PROVIDER_LOCKED |
| Direct `@vercel/blob` in domain path | PROVIDER_LOCKED |
| Optional `storageUrl` on version row | PARTIALLY_PORTABLE (signed URL risk) |

---

## 4. Audit trail discovery

### 4.1 Three layers (non-interchangeable)

| Layer | Purpose | Examples | Storage today |
|-------|---------|----------|---------------|
| **A. Security / governance audit** | Accountability, compliance, investigations | Version uploaded; ACL grant changed; trash/restore/permanent delete; download denied; break-glass; scan result; hold applied | `AuditLog` (+ proposed `WorkspaceAuditEvent` enrichment) |
| **B. Product activity** | UX velocity | Recent documents; favorites | `WorkspaceRecentAccess`, `WorkspaceFavorite` |
| **C. Technical logging** | Ops/debug | Provider 5xx; stack traces; scan worker errors | Log drain / APM — **not** tenant audit |

### 4.2 W08 security audit contract (minimum)

**Actions requiring durable audit (transactional `writeAuditRecord` where paired with mutation):**

- Document/folder: create, rename, move, archive, trash, restore (from archive/trash), permanent delete (success **and** blocked attempt with reason)
- Version: created (upload/restore), superseded (implicit in upload audit)
- ACL: grant create/update/delete; inheritance mode change
- Access: download/preview **denied** at security boundary (sampled or full — **full for DENIED** recommended)
- W07 refs: link/unlink (already — align moduleKey vocabulary)
- Governance: retention policy change; hold apply/release; break-glass session start/end
- Scan: state transition to INFECTED; admin override on quarantined object

**Actor identity:**

| Field | Rule |
|-------|------|
| `actorUserId` | Primary — `User.id` for authenticated actions |
| `actorPersonId` | Optional in `metadataJson` when action is on behalf of / tied to `Person` (future acknowledgement) |
| `effectiveUserId` | When impersonation/delegation exists — already supported in `buildAuditData` |
| Service/system | `actorUserId` null + `metadataJson.source = "system"` for cron jobs |

**Resource identity:**

| Field | Rule |
|-------|------|
| `tenantId` | **Required** for all workspace governance events |
| `entityType` / `entityId` | Primary resource (document/folder/grant/policy) |
| `workspaceDocumentVersionId` | When action is version-specific |
| `documentId` | When folder-level but version relevant |

**Other fields:**

| Field | Rule |
|-------|------|
| `action` | Canonical string enum document (W08-01) — no ad-hoc literals long-term |
| `outcome` | SUCCESS \| DENIED \| FAILURE in `metadataJson` |
| `reason` | Required for DENIED, break-glass, governance override |
| `correlationId` | Request ID from middleware when present |
| `source` | `web`, `api`, `cron`, `worker` |
| `beforeJson` / `afterJson` | Minimal diff — ACL grant level/subject ids; **never** document bytes, storage keys, signed URLs |
| IP / device | **Default: omit**; optional tenant-configured retention for security investigations — hash or truncate if stored |
| Content | **Never** file contents; filenames only when necessary for admin UX (prefer ids) |

**Retention:**

| Audit type | Suggested default |
|------------|-------------------|
| Workspace security audit | **7 years** platform default (configurable); align with Swiss association record-keeping norms — legal review out of scope |
| Product recents | 90-day rolling cap (existing behaviour target) |
| Technical logs | 30–90 days per ops policy |

**Read authorization:**

| Reader | Rule |
|--------|------|
| Tenant user | New permission **`workspace.audit.view`** — explicit grant, not `workspace.manage` |
| Platform operator | Separate break-glass / support tooling — **not** implicit super-admin read of all tenants |
| Tenant isolation | Queries always `tenantId` scoped |

**Mutability:**

| Rule |
|------|
| Application **must not** expose update/delete on audit rows |
| DB role separation (app role: INSERT-only on audit table) — **ADAPT** for W08 (Phase 1 app discipline + tests; Phase 2 DB policy) |
| Optional export to WORM object storage — W08-06 seam |

---

## 5. Tamper resistance

| Term | SCE meaning |
|------|-------------|
| **Tamper-evident** | Unauthorized change/deletion would be detectable (hash chain, WORM export, integrity monitoring) |
| **Tamper-resistant** | Practical barriers: append-only API, DB permissions, separated export sink |
| **Immutable** | Strong cryptographic/legal immutability (Object Lock compliance mode) |

**Options evaluated:**

| Option | Fit for SCE |
|--------|-------------|
| A. Append-only relational table | **ADOPT** — baseline |
| B. DB permissions (INSERT-only app role) | **ADAPT** — W08-01 tests + migration for role doc; enforce when ops ready |
| C. Hash chaining per tenant | **DEFER** — enterprise tier |
| D. External append-only sink | **ADAPT** — optional nightly export W08-06 |
| E. Object-storage WORM archive | **ADAPT** — audit export bucket in Swiss SOS |
| F. Hybrid A+B+D | **RECOMMEND** for W08 exit |

**Recommendation:** W08 delivers **tamper-resistant** (append-only + transactional integrity + no app-level mutation API). Document path to **tamper-evident** export for customers who need proof. Do not claim **immutable** without WORM export enabled.

---

## 6. Governance / break-glass

**Invariant preserved:** No broad admin ACL bypass (W01–W07).

**Need:** Exceptional operations — tenant recovery, legal request, security incident, orphaned restricted content, departed tenant admin — require **explicit** mechanism.

**Recommended contract (`workspace.break_glass` or `workspace.governance.break_glass`):**

| Requirement | Detail |
|-------------|--------|
| Permission | Dedicated technical permission — **not** `workspace.manage` or club admin role |
| User action | Explicit UI/API invocation — two-step confirm |
| Reason | Mandatory text (min length) |
| Time limit | Session TTL (e.g. 1h) renewable with re-audit |
| Audit | START / END / each privileged read or mutation |
| Scope | **Single tenant**; optional single resource scope |
| Dual approval | **DEFER** unless enterprise customer — document hook |
| UI | High-visibility banner for actor |
| Zero disclosure | Break-glass **does not** disable ACL checks by default — **elevates** to allow specific governed actions (e.g. read quarantined metadata, export audit) |

**REJECT:** “Admin can always see everything.”

---

## 7. Retention model

### 7.1 Three retention classes

| Class | Driver | W08 behaviour |
|-------|--------|---------------|
| **User trash retention** | Mistake recovery | Timer on `trashedAt`; auto-purge job moves to permanent delete pipeline |
| **Governance retention** | Club policy / statute | Optional minimum retain duration on document/version |
| **Legal / governance hold** | Incident / legal | Blocks purge regardless of trash timer |

### 7.2 Defaults (grassroots sports clubs)

| Setting | Default |
|---------|---------|
| Trash retention | **60 days** (tenant override 30–180) |
| Auto-purge | Enabled for trash **without** blockers/holds |
| Document retention policies | **Off** by default; enable per tenant |
| Version retention | Subordinate to document; no independent version purge in W08 |

### 7.3 Lifecycle beyond W06

| State | W08 addition |
|-------|--------------|
| TRASHED | `purgeEligibleAt` computed = `trashedAt + retention` |
| ARCHIVED | No auto-delete unless governance policy |
| Permanent delete | Storage cleanup retry queue |

**Configuration boundary:** Platform max/min; tenant admin configures within bounds; **no** per-user legal hold (use governance hold on resources).

---

## 8. Reference-aware retention (W07 integration)

**Invariants:**

- References **never** silently retarget to latest.
- No referenced **immutable evidence** may disappear because a generic trash timer fires.

**Rules:**

| Scenario | Rule |
|----------|------|
| Task/Requirement exact version ref | **Blocks permanent delete** (existing RESTRICT + blockers) |
| Trash timer expires | **Skip purge** if blockers exist; surface admin “referenced trash” report |
| ARCHIVED / TRASHED document | **Structurally referenceable** for authorized domain readers; resolver applies lifecycle + dual auth |
| Closed Task/Requirement | Ref remains — purge still blocked until unlink or governance decision |
| Legal hold | Supersedes trash timer |
| Tenant deletion | Separate programme — W08 defines **export + hold check** seam |

**Future acknowledgement:** Retention must preserve `WorkspaceDocumentVersion.id` for proof queries even if document is archived (not trashed/deleted).

---

## 9. Acknowledgement governance readiness

W07 identity type: `WorkspaceDocumentVersionAcknowledgementIdentity` — `tenantId`, `workspaceDocumentVersionId`, `actorUserId`/`actorPersonId`, `acknowledgedAt`, optional `taskId`/`requirementId`.

**W08 must preserve for future workflow:**

- Audit event template: `REQUIREMENT_ACKNOWLEDGED` (future) must cite **version id**, not `currentVersionId`.
- Retention/hold: acknowledged version **cannot** be purged while proof obligation active.
- **Do not implement** acknowledgement workflow in W08.

---

## 10. Malware / file-safety architecture

**Current:** Extension/MIME gate only; `NOT_SCANNED` default; Communication module has separate `scanStatus` — do not conflate.

**Recommended:** **Pattern C** — private upload → persist version → **QUARANTINED/PENDING** → async scan → **CLEAN** | **INFECTED** | **SCAN_FAILED**.

| Alternative | Verdict |
|-------------|---------|
| A. Sync scan before accept | **REJECT** for 100 MiB on serverless latency |
| B. Async quarantine | **ADOPT** |
| D. External scanning API | **ADAPT** — evaluate vs self-hosted |
| E. ClamAV-compatible worker | **ADOPT** as default implementation option |
| F. Provider-native | **DIFFER** — Vercel Blob has no first-class AV; stay provider-agnostic |

**Considerations:**

| Topic | Policy |
|-------|--------|
| Upload latency | Accept after blob + DB version row; scan async |
| Scanner outage | Remain PENDING/QUARANTINED — **fail closed** for download/preview except uploader **optional** narrow exception (config off by default) |
| False positive | Admin mark + re-scan workflow; audit |
| Encrypted/password PDF | **UNSCANNABLE** → treat as **SCAN_FAILED** or restricted — not CLEAN |
| ZIP bombs | Size/time limits in worker; max extract depth 0 (scan container only) |
| MIME mismatch | Log + SCAN_FAILED or BLOCKED |
| Download before scan | **Block** except NOT_SCANNED legacy (existing W04) transitions to blocked when scan enabled per tenant flag |

**Critical invariant:** UNKNOWN / NOT_SCANNED / FAILED / PENDING **never** represented as CLEAN in UI or API.

---

## 11. File processing state machine

**Domain choice:** **`WorkspaceDocumentVersion`** — scanning is property of **immutable blob identity**, not mutable document row.

**Proposed states (canonical names — W08-04):**

| State | Meaning |
|-------|---------|
| `NOT_SCANNED` | Legacy / pre-policy uploads |
| `PENDING` | Accepted, queued for scan |
| `SCANNING` | Worker claimed job |
| `CLEAN` | Passed |
| `INFECTED` | Malware detected |
| `SCAN_FAILED` | Timeout, engine error, unscannable |
| `BLOCKED` | Policy block (extension override attempt) |

Optional dedicated `WorkspaceObjectProcessingJob` row for worker idempotency (see §26).

**Migration:** Add column(s) on `WorkspaceDocumentVersion` **or** side table 1:1 — prefer **side table** if scan metadata churn should not touch immutable version display queries.

---

## 12. Download / preview safety

| Scan state | Download | Preview |
|------------|----------|---------|
| CLEAN | Allowed (VIEW) | Allowed |
| NOT_SCANNED | Allowed (W04 legacy) until tenant enables enforcement | Same |
| PENDING / SCANNING | **Deny** (config: uploader-only optional) | Deny |
| SCAN_FAILED | Deny | Deny |
| INFECTED | Deny | Deny |
| BLOCKED | Deny | Deny |

**Roles:** Admin does **not** auto-bypass; break-glass + audit for forensic export of infected object (discouraged; prefer vendor quarantine).

**Infected object retention:** Keep blob in private quarantine prefix **7 days** then delete with audit — configurable.

**Attachment-only download:** Content-Disposition attachment for risky MIME types (existing pattern extend).

---

## 13. Background job architecture

**Current:** Vercel cron HTTP routes; Prisma transactions; **no** durable workspace job table.

**W08 needs:** scan worker dispatch, trash purge, storage delete retry, retention evaluation, audit export, large subtree delete.

**Recommended model (W08-05):**

| Component | Choice |
|-----------|--------|
| Queue | **Postgres `WorkspaceBackgroundJob`** table — tenant-scoped, type, payload JSON, status, attempts, `runAfter` |
| Dispatcher | Vercel cron every 1–5 min + claim with `FOR UPDATE SKIP LOCKED` |
| Semantics | **At-least-once**; idempotent handlers |
| DLQ | `status = DEAD` + alert metric |
| Long work | Chunked subtree jobs with progress JSON |
| Abstraction | `WorkspaceBackgroundJobQueue` interface — default DB implementation |

**Compare:**

| Option | Verdict |
|--------|---------|
| Managed SQS/Inngest | **ADAPT** later if DB queue insufficient |
| Pure cron without job table | **REJECT** — no retry state |

**Vercel limits:** 10–60s route — subtree > threshold **must** async chunk (§15).

---

## 14. Scale analysis (order-of-magnitude)

Assumptions — not precision.

| Class | Folders | Documents | Versions/doc | ACL grants | Uploads/day | Reads/day |
|-------|---------|-----------|--------------|------------|-------------|-----------|
| **Small club** | 20–100 | 200–2k | 1–3 | 500–5k | 5–30 | 50–500 |
| **Medium club** | 100–1k | 2k–20k | 1–5 | 5k–50k | 30–200 | 500–5k |
| **Large club** | 1k–5k | 20k–100k | 1–10 | 50k–300k | 200–1k | 5k–50k |
| **Multi-tenant platform** | 10k+ | 1M+ docs aggregate | — | millions | 10k+ | 100k+ |

**Growth hotspots:**

| Area | Pressure |
|------|----------|
| ACL resolution / recursive folder auth | Medium–high for deep trees |
| `buildWorkspaceReadWhere` large IN lists | Medium |
| Subtree delete transaction | **High** > ~1k rows |
| AuditLog insert rate | High with full download audit — prefer DENIED + mutations |
| Favorites/recents | Low–medium |
| Deletion blockers | Low (indexed FK lookups) |
| Storage cleanup fan-out | Medium on version-heavy deletes |

W08 solves **workspace-safe** scale — not PERFORMANCE programme global optimisation.

---

## 15. Large subtree operations

**Today:** Synchronous transactional folder permanent delete + document cascade in one transaction (`folder-delete-service.ts`).

| Threshold | Risk |
|-----------|------|
| ~100 folders / ~1k docs | Usually safe |
| ~1k folders / ~10k docs | Transaction duration, lock contention, serverless timeout |
| 10k+ | **Unsafe** synchronous |

**W08-07 recommendation:**

| Feature | Detail |
|---------|--------|
| Plan job | `WorkspaceDestructiveOperation` — type SUBTREE_DELETE, progress counters |
| Async phases | (1) mark trashed/deleting, (2) delete rows in batches, (3) enqueue storage deletes |
| Authorization | Unchanged — plan created only if MANAGE+delete capability |
| Atomicity | User-visible **either** complete subtree gone **or** operational rollback marker — no partial orphan ACL leaks |
| Audit | Operation START / PROGRESS / COMPLETE / FAIL |

---

## 16. Storage portability audit

| Operation | Portable? | Notes |
|-----------|-----------|-------|
| Upload | PARTIAL | Interface yes; impl Vercel-only |
| Download stream | PARTIAL | Same |
| Delete | PARTIAL | Same |
| Key layout | PORTABLE | Tenant-scoped canonical |
| Checksum | PORTABLE | Stored on version |
| Signed URL | PARTIAL | `storageUrl` optional — avoid persisting |
| Copy/restore | PORTABLE | New key per version (W05) |

**Required repairs (W08-06):**

1. Inject `WorkspaceStorageProvider` via factory/config — domain imports interface only.
2. S3-compatible adapter (Exoscale SOS) implementing same interface.
3. Locator `provider` enum from config.
4. Sentinel: no `@vercel/blob` import outside adapter module.
5. DTO audit: no `storageKey` in external/Mobile DTOs (extend W07 sentinels).

---

## 17. Swiss-hosting portability

**Question:** Can Workspace domain move to Swiss-hosted stack **without rewrite**?

| Component | Today (typical) | Swiss option | Portability |
|-----------|-----------------|--------------|-------------|
| Postgres metadata | Neon (region variable) | Exoscale DBaaS / Aiven CH / self-host | **ADAPT** — Prisma standard |
| Blobs | Vercel Blob | Exoscale SOS `ch-gva-2`, `ch-dk-2` S3 API | **ADOPT** target via adapter |
| Compute | Vercel serverless | Exoscale SKS / Fly.io CH / on-prem | **ADAPT** — Next.js portable |
| Cron/jobs | Vercel cron | Cron + worker on SKS | **ADAPT** |
| Audit export | Postgres | SOS WORM bucket | **ADOPT** optional |

**Blockers:** Vercel Blob coupling; Neon region choice for metadata; no legal claim without deployment config.

**Migration required now:** **No** — W08 defines seams only.

---

## 18. Data-residency boundary

| Data class | May contain personal/child data? | Residency driver |
|------------|----------------------------------|------------------|
| Relational metadata | Yes — names, ACL subjects | DB region |
| Document blobs | Yes — contents, filenames | Object store region |
| Backups | Yes | Backup provider region |
| Application logs | Maybe — filenames in errors | Log vendor region |
| AuditLog | Yes — ids, minimal metadata | DB region |
| Scan payloads | Yes — full file bytes in worker memory | Worker region |
| CDN/cache | Should not for private workspace | Avoid caching private blobs |
| Temp processing | Yes | Same region as blob |

**Architecture discovery only — not legal advice.**

---

## 19. Provider abstraction targets

| Seam | Needed? | Alternates | Protects |
|------|---------|------------|----------|
| `WorkspaceStorageProvider` | **Yes** (extend) | SOS, AWS S3, MinIO | Blob IO |
| `WorkspaceMalwareScanner` | **Yes** | ClamAV, cloud API | Scan worker |
| `WorkspaceBackgroundJobQueue` | **Yes** | DB, SQS, Inngest | Async governance |
| `WorkspaceAuditSink` | **Optional** | S3 WORM, syslog | Long-term audit |

**Testing:** Contract tests with in-memory fake provider/scanner/queue.

**Failure semantics:** Scanner/storage **fail closed** for access; audit **fail closed on mutation** (transaction rollback) vs **best-effort read logging** (queue retry).

---

## 20. Observability / operations

| Type | Examples |
|------|----------|
| **Metric** | uploads_total, scan_pending_gauge, scan_failures, infected_total, purge_backlog, job_queue_depth, audit_write_failures |
| **Log** | Provider errors (no blob content), worker stack traces |
| **Audit** | Security events per §4 |

**Alerting:** scan queue age > 1h; purge job failure; audit transaction rollback rate spike.

---

## 21. Failure semantics

| Failure | Behaviour |
|---------|-----------|
| Audit sink on mutation | **Fail closed** — rollback transaction (`writeAuditRecord`) |
| Audit sink on read/download log | **Retry queue**; drop after N with operator alert |
| Scanner down | Stay PENDING; alert; no CLEAN promotion |
| Queue down | Cron retry; jobs remain PENDING |
| Storage delete fail | Retry job with exponential backoff; **orphan blob report** |
| Retention job fail | No partial purge; next run idempotent |
| Provider outage | Upload fail visible to user; no data loss on committed DB without blob — compensation already W04 |

---

## 22. Tenant offboarding / deletion

**Seam (no implementation):**

1. Export audit + document manifest
2. Check governance holds + W07 refs platform-wide
3. Soft-lock tenant workspace (`read-only` banner)
4. Async blob purge after legal retention
5. Retain audit per regulation — **separate** retention from content

---

## 23. Child / family privacy intersection

Workspace documents **may** contain child/family data (medical forms, consent PDFs). **`people.private_documents.*`** permissions govern Person-domain private docs — **distinct** from Workspace resource ACL.

**W08 rules:**

- Break-glass must **not** become a cross-domain master key into future Mobile family vault.
- Governance permissions are **workspace-scoped** — not ORGANISATION ROLE audiences.
- Audit sensitive access (download/preview DENIED and break-glass READ).
- Mobile-ready: stable version ids + scan state in DTOs — no storage leakage.

---

## 24. Security threat model (concise)

| Threat | Current control | W08 control | Residual |
|--------|-----------------|-------------|----------|
| Malicious tenant admin | No ACL bypass | No bypass; break-glass audited | Abuse of assigned governance perms |
| Compromised user | ACL + tenant caps | Scan gates; audit | Credential theft |
| Guessed resource IDs | Zero disclosure | Same | Enumeration noise in logs |
| ACL downgrade abuse | MANAGE required | Audit grant changes | — |
| Audit tampering | App can UPDATE AuditLog | INSERT-only discipline + export | DBA risk |
| Delete to destroy evidence | Blockers + trash | Holds + audit | Insider with delete+unlink |
| Retention bypass | No auto-purge | Policy engine | Misconfiguration |
| Malware upload | Extension block | Quarantine scan | Zero-day |
| Scanner bypass | N/A | No CLEAN without scan | Logic bug |
| Malicious archive | Size limit | Worker limits | DoS |
| Cross-tenant job bug | tenantId in queries | Job payload validation tests | — |
| URL leakage | Private blob | No signed URL in DTO | Misconfigured bucket |
| Wrong tenant blob delete | Key prefix | Locator validation + tests | — |
| Break-glass abuse | N/A | Reason + TTL + audit | Collusion |
| Huge folder DoS | Sync delete | Async plan | Slow operations |

---

## 25. Governance permissions

**Existing workspace permissions:** `workspace.view`, `workspace.manage`, `workspace.delete` (`permissions.ts`).

**Proposed (W08-02) — technical, tenant-scoped, grantableByAdmin:**

| Key | Purpose |
|-----|---------|
| `workspace.audit.view` | Read workspace governance audit |
| `workspace.governance.manage` | Retention policies, holds (not break-glass) |
| `workspace.retention.manage` | Alias or subset of governance.manage |
| `workspace.break_glass` | Exceptional governed access |

Follow `<module>.<area>.<verb>` pattern like `people.audit.view`.

**Never** model as organisational ROLE audience grants on resources.

---

## 26. W08 data model options (proposal — no 08D schema change)

| Model | Ownership | Key fields | Growth |
|-------|-----------|------------|--------|
| **WorkspaceAuditEvent** | Optional 1:1 `AuditLog` or workspace-specific table | tenantId, action enum, resource ids, versionId, outcome, reason, correlationId | High — index `(tenantId, createdAt)` |
| **WorkspaceRetentionPolicy** | Tenant | trashDays, scanEnforcement, enabled flags | Low |
| **WorkspaceResourceHold** | Tenant + resource FK | holdReason, placedBy, expiresAt | Low–medium |
| **WorkspaceDocumentVersionScan** | 1:1 version | status, engine, scannedAt, signature | Medium |
| **WorkspaceBackgroundJob** | Tenant optional | type, payload, status, attempts, runAfter | High — prune COMPLETE |
| **WorkspaceBreakGlassSession** | Tenant + user | reason, expiresAt, revokedAt | Low |
| **WorkspaceStorageCleanupTask** | Tenant | storageKey, attempts | Medium |

**Minimal set for W08 exit:** Audit vocabulary on existing `AuditLog` + `WorkspaceDocumentVersionScan` + `WorkspaceBackgroundJob` + `WorkspaceRetentionPolicy` + hold table.

---

## 27. W08 package plan

### W08-01 — Audit foundation + governance event contract

| | |
|--|--|
| **Goal** | Canonical action enum; transactional audit coverage; `workspace.audit.view` read API |
| **Schema** | Optional `WorkspaceAuditEvent` view/table; indexes on AuditLog |
| **Migration** | Yes |
| **Security** | No content in audit; tenant isolation |
| **Sentinels** | No storageKey in audit; mutation rollback on audit fail |
| **Deps** | W07 |
| **Out of scope** | SIEM connectors |

### W08-02 — Governance authorization + break-glass

| | |
|--|--|
| **Goal** | Permissions; break-glass session contract |
| **Schema** | `WorkspaceBreakGlassSession` |
| **Migration** | Yes |
| **Security** | No ACL bypass by default |
| **Sentinels** | break-glass requires reason |
| **Deps** | W08-01 |
| **Out of scope** | Dual approval |

### W08-03 — Retention / trash purge / reference-aware lifecycle

| | |
|--|--|
| **Goal** | Trash timer, holds, purge job respecting blockers |
| **Schema** | Retention policy + hold |
| **Migration** | Yes |
| **Security** | Referenced docs never silent purge |
| **Sentinels** | W07 blocker integration tests |
| **Deps** | W08-01, W08-05 |
| **Out of scope** | Full legal export |

### W08-04 — Malware scanning + quarantine

| | |
|--|--|
| **Goal** | Async scan pipeline; download/preview gates |
| **Schema** | Version scan side table |
| **Migration** | Yes |
| **Security** | NOT_SCANNED ≠ CLEAN |
| **Sentinels** | State machine tests |
| **Deps** | W08-05, storage adapter |
| **Out of scope** | DLP content inspection |

### W08-05 — Background jobs + retries + observability

| | |
|--|--|
| **Goal** | Job table, cron dispatcher, metrics |
| **Schema** | `WorkspaceBackgroundJob` |
| **Migration** | Yes |
| **Security** | tenantId validation |
| **Sentinels** | Idempotency tests |
| **Deps** | — |
| **Out of scope** | Multi-region workers |

### W08-06 — Storage portability + Swiss-hosting seams

| | |
|--|--|
| **Goal** | S3 adapter; factory injection; optional audit export bucket |
| **Schema** | Minimal — provider config env |
| **Migration** | Maybe locator backfill none |
| **Security** | Key validation |
| **Sentinels** | No vercel import outside adapter |
| **Deps** | W04 |
| **Out of scope** | Production cutover |

### W08-07 — Scale hardening + large subtree ops

| | |
|--|--|
| **Goal** | Async destructive operations; batch sizes |
| **Schema** | `WorkspaceDestructiveOperation` optional |
| **Migration** | Yes |
| **Security** | Same auth as sync path |
| **Sentinels** | 10k subtree simulation test |
| **Deps** | W08-05 |
| **Out of scope** | Global perf |

### W08-08 — Security / regression / benchmark acceptance

| | |
|--|--|
| **Goal** | W08 exit criteria; extend w01–w07 sentinels |
| **Schema** | — |
| **Migration** | — |
| **Security** | Threat model regression |
| **Sentinels** | Full suite |
| **Deps** | W08-01–07 |
| **Out of scope** | W09 full programme |

---

## 28. W09 readiness contract

**W08 exit criteria (measurable):**

- [ ] ≥95% workspace **mutations** emit transactional audit with canonical actions
- [ ] `workspace.audit.view` UI/API with tenant filter tests
- [ ] Trash retention + purge job with **reference blocker** skip logic
- [ ] Scan pipeline: PENDING → CLEAN/INFECTED/SCAN_FAILED; download policy enforced
- [ ] `WorkspaceBackgroundJob` with retry + DLQ metric
- [ ] `WorkspaceStorageProvider` injectable; S3 adapter passes contract tests
- [ ] Large subtree async path documented + tested at 1k+ nodes
- [ ] Benchmark record ADOPT/ADAPT items addressed or explicitly deferred in W08-08
- [ ] No new admin ACL bypass; break-glass audited

**W09 then:** penetration/regression, release checklist, Mobile-ready sign-off — **no new W08 architecture**.

---

## 29. Mobile-ready exit

Mobile will rely on:

- Stable `WorkspaceDocumentVersionRef` DTOs (W07)
- Scan state in version DTO (not CLEAN unless CLEAN)
- Preview/download availability flags
- Lifecycle states affecting visibility
- Zero disclosure on unauthorized ids
- Tenant isolation on all APIs
- No storage keys/URLs in mobile payloads

---

## 30. Out of scope (08D / W08 boundary)

W08D and W08 exclude: W09 implementation, Mobile, Universal Search, AI search, PERFORMANCE programme, global hosting migration, Google Drive import, anonymous sharing, co-editing, comments/mentions, e-signature, approval workflows, **new** Requirement acknowledgement workflow.

---

## 31. Discovery artifacts

| Artifact | Path |
|----------|------|
| Discovery | `docs/workspace/WORKSPACE-08D-DISCOVERY.md` |
| Benchmark | `docs/workspace/WORKSPACE-08D-BENCHMARK-RECORD.md` |

---

## 32. Verdict

**WORKSPACE-08D DISCOVERY PASS** — Audit + governance + reference-aware retention + malware-scanning + async operations + scale + Swiss-hosting portability contract defined — world-class benchmark gate passed — ready for WORKSPACE-08 implementation.

**Next:** WORKSPACE-08 — Governance / retention / scanning / scale / portability implementation.
