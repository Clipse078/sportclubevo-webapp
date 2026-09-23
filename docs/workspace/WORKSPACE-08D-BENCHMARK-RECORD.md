# WORKSPACE-08D — Governance, retention, scanning & portability benchmark record

**Benchmark date:** 2026-09-23  
**Baseline STAGE SHA:** `7987a9650f760085117a261709411bbd19905e44` (WORKSPACE-07 merged, PR #700)  
**Sources (authoritative where noted):**

- Microsoft Learn — [Retention for SharePoint and OneDrive](https://learn.microsoft.com/en-us/purview/retention-policies-sharepoint), [Retention policies & labels](https://learn.microsoft.com/en-us/purview/retention), [Audit log retention policies](https://learn.microsoft.com/en-us/purview/audit-log-retention-policies), [Record versioning](https://learn.microsoft.com/en-us/purview/record-versioning)
- Dropbox Help — [Data Governance add-on](https://help.dropbox.com/plans/data-governance), [Legal holds](https://help.dropbox.com/security/legal-hold), [Data retention](https://help.dropbox.com/security/data-retention), [Team activity / audit export](https://help.dropbox.com/account-access/view-activity)
- AWS — [Log Archive / S3 Object Lock patterns](https://docs.aws.amazon.com/prescriptive-guidance/latest/security-reference-architecture/log-archive.html) (tamper-resistant audit sink reference architecture)
- Exoscale — [SOS quick start / Swiss zones](https://community.exoscale.com/product/storage/object-storage/quick-start/) (S3-compatible Swiss object storage reference)

Companion: `WORKSPACE-08D-DISCOVERY.md`. This is **not** feature-parity work.

---

## Classification legend

| Class | Meaning for SCE |
|-------|-----------------|
| **ADOPT** | Pattern fits grassroots multi-tenant SaaS with proportionate complexity |
| **ADAPT** | Take the idea but simplify scope, UX, or licensing model |
| **DIFFER** | Deliberate SCE alternative (document why) |
| **DEFER** | Correct direction but wrong programme slice (post-W08 or separate programme) |
| **REJECT** | Incompatible with SCE security model or product scope |

---

## Microsoft SharePoint / OneDrive

| Capability | Mature product behaviour | Class | SCE rationale |
|------------|-------------------------|-------|---------------|
| Two-stage recycle bin (93-day aggregate clock) | Delete → stage 1 → stage 2 → permanent purge | **ADAPT** | W06 **TRASHED** exists; W08 adds **configurable trash retention** + scheduled purge — default **30–90 days** club-configurable, not 93-day Microsoft default |
| Preservation Hold library (hidden copies on edit/delete under retention policy) | Automatic shadow copies; users cannot edit held copies | **DEFER** | Enterprise legal/compliance scale; SCE clubs need **reference-aware delete** + optional **governance hold** seam, not full shadow-library UX in W08 |
| Retention labels + “records” (lock/unlock, regulatory records) | Label-driven lifecycle; record lock audited | **ADAPT** | Future **governance retention** on document/version — W08 defines **hold + policy model**, not full Purview label taxonomy |
| Retention policy timer jobs (up to ~7 days evaluation lag) | Async compliance engine | **ADOPT** | W08 **background jobs** for trash purge, retention evaluation, scan pipeline — idempotent cron/queue pattern |
| Unified audit log (workload-specific retention up to 10y, Audit Premium) | Central SIEM-oriented audit with long retention | **ADAPT** | Reuse **`AuditLog`** + new **`WorkspaceAuditEvent`** vocabulary; **tenant-scoped read** via new permission; platform retention **1–7 years** configurable — not Microsoft licensing stack |
| Audit of retention *configuration* vs retention *actions* | Admin changes logged; some actions label-only | **ADOPT** | W08 logs **policy/hold changes** and **security-relevant workspace actions** in durable audit (transactional where mutation-coupled) |
| Document ID / stable internal identity | Survives rename/move within site | **ADOPT** (already) | W06 stable ID links — **no change** |
| Version history tied to item until purge | Delete item removes versions from user view | **DIFFER** | SCE **immutable `WorkspaceDocumentVersion.id`** + W07 refs — purge must be **reference-aware**, not benchmark “delete file = all versions gone” |
| Admin “see all site content” via tenant admin | Broad library access in SharePoint admin | **REJECT** | SCE **no resource ACL bypass** (`admin-bypass.ts`) — governance via **explicit break-glass**, not admin omniscience |
| eDiscovery / legal hold export at scale | Purview eDiscovery | **DEFER** | Separate compliance programme if enterprise customers appear |
| Malware scanning (Defender for Office / M365) | Integrated cloud AV | **ADAPT** | W08 **async quarantine scan** on private blobs — provider TBD (ClamAV-class or managed API), not M365 stack |

---

## Dropbox Business

| Capability | Mature product behaviour | Class | SCE rationale |
|------------|-------------------------|-------|---------------|
| Data Governance add-on (retention + legal hold) | Paid tier; retention until policy end; disposition auto-delete + 31-day buffer | **ADAPT** | **Optional tenant retention config** — sensible defaults for small clubs; **no** mandatory enterprise add-on pricing model |
| Legal hold (member-scoped; silent to member) | Copies content created/edited by member; export filters | **ADAPT** | SCE **governance hold** on **resource or tenant** with **mandatory reason + audit** — not silent member-wide hold |
| Disposition policy email report before delete | Admin warning | **ADOPT** | W08 **operator/tenant admin notification** before automated purge batch (configurable) |
| Team activity CSV + `/2/team_log/get_events` API | Admin investigation export | **ADAPT** | W08 **audit export job** (CSV/JSON) for `workspace.*` events — scoped by tenant + permission |
| Malware / ransomware detection alerts | Business+ security features | **ADAPT** | W08 **INFECTED** state + admin alert metric — not full Dropbox SIEM bundle |
| Admin “sign in as member” for troubleshooting | Full account access | **REJECT** | Incompatible with SCE zero-disclosure + child/family boundary — use **break-glass** with audit instead |
| Version history by plan tier | Extended history paid | **DIFFER** | SCE keeps **full immutable version history** until lifecycle/retention permits purge — not tier-gated history |
| 180–365 day deleted file recovery by plan | Plan-dependent trash window | **ADAPT** | **Single configurable trash retention** per tenant (platform default + optional override) |

---

## Other reference architectures (selected)

| Topic | Reference pattern | Class | SCE rationale |
|-------|-------------------|-------|---------------|
| Tamper-evident audit (hash chain) | Append-only log with HMAC/hash chain per tenant | **DEFER** | Phase 2 if enterprise customers require cryptographic proof — W08 **ADAPT** relational append-only + DB role separation + optional export to WORM bucket |
| External immutable audit sink (S3 Object Lock / CloudTrail Lake) | Log archive account, Object Lock compliance mode | **ADAPT** | W08-06 **optional `WorkspaceAuditSink` export** — nightly batch to S3-compatible Swiss bucket; not required for initial W08 exit |
| Async malware scan (quarantine → scan → release) | S3 trigger + Lambda + ClamAV / commercial API | **ADOPT** | Matches private object model; **version-scoped** scan state |
| DB-backed job queue + cron | Idempotent job rows + Vercel cron dispatcher | **ADOPT** | Fits current **Vercel cron** pattern (`vercel.json`); no new vendor required for W08 MVP |
| Managed queue (SQS, Inngest, BullMQ) | Durable at-least-once workers | **ADAPT** | **W08-05** — start with **Postgres job table**; abstract **`WorkspaceBackgroundJobQueue`** if worker moves off Vercel |
| Swiss S3-compatible object storage (Exoscale SOS) | `ch-gva-2`, `ch-dk-2`, SigV4 | **ADOPT** (target option) | Primary **portability target** for blobs via **`WorkspaceStorageProvider`** S3 adapter |
| Neon / PostgreSQL region choice | Managed Postgres in EU/US regions | **ADAPT** | Metadata residency follows DB host — document boundary; **no W08 migration** |
| ClamAV / cloud AV API for object scanning | Stream blob to scanner in isolated worker | **ADOPT** | W08-04 implementation choice — compare ops burden vs API cost at scale |

---

## Summary matrix (programme-level)

| Class | Items |
|-------|--------|
| **ADOPT** | Async retention/scan jobs; transactional security audit for mutations; trash retention + scheduled purge concept; stable ID links; quarantine→scan pipeline; DB job table + cron; reference-aware delete (existing W06/W07) |
| **ADAPT** | Purview/Dropbox retention → lightweight tenant policies; audit log retention duration; legal hold → governance hold with reason; team activity export → workspace audit export; Swiss SOS as blob target; scan status UX |
| **DIFFER** | No admin omniscience; immutable version refs block naive purge; no tier-gated version history; NOT_SCANNED ≠ CLEAN (W04 invariant preserved) |
| **DEFER** | Preservation Hold library UX; full eDiscovery; hash-chained audit MVP; hash-chained audit as default; SharePoint-scale SIEM; global hosting migration |
| **REJECT** | URL/token anonymous sharing; admin impersonation for file access; silent break-glass; representing unscanned files as clean |

---

## Benchmark gate result

**PASS** — SharePoint/OneDrive and Dropbox Business patterns classified with explicit SCE ADOPT/ADAPT/DIFFER/DEFER/REJECT rationale. Additional tamper-resistance, scanning, and Swiss-hosting references recorded for W08 architecture decisions.
