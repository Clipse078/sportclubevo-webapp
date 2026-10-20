# SCE-DESIGN-SYSTEM-03 — Workspace / Surface / Navigation System

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-03` |
| **Predecessor** | `SCE-DESIGN-SYSTEM-02` (**CLOSED / ACCEPTED / MERGED**, PR **#880**) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#881** → **STAGE**; merge `5522cfee822339d5ac0d45957df5c63b10c35f3c`) |
| **`DS03_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-design-system-03-workspace-surface-navigation` (merged) |
| **Baseline STAGE (pre-merge)** | `e54213bce121b50db5aae8891d821faabecac75d` |
| **Accepted implementation HEAD (`FEATURE_HEAD`)** | `46de14ffcbc089c773928234e60e6c3679f0022e` |
| **Closure commit** | `e6aac4cad64ff802280fc11f3e1e028dc7de2b66` |
| **STAGE merge commit** | `5522cfee822339d5ac0d45957df5c63b10c35f3c` |
| **PR** | **#881** — **MERGED** |
| **Successor** | **`SCE-DESIGN-SYSTEM-04`** — Cards & Information Presentation ([doc](./SCE-DESIGN-SYSTEM-04.md)) — **CLOSED / ACCEPTED** (PR **#882**) |
| **Foundation consumed** | DS-02 `app/globals.css` + `lib/design-system/sce-foundation-contract.ts` |

**PO closure:** `PO_WORKSPACE_SYSTEM_REVIEW = PASS` · `PO_BREADCRUMB_SYSTEM_REVIEW = PASS` · `PO_CONTEXT_TAB_SYSTEM_REVIEW = PASS` · `PO_NAVIGATION_ARCHITECTURE_REVIEW = PASS` · `MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED` · `SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED`

**Programme:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-05`** — Forms & Controls

---

## PO acceptance (final closure)

Product Owner accepts the submitted DS-03 implementation at **`46de14ffcbc089c773928234e60e6c3679f0022e`**. No redesign during closure — documentation and programme truth only.

| Field | Value |
| --- | --- |
| `PO_WORKSPACE_SYSTEM_REVIEW` | **PASS** |
| `PO_BREADCRUMB_SYSTEM_REVIEW` | **PASS** |
| `PO_CONTEXT_TAB_SYSTEM_REVIEW` | **PASS** |
| `PO_NAVIGATION_ARCHITECTURE_REVIEW` | **PASS** |
| `ACTIVITY_TAB_ARROW_KEY_ACCESSIBILITY` | **IMPLEMENTED** (DS-01 P0 `LEGACY-A11Y-TABS-001` resolved — not deferred to DS-09) |
| `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE` | **YES** |
| `COMMUNICATION_IS_UNIVERSAL_PAGE_TEMPLATE` | **NO** |

**Canonical architecture (locked):**

```text
AppShellNavigation → SceBreadcrumbs → SceWorkspaceHeader → SceContextTabs (when semantic) → workspace content
```

Composition primitives: **`SceWorkspaceChrome`** · **`SceWorkspaceSurface`** · **`PageShell`** · **`SceBreadcrumbs`** · **`SceContextTabs`**

**Domain-specific exceptions (interim — DS-10 mandatory review):** `TeamCockpitNav` · `ProgrammeViewSwitcher` · `CommunicationInboxToolbar` · composer `localNavigation`. **`DOMAIN_SPECIFIC_REVIEW_REQUIRED_AT_DS10 = YES`**. **`TeamCockpitNav`** flagged for review against future canonical Team workspace IA (Übersicht · Kader · Programm · Resultate · Rangliste · Trainerteam · Kommunikation · Dokumente · Administration · Mehr — no placeholder tabs in DS-03).

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

### DS-03 implementation notes (engineering)

| Primitive | Module |
| --- | --- |
| `SceBreadcrumbs` | `components/sce/navigation/SceBreadcrumbs.tsx` |
| `SceWorkspaceHeader` | `components/sce/workspace/SceWorkspaceHeader.tsx` |
| `SceWorkspaceChrome` | `components/sce/workspace/SceWorkspaceChrome.tsx` |
| Context tab route mode | `ContextTabNavigationConfig.tabRoutes` |
| Legacy inventory | [`SCE-DESIGN-SYSTEM-03-MIGRATION-INVENTORY.md`](../design/SCE-DESIGN-SYSTEM-03-MIGRATION-INVENTORY.md) |
| Guardrails | `lib/design-system/__tests__/sce-design-system-03-workspace-navigation.test.ts` |

