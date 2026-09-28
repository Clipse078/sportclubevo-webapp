# SCE-COMM-EVO-09 — Integrated UX, Regression & Release Hardening

**Branch:** `cursor/comm-evo-09-integrated-hardening`  
**Base:** `cursor/comm-evo-05-zielgruppen-ux-rebuild` @ `4246a8d982948afec0b1908ec3b20a2e91134402`  
**Parent PR:** #759 (EVO-05)

## Stack integrity

Git ancestry on the base branch contains EVO-01 → EVO-08 commits (product completion, inbox reliability, universal audience, attachments, multi-sender, personalisation, signatures, Zielgruppen UX).

**STACK_CONTAINED:** YES

## Product surface inventory (RELEASE-01 scope)

| Surface | Route(s) | Primary UI / service |
|---------|----------|----------------------|
| Communication Hub | `/dashboard/communication` | Hub cards → sub-surfaces |
| Kommunikationscenter / Inbox | `/dashboard/communication/inbox`, `inbox/new`, `inbox/settings` | `CommunicationInboxWorkspace`, COMM-15 sync |
| Neue Nachricht (direct) | `/dashboard/communication/inbox/new` | Direct composer (COMM-UX-04A) |
| Mitteilungen | `/dashboard/communication/mitteilungen/*` | `ClubCommunicationComposer`, COMM-11 |
| Kampagnen | `/dashboard/communication/kampagnen/*` | Campaign composer, COMM-12/13 |
| Zielgruppen | `/dashboard/communication/zielgruppen/*` | EVO-05 editor + COMM-03 resolver |
| Vorlagen | `/dashboard/communication/vorlagen/*` | COMM-16 templates |
| E-Mail-Absender | `/dashboard/communication/email-sender` | EVO-08 sender identities |
| Persönliche Signatur | `/dashboard/communication/personal-signature` | EVO-07 / UX-08A |
| Preferences / consent | User settings + delivery boundary | COMM-17 `lib/communication/preferences/` |
| Delivery analytics | Communication detail / COMM-19 APIs | Snapshot + attempt aggregates |
| Event communication | Event flows + smart reminders | COMM-10 cron |
| Attachments | Upload/download APIs | EVO-04 `attachment-service` |
| Push | Device + notification pipeline | COMM-09 (no real push in EVO-09) |

## Fixed defects (EVO-09)

### Inbox `replyAttachments.some` TypeError

- **Root cause:** `CommunicationInboxConversationDetailPane` requires `replyAttachments: ComposerAttachment[]` from `useCommunicationAttachmentUpload()`. Test fixtures and some isolated renders omitted the prop → runtime `undefined.some`.
- **Fix:** Canonical contract in `lib/communication/inbox/inbox-reply-composer-contract.ts`; send-button logic uses `inboxReplyHasSendableAttachment()`; inbox UX tests use `inboxReplyComposerTestDefaults`.
- **Regression:** `lib/communication/__tests__/sce-comm-evo-09-reply-attachments.test.tsx`

### Stack integration test drift

- **COMM-UX-06 Zielgruppen:** Updated for EVO-05 single-page editor (no wizard step buttons).
- **COMM-13 sponsor publish:** Mock `prepareEmailSenderForPublish` after EVO-08 sender snapshot seam.

### Attachment orphan lifecycle (EVO-04 deferral)

- **Service:** `lib/communication/attachment-cleanup-service.ts` — READY rows with zero links (message, platform communication, center message, signature asset), tenant-scoped, grace period (default 7d), bounded batch.
- **Cron:** `GET /api/cron/communication-attachment-cleanup` (daily `25 4 * * *` in `vercel.json`).
- **Tests:** `lib/communication/__tests__/attachment-cleanup-service.test.ts` (mock storage; no remote deletes in CI).

## Test matrix (automated)

| Suite | Result | Notes |
|-------|--------|-------|
| `lib/communication/**` + `app/.../communication/__tests__/**` | **637 pass**, 2 skipped | Full stack regression |
| `__tests__/vercel-cron-schedules.test.ts` | PASS | Includes attachment cleanup cron |
| Billing communication tests | **39 pass** | Isolated from Communication transport |
| `attachment-storage.test.ts` | **ENVIRONMENT_LIMITATION** | Requires Vercel Blob workspace adapter init |
| Disposable DB migration replay | **NOT AVAILABLE** | No `DATABASE_URL` in agent VM |

Failures classified:

- **PACKAGE_DEFECT:** Fixed (reply attachments, zielgruppen tests, sponsor publish mock).
- **ENVIRONMENT_LIMITATION:** `attachment-storage.test.ts` (blob provider).
- **INHERITED_REPO_DEBT:** Long PostgreSQL identifier names across COMM migrations (pre-EVO-09); COMM-17 sponsor index pair truncates to same 63-byte prefix.

## Security matrices

Authorization and cross-tenant coverage remain in existing suites (representative):

- `lib/communication/__tests__/attachment-*` (IDOR, download auth)
- `lib/communication/__tests__/sce-comm-evo-04-unified-attachments.test.ts`
- `lib/communication/__tests__/sce-comm-evo-08-multi-sender-identities.test.ts`
- `lib/communication/zielgruppen/__tests__/sce-comm-evo-05-zielgruppen-ux.test.ts`
- Platform permission gates on `/api/communication/*` routes (COMM UX route tests)

