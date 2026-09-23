# WORKSPACE-08 — STAGE Closure Record

**Closed:** 2026-09-23  
**Repository:** Clipse078/sportclubevo-webapp  
**Feature HEAD:** `94f8b2e5016e72edc57569f0edfedd23b41f6565`  
**PR:** #702 → base `STAGE`  
**Merge commit:** `c406546b41d8ce6982be1dad3c649e806fd165ef`  
**STAGE SHA (after merge):** `c406546b41d8ce6982be1dad3c649e806fd165ef`  
**STAGE baseline (pre-W08):** `7987a9650f760085117a261709411bbd19905e44`

---

## Acceptance reference

W08-08 release acceptance: `docs/workspace/WORKSPACE-08-RELEASE-ACCEPTANCE.md` (recorded at feature HEAD `94f8b2e…`).

---

## STAGE database

| Field | Value |
|-------|--------|
| Host fragment | `ep-wispy-hall-aso93dy6` |
| Database | `neondb` |
| Fingerprint | `acd3b37682911890` |
| Classification | STAGE |

---

## Migrations on STAGE

**Pre-merge last applied:** `20260922240000_workspace_07_immutable_document_version_references`  
**W08 chain applied (7):** W08-01 … W08-07 (`20260923120000` … `20260923240000`)

**Application method:** `prisma migrate deploy` (initial apply during closure verification), then canonical  
`APP_ENV=stage NODE_ENV=production APPLY_DATABASE_MIGRATIONS=true npm run db:migrate:deploy-if-enabled`  
→ **No pending migrations to apply.**

All seven W08 `_prisma_migrations` rows: `finished_at` set, `rolled_back_at` null, checksums **exact match** to repo `migration.sql` SHA-256.

**MIGRATION-ORDER-01 (pre-W08 enum replay fix):** Historical SQL in  
`20260920194500_aufgaben_05_task_reminders` (+ related AUFGABEN migrations, commit `45cd6329`) was edited after STAGE had applied earlier checksums. STAGE recorded checksums differ from current repo files; **Prisma 7.7 `migrate deploy` did not block** pending W08 application (no checksum failure on deploy). Documented residual: future tooling that strict-validates all applied migration checksums may flag drift; **do not** rewrite `_prisma_migrations` or `migrate resolve` to silence.

---

## STAGE data sanity (read-only, post-W08)

| Check | Result |
|-------|--------|
| Tenants | 47 |
| Workspace folders | 9 |
| Workspace documents | 6 |
| Workspace document versions | 6 |
| Task document refs | 0 |
| Requirement version refs | 0 |
| `storageProvider = vercel-blob` backfill | 6 / 6 versions |
| Non–vercel-blob / null provider | 0 |
| Cross-tenant folder parent leaks | 0 |

No automatic cross-tenant storage migration observed.

---

## Deployment

| Field | Value |
|-------|--------|
| STAGE Git SHA | `c406546b41d8ce6982be1dad3c649e806fd165ef` |
| Vercel project | `sportclubevo-webapp-stage` |
| Vercel deployment id (dashboard) | `4Bs3GAPbRSpbqQrM2Ek2aVw8shhs` |
| GitHub commit status | **SUCCESS** (Vercel) |

---

## Regression (closure agent run @ merge SHA)

- Workspace suite: **869 passed**, 1 skipped (`lib/workspace`, `app/api/workspace`, `components/admin/workspace`)
- W08 / W07 / 06D / 06G focused gate: **350 passed**, 1 skipped
- `npx prisma validate` / `generate`: PASS
- Changed-file ESLint: **0 errors**
- `APPLY_DATABASE_MIGRATIONS=false npm run build`: PASS

---

## Residual risks (unchanged by STAGE closure)

- Real AV scanner **not configured** on STAGE
- Swiss-dedicated blob storage **not configured / not verified**
- Full platform Swiss residency **not claimed**
- MIGRATION-ORDER-01 historical checksum drift on STAGE (non-blocking for this deploy)
- Legacy `_prisma_migrations` orphan rows on STAGE (pre-existing; see stage-preview migration runbook)

---

## Verdict

**WORKSPACE-08 closed on STAGE** — governance, audit, break-glass, retention/holds, malware-safety foundation, background jobs, storage portability, bounded subtree operations merged and migrated.

**Next programme:** WORKSPACE-09 (product completion + UX + final release acceptance) — **not started** in this closure.
