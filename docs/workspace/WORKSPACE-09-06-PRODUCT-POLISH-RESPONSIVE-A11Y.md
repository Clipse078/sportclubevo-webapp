# WORKSPACE-09-06 — Responsive UX, resizable panes, favorites/recent, a11y, i18n

**Branch:** `cursor/workspace-09-product-completion-ux`  
**PR:** #704 (draft, base STAGE)

## Benchmark (Dropbox / OneDrive / SharePoint)

### Adopted patterns

- Three-pane mental model: navigation · list · inspector
- Drag resize between navigation and content and between content and inspector (desktop xl+)
- Inspector can close without clearing selection; reopen from content header
- Favorites and Recent as first-class hub tabs plus compact header strip
- Secondary star affordance (row + overflow + folder inspector)
- Narrow viewports: folder drawer + inspector sheet; content-first
- Local persistence of pane widths and inspector visibility (no schema)

### Rejected patterns

- Cloning vendor visual chrome or marketing empty-state illustrations
- Favorite/recent as authorization shortcuts
- Permanent idle drop-zone chrome
- Server-side user preference schema for pane widths (W09-06 scope)

### SCE-specific patterns

- Club/organisation lifecycle navigation (Aktiv / Archiviert / Papierkorb) unchanged
- German reference copy via `next-intl` (`messages/de.json`)
- ACL + Club Admin tenant-scoped MANAGE preserved from W09-04A

## Responsive architecture

| Viewport | Navigation | Content | Inspector |
|----------|------------|---------|-----------|
| xl+ (≥1280px) | Inline, resizable | Flexible center | Inline, resizable, toggle |
| lg (1024–1279) | Inline, resizable | Flexible | Sheet overlay |
| < lg | Sheet drawer | Full width | Sheet overlay |

Components: `WorkspaceThreePaneLayout`, `WorkspaceActiveBrowseLayout`, `WorkspaceClientShell` (`resizableLayout`).

## Pane persistence

Keys in `lib/workspace/ui/workspace-pane-preferences.ts` (localStorage, user-scoped in browser):

- `sce-workspace-nav-width`
- `sce-workspace-inspector-width`
- `sce-workspace-inspector-open`

## Inspector behavior

Selection and inspector visibility are independent. Closing the inspector does not deselect the document. Toggle: content header (xl), mobile details button, inspector pane close control.

## Favorites / Recent

- Canonical services: `favorites-service`, `recent-service` (auth-filtered lists)
- APIs: `GET/POST /api/workspace/favorites`, `GET/POST /api/workspace/recent`
- Hub tabs: `?hub=favorites` | `?hub=recent` (browse default)
- Recent recording: `useWorkspaceRecentRecorder` on folder/document context in `WorkspaceClientShell`
- List DTOs include `name` and `parentFolderName` for disambiguation

## + Neu decision

`+ Neu` menu contains **Ordner erstellen** and **Datei hochladen** (when upload allowed). Primary **Hochladen** button remains for discoverability.

## Accessibility

- Resize handles: `role="separator"`, keyboard arrows (8px / shift 32px)
- Sheet focus trap (existing `Sheet` primitive)
- Favorite toggle: `aria-pressed`, accessible name
- Discovery hub lists: semantic headings and list markup

## i18n

Workspace strings extended under `Workspace.discovery`, `Workspace.favorites`, `Workspace.layout`, `Workspace.actions.trash*`, `Workspace.commandBar.uploadMenuItem`. Architecture remains single-locale MVP (`i18n/request.ts` → `de`); EN/FR/IT follow same key structure when locales are enabled.

## Security

- No client-side authorization; favorites/recent filtered server-side
- No schema changes; no STAGE writes

## Tests

- `lib/workspace/__tests__/w09-06-product-polish.test.ts`
- `lib/workspace/ui/__tests__/workspace-pane-preferences.test.ts`
- Existing W09/W08/W07/W06 sentinels (regression)

## W09-07 boundary

Mobile-ready DTO/API contract, final security acceptance, milestone sign-off — **not** in W09-06.