**BILLING_BOUNDARY:** PASS — Billing uses Infomaniak SMTP / `billing-communication-*`; Communication uses Resend/platform pipeline; billing test suite green; no EVO-09 changes to billing transport.

## Cron inventory

| Cron | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/platform-communication-email` | `*/5 * * * *` | Outbound email (COMM-14) |
| `/api/cron/communication-scheduler` | `*/1 * * * *` | Scheduled publish (COMM-16) |
| `/api/cron/communication-reminders` | `*/1 * * * *` | Smart reminders (COMM-10) |
| `/api/cron/communication-inbox-sync` | `*/5 * * * *` | IMAP sync (COMM-15) |
| `/api/cron/communication-attachment-cleanup` | `25 4 * * *` | **EVO-09** unlinked attachment cleanup |

Push delivery: existing notification crons (`task-notifications`, `participation-notifications`, `requirement-notifications`).

## Environment inventory (names only)

| Variable | Required | Purpose |
|----------|----------|---------|
| `CRON_SECRET` | Production crons | Bearer auth for `/api/cron/*` |
| `RESEND_API_KEY` | Email send | COMM-14 (not exercised in EVO-09) |
| `VAPID_*` | Push | COMM-09 |
| `COMMUNICATION_UNLINKED_ATTACHMENT_MAX_AGE_HOURS` | Optional | Cleanup grace (default 168h) |
| `COMMUNICATION_UNLINKED_ATTACHMENT_CLEANUP_BATCH` | Optional | Cleanup batch size (default 25) |
| Blob / workspace storage | Upload | EVO-04 attachments |
| `ACCEPTANCE_ENABLED_EXTERNAL_PROVIDERS` | Side-effect gating | Includes cron/resend/push |

**Secrets exposed in EVO-09:** None (inventory only).

## Migration inventory

- COMM programme migrations `20260927120000` … `20260927320000` (COMM-02–18 core).
- UX/INBOX: `20260928120000`–`20260928160000`.
- EVO: `20260928170000` (EVO-07 **and** EVO-08 share timestamp), `20260928180000` (EVO-06).

**Duplicate timestamps:** `20260928170000` used for both EVO-07 rich signature and EVO-08 multi-sender — RELEASE-01 should confirm deploy order on remote `_prisma_migrations`.

**Identifier limit:** Automated scan in `sce-comm-evo-09-migration-identifiers.test.ts`. Multiple explicit names exceed 63 bytes; COMM-17 sponsor **unique** and **lookup** indexes truncate to the **same** 63-byte prefix → collision risk on fresh apply.

## COMM-17 remote reconciliation (RELEASE-01 checklist)

**Repo migration SQL:** Structurally valid enums + tables + FK definitions in `20260927310000_sce_comm_17_preferences_consent/migration.sql`.

**Known historical remote partial state (do not assume healed):**

- Failed migration row may exist.
- Enums + both preference tables + user indexes + sponsor composite UNIQUE may exist.
- Sponsor lookup index may be **missing**.
- All four FKs may be **missing**.
- Tables may be empty.
- Suspected PostgreSQL 63-byte truncation on sponsor index names.

**REMOTE_CHECK_REQUIRED (read-only SQL on STAGE/prod):**

1. `SELECT migration_name, finished_at, logs FROM _prisma_migrations WHERE migration_name LIKE '%comm_17%';`
2. `\d "UserCommunicationPreference"` and `\d "SponsorContactCommunicationPreference"` — confirm FKs to Tenant, User, SponsorContact.
3. `SELECT indexname, indexdef FROM pg_indexes WHERE tablename IN ('UserCommunicationPreference','SponsorContactCommunicationPreference');` — verify **distinct** index names for sponsor unique vs lookup; if only one physical index, reconcile naming (short explicit names) before marking healthy.
4. If FKs missing but tables empty: safe to add FKs via controlled migration or manual `ALTER TABLE` in maintenance window.
5. Re-run `prisma migrate resolve` / deploy only after index/FK inventory matches repo intent.

**REMOTE_MUTATION_PERFORMED in EVO-09:** None.

## Malware scanning status

Unchanged honest semantics: `scanStatus: PENDING` = validated upload, **not** malware-scanned. No fake “Sicher geprüft” UI. Operational scanner remains deferred (see EVO-04 doc).

## Release blockers vs evidence gaps

**Blockers before RELEASE-01 deploy:**

1. COMM-17 remote schema reconciliation (FKs + sponsor index collision).
2. Confirm duplicate EVO-07/EVO-08 migration timestamp ordering on target database.

**Evidence gaps (non-blocking for code merge):**

- Disposable full migration replay (no local DB in agent).
- `attachment-storage.test.ts` without blob credentials.

**Deferred non-blockers:**

- Public unsubscribe tokens (COMM-17 deferred).
- Full operational malware scanning.

## Validation performed

| Check | Result |
|-------|--------|
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |
| `APPLY_DATABASE_MIGRATIONS=false npm run build` | PASS |
| `public/images/background/SCE_background.png` SHA256 | `583698df…` (unchanged) |
| Remote DB writes / migrations / email / push / IMAP | **None** |
| Manual browser testing | **None** (automated only) |

## Release readiness classification

**READY_FOR_RELEASE_01_WITH_EVIDENCE_GAPS**

Codebase regression is green for Communication + Billing boundary; RELEASE-01 must execute COMM-17 remote reconciliation and optional disposable migration replay before production promotion.