**Representative migrations (DS-03):** Mein Programm workspace chrome; Person detail `SceContextTabs`; Roles admin route tabs; Communication header alignment; Documents `WorkspaceBreadcrumbs`.

**Activity tabs:** `SceContextTabs` arrow-key navigation (`ArrowLeft` / `ArrowRight` / `Home` / `End`) — DS-01 P0 a11y closure.

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
- [`SCE-DESIGN-SYSTEM-04.md`](./SCE-DESIGN-SYSTEM-04.md)
- [`SCE-WORKSPACE-SURFACE-STANDARD.md`](../design/SCE-WORKSPACE-SURFACE-STANDARD.md)
- [`SCE-CONTEXT-TABS-STANDARD.md`](../design/SCE-CONTEXT-TABS-STANDARD.md)
- [`SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md`](../design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md)

---

## Acceptance criteria

- [x] Canonical workspace composition (`SceWorkspaceChrome`, `SceWorkspaceHeader`, `SceWorkspaceSurface`, `PageShell`)
- [x] Canonical breadcrumbs (`SceBreadcrumbs`) — product-wide language; alias compatibility only
- [x] `SceContextTabs` adoption architecture + representative migrations (Mein Programm, Person, Roles, Communication, Documents, activity tabs)
- [x] Activity tab arrow-key accessibility (DS-01 P0 closure)
- [x] Migration inventory for DS-10 gate
- [x] Guardrail tests (`sce-design-system-03-workspace-navigation.test.ts`)
- [x] PO acceptance (PO-owned UAT — **PASS**; Cursor skipped per closure policy)

---

## Verification (DS-03 closure)

Regression gate: DS-01 architecture guardrails · DS-02 foundation guardrails · DS-03 workspace/navigation guardrails · `SceContextTabs` / `SceBreadcrumbs` · Roles admin tabs · Person workspace · activity/navigation presentation · binary-control standard. `prisma validate`, `prisma generate`, production build (`NODE_OPTIONS=--max-old-space-size=8192`) — **PASS** at closure.

---

## Governance (closure template)

| Field | DS-03 value |
| --- | --- |
| `SCE_DESIGN_SYSTEM_COMPLIANCE` | **PASS** (workspace/navigation scope) |
| `WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE` | **PASS** |
| `BINARY_CONTROL_COMPLIANCE` | **PASS** |
| `NEW_BINARY_CHECKBOXES` | **0** |
| `CANONICAL_TOGGLES_USED` | **YES** |
| `PARALLEL_PATTERN_INTRODUCED` | **NO** |
| `DOMAIN_SPECIFIC_REVIEW_REQUIRED_AT_DS10` | **YES** |
| `PRODUCT_WIDE_WORKSPACE_MIGRATION_REQUIRED` | **YES** |
| `UNEXPLAINED_LEGACY_WORKSPACES_ALLOWED_AT_DS10_CLOSURE` | **NO** |
| `DATABASE_MIGRATION_REQUIRED` | **NO** |
| `SCHEMA_DRIFT` | **NO** |
| `PERSISTENT_TEST_DATA` | **0** |
| `PROD` | **UNTOUCHED** |

```text
DS03_STATUS = CLOSED / ACCEPTED / MERGED
SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS
NEXT_PACKAGE = SCE-DESIGN-SYSTEM-05 — Forms & Controls
WORKSPACE_SYSTEM_PRODUCT_WIDE = YES
BREADCRUMB_SYSTEM_PRODUCT_WIDE = YES
CONTEXT_TABS_PRODUCT_WIDE_WHERE_SEMANTIC = YES
LOCAL_PARALLEL_WORKSPACE_SYSTEMS_ALLOWED = NO
MANUAL_UAT_BY_CURSOR = SKIPPED_PO_OWNED
SCREENSHOTS_BY_CURSOR = SKIPPED_PO_OWNED
```
