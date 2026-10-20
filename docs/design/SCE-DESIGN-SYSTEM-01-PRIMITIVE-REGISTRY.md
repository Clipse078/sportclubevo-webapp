# SCE Design System v1.0 — Proposed Primitive Registry (DS-01)

> **Status:** Architecture proposal — **not** full product adoption until DS-02+  
> **Baseline STAGE:** `9430a8e7b3bfefc40872e756d7dfe6e6b9cb6f2c`  
> **Master doc:** [`SCE-DESIGN-SYSTEM.md`](./SCE-DESIGN-SYSTEM.md)  
> **Programme:** [`SCE-DESIGN-SYSTEM-01`](../roadmap/SCE-DESIGN-SYSTEM-01.md)

Legend for **canonical status:**

| Status | Meaning |
|--------|---------|
| **CANONICAL** | Modern, reusable — adopt as DS v1.0 without replacement |
| **CANONICAL_REFINE** | Correct architecture — tokenisation / polish in DS-02+ |
| **LEGACY_MIGRATE** | Valid function — migrate to canonical primitive |
| **DUPLICATE** | Overlaps another primitive — consolidate |
| **DOMAIN** | Justified one-off composition on canonical foundations |
| **DEPRECATE** | Remove after migration |

### PO visual reference (DS-01-R1)

| Flag | Value |
| --- | --- |
| `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE` | **YES** |
| `PRODUCT_WIDE_ROLLOUT_TARGET` | **YES** |
| `DARK_NAVY_SCE_LANGUAGE` | **CANONICAL_DIRECTION** |
| `RESTRAINED_ACCENT_USAGE` | **REQUIRED** |

Evidence routes: `/dashboard/communication` · `/dashboard/communication/email-sender`

---

## Communication pattern mapping (formalise — no new components in DS-01)

Repository evidence mapped onto existing DS-01 primitives. Prefer **refinement and tokenisation** in DS-02+ over parallel components.

| Pattern | Evidence | Maps to | DS package | New primitive in DS-01? |
| --- | --- | --- | --- | --- |
| **Module workspace canvas** | `communication/layout.tsx` → `SCE_DASHBOARD_MODULE_PAGE_SURFACE` | WORKSPACE layer in surface hierarchy; aligns with `SceWorkspaceSurface` / `lib/shell/sce-surface-system.ts` tokens | DS-03 | **No** — extend shared module canvas utility |
| **Page frame + calm header** | `PageShell` + `CommunicationWorkspaceHeader` → `PageHeader` / `PageActions` | PAGE + SECTION (title, description, primary/secondary actions) | DS-03 | **No** — generalise header recipe |
| **Elevated working panel** | `CommunicationContentSurface` → `SCE_SURFACE_STANDARD_PANEL` | PANEL layer | DS-03 | **No** |
| **Feature capability card** | `CommunicationHubCapabilityLink` (Mitteilungen, Kampagnen, …) | Composed link-card: icon tile + title + description + tertiary “Öffnen →” affordance on `Card`/surface tokens | DS-04 | **No** — document as **SceFeatureCapabilityCard** composition spec (optional thin wrapper later) |
| **Feature hero / action panel** | `CommunicationHubInboxSection` | SECTION + PANEL with PRIMARY action (`Kommunikationscenter öffnen`) | DS-04 / DS-06 | **No** — pattern spec on `CommunicationContentSurface` |
| **Readiness / configuration status panel** | `EmailSenderWorkspace` Versandbereitschaft + `buildEmailSenderReadinessPresentation` | Future **`SceReadinessStatusPanel`** family (DS-07); headline + summary + overall state + checklist | DS-07 | **No** — architecture only |
| **Status checklist row** | Checklist items (`pass` / `fail` / `warn` / `neutral`) with lucide icon + label + detail + `sr-only` state | Same as readiness rows; overall pill today uses **`AdminStatusPill`** → migrate to **`Badge`** semantic variants (registry DUPLICATE row) | DS-07 | **No** — do not duplicate Badge |
| **Action hierarchy** | Hub: primary filled (`Neue Mitteilung`), secondary bordered (`Neue Kampagne`), hero primary, capability tertiary text link | Map to `Button` variants: PRIMARY / SECONDARY / tertiary link / destructive / icon-button | DS-05 / DS-06 | **No** — audit raw `<Link className="bg-[var(--sce-primary)]…">` in Communication for Button adoption in DS-05 |

