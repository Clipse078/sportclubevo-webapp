# SCE Icon System — Geometry Contract

## Master geometry vs rendered UI size

| Concept | Description |
|---------|-------------|
| **Master geometry** | Canonical vector artwork in design coordinates (e.g. `viewBox="0 0 64 64"` for approved hero icons). |
| **Rendered UI size** | CSS pixel width/height on the `<svg>` element (16, 20, 24, 32, 48, …). |

Master coordinate systems are **not** required to be 24×24. The renderer scales the master viewBox into the requested render size without distorting aspect ratio.

Provisional Phase-1 glyphs still use `0 0 24 24`. Approved SCE hero masters use richer 64×64 artwork committed under `public/images/icons/`.

## Provisional glyph canvas (legacy inventory)

| Property | Value |
|----------|-------|
| ViewBox | `0 0 24 24` |
| Primary production size | 24px |
| Standard UI size | 20px |
| Compact / navigation size | 16px |
| Hero / demo sizes | 32px, 48px |

Geometry is **identical** at every supported render size. Scaling is handled by `SceIcon` only.

## Stroke language (provisional 24×24 glyphs)

- Round line caps and joins where strokes are used (`strokeLinecap="round"`, `strokeLinejoin="round"`).
- Default stroke width: **1.75** on the 24×24 grid (~2px optical character at 24px).
- Corner radius on rects: typically **1.5–2** (module tiles use `rx="2"`).
- Prefer optical centering over strict mathematical symmetry when readability at 16px requires it.

Approved masters retain their committed stroke widths (3, 4, …) on the 64×64 grid.

## Color roles (theme tokens)

Glyphs reference semantic roles — never duplicate geometry per theme:

| Role | CSS variable |
|------|----------------|
| Primary | `--sce-icon-primary` |
| Secondary | `--sce-icon-secondary` |
| Accent | `--sce-icon-accent` |
| Muted | `--sce-icon-muted` |

Utility/action icons are **monochrome** (`currentColor` on the SVG, tinted via `--sce-icon-primary`).

Domain icons may combine primary, secondary, and accent. Orange accent is selective — one meaningful detail per icon where applicable.

## Prohibited in production glyphs

- Theme-specific duplicate SVG files
- Hard-coded `#fff` / `#000` foregrounds (except design-master files may document reference values in `style` for offline preview)
- Gradients inside glyph geometry
- Raster assets, icon fonts, remote SVG, `dangerouslySetInnerHTML`
