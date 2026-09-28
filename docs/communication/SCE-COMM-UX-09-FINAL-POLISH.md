# SCE-COMM-UX-09 — Responsive, Accessibility & Final Polish

**Programme:** SCE COMM  
**Branch:** `cursor/comm-ux-09-final-polish`  
**Base:** `STAGE` @ `9e65f890bafe69d23bfb7eb1573f974b15f6c76a`

---

## Scope

Final UX hardening across the Communication workspace (no new domain capabilities, no schema changes).

Surfaces: Hub, Kommunikationscenter, Neue Nachricht, Mitteilungen, Kampagnen, Zielgruppen, Vorlagen, E-Mail-Absender, Persönliche Signatur.

---

## Route inventory

| Surface | Route | Primary action |
|--------|--------|----------------|
| Hub | `/dashboard/communication` | Kommunikationscenter / module links |
| Kommunikationscenter | `/dashboard/communication/inbox` | Neue Nachricht |
| Neue Nachricht | `/dashboard/communication/inbox/new` | Senden |
| Postfach-Einstellungen | `/dashboard/communication/inbox/settings` | Postfach speichern |
| Mitteilungen | `/dashboard/communication/mitteilungen` | Neue Mitteilung |
| Kampagnen | `/dashboard/communication/kampagnen` | Neue Kampagne |
| Zielgruppen | `/dashboard/communication/zielgruppen` | Neue Zielgruppe |
| Vorlagen | `/dashboard/communication/vorlagen` | Neue Vorlage |
| E-Mail-Absender | `/dashboard/communication/email-sender` | Speichern |
| Persönliche Signatur | `/dashboard/communication/personal-signature` | Speichern |

Shared primitives: `CommunicationWorkspaceHeader`, `CommunicationContentSurface`, SCE surface tokens.

---

## Responsive decisions

| Width band | Changes |
|------------|---------|
| Desktop | Existing split inbox layouts preserved (INBOX-02); list tables use horizontal scroll where needed |
| Tablet (~768–1180) | Vorlagen/Zielgruppen tables wrapped in `overflow-x-auto` to avoid clipped columns |
| Mobile (~320–430) | Unchanged master/detail inbox; primary actions remain in header stacks |

Touch: removed non-functional icon-only «Weitere Aktionen» controls that had inadequate purpose and tiny hit areas without behavior.

---

## Accessibility

- **Terminology:** Usage panels map raw enum statuses to German labels (`usage-reference-display.ts`); mailbox settings use `inboxMailboxStatusLabel`.
- **Copy:** Removed visible `COMM-*` ticket references from E-Mail-Absender help and Reply-To notes.
- **Inbox reading pane:** Subject exposed as focusable `h2`; focus moves on conversation load (not on every re-render).
- **View menu:** Closing the inbox layout/density menu returns focus to the trigger button.
- **Motion:** Inbox view control uses `motion-safe` / `motion-reduce` transition classes.
- **HTML messages:** Prose container uses `break-words` and scrollable table overflow to reduce horizontal pane overflow.

---

## Loading / empty / error

- Reading pane empty copy uses **mailbox totals** (`mailboxCounts`) so filtered-empty lists still prompt «Wählen Sie eine Konversation aus» when the mailbox has items.
- Removed unreachable loading/error branches inside the loaded detail branch (hygiene after UX-03R2).

---

## Navigation & headers

- Postfach-Einstellungen aligned with `CommunicationWorkspaceHeader` + `CommunicationContentSurface` (consistent eyebrow «Kommunikation»).
- Persönliche Signatur wrapped in `CommunicationContentSurface` for panel parity.

---

## Performance

No refetch behavior changed. Bounded usage lists unchanged. Inbox layout/density persistence semantics preserved (INBOX-02).

---

## Deferred (non-UX-09)

- Platform template admin components under `components/admin/communication/templates/` remain unwired to routes (pre-existing).
- Full pixel-perfect responsive validation without manual browser testing.

---

## Validation

- Targeted Vitest: `comm-ux-09-final-polish.test.tsx` plus Communication regression suites listed in package scripts.
- `npx prisma validate`, `npx prisma generate`, `APPLY_DATABASE_MIGRATIONS=false npm run build`.
- No remote DB writes, migrations, seeds, or real email sends during UX-09 validation.

---

## Background

Canonical asset: `/images/background/SCE_background.png?v=2`  
SHA256: `583698dfdf8562c192ef1f1b8319c3681e888d13d049ee2ac6c96d7cbf76eb09` (unchanged).
