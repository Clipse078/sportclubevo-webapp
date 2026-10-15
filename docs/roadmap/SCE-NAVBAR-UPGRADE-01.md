# SCE-NAVBAR-UPGRADE-01 — Canonical Desktop Navigation Architecture

| Field | Value |
|-------|-------|
| **Status** | **CLOSED / ACCEPTED / READY FOR MERGE** |
| **PO visual UAT** | **PASS** (R11 accepted — no further visual iteration) |
| **Branch** | `cursor/sce-navbar-upgrade-01-canonical-navigation` |
| **PR** | [#847](https://github.com/Clipse078/sportclubevo-webapp/pull/847) → `STAGE` |
| **Feature HEAD** | `d1e278d81be4552bf1154b1d266dccc18447f1ac` (R11) |
| **Base** | `STAGE` @ `b101a171` (post **01I** / PR #846) |
| **Predecessor** | SCE-ACTIVITY-CREATE-01I — CLOSED / ACCEPTED / MERGED |
| **Successor (not started)** | SCE-ACTIVITY-CREATE-01J Dashboard + Mein Programm |

## Accepted architecture (frozen)

**Row 1:** FC Allschwil crest + name · Planung · Kommunikation · Club · Publizieren · Admin · notifications · avatar  

**Row 2:** SportClubEvo (platform) · intentional workspace whitespace · localized season (full label on desktop `lg+`)

**Depth:** L1 = Row 1 domains · L2/L3 = on-demand `SceDomainNavigationPanel` (one strong L1 max; no permanent desktop L2/L3 strips; no desktop hamburger; no nav scrollbar).

**Home:** Tenant and platform identities link to `/dashboard`; dashboard is above L1 and does not fake an active domain.

**Page grid:** R8 `--sce-page-gutter` model — navigation rails do not offset page content.

## Delivery rounds (R1–R11)

| Round | Summary |
|-------|---------|
| R1–R5 | Canonical nav components, spine geometry, application page grid |
| R6 | Two-row platform vs tenant composition (superseded by R10) |
| R7 | On-demand L3; dashboard removed from desktop L1 |
| R8 | Page grid decoupled from nav rail; stable two-row shell |
| R9 | Hierarchical domain panel; persistent tenant/platform row |
| R10 | Tenant-first Row 1; platform Row 2; single strong L1 selection |
| R11 | Monochrome nav icons; desktop hamburger removed; full desktop season label |

## PO UAT (completed)

- [x] L1 dominance vs L2/L3 hierarchy (domain panel)
- [x] Tenant-first Row 1 / SportClubEvo Row 2 brand hierarchy
- [x] Season switcher visible on Row 2 at desktop width
- [x] Vereinsprogramm monochrome icon language
- [x] No desktop hamburger / permanent L2/L3 / nav scrollbar
- [x] Page alignment from R8 accepted

## Closure criteria

- [x] PO UAT PASS
- [x] Automated navbar / page-grid / registry regression suites green
- [ ] PR merged to `STAGE` (owner action — PR #847 left **OPEN**)

## Out of scope (unchanged)

- Programme engine, activity cards, calendar MICRO tiles (01I contracts).
- Dashboard/Mein Programm redesign (01J), Tournament Planner, Sponsor, Mobile app redesign.
- Background artwork, domain authorization redesign, credential mutation.

---

## Agent delivery report (R12 — closure)

**R12:** Registry test baselines aligned with Vereinsprogramm + Dokumente completeness; removed unreachable pre-R9 desktop `SceModuleNavigation` / `SceContextNavigationPanel` shell; design-system + roadmap marked **CLOSED / READY FOR MERGE**. No navigation behavior change beyond dead-code removal.
