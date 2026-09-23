# WORKSPACE-09-06R1 — Interaction quality (Dropbox benchmark + SCE differentiation)

**Branch:** `cursor/workspace-09-product-completion-ux`  
**Baseline STAGE:** `704a7c4571524bd0fd2dc10df238110a23a3201b`

## Dropbox benchmark observations

| Pattern | Decision |
|---------|----------|
| Quiet rows at rest | **Adopted** — inline actions hidden until hover/focus/selection; reserved action width |
| Contextual row actions | **Adopted** — Download, Favorite, More (+ rename affordance on name for EDIT) |
| Complete overflow menu | **Adopted** — grouped document menu incl. task/requirement, link copy, lifecycle |
| Recent / Favorites as daily nav | **Adopted** — sidebar Work section; demoted top segmented lifecycle |
| Archive/trash secondary | **Adopted** — Verwaltung section in sidebar |
| Optional details panel | **Adopted** — inspector defaults closed (local preference) |
| View density controls | **Adopted** — List + Compact + column toggles (localStorage) |
| Grid/tiles | **Deferred** — no placeholder control |
| Suggested cards | **Rejected** — no canonical recommendation source |
| Universal search | **Rejected** — out of scope (SEARCH roadmap) |
| Dropbox branding | **Rejected** — SCE visual language retained |

## SCE differentiation preserved

- Zugriff verwalten (not public “Teilen”)
- Aufgabe / Anforderung in document overflow (W09-02)
- Inspector tabs: Vorschau, Details, Versionen, Zugriff, Aufgaben, Anforderungen
- Authorization algebra unchanged; access dialog is presentation-only refinement
- Favorites/Recent canonical APIs (`?hub=favorites|recent`)

## Navigation hierarchy

```
Workspace
  Arbeit: Zuletzt verwendet, Favoriten
  Ordner: tree
  Verwaltung: Archiviert, Papierkorb
```

“Aktiv” removed from dominant chrome; active lifecycle is implicit during folder browse.

## Security invariants

- No client-side authorization changes
- Copy link = internal URL only; no grant on copy
- Club Admin actor authority shown separately from configured ACL (W09-04A)

## Tests

- `w09-06r1-interaction-quality.test.ts` — row rename auth, overflow reachability
- `WorkspaceSidebarNavigation.test.tsx` — nav sections
- `workspace-view-preferences.test.ts` — density/columns persistence
- Existing W09-04 access dialog tests retained

## W09-07 readiness

Core desktop interaction gaps addressed. W09-07 remains mobile DTO/API boundary, available-actions contract, final security/product review.
