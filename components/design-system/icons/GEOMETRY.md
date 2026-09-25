# SCE Icon System — Geometry Contract

## Canvas

| Property | Value |
|----------|-------|
| ViewBox | `0 0 24 24` |
| Primary production size | 24px |
| Standard UI size | 20px |
| Compact / navigation size | 16px |

Geometry is **identical** at every supported size. Scaling is handled by the `SceIcon` component only.

## Stroke language

- Round line caps and joins where strokes are used (`strokeLinecap="round"`, `strokeLinejoin="round"`).
- Default stroke width: **1.75** on the 24×24 grid (~2px optical character at 24px).
- Corner radius on rects: typically **1.5–2** (module tiles use `rx="2"`).
- Prefer optical centering over strict mathematical symmetry when readability at 16px requires it.

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
- Hard-coded `#fff` / `#000` foregrounds
- Gradients inside glyph geometry
- Raster assets, icon fonts, remote SVG, `dangerouslySetInnerHTML`
