# SCE-COMM-UX-02 — Communication Hub Redesign

## UX rationale

The Kommunikation landing page (`/dashboard/communication`) previously read like a technical feature catalogue: six similarly weighted cards, repetitive “Verfügbar” badges, and tag clouds describing implementation capabilities (IMAP, Unified Inbox, Push, and similar). COMM-UX-02 reframes the hub around **user tasks** and **workspace entry**, not internal module names.

## Information hierarchy

1. **What can I do now?** — Primary actions in `CommunicationWorkspaceHeader`: *Neue Mitteilung* (primary) and *Neue Kampagne* (secondary), permission-gated via send route contracts.
2. **Kommunikationscenter** — Prominent operational surface for inbound/outbound conversation handling.
3. **Kommunikation** — Mitteilungen and Kampagnen as peer operational areas.
4. **Organisation & Wiederverwendung** — Zielgruppen and Vorlagen for reuse.
5. **Einstellungen** — E-Mail-Absender (administration), visually de-emphasized.

Capabilities the user cannot access are **omitted**, not shown as “Demnächst” placeholders.

## Primary actions

| Action | Route | Permission contract |
|--------|--------|---------------------|
| Neue Mitteilung | `/dashboard/communication/mitteilungen/new` | `CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS` |
| Neue Kampagne | `/dashboard/communication/kampagnen/new` | `CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS` |

View-only club users see list destinations but not create actions.

## Capability grouping

Implemented in `CommunicationHubView` with semantic section headings (H2) and calm link cards (`CommunicationHubCapabilityLink`). No capability tag lists on the hub.

## Administration separation

E-Mail-Absender lives under **Einstellungen** with a single-column layout (`lg:max-w-xl`) so configuration does not compete with daily communication work.

## Permission-aware behavior

`resolveCommunicationHubCapabilityAccess()` in `lib/communication/hub-access.ts` remains the single resolver for hub visibility. COMM-UX-02 extends it with `mitteilungenSend` and `kampagnenSend` aligned to `CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS`. Hub route gate unchanged: `COMMUNICATION_HUB_ROUTE_PERMISSIONS`.

## Responsive behavior

- Desktop: two-column grids for capability groups; inbox band with horizontal action.
- Tablet/mobile: single-column flow; primary actions remain in the header stack (`CommunicationWorkspaceHeader`).

## Accessibility

- One H1 (“Kommunikation”) via shared workspace header.
- Section H2s for inbox, communication, organisation, and settings.
- Whole-card links use `aria-label` with explicit destinations (e.g. “Mitteilungen öffnen”).
- Visible focus rings; icons marked decorative where text carries meaning.
- Motion uses `motion-safe:` prefixes for hover/focus transitions.

## Boundaries (out of scope)

- No changes to Kommunikationscenter, Mitteilungen/Kampagnen lists or composers, Zielgruppen, Vorlagen, or E-Mail-Absender **feature pages**.
- No database schema, migrations, delivery, IMAP, or new analytics/counts on the hub.
- No invented hrefs; only documented create/list routes are linked.

## Key files

- `app/(admin)/dashboard/communication/page.tsx`
- `components/admin/communication/hub/*`
- `lib/communication/hub-access.ts`
- `app/(admin)/dashboard/communication/__tests__/comm-ux-02-communication-hub.test.tsx`
