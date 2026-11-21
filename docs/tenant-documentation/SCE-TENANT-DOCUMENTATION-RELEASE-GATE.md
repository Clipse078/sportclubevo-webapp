# SCE Tenant Documentation — automated release gates (PR #1025)

## Candidate verification

| Gate | Result |
| --- | --- |
| Disposable migrate + integration (`npm run tenant-documentation:disposable-release-gate`) | PASS |
| Unit tests (`yjs`, mention notifications, handoff URLs) | PASS |
| DS2-07B route governance (`blocking=0`) | PASS |
| `npm run test:design-system` | PASS (470 passed, 2 skipped) |
| `npm run build` | PASS |

## Publish authority (proved on disposable Postgres)

1. **Co-edit merge** — `synchronizePageCollaboration` merges Yjs updates CRDT-style into `TenantDocumentationPageDraft.yjsState`.
2. **Mention marks** — TipTap `contentJson` on the draft is canonical for `@mention` identity at publish; publish reads `draft.contentJson` when it is valid RichTextValue.
3. **Stale autosave guard** — content-only autosave without a Yjs delta cannot drop mention marks already on the draft; Yjs-only peer updates preserve existing mention JSON until the editor submits fresh TipTap JSON.
4. **Reader view during edit** — collaboration sync returns `publishedVersionId` from the page; readers consume the last published version, not the live draft.
5. **Notifications** — autosave never creates notifications; `publishPageDraft` emits `TENANT_DOCUMENTATION_MENTION` once per `(publishedVersionId, recipientUserId)` via idempotent insert; retries and unchanged mentions do not duplicate.

## STAGE read-only inventory

Run: `npm run tenant-documentation:stage-migration-verify` with designated STAGE credentials.

At gate closure, both migrations and permission catalog rows were **pending on shared STAGE** (no schema tables present). App code at the PR head is compatible; deploy + permission sync require **separate PO approval**.

## Ready URLs

Built from `lib/tenant-documentation/sce-tenant-documentation-handoff.ts` with `dpl=<shortSha>` on the STAGE-backed Vercel preview.

## PO manual UAT

See `docs/tenant-documentation/SCE-TENANT-DOCUMENTATION-PO-CHECKLIST.md` (two editors + publisher/reader flows).