**Action levels (semantic):**

| Level | Communication example | Target primitive |
| --- | --- | --- |
| PRIMARY | Neue Mitteilung · Kommunikationscenter öffnen | `Button` primary |
| SECONDARY | Neue Kampagne | `Button` secondary / outline |
| TERTIARY / TEXT | Öffnen → on capability cards | Link styled as text action (tokenised) |
| DESTRUCTIVE | (rare in hub) | `Button` destructive |
| ICON ACTION | Toolbar icons in inbox (separate module) | Icon button sizes (DS-05) |

---

## Foundation

| Primitive | Current implementation | Status | Variants / densities | A11y owner | Responsive owner | New impl required? |
|-----------|------------------------|--------|----------------------|------------|------------------|-------------------|
| Design tokens (CSS) | `app/globals.css` `:root`, `@theme`, activity palettes | **CANONICAL_REFINE** | light/dark admin; activity semantic palettes | contrast tokens | breakpoint tokens in CSS | No — consolidate hard-coded Tailwind in DS-02 |
| Activity semantic colors | `ActivityTypePill`, `lib/sce/activity-composer/semantic-identity.ts` | **CANONICAL** | match-red, training-blue, tournament-orange, club-event-violet | text labels required | pill scales | No |
| Spacing / radius / shadow | `--space-*`, `--radius-*`, `--shadow-*` in globals | **CANONICAL_REFINE** | operational vs readable page modes | — | page gutter tokens | No |
| Overlay / z-index | `lib/ui/sce-overlay-layering.ts`, globals | **CANONICAL** | popover, modal, composer, elevated | focus trap in Dialog/Composer | full-screen composer mobile | No |
| Typography scale | Tailwind + local `text-*` in modules | **CANONICAL_REFINE** | dense planner vs readable admin | heading hierarchy inconsistent in legacy forms | — | Partial — document scale in DS-02 |

---

## Surface & workspace

| Primitive | Current implementation | Status | Notes |
|-----------|------------------------|--------|-------|
| App background | `lib/shell/sce-app-background.ts`, `--sce-app-background-*` | **CANONICAL** | Atmospheric canvas |
| Workspace surface | `SceWorkspaceSurface`, `SCE-WORKSPACE-SURFACE-STANDARD.md` | **CANONICAL** | Tournament surfaces use `lib/sce/tournament/sce-tournament-surface-layout.ts` |
| Page shell / gutters | `PageShell`, `SceApplicationPageGrid`, `lib/shell/sce-page-layout.ts` | **CANONICAL** | `operational` / `readable` / `dashboard` width modes |
| Section / panel | `FormSection`, admin `AdminSurfaceCard`, mixed local `rounded-lg border` | **CANONICAL_REFINE** | Tokenise repeated border/bg recipes (DS-02) |
| Card (generic) | `components/ui/Card.tsx` | **CANONICAL_REFINE** | Activity cards are specialised |
| Dense planner cell | Planning hub blocks, tournament grid cells | **DOMAIN** | Composes canonical activity/tournament presentation |

---

## Navigation

