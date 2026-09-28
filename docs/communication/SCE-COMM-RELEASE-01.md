# SCE-COMM-RELEASE-01 — Communication release, migration reconciliation & STAGE acceptance

**Branch:** `cursor/comm-release-01-containment-0cac`  
**Parent stack:** PR #760 (`cursor/comm-evo-09-integrated-hardening`)  
**STAGE before:** `443e0b76` (Merge PR #751)  
**STAGE after:** `1dbc82c1` (Merge PR #761)  
**Release HEAD:** `b02805fc` (EVO-09 stack + migration reconciliation)

## Scope

Final Communication programme release to STAGE. No new product features beyond the stacked EVO-01…EVO-09 implementation. Work focused on migration truth, containment merge, automated gates, and deployment readiness.

## Stack

| PR | Branch | State (preflight) |
|----|--------|-------------------|
| #752 | `cursor/comm-evo-01-product-completion-architecture` → STAGE | OPEN, MERGEABLE, CI green |
| #753 | EVO-02 on EVO-01 | OPEN, MERGEABLE, CI green |
| #754 | EVO-04 on EVO-02 | OPEN, MERGEABLE, CI green |
| #755 | EVO-08 on EVO-04 | OPEN, MERGEABLE, CI green |
| #756 | EVO-03 on EVO-08 | OPEN, MERGEABLE, CI green |
| #757 | EVO-06 on EVO-03 | OPEN, MERGEABLE, CI green |
| #758 | EVO-07 on EVO-06 | OPEN, MERGEABLE, CI green |
| #759 | EVO-05 on EVO-07 | OPEN, MERGEABLE, CI green |
| #760 | EVO-09 on EVO-05 | OPEN, MERGEABLE, CI green |

**Containment strategy:** Single PR from `cursor/comm-release-01-containment-0cac` → `STAGE` lands the full 14-commit stack once (avoids nine sequential stacked merges).

## Migration diagnosis (STAGE, read-only)

- **Target:** Neon `neondb` @ `ep-wispy-…aws.neon.tech` (via `STAGE_DB_URL` host fingerprint; credentials not logged).
- **COMM-16:** Failed apply row (enum already exists) rolled back; successful row with `applied_steps_count` 0 (historical `migrate resolve --applied`). Templates/scheduling schema present. **Class:** HISTORY_ONLY_MISMATCH, schema healthy.
- **COMM-17:** Prior failed row (index truncation collision) rolled back; successful apply 2026-09-28. Remote schema uses short sponsor indexes `SponsorCommPref_*`, all four FKs, empty tables, zero orphans. **Class:** HEALTHY (repair not required on remote).
- **Pending before RELEASE-01 apply:** EVO-08, EVO-07, EVO-06 migrations only.
- **Legacy `_prisma_migrations` rows:** Many rolled-back historical failures (202604–202605); no active `finished_at IS NULL AND rolled_back_at IS NULL` blockers.

## RELEASE-01 migration actions

1. **COMM-17 SQL (repo):** Short sponsor index names aligned with healthy STAGE schema; enables clean disposable replay.
2. **Duplicate timestamp:** Renamed `20260928170000_sce_comm_evo_08_multi_sender_identities` → `20260928169000_sce_comm_evo_08_multi_sender_identities` (EVO-08 before EVO-07). **Class:** SAFE_TO_RENAME_BEFORE_FIRST_APPLY (neither EVO migration had been applied on STAGE).
3. **STAGE `prisma migrate deploy`:** Applied EVO-08, EVO-07, EVO-06 successfully. Final status: **Database schema is up to date!**
4. **Clean replay:** Fresh local DB `fc_comm_release_replay` — full 212-migration chain **PASS** after COMM-17 fix.

## Automated gates (agent VM)

| Gate | Result |
|------|--------|
| Inbox deployed-stage regression (`sce-comm-evo-09-inbox-detail-deployed-stage.test.tsx`) | PASS (6 tests) |
| Communication vitest (`lib/communication`, dashboard communication) | 527 pass; `attachment-storage.test.ts` ENV limitation (blob adapter) |
| Billing transport guards | 23 pass |
| Cron schedules incl. attachment cleanup | PASS |
| `npx prisma validate` / `generate` | PASS |
| `APPLY_DATABASE_MIGRATIONS=false npm run build` | PASS |
| Background SHA256 `SCE_background.png` | PASS (583698df…) |
| Migration identifier audit | COMM-17 collision **fixed** in repo |

## Environment & cron (agent VM — not Vercel STAGE)

Agent environment lacks production/STAGE secret values. Vercel STAGE project configuration must be verified in dashboard (names only): `CRON_SECRET`, Resend, VAPID, Blob, Communication encryption, fallback sender.

**Crons in repo (`vercel.json`):** platform email, scheduler, reminders, inbox sync, **attachment cleanup** — all registered.

## STAGE inbox acceptance

No authenticated STAGE session credentials in the agent environment. **LIVE_INBOX_ACCEPTANCE: USER_REQUIRED**

**Single user action:** After STAGE deploy of containment merge, open `https://sportclubevo-webapp-stage.vercel.app/dashboard/communication/inbox` (or canonical STAGE URL), select a real IMAP-synced EMAIL thread, confirm detail loads (HTTP 200, no BigInt error, no *Die Konversation konnte nicht geladen werden.*). Read-only.

## Non-blockers

- Malware scanning: not operational (upload validation only).
- Public unsubscribe tokens: deferred (COMM-17).
- `attachment-storage.test.ts`: requires Vercel Blob workspace adapter in CI VM.

## Deployment

- **STAGE SHA:** `1dbc82c1`
- **Vercel:** `sportclubevo-webapp-stage` — GitHub commit status **success** (deployment completed 2026-09-28T20:37Z UTC, see Vercel dashboard link on commit).

## Verdict

**RELEASED_TO_STAGE_USER_ACCEPTANCE_REQUIRED** — code merge and migrations applied; automated gates green; Vercel STAGE deployment succeeded; live IMAP inbox detail acceptance requires user with STAGE login.
