# SCE-DESIGN-SYSTEM-03 — Workspace / Surface / Navigation System

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-03` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-02` (**CLOSED / ACCEPTED / MERGED**, PR **#880**) |
| **Status** | **NOT STARTED** |
| **Foundation consumed** | DS-02 `app/globals.css` + `lib/design-system/sce-foundation-contract.ts` |

---

## Mission

Turn the **DS-02 code-backed foundation** into the **canonical product-wide workspace language** for SportClubEvo — without treating Communication as a universal page template.

**Core principle (locked at DS-02 closure):** **ONE CANONICAL SCE WORKSPACE SYSTEM** across the webapp. Modules share hierarchy, surfaces, headers, breadcrumbs (where meaningful), contextual navigation (`SceContextTabs` where semantic), spacing, typography, action hierarchy, responsive behaviour, and accessibility — while retaining **purpose-built domain compositions** where required.

| Flag | Value |
| --- | --- |
| `WORKSPACE_SYSTEM_PRODUCT_WIDE` | **YES** |
| `BREADCRUMB_SYSTEM_PRODUCT_WIDE` | **YES** |
| `BREADCRUMB_ROLLOUT_OWNER` | **SCE-DESIGN-SYSTEM-03** |
| `CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC` | **YES** |
| `CONTEXT_TABS_CANONICAL` | **SceContextTabs** |
| `CONTEXT_TAB_ROLLOUT_OWNER` | **SCE-DESIGN-SYSTEM-03** |
| `LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED` | **NO** |
| `BREADCRUMBS_CANONICAL_NAVIGATION_LANGUAGE` | **YES** |

---

## Canonical workspace hierarchy

```text
GLOBAL NAVIGATION
  → BREADCRUMBS
  → WORKSPACE / PAGE HEADER
  → CONTEXT TABS (when semantically appropriate)
  → WORKSPACE CONTENT
```

| Layer | Question answered |
| --- | --- |
| Global navigation | Which major SCE domain? |
| Breadcrumbs | Where in the product hierarchy? |
| Workspace / page header | What context/object/workspace? |
| Context tabs | What views/actions within this context? |
| Workspace content | Operational UI |

Layers **complement** each other — no duplicated titles, competing tab rows, or redundant wayfinding.

**Important:** **All workspaces ≠ all workspaces require tabs.** Flat or single-purpose workspaces must not receive artificial tabs for visual consistency alone.

---

## Minimum scope (DS-03)

1. **Canonical workspace composition** — module canvas, page frame, section/panel rhythm on DS-02 tokens.
2. **Canonical page/workspace headers** — calm title, description, primary/secondary actions (`PageShell` / header recipes).
3. **Canonical breadcrumbs** — component/pattern, hierarchy semantics, clickable ancestors, current item, separators, truncation, responsive collapse, mobile parent/back, accessibility, relationship to Navbar/header/tabs.
4. **`SceContextTabs` adoption architecture** — migrate legacy/local tab shells; extend `SceContextTabs` when a reusable capability is missing; document domain exceptions.
5. **Relationship to `AppShellNavigation`** — global nav vs module workspace; no parallel shell models.
6. **Responsive workspace navigation** — tier behaviour aligned with `SCE_MOBILE_SHELL_MAX_WIDTH_PX` and page gutters.
7. **Mobile hierarchy / navigation behaviour** — collapse breadcrumbs/tabs/header sensibly on small viewports.
8. **Workspace surface composition** — `SceWorkspaceSurface`, panel/card elevation on semantic surfaces.
9. **Removal/migration plan** for parallel workspace navigation patterns (see [`SCE-UI-LEGACY-REGISTER.md`](../design/SCE-UI-LEGACY-REGISTER.md), migration matrix).
10. **Representative adoption** across **multiple substantially different domains** (not Communication-only).

---

## Visual reference vs template

| Source | Role |
| --- | --- |
| **`/dashboard/communication`** (+ email-sender settings) | **Primary positive visual reference** — principles (dark navy, layered surfaces, restrained accent, calm hierarchy) |
| Communication hub layout | **Not** a universal page template |

**Preserve domain-specific compositions:**

- Tournament Planner operational density
- Activity Composer workflow
- Programme Engine + programme list-row grammar
- SCE activity card family + tournament fixture presentations
- Permission matrices, Wochenplaner density, team cockpit route-tab models where domain-justified

---

## Out of scope (DS-03)

- Full DS-10 product-wide visual migration (register closure)
- Mass binary-checkbox → toggle migration (DS-05 / DS-10)
- DS-07 unified empty/error/status families
- Automated AST compliance (DS-11)

---

## DS-10 carry-forward gate

`PRODUCT_WIDE_WORKSPACE_MIGRATION_REQUIRED = YES`

By DS-10 closure, every applicable workspace must be:

- **(A)** migrated to the canonical SCE workspace system;
- **(B)** already compliant;
- **(C)** explicitly classified as a justified domain-specific composition that still consumes canonical foundations/navigation semantics.

`UNEXPLAINED_LEGACY_WORKSPACES_ALLOWED_AT_DS10_CLOSURE = NO` — no accidental **(D)** forgotten legacy UI.

---

## Related

- [`SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md)
- [`SCE-DESIGN-SYSTEM-02.md`](./SCE-DESIGN-SYSTEM-02.md)
- [`SCE-WORKSPACE-SURFACE-STANDARD.md`](../design/SCE-WORKSPACE-SURFACE-STANDARD.md)
- [`SCE-CONTEXT-TABS-STANDARD.md`](../design/SCE-CONTEXT-TABS-STANDARD.md)
- [`SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md`](../design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md)