| Primitive | Current implementation | Status | Migration targets |
|-----------|------------------------|--------|-------------------|
| Primary navbar (desktop) | `AppShellNavigation`, `ScePrimaryNavigation`, `SceDomainNavigationPanel` | **CANONICAL** | Do not replace NAVBAR-UPGRADE-01 |
| Mobile primary nav | Bottom nav + `GlobalNavDrawer` | **CANONICAL_REFINE** | Align focus rings / overflow with desktop tokens |
| Context tabs | `SceContextTabs`, `lib/context-tabs` | **CANONICAL** | `PersonDetailTabs`, `RolesAdminTabs` migrated DS-03 |
| Activity navigation | `lib/activity-navigation/configs.ts` | **CANONICAL** | Arrow-key a11y on `SceContextTabs` — **DS03_DONE** |
| Breadcrumbs | `SceBreadcrumbs` (+ `PageBreadcrumbs` alias) | **CANONICAL** | Product-wide rollout continues DS-04–DS-10 |
| Filter rails | Matchcenter, Turniere, Planning hub toolbars | **DOMAIN** | Shared filter-bar primitive optional in DS-08 |

---

## Activity presentation & cards

| Primitive | Current implementation | Status | Densities |
|-----------|------------------------|--------|-----------|
| Presentation model | `lib/sporting-activity-presentation/canonical` | **CANONICAL** | MATCH \| TRAINING \| TOURNAMENT \| CLUB_EVENT |
| SceMatchCard | `components/sporting-activity/SceMatchCard.tsx` | **CANONICAL** | HERO, STANDARD, COMPACT, MICRO, list-row |
| SceTrainingCard | `components/sporting-activity/SceTrainingCard.tsx` | **CANONICAL** | same contract |
| SceTournamentCard | `components/sporting-activity/SceTournamentCard.tsx` | **CANONICAL** | same contract |
| SceClubEventCard | `components/sporting-activity/SceClubEventCard.tsx` | **CANONICAL** | same contract |
| SceTournamentFixturePresentation | `components/sce/tournament/SceTournamentFixturePresentation.tsx` | **CANONICAL** | standard, compact, grid |
| Legacy MatchCard | `components/admin/matchcenter/MatchCard.tsx` | **LEGACY_MIGRATE** | → SceMatchCard |
| Wochenplan category shell | `WochenplanEventCard.tsx` | **LEGACY_MIGRATE** | → ActivityTypePill + canonical cards (01H/DS-10) |
| VeranstaltungCard | `VeranstaltungCard.tsx` | **LEGACY_MIGRATE** | → SceClubEventCard |
| Dashboard today cards | `DashboardTodayEventCards` | **LEGACY_MIGRATE** | → Sce*Card COMPACT |
| Programme list row shell | `SceProgrammeActivityCardShell` | **CANONICAL** | operational list-row |

**Compliance field:** `WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE` — one SCE activity card **family** (four activity components + tournament fixture presentation layer), purpose-built densities; no parallel card architecture.

---

## Identity

| Primitive | Current implementation | Status |
|-----------|------------------------|--------|
| Club crest | `ClubCrest`, `ClubIdentity`, `lib/sporting-data/sce-club-visual-identity.ts` | **CANONICAL** |
| Person avatar | Person header photo / initials patterns in `components/admin/persons/*` | **CANONICAL_REFINE** | Unify avatar primitive in DS-04 |
| Club directory logo | `ClubLogo` in club-team selector | **CANONICAL** | Same crest rules as ClubCrest |

---

## Controls & forms

| Primitive | Current implementation | Status |
|-----------|------------------------|--------|
| Button | `components/ui/Button.tsx` | **CANONICAL_REFINE** | Destructive/loading consistency audit in DS-05 |
| Icon button | Local `button` + lucide patterns | **CANONICAL_REFINE** | Extract shared icon-button sizes in DS-05 |
| Toggle / switch | `SwitchToggle`, `SwitchThumb` | **CANONICAL** | Toggle First for binary settings |
| Checkbox | Native + Tailwind in forms/tables | **DOMAIN** / **LEGACY_MIGRATE** | Multi-select OK; binary settings → toggle |
| Select | `SceToolbarSelect`, native `<select>`, combobox patterns | **CANONICAL_REFINE** | Unify combobox in DS-05 |
| Text input / textarea | Mixed `.fca-*` and Tailwind | **CANONICAL_REFINE** | |
| Date/time (activity) | `SceActivityDateTimeInput`, calendar popover | **CANONICAL** | Composer-owned |
| Segmented control | `SceSegmentedControl` (club directory filters) | **CANONICAL** | Filter/view mode |
| Validation | `ValidationSummary`, inline field errors | **CANONICAL_REFINE** | |

