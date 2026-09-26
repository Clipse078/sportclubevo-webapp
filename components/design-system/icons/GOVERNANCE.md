# SCE Icon System — Governance (Phase 1)

## Approved master artwork (authoritative)

**Approved SCE master artwork is authoritative.** Implementation must not redraw, simplify, trace, substitute, or materially alter approved master icons without explicit design approval.

Committed design masters live under `public/images/icons/`. Runtime React master components must preserve the same vector geometry. Rendered UI size is independent of the master coordinate system (e.g. 64×64 masters scale cleanly to 16–48px).

The five hero icons (`dashboard`, `week-planner`, `training`, `match`, `tournament`) establish the canonical SCE visual DNA. Future icons should visually belong to this family.

## Original and Light

Same master geometry powers **SCE Original** and **SCE Light**. Semantic colors are token-driven (`--sce-icon-primary`, `--sce-icon-secondary`, `--sce-icon-accent`, `--sce-icon-muted`). There are no parallel `-light.svg` geometry files.

## Policy (future hard rule)

**New** SportClubEvo application iconography should use the SCE Icon System (`SceIcon` + registered glyphs).

SCE-ICONS-01 does **not** enforce this globally. Existing Lucide, Heroicons, react-icons, Font Awesome, and inline SVG usage continues to work until controlled migration (SCE-ICONS-04) and enforcement (SCE-ICONS-05). Third-party icon libraries are transitional legacy; the SCE registry remains the application abstraction.

SCE-ICONS-09 (technical closure): **78** approved masters, **92** registry concepts, high-confidence nav adoption via `lib/nav/nav-destination-sce-icons.ts`, and automated regression in `lib/nav/__tests__/sce-icons-09-closure.test.ts`. Approved master SVGs under `public/images/icons/` remain immutable without explicit design approval.

## Registry

Every production glyph is registered in `registry.ts` with:

- `name`, `category`, `label`, optional `i18nKey`
- `purpose`, `aliases`, `semanticType`, `status`
- optional `viewBox`, `masterAssetPath`, `geometrySource` for approved masters

Categories: `planning`, `organisation`, `communication`, `club`, `actions`, `system`.

Semantic types: `DOMAIN`, `ACTION`, `STATUS`, `STRUCTURAL`.

Status: `experimental`, `stable`, `deprecated`.

## Legacy inventory

Run (read-only):

```bash
npm run sce-icons:legacy-inventory
```

Reports direct usage of common external icon sources without modifying source files.

## Multi-tenancy

Icon geometry is **platform infrastructure**. No tenant-specific glyphs or registry branches.
