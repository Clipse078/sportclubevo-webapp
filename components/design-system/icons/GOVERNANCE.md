# SCE Icon System — Governance (Phase 1)

## Policy (future hard rule)

**New** SportClubEvo application iconography should use the SCE Icon System (`SceIcon` + registered glyphs).

SCE-ICONS-01 does **not** enforce this globally. Existing Lucide, Heroicons, react-icons, Font Awesome, and inline SVG usage continues to work until controlled migration (SCE-ICONS-04) and enforcement (SCE-ICONS-05).

## Registry

Every production glyph is registered in `registry.ts` with:

- `name`, `category`, `label`, optional `i18nKey`
- `purpose`, `aliases`, `semanticType`, `status`

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
