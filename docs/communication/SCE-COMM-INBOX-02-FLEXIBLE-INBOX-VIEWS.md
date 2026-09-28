# SCE-COMM-INBOX-02 — Flexible Inbox Views

Personal workspace layouts for the Kommunikationscenter (Outlook-class productivity).

## Six layouts

| Layout | Behavior | Default list share |
| --- | --- | --- |
| `STANDARD` | Side-by-side list and reading pane | 38% list |
| `READING_LARGE` | Side-by-side, wider reading pane | 28% list |
| `LIST_LARGE` | Side-by-side, wider list | 50% list |
| `BOTTOM` | List above reading pane (horizontal splitter) | 42% list height |
| `FULL_READING` | Full-width list; selected conversation opens full-width reading | n/a |
| `LIST_ONLY` | Full-width list only until a conversation is opened | n/a |

Selecting the same preset again from **Ansicht** resets that preset’s recommended split ratio.

Custom drag positions stay within the active preset (no seventh “Custom” layout).

## Density

Per-user density (`COMPACT`, `STANDARD`, `SPACIOUS`) adjusts list row spacing only. Unread, star, participant, subject, and metadata remain visible.

## Ownership and persistence

- Preferences belong to the **authenticated user** (scoped by `tenantId` + `userId`).
- Never mailbox-wide, tenant-wide, or conversation-wide.
- **Server authoritative:** `UserCommunicationInboxWorkspacePref` via `/api/communication/inbox/workspace-preferences`.
- Optional `localStorage` cache (`sce-comm-inbox-workspace-pref-v1`) for faster first paint only.

Defaults when nothing is stored: `STANDARD` layout, `STANDARD` density, 38% list split.

## Ansicht control

Compact toolbar menu (**Ansicht**) with layout presets, density presets, and **Auf Standard zurücksetzen**. Current options are indicated with `menuitemradio` + `aria-checked`.

## Resizable panes

- Vertical splitter: `STANDARD`, `READING_LARGE`, `LIST_LARGE`.
- Horizontal splitter: `BOTTOM`.
- Pointer drag + keyboard (`ArrowLeft`/`ArrowRight` or `ArrowUp`/`ArrowDown`).
- `role="separator"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.
- Persist split on interaction end (not per pointer move).
- Minimum practical panes: ~280px list, ~420px reading.

## Responsive behavior

- **Mobile (`< lg`):** always master/detail; no splitter; desktop preference unchanged.
- **Narrow desktop:** when side-by-side minimums cannot be met, temporary master/detail; stored preference unchanged.
- Returning to sufficient width restores the stored layout and split.

## COMM-UX-03R2

Reading-pane state machine unchanged: placeholder, loading, error+retry, loaded timeline; stale response guard; read-after-load.

## COMM-INBOX-01

Mailbox organization, search, filters, star/read/archive/trash, bulk actions, assignment, and workflow actions remain independent of layout.

## Performance

Layout/density/split changes do not refetch conversations. Server writes occur on preset change, density change, split completion, or reset — not during drag pointer moves.

## BG-01R2

This package does not modify the authenticated background contract:

- Path: `/images/background/SCE_background.png`
- Rendered URL: `/images/background/SCE_background.png?v=2`
- SHA256: `583698dfdf8562c192ef1f1b8319c3681e888d13d049ee2ac6c96d7cbf76eb09`
