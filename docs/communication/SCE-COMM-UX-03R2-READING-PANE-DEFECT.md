# SCE-COMM-UX-03R2 — Reading Pane Selection Defect

## Observed incident

On STAGE (`/dashboard/communication/inbox`), selecting a synchronized conversation (for example **Sicherheitswarnung**) did not show the conversation in the reading pane. The pane stayed on the no-selection copy: **Wählen Sie eine Konversation aus.**

Selection in the list appeared to have no effect even though the detail API and COMM-UX-03 workspace were present on STAGE.

## Reproduction

Automated regression: `app/(admin)/dashboard/communication/__tests__/comm-ux-03r2-reading-pane-defect.test.tsx`

1. Render `CommunicationInboxWorkspace` with two list items.
2. Click conversation A → expect selected row, loading state (not no-selection), detail GET for A, message body.
3. Click conversation B → expect B selected, A deselected, B content replaces A.
4. Detail failure → row stays selected, product error + **Erneut versuchen**.
5. Rapid A→B → slow A response must not overwrite B.

Before the fix, steps 2 and 4 failed because the reading pane treated `detail === null` the same as **no selection**, hiding loading and error UI.

## Root cause

**Classification:** B — current COMM-UX-03 client defect (render/state contract).

**Exact cause:** `CommunicationInboxConversationDetailPane` computed `showPlaceholder = !listItem || !detail`. Any selected conversation remains without `detail` until the GET completes (or permanently on error). That forced the no-selection placeholder and swallowed inline error content.

**Affected component:** `CommunicationInboxConversationDetail.tsx` (with supporting race/read handling in `CommunicationInboxWorkspace.tsx`).

**API involved:** Canonical GET `/api/communication/inbox/conversations/[conversationId]` — not changed; contract was already correct.

**Deployment factor:** STAGE at `e78cfc6957745adf73d8c39875c91e88114c962e` includes COMM-UX-03 merge `cf025988`. The behavior is explained by the client placeholder logic, not a missing merge or alternate API.

## Corrected selection flow

1. Row `button` → `onSelect(conversationId)` in list.
2. Workspace sets `selectedId` (single source of truth) and mobile pane `detail`.
3. Effect clears stale detail and calls `loadDetail(selectedId)`.
4. Reading pane branches on `selectedConversationId`:
   - **No selection** → empty state.
   - **Selection + loading** → restrained loading (list preview when available).
   - **Selection + error** → error + retry; row selection unchanged.
   - **Selection + detail** → header, timeline, reply (permission-gated).
5. Successful detail load → POST `/read` (best-effort; failures do not clear detail).

## Loading / error behavior

- Loading never shows the no-selection string.
- Errors use: **Die Konversation konnte nicht geladen werden.** with **Erneut versuchen**.
- No Prisma, stack traces, or raw API payloads in the UI.

## Race handling

`selectedConversationRef` guards async completion: detail state and loading flags apply only when the response matches the currently selected ID. Switching A→B clears detail immediately and ignores late responses for A.

## Read-state semantics

Read mutation runs **after** successful detail GET via existing POST `/read`. List unread badge updates on success. Conversations are not marked read from list render alone.

## Mobile behavior

Unchanged COMM-UX-03 contract: select → `mobilePane = detail`; back button returns to list without resetting filters/search.

## Security regression

Timeline still renders only `bodyHtmlSanitized` through the existing sanitizer path. No new raw HTML pipeline. Remote-image blocking and tenant-scoped API authorization unchanged.

## Boundaries

- No Archive/Trash/Star/bulk/mailbox organization (COMM-INBOX-01).
- No new detail endpoint.
- Desktop two-pane layout preserved; filter sidebar remains removed.
