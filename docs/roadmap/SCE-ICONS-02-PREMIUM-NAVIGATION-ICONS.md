# SCE-ICONS-02 — Premium Navigation Icons

**Status:** **CLOSED**

**Human UAT:** **PASS** (authenticated Vercel Preview)

**Implementation:** `cursor/sce-icons-02-premium-navigation-icons` — Club master (`club.svg` / `ClubApprovedMasterGlyph`) Variante 1 minimal outline shield; Spiele master (`match.svg` / `MatchApprovedMasterGlyph`) Variante 4 circle + path VS; canonical nav via `TARGET_L1_SCE_ICONS.club`, `NAV_DESTINATION_SCE_ICON_BY_KEY.matchcenter`.

**Human UAT verification (authenticated Preview):**

| Concept | Approved variant | Design |
|---------|------------------|--------|
| **Club** | Variante 1 | Minimal premium outline shield |
| **Spiele** | Variante 4 | Outlined circle containing **VS** |

- **Visual integration:** PASS — Spiele active state inherits SCE gold; inactive Club inherits navigation muted color; icon/text alignment correct; optical sizing consistent with neighboring navigation icons; VS clearly legible; no clipping or navigation layout regression.
- **Responsive/navigation regression observed:** NONE

**Priority order (historical):**

1. **SCE-PLANNER-UX-08-02** — Canonical Resource Manipulation
2. **SCE-ICONS-02** — Premium Navigation Icons *(this package — CLOSED)*
3. **SCE-PLANNER-UX-08-03** — Activity Rescheduling *(next package)*

---

## Approved designs

| Navigation concept | Variant | Design intent |
|--------------------|---------|---------------|
| **CLUB** | Variante 1 | Minimal premium outline shield |
| **SPIELE** | Variante 4 | Minimal premium outlined circle containing **VS** |

**Design intent:** minimal, premium, restrained, clean geometry, excellent recognition at navigation sizes, visually consistent with SportClubEvo, no decorative complexity.

---

## Implementation rules

- Use reusable **vector/icon components** — do **not** use raster or generated image assets.
- Preserve current navigation **labels**, **routes**, **permissions**, **active/inactive** behavior, and **hover/focus** behavior.
- Integrate with existing icon **sizing/stroke** conventions.
- Active state continues using canonical SCE **accent** treatment.
- Ensure **16 / 20 / 24px** rendering remains crisp.

---

## Scope (minimum)

Replace the canonical representations of **Club** and **Spiele** wherever these concepts appear in **navigation**.

Before implementation, identify shared icon sources/components so navigation instances are not patched independently.

---

## Explicit boundaries

- **Not** part of SCE-PLANNER-UX-08-02 (PR #798).
- **Not** Kalender activity rescheduling (**08-03**).
- **Not** PROD-only changes unless released via normal STAGE → PROD promotion.

**Branch from:** `origin/STAGE` HEAD immediately after **08-02** merge.
