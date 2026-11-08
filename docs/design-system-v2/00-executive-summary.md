# SCE Design System 2.0 — Executive summary

**Package ID:** `SCE-DS2-00`  
**Mission:** Evidence-based design and typography audit for **White Edition** direction — architecture and documentation only.

## Repository and branch record

| Item | Value |
| --- | --- |
| Repository | [Clipse078/sportclubevo-webapp](https://github.com/Clipse078/sportclubevo-webapp) |
| Starting branch | `STAGE` |
| Starting SHA | `4f498000efe70b82720b2d9320ac0d46fd816900` |
| Feature branch | `cursor/sce-ds2-00-design-audit` |
| Predecessor programme | SCE Design System v1.0 (DS-01 … DS-11, **closed** on STAGE) |

## Strategic finding

SCE v1.0 intentionally canonized a **dark-navy operational canvas** (`DARK_NAVY_SCE_LANGUAGE` in `docs/roadmap/SCE-DESIGN-SYSTEM-02.md`) with layered translucent surfaces, decorative navigation motion, and card-heavy presentation. Reference club sites (**SC Cham**, **FC Allschwil**) present a **light, editorial, football-club public web** aesthetic: white/neutral backgrounds, strong typographic hierarchy, uppercase team/fixture copy, and activity lists that read as schedule boards rather than dashboard panels.

**DS 2.0 White Edition** is a **direction change at the foundation layer**, not a cosmetic reskin. It preserves operational density, tenant semantics, infoboard isolation, and the existing presentation read-model (`lib/sporting-activity-presentation/`), while replacing default surface assumptions and tightening typography contracts (team names, header navigation, activity cards).

## Inventory scale (this audit)

| Metric | Count / note |
| --- | --- |
| `components/sporting-activity/*.tsx` | 45 files |
| `components/admin/**/*.tsx` | 1,352 files |
| `app/**/dashboard/**/page.tsx` | 201 routes |
| Files touching dark tokens / `fca-*` / dense surfaces | ~479 paths (ripgrep snapshot) |
| `lib/design-system/` modules | 96 files (+ governance tests) |
| Infoboard components (`components/infoboard/`) | 168 files — **excluded** from white-first auto-migration |

## Highest-risk inconsistencies for DS 2.0

1. **Foundation conflict:** `:root` defaults in `app/globals.css` set `--background: #0a0f1e` and semantic `--sce-color-*` aliases assume dark chrome; DS-02 documentation still records dark navy as canonical direction.
2. **Team name contract gap:** Match and programme surfaces use `font-semibold` title case / mixed case (`SceMatchCard`, `SportingActivityIdentity`); **no shared `TeamName` primitive** enforces uppercase + italic presentation.
3. **Navigation:** `AdminSidebar` + `.sce-nav-item` pair labels with `AnimatedNavIcon` and icon wells (`.sce-nav-icon-wrap`); labels are **not** globally uppercase (`text-transform` absent on `.sce-nav-item`).
4. **Parallel card systems:** Canonical `Sce*Card` family coexists with `MatchCard.tsx`, `Weekplanner*IdentityCard`, `PlanningHubListeSceActivityCard`, dashboard rows, and infoboard match identity — different shells and density scales.
5. **FCA legacy CSS:** `.fca-heading`, `.fca-card`, `.fca-eyebrow` in `globals.css` encode a tenant-specific marketing typography pattern inside global stylesheet.
6. **Hardcoded literals:** Hundreds of `text-[var(--foreground)]`, `bg-[var(--surface)]`, and occasional hex literals bypass semantic white-edition tokens.

## Proposed Activity Card architecture (summary)

Introduce **`SceActivityCardSystem`** with:

- **`SceActivityCardShell`** (existing programme shell — extend for white surfaces)
- **Four typed variants:** `SceMatchCard`, `SceTrainingCard`, `SceTournamentCard`, `SceClubEventCard` (retain distinct information hierarchy)
- **Shared primitives:** schedule row, location row, status chip, type pill, crest slot, list-row scale (`lib/sporting-activity-presentation/canonical/activity-card-list-row-scale.ts`)
- **White-edition tokens:** new semantic vars for card border, section wash, and title colors (see [05-activity-card-system.md](./05-activity-card-system.md))

Benchmark alignment: fixture blocks on SC Cham homepage (date line + venue + competition metadata) and FC Allschwil “Nächste Spiele” blocks (uppercase team pairing, time prominence).

## Typography findings (summary)

- **Already loaded:** `Inter` (body) and `Barlow Condensed` (display) via `app/layout.tsx` — aligns with DS 2.0 proposal; under-used for navigation and team identity.
- **Semantic utilities exist:** `.sce-type-*` roles in `globals.css` + `lib/design-system/sce-foundation-contract.ts` — tuned for **dark** text hierarchy (`--sce-color-text-primary` on navy).
- **Gap:** Display font not applied to `.sce-nav-item`; team/club names lack `font-family: var(--font-display)` + `uppercase italic` contract.

## Recommended migration approach

**Recommend Approach A — incremental shared-component migration** (see [07-migration-roadmap.md](./07-migration-roadmap.md)):

- Lower blast radius than global `:root` inversion while DS-11 governance and ~479 dependent files remain active.
- Sequence: token white foundation → typography/nav contracts → activity cards → workspace primitives → module sweeps.
- Approach B (global foundation first) risks long-lived dual-theme breakage across SSR/hydration and Tailwind arbitrary values.

## Governance validation (this package)

```
[sce-design-system-governance] filesScanned=2003 ruleCount=10 durationMs=115 exceptions=10 pass=YES
```

No production components or `globals.css` values were modified in `SCE-DS2-00`.

## Deliverables map

| Doc | Purpose |
| --- | --- |
| [01](./01-reference-benchmark-sc-cham-fc-allschwil.md) | External benchmark with verified vs interpreted findings |
| [02](./02-current-sce-design-inventory.md) | File-backed inventory |
| [03](./03-white-first-visual-language.md) | White-first principles and token sketch |
| [04](./04-typography-and-navigation.md) | Type roles, TeamName, nav contract |
| [05](./05-activity-card-system.md) | Activity card architecture |
| [06](./06-tenant-branding-architecture.md) | Future tenant color studio boundaries |
| [07](./07-migration-roadmap.md) | Executable packages P0–LATER |
| [08](./08-risk-and-regression-matrix.md) | Risks and test coverage |

## Unresolved research gaps

- SC Cham CSS is a large minified bundle (`/css/home.css`); body-level `font-family` not isolated in this audit without dedicated CSS parsing — structural/layout observations are **visual/interaction** tier.
- Mega-menu and authenticated member areas were not reachable in unattended fetch; benchmark focuses on public homepage, fixtures, news, and events lists.
- Live responsive breakpoints for reference sites were not emulated in browser UAT (explicitly out of scope for `SCE-DS2-00`).

---

**FINAL STATUS:** `SCE-DS2-00 AUDIT COMPLETE — AWAITING PO REVIEW`
