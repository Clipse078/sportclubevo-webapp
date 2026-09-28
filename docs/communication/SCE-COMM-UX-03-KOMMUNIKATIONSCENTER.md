# SCE-COMM-UX-03 — Kommunikationscenter (Inbox Redesign)

**Programme:** SCE COMM  
**Branch:** `cursor/comm-ux-03-kommunikationscenter`  
**Route:** `/dashboard/communication/inbox`  
**Architecture base:** SCE-COMM-15 (unchanged transport, sync, sanitization)

---

## Before / after information architecture

| Before | After |
|--------|--------|
| Three columns: empty filter sidebar, list, detail | Two operational panes: conversation list + detail workspace |
| Filters + search + settings scattered above grid | COMM-UX-01 header + compact toolbar (search + filter chips) |
| List row = subject-first, minimal metadata | List row = participant → subject → preview → assignment → unread |
| Settings link in filter row | **Postfach-Einstellungen** in page header (when authorized) |

---

## Desktop two-pane model

- **Left:** scrollable conversation list with independent overflow.
- **Right:** contextual header, scrollable message timeline, pinned reply composer (when permitted).
- Workspace height uses `min/max` + `calc(100dvh - …)` so the page does not grow unbounded with long threads.

---

## Mobile master/detail

- `< lg`: list **or** detail (never side-by-side).
- Back control returns to list; search/filter state remains in client state.

---

## Search / filter strategy

- Search: `GET /api/communication/inbox/conversations?search=…` (debounced).
- Quick filters: canonical `ALL`, `UNREAD`, `ASSIGNED_TO_ME`, `UNASSIGNED`, `EMAIL`.
- Active filters indicated via `aria-pressed` on chips; **Filter zurücksetzen** when search or non-`ALL` filter is active.
- OPEN/RESOLVED: managed per conversation (resolve/reopen actions), not a list filter (no list API filter exists).

---

## Conversation hierarchy (list)

1. Participant label (matched Person/Sponsor or latest inbound From)
2. Subject
3. Preview text
4. Timestamp
5. Unread (weight + dot + screen reader text)
6. Assignment hint (mir / name / unassigned)

List enrichment uses a single Prisma `findMany` include (latest inbound message `take: 1`, matched contacts, assignee) — not full detail/history per row.

---

## Unread semantics

Per-user read state via `CommunicationCenterConversationReadState` (COMM-15). Opening a conversation POSTs `/read` and clears unread locally. Provider IMAP Seen flags are not used.

---

## Assignment

Display-only hints in list; manage actions in detail header when `communication.inbox.manage` (or tenant admin) is granted:

- Mir zuweisen / Zuweisung entfernen → `POST …/assign`
- Uses existing assignee membership checks (tenant-isolated)

---

## Message timeline

- Inbound vs outbound differentiated by alignment/surface (not chat bubbles).
- HTML bodies render through existing `bodyHtmlSanitized` from COMM-15 ingestion (sanitizer unchanged).
- Plain text fallback when no sanitized HTML.

---

## Reply UX

When `communication.inbox.reply` (or manage/admin path):

- Composer under timeline; send uses `POST …/reply` with idempotency key (COMM-15 transport).

---

## Resolve / reopen

When manage permission:

- **Als erledigt markieren** → `RESOLVED`
- **Wieder öffnen** → `OPEN`

---

## Permission mapping

| Capability | Permission keys |
|------------|-----------------|
| View inbox | `communication.inbox.view` (+ manage/reply/settings/admin paths) |
| Reply | `communication.inbox.reply`, manage, tenant admin |
| Assign / status | `communication.inbox.manage`, tenant admin |
| Postfach-Einstellungen | `communication.inbox.settings`, tenant admin |

Server routes remain authoritative; UI hides affordances without permission.

---

## Performance

- Cursor pagination preserved (`nextCursor`, “Weitere Konversationen”).
- Detail fetch only for selected conversation ID.
- No full message history loaded for list rows.

---

## Security invariants (unchanged)

- `lib/communication/inbox/html-sanitizer.ts` — script/event handler/javascript URL stripping, remote image blocking.
- Tenant scoping on all inbox services/APIs.
- Mailbox credentials / encryption key handling untouched.

---

## Scope boundaries

No IMAP/sync/schema/mailbox/hub/mitteilungen changes. Presentation + list projection enrichment only.

---

## Related packages

- SCE-COMM-UX-01 — module shell & header pattern
- SCE-COMM-UX-02 — Communication Hub (unaffected)
- SCE-COMM-15 — canonical inbox architecture
