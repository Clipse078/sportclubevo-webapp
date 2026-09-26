# SCE Icon System V2 — Design Contract

**Status:** Foundation (SCE-ICONS-V2-01) — migration specification only. V1 approved artwork remains authoritative until product-owner handoff batches land.

## Visual language

Everyday SportClubEvo UI icons are:

- **Monochrome** in canonical masters — shape communicates the module; color is owned by context/state.
- **`currentColor`-ready** — no baked SCE blue/orange/white brand combinations in canonical UI glyph geometry.
- **Calm** — restrained visual density; no miniature illustrations.
- **Confident & premium** — strong silhouettes, consistent optical weight, consistent negative space, consistent apparent size.
- **Recognisable without colour** — semantic silhouette must read at 20–24px in one color.

V1 multicolour masters remain frozen as **SCE Icon System V1** baseline (`components/design-system/icons/v2/v1-system-baseline.ts`).

## Canvas

- Preserve canonical **64×64** source `viewBox` (`0 0 64 64`) unless a future architecture review proves another normalized canvas materially superior.
- Artwork must occupy a **consistent optical bounding area** within the canvas — avoid tiny artwork floating in empty space.

## Size model

| Context | Range | Priority |
|---------|-------|----------|
| MICRO | 16–18px | Secondary — separate micro variant only when evidence requires (not in V2-01) |
| **UI** | **20–28px** | **Primary optical target** |
| HERO | 32–64px | Marketing / emphasis surfaces |

**Primary target:** 20–24px. Quality gate: can the semantic silhouette be understood immediately at 20–24px in **one color** without inspecting internal detail?

Secondary validation sizes: 16, 18, 28, 32, 48, 64.

Prefer **one excellent monochrome master** per semantic that scales across UI sizes.

## Color model

| UI state | Color ownership |
|----------|-----------------|
| Default | Neutral / `currentColor` / foreground token |
| Muted | Secondary foreground |
| Active / selected | SCE orange (semantic emphasis — not baked into master) |
| Hover | Foreground emphasis |
| Disabled | Subdued foreground |
| Success / warning / error / info | Semantic status tokens |

**Rule:** Orange is meaningful. It must not be permanently embedded in every icon master.

Canonical V2 UI masters:

- Use `currentColor` (or token references that resolve to inherited foreground at render time).
- **No hard-coded** `#062B52`, `#FF9D21`, `#2F8ED8`, etc. in canonical UI master geometry.

Status and content-identity surfaces (crests, avatars, provider logos, uploaded media) remain outside this contract.

## Safety

Vector only. No text, fonts, raster, script, external refs, or `foreignObject` in canonical masters.

## Accessibility

Same `SceIcon` contract as V1:

- Decorative when paired with visible label (`aria-hidden`).
- Accessible name via `title` for icon-only controls.

## Integration (future V2 tasks)

- V2 artwork replaces V1 SVG + React geometry via controlled handoff batches.
- Fingerprint guards protect approved V2 geometry.
- Product adoption follows manifest `integrationStatus` / `productAdoptionStatus` fields.

See also: `components/design-system/icons/v2/v2-regression-architecture.ts`, `components/design-system/icons/GOVERNANCE.md`.
