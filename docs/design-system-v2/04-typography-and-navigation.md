# Typography and navigation contracts (DS 2.0)

## 1. Font loading (verified current state)

| Font | Loader | CSS variable | Proposed role |
| --- | --- | --- | --- |
| Inter | `next/font/google` in `app/layout.tsx` | `--font-inter` | Body, UI labels, dense tables |
| Barlow Condensed | `next/font/google` (400–700) | `--font-display` | Page titles, section headings, **team names**, nav labels |

**Finding:** DS 2.0 proposed fonts **match what is already shipped**; gap is **application**, not installation.

## 2. Semantic type roles

Existing utilities in `app/globals.css`:

- `.sce-type-page-title`, `.sce-type-section-title`, `.sce-type-card-title`
- `.sce-type-body`, `.sce-type-body-secondary`, `.sce-type-label`, `.sce-type-metadata`, `.sce-type-caption`, `.sce-type-dense`

Typed references: `lib/design-system/sce-foundation-contract.ts` (DS-02).

### DS 2.0 adjustments (architecture)

| Role | Family | Transform | Weight | Notes |
| --- | --- | --- | --- | --- |
| Page title | Display (Barlow) | uppercase optional per PO | 700 | Tenant `--sce-color-page-title` optional |
| Section heading | Display | uppercase optional | 600–700 | Distinct from page title by size token |
| Card title | Body or display | sentence case default | 600 | Activity cards may use display for fixture |
| Label | Body | uppercase tracking for **field labels only** | 500 | Avoid global uppercase body |
| Body | Body | none | 400–500 | 14px base stays |
| Numeric data | Body | none | 600, `tabular-nums` | Scores, finance |

Re-tune `--sce-fs-*` / `--sce-fw-*` CSS variables for **dark-on-light** contrast when white foundation lands.

### Legacy classes

| Class | Status |
| --- | --- |
| `.fca-eyebrow`, `.fca-heading`, `.fca-subheading` | Tenant-marketing pattern — **do not** spread into admin; fold into tenant public site package |
| `.sce-page-eyebrow`, `.sce-page-title` | Top chrome — align with display font in nav package |

## 3. TeamName contract (non-negotiable)

### Requirement

Every **team name** in UI must render:

```css
font-family: var(--font-display);
font-style: italic;
text-transform: uppercase;
/* weight: 600–700 per density scale */
```

Examples: `FC ALLSCHWIL`, `SC CHAM`, `JUNIOREN F2`, `1. MANNSCHAFT`, `FRAUEN 1`.

### Presentation-layer only

- **Do not** mutate stored `Team.name` or provider sync strings.
- Apply via React primitive or shared class (e.g. `.sce-team-name`).

### Proposed primitive

```tsx
// components/design-system/typography/SceTeamName.tsx (future)
export function SceTeamName({
  children,
  as: Tag = "span",
  truncate = true,
  density = "standard",
}: SceTeamNameProps) { … }
```

**Accessibility:**

- Visible text is uppercase-styled; **accessible name** uses original string (no `aria-label` duplication unless truncation hides meaning).
- `title` attribute when `truncate` clips long user-entered names.

### Rendering contexts to migrate (inventory)

| Context | Current | File hints |
| --- | --- | --- |
| Match cards home/away | semibold title case | `SceMatchCard.tsx`, `SceMatchStackedFixtureIdentity.tsx` |
| Training cards | uppercase label, not italic | `SceTrainingCard.tsx` |
| Tournament participants | mixed | `SceTournamentCard.tsx` |
| Event participation teams | module-specific | club event admin |
| Calendars | engine formatters | `lib/calendar/sce-calendar-engine/*` |
| Team pages / headers | mixed | `components/admin/teams/*` |
| Team selectors | sentence case | team pickers in planning |
| Tables / standings | sentence case | matchcenter, standings |
| Squad management | sentence case | team roster views |
| Mobile / drawer | same contract | `GlobalNavDrawer.tsx` |

### Density scale

| Density | Size | Line clamp |
| --- | --- | --- |
| HERO | 1.0625rem+ | 2 |
| STANDARD | 0.875–1rem | 2 |
| COMPACT / MICRO | 0.8125rem | 1–2 |

Match existing `SceActivityPresentationDensity` keys.

## 4. Header navigation contract (non-negotiable)

### Requirements

- Nav **labels** always **uppercase** (`text-transform: uppercase`; letter-spacing tuned per display font).
- **Remove decorative icons** attached to header/sidebar navigation items (`AnimatedNavIcon`, `.sce-nav-icon-wrap`).
- Preserve active (`active` class), hover, focus-visible, disabled states — today in `.sce-nav-item` rules (`app/globals.css` ~1686+).
- Preserve keyboard accessibility (focus ring uses `--sce-primary`).
- **Functional** controls keep icons: mobile menu, notifications (`NotificationBell.tsx`), search, profile, sign-out.

### Current implementation gaps

| Item | Location |
| --- | --- |
| Icons beside every item | `AdminSidebar.tsx` → `AnimatedNavIcon` |
| Icon wells | `.sce-nav-icon-wrap` in `globals.css` |
| Label casing | `.sce-nav-item` — no `text-transform` |
| Motion loops | `app/nav-icon-animations.css`, `--sce-nav-loop-*` tokens |

### Target DOM pattern (architecture)

```text
a.sce-nav-item (uppercase label text only)
  └─ span.sce-nav-label
```

Optional: section dividers without icons; L2/L3 indent via spacing, not glyphs.

### Contracts file (future)

`lib/design-system/sce-navigation-typography-contract.ts` — constants for uppercase, letter-spacing, min tap height (44px).

## 5. Breadcrumbs and context tabs

Unchanged hierarchy from DS-02/03:

`Global nav → Breadcrumbs → Workspace header → Context tabs → Content`

White edition updates **colours only**; component owners remain `SceBreadcrumbs`, `SceContextTabs`.

## 6. Excessive uppercase guardrail

Uppercase allowed:

- Nav labels (header)
- Team names (`SceTeamName`)
- Status chips / competition labels where space-constrained
- Eyebrow labels (optional)

Uppercase **discouraged**:

- Body paragraphs, error messages, form helper text, long user-generated content

## 7. Related tests (future packages)

- Extend `components/admin/layout/__tests__/AdminSidebar.test.tsx` for label casing and absence of `AnimatedNavIcon` in nav items.
- Add `SceTeamName.test.tsx` for transform/family classes without mutating input string.
- Snapshot tests for match/training cards with long team names.

See [05-activity-card-system.md](./05-activity-card-system.md) for card title integration.
