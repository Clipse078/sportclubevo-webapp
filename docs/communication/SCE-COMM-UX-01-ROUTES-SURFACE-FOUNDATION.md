# SCE-COMM-UX-01 — Communication Routes & UX Foundation

## Route defect root cause

The Mitteilungen, Kampagnen and Vorlagen routes were implemented with `requireAnyPermission` gates that only accepted narrow Communication permission keys (`communication.club.view` / `.send`, `communication.templates.view` / `.manage`).

The Kommunikation hub, Kommunikationscenter, Zielgruppen and E-Mail-Absender already treated **tenant club administrators** (`users.manage_memberships`) as authorized entry points (see `ZIELGRUPPEN_VIEW_ROUTE_PERMISSIONS` and `INBOX_VIEW_PERMISSIONS`).

Users who opened the hub via tenant administration saw **Verfügbar** CTAs but were redirected to `/dashboard` on the three club/template list routes — a permission mismatch between hub CTA visibility and page authorization.

## Corrected route contract

| Route | Purpose | Route permissions |
| --- | --- | --- |
| `/dashboard/communication/mitteilungen` | Organisation communication list/workspace | `CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS` |
| `/dashboard/communication/kampagnen` | Campaign list/workspace | `CLUB_COMMUNICATION_VIEW_ROUTE_PERMISSIONS` |
| `/dashboard/communication/vorlagen` | Reusable template list/workspace | `PLATFORM_TEMPLATE_VIEW_ROUTE_PERMISSIONS` |

Send/manage sub-routes use `CLUB_COMMUNICATION_SEND_ROUTE_PERMISSIONS` and `PLATFORM_TEMPLATE_MANAGE_ROUTE_PERMISSIONS` with the same tenant-administration alignment.

Service-layer authorization (`resolveClubCommunicationAuthorization`, `resolvePlatformTemplateAuthorization`) remains unchanged and continues to enforce send/manage capabilities.

## Permission alignment

- Hub capability cards resolve visibility via `resolveCommunicationHubCapabilityAccess()` — links render only when the user holds route-aligned permissions.
- Hub entry remains `COMMUNICATION_HUB_ROUTE_PERMISSIONS` (tenant administration + inbox view family).

## Communication page shell

- `app/(admin)/dashboard/communication/layout.tsx` applies `SCE_DASHBOARD_MODULE_PAGE_SURFACE` for all Communication routes (including inbox).
- Pages continue to compose `PageShell` for gutters and max-width.

## Header pattern

`CommunicationWorkspaceHeader` (`components/admin/communication/shared/CommunicationWorkspaceHeader.tsx`):

- Breadcrumb trail (Dashboard → Kommunikation → …)
- Eyebrow + semantic H1 + short description
- Primary/secondary actions via `PageActions` (responsive stack)

## Content surface pattern

`CommunicationContentSurface` wraps list/working areas with `SCE_SURFACE_STANDARD_PANEL` for readable contrast over the decorative authenticated shell.

## Empty-state convention

Zero-data list routes render `EmptyState` with German copy and primary CTA:

- Mitteilungen — «Noch keine Mitteilungen» / «Neue Mitteilung»
- Kampagnen — «Noch keine Kampagnen» / «Neue Kampagne»
- Vorlagen — «Noch keine Vorlagen» / «Neue Vorlage»

## Product language

- Removed hub badge «Modul im Aufbau».
- Removed user-facing `COMM-*` package labels from hub capability details.
- Updated hub banner to reflect implemented capabilities.

## Responsive convention

- Header actions stack on small viewports (`flex-col` → `lg:flex-row`).
- Tables use horizontal scroll and progressive column hiding at `md`/`lg`/`xl`.

## Subsequent UX packages (not implemented here)

| Package | Scope |
| --- | --- |
| COMM-UX-02 | Communication Hub |
| COMM-UX-03 | Kommunikationscenter |
| COMM-UX-04 | Mitteilungen |
| COMM-UX-05 | Kampagnen |
| COMM-UX-06 | Zielgruppen |
| COMM-UX-07 | Vorlagen |
| COMM-UX-08 | E-Mail-Absender |
| COMM-UX-09 | Responsive, Accessibility & Final Polish |