---

## Feedback & system states

| Primitive | Current implementation | Status |
|-----------|------------------------|--------|
| Badge | `components/ui/Badge.tsx`, activity status subcomponents | **CANONICAL** |
| Admin status pill | `AdminStatusPill` | **DUPLICATE** | → Badge semantic variants (DS-07) |
| Toast | `Toast`, `ToastProvider` | **CANONICAL_REFINE** |
| Loading skeleton | `LoadingSkeleton`, domain-specific skeletons | **CANONICAL_REFINE** | Single SCE skeleton vocabulary in DS-07 |
| Empty state | 90+ local empty components (person, billing, homepage-builder, …) | **DUPLICATE** | → `SceEmptyState` family (new, DS-07) |
| Error state | Mixed inline + generic API messages | **CANONICAL_REFINE** | ERROR_UX_MIGRATION inventory in DS-01 roadmap |
| Permission denied | Route guards + inline messages | **CANONICAL_REFINE** | |

---

## Overlays & composer

| Primitive | Current implementation | Status |
|-----------|------------------------|--------|
| Dialog | `Dialog.tsx`, `SceModalOverlay.tsx` | **CANONICAL** |
| Activity composer | `SceActivityComposer`, `/new` routes | **CANONICAL** | Do not rebuild in DS-01 |
| Popover / menu | `Popover`, local dropdowns | **CANONICAL_REFINE** | Nested modal risk audit in DS-06 |
| Sheet | `Sheet.tsx` | **CANONICAL_REFINE** | Person create, drawers |

---

## Data display

| Primitive | Current implementation | Status |
|-----------|------------------------|--------|
| Table / list row | Admin tables, Spiele rows, programme rows | **CANONICAL_REFINE** | Comfortable / compact / dense tiers (DS-08) |
| Planner matrix | Wochenplaner, tournament planung board | **DOMAIN** | Density-first; not cardified |

---

## Iconography

| Primitive | Current implementation | Status |
|-----------|------------------------|--------|
| Primary library | `lucide-react` (600+ modules) | **CANONICAL** |
| SCE semantic icons | `lib/sce/workspace/sce-activity-semantic-icons.ts`, nav icons | **CANONICAL** |
| Resource icons | Pitch / hall / dressing room distinctions in planning | **CANONICAL** | Preserve semantics |
| Local one-off SVGs | Infoboard designer, legacy admin | **LEGACY_MIGRATE** | Map to lucide or SCE icon set |

---

## Registry totals (classification of registry rows)

Report field **`CANONICAL_PRIMITIVES_COUNT`** and related DS-01 closure counts:

| Classification | Count | Report field |
|----------------|------:|--------------|
| **CANONICAL** | **38** | `CANONICAL_PRIMITIVES_COUNT` |
| **CANONICAL_REFINE** | **24** | `CANONICAL_WITH_REFINEMENT_COUNT` |
| **LEGACY_MIGRATE** | **18** | `LEGACY_MIGRATION_COUNT` |
| **DUPLICATE** | **11** | `DUPLICATE_PATTERN_COUNT` |
| **DOMAIN** | **14** | `DOMAIN_SPECIFIC_PATTERN_COUNT` |
| **DEPRECATE** | **6** | `DEPRECATION_CANDIDATE_COUNT` |

*(Counts are registry **rows** in this document, not file counts.)*
