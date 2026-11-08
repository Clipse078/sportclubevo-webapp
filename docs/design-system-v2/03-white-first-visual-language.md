# White-first visual language (DS 2.0)

## 1. Mandatory principles (from product brief)

1. **White-first application** — main canvas returns to pure white (`#ffffff` or equivalent), with subtle neutral section backgrounds (`#f8fafc`, `#f1f5f9`).
2. **Restrained borders and shadows** — 1px neutral borders (`#e2e8f0`); shadows for elevation only, not atmosphere.
3. **Hierarchy through typography and spacing** — reduce reliance on dark glass panels and backdrop blur.
4. **No decorative dark dashboard backgrounds** — retire default `--sce-app-background-image` on authenticated shell for White Edition (tenant may opt-in later).
5. **No forced card-heavy layout** — lists and tables may sit directly on white; cards for grouped activity objects only.
6. **Preserve operational density** — DS-08 dense UI tiers remain; white edition adjusts contrast, not row heights.

## 2. Conflict with SCE v1.0 foundation

DS-02 (`docs/roadmap/SCE-DESIGN-SYSTEM-02.md`) locked:

- `DARK_NAVY_SCE_LANGUAGE = CANONICAL_DIRECTION`
- Layered translucent surfaces (`--sce-surface-standard` with alpha on navy)

**DS 2.0 supersedes default direction** while keeping semantic token **names** where possible. Programme docs should add a DS-12 / White Edition charter reference when implementation starts — **not in SCE-DS2-00**.

## 3. Proposed semantic surface tokens (architecture sketch)

Runtime values remain in `app/globals.css` only. Proposed **White Edition** mapping:

| Semantic token (existing name) | DS 1.0 effective | DS 2.0 proposed role |
| --- | --- | --- |
| `--sce-color-app-background` | Deep navy + PNG | **#ffffff** canvas |
| `--sce-color-chrome` | Dark chrome rgba | **#ffffff** or **#fafafa** header/sidebar |
| `--sce-color-workspace` | Navy wash | **#ffffff** |
| `--sce-color-page-surface` | Elevated navy panel | Optional **#f8fafc** section wash |
| `--sce-color-surface-standard` | Translucent card | **#ffffff** + border |
| `--sce-color-surface-elevated` | Dark elevated | **#ffffff** + shadow-sm |
| `--sce-color-text-primary` | `#f8fafc` | **#0f172a** (slate-900) |
| `--sce-color-text-secondary` | `#94a3b8` | **#475569** |
| `--sce-color-text-muted` | `#64748b` | **#64748b** (may stay) |
| `--sce-color-border-standard` | White 8% on dark | **#e2e8f0** |

Legacy aliases `--background`, `--surface`, `--foreground` should **mirror** semantic tokens after migration to avoid breaking arbitrary Tailwind classes.

## 4. Borders, shadows, spacing

- Reuse DS-02 spacing scale (`--space-*`, `--radius-*`) unchanged.
- Replace dark-tuned shadows (`rgba(0,0,0,.32)`) with light-theme equivalents (`rgba(15,23,42,.08)`).
- **Remove default backdrop-filter** on standard cards (`.fca-card`, translucent shells) unless a documented exception requires glass.

## 5. Data density

| Tier | Guideline |
| --- | --- |
| COMFORTABLE | Settings, onboarding |
| COMPACT | Default admin lists (unchanged row metrics) |
| DENSE | Matchcenter, registrations, roles tables |

White-first must preserve **WCAG contrast** at DENSE sizes (see `08-risk-and-regression-matrix.md`).

## 6. Theme boundaries

| Domain | White-first auto-apply? |
| --- | --- |
| Authenticated admin shell | **Yes** (target) |
| SCE preview routes (`app/sce-preview/*`) | Yes — parity with production |
| Infoboard Screen 1 & 2 | **No** — independent signage themes |
| Venue display / kiosk | **No** |
| CMS public website builder | Separate `lib/cms/design-system.ts` consumer — migrate on dedicated package |
| Transactional email HTML | Inline styles — out of scope |

## 7. Infoboard protection

- Components under `components/infoboard/screen1`, `screen2`, `venue-display` retain existing CSS modules (`.module.css`).
- Do not import white-edition `--background` into kiosk shells without explicit PO sign-off.
- Activity **presentation models** may be shared; **presentation chrome** is not.

## 8. Anti-patterns to eliminate in migration

| Pattern | Example | Action |
| --- | --- | --- |
| Hardcoded navy hex in components | `#0a0f1e`, `#121a2e` | Replace with semantic vars |
| `fca-*` marketing classes in admin | `.fca-card` on operational UI | Deprecate for admin; scoped to CMS/public if needed |
| Dark scrollbar styling | `.sce-app-explorer-scroll` white-alpha thumbs | Neutral thumbs on light chrome |
| Translucent match pitch card | `--sce-match-card-surface` dark opaque | White card + strong border; preserve result numeral contrast |

## 9. Acceptance criteria (foundation package — future)

- `:root` defaults pass contrast checker for text/surface pairs.
- `SCE_FUNCTIONAL_PANEL_CLASS` renders correctly on white without “invisible panel” regression.
- Governance runner PASS with updated surface rules.
- No change to infoboard screenshot baselines without explicit package.

See [07-migration-roadmap.md](./07-migration-roadmap.md) package `SCE-DS2-01`.
