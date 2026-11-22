# SCE Tenant Documentation — automated release gates (PR #1025)

## Candidate verification

| Gate | Result |
| --- | --- |
| Disposable migrate + integration (`npm run tenant-documentation:disposable-release-gate`) | **PASS** (integration 10/10 on disposable Postgres; see agent `tenant-documentation-disposable-release-gate-final2.log`) |
| Edit browser regression (`TENANT_DOC_BROWSER_REGRESSION=1`, requires Playwright + auth secret) | **PASS** — `/opt/cursor/artifacts/tenant-documentation-edit-browser-regression.json` |
| Lifecycle browser regression (⋯ menu, Archiv, Papierkorb, restore) | **PASS** — `/opt/cursor/artifacts/tenant-documentation-lifecycle-browser-regression.json` |
| DS2-07B route registry sync (`node scripts/sce-ds2-06-route-inventory-scan.mjs`) | **PASS** locally (`npm run test:route-governance`) |
| Unit tests (`yjs`, mention notifications, handoff URLs, workspace client) | **PASS** |

### Local login / browser prerequisites (disposable setup)

- `.env` may ship with empty `NEXTAUTH_SECRET`; generate for local runs, e.g. `export AUTH_SECRET=$(openssl rand -hex 32)` and mirror to `NEXTAUTH_SECRET`.
- Install Playwright Chromium once: `npx playwright install chromium`.
- Prefer ephemeral ports (`TENANT_DOC_BROWSER_PORT`) when parallel agents left `3099` busy.

## Publish authority (proved on disposable Postgres)

1. **Co-edit merge** — `synchronizePageCollaboration` merges Yjs updates CRDT-style into `TenantDocumentationPageDraft.yjsState`.
2. **Mention marks** — TipTap `contentJson` on the draft is canonical for `@mention` identity at publish; publish reads `draft.contentJson` when it is valid RichTextValue.
3. **Stale autosave guard** — content-only autosave without a Yjs delta cannot drop mention marks already on the draft; Yjs-only peer updates preserve existing mention JSON until the editor submits fresh TipTap JSON.
4. **Reader view during edit** — collaboration sync returns `publishedVersionId` from the page; readers consume the last published version, not the live draft.
5. **Notifications** — autosave never creates notifications; `publishPageDraft` emits `TENANT_DOCUMENTATION_MENTION` once per `(publishedVersionId, recipientUserId)` via idempotent insert; retries and unchanged mentions do not duplicate.

## Lifecycle MVP (disposable + browser)

- **⋯ menu** — `Archivieren` / `Seite löschen` for manage-capable users; parent **HAS_ACTIVE_CHILDREN** guard (API + UI menu on parent).
- **Archiv** — `/dashboard/dokumentation/archiv` list + `Wiederherstellen`.
- **Papierkorb** — trash banner on direct page view with **Wiederherstellen** (`source: trash`).
- **Restore invariants** — integration asserts stable `pageId`, `publishedVersionId`, and tree membership after trash restore.

## STAGE read-only inventory

Run: `npm run tenant-documentation:stage-migration-verify` with designated STAGE credentials.

At prior gate closure, migrations/permissions were pending on shared STAGE. App code remains compatible; deploy + permission sync require **separate PO approval**.

## Ready URLs

Built from `lib/tenant-documentation/sce-tenant-documentation-handoff.ts` with `dpl=<shortSha>` on the STAGE-backed Vercel preview.

**Correlation:** `?dpl=` labels the intended commit; verify via GitHub Deployments / Vercel deployment SHA (not query string alone).

## PO manual UAT

See `docs/tenant-documentation/SCE-TENANT-DOCUMENTATION-PO-CHECKLIST.md` (two editors + publisher/reader flows). PO owns STAGE screenshots vs SCE reference target.