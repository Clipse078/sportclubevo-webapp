# SCE-COMM-HOTFIX-01 — Inbox detail scroll & reply visibility

**Scope:** Post–RELEASE-01 layout hotfix on `STAGE`  
**Route:** `/dashboard/communication/inbox`

## Symptom (manual STAGE)

Long real IMAP conversations loaded correctly after RELEASE-01, but scrolling the detail pane ended at the workspace card boundary. **Antwort**, the reply editor, signature/attachment controls, and send action were clipped or unreachable. A large empty dark region appeared below the Inbox workspace (document scroll past the card).

## Root cause

1. **Workspace height was `auto` up to `max-h`**, without `overflow-hidden`, so unconstrained detail content extended the document and produced the empty page tail.
2. **Flex height chain broke** between the layout grid and list/detail panes (`min-h-0` without `h-full` on pane shells), so the detail column could size to message content instead of the workspace band.
3. **Reply lived outside the detail scroll region** while the message block owned `flex-1 overflow-y-auto`, so on under-constrained layouts the composer competed for space at the clipped bottom.

## Scroll ownership (before → after)

| Region | Before | After |
|--------|--------|--------|
| Document / page | Often scrolled (empty tail) | Desktop: workspace capped; `overflow-hidden` on workspace |
| Workspace | `min-h` + `max-h`, no overflow clip | Fixed band `h/max-h calc(100dvh-12rem)` + `overflow-hidden` (lg+) |
| List pane | Internal `nav` scroll | Unchanged: `data-inbox-list-scroll` |
| Detail pane | Messages scroll only; reply pinned below, clipped | Single `data-inbox-detail-scroll` for messages **and** reply flow |
| Reply | Sibling below scroll | End of detail scroll (header/toolbar stay fixed) |

## Changed files

- `lib/communication/inbox/inbox-workspace-layout-contract.ts` — shared class/DOM contract
- `components/admin/communication/inbox/CommunicationInboxWorkspace.tsx`
- `components/admin/communication/inbox/CommunicationInboxWorkspaceLayout.tsx`
- `components/admin/communication/inbox/CommunicationInboxConversationList.tsx`
- `components/admin/communication/inbox/CommunicationInboxConversationDetail.tsx`
- `app/(admin)/dashboard/communication/inbox/page.tsx` — flex height chain on page shell
- `lib/communication/inbox/__tests__/sce-comm-hotfix-01-inbox-reply-layout.test.tsx`

## Layout presets (INBOX-02)

All six presets use the same pane shell + scroll contract; master/detail and split layouts unchanged semantically. **LIST_ONLY** hides detail (no reply expected).

## Mobile

`max-lg:h-auto` avoids forcing desktop viewport height; master/detail single-pane behavior preserved.

## Regression tests

- `sce-comm-hotfix-01-inbox-reply-layout.test.tsx` (structural DOM/class contract, all layouts)
- Existing EVO-02, INBOX-02, UX-03, EVO-09 BigInt/detail, reply attachments — unchanged API/DTO boundaries.

## User acceptance

Visual verification on authenticated STAGE with the same long IMAP thread is **required** (`USER_REQUIRED = YES` for automated agents).

## PR / STAGE / deployment

Recorded in the hotfix agent return block after merge and canonical Vercel STAGE verification.
