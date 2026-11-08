# Reference benchmark — SC Cham & FC Allschwil

**Sources inspected (public, 2026-11-08):**

- https://www.sccham.ch
- https://www.fcallschwil.ch

Legend:

| Tag | Meaning |
| --- | --- |
| **OBSERVED** | Confirmed from fetched page content or downloaded assets |
| **VERIFIED CSS** | Confirmed from downloaded stylesheet rules |
| **INTERPRETATION** | Design reading — not a guaranteed computed style on all breakpoints |
| **RECOMMENDATION** | Transferable principle for SCE DS 2.0 |

---

## 1. SC Cham (sccham.ch)

### 1.1 Homepage structure (OBSERVED)

- Hero / team focus: “**1. Mannschaft**” section with upcoming fixtures listed chronologically.
- Each fixture block includes: **date + time**, **venue** (pipe-separated), **competition name** (e.g. “Meisterschaft 26/27”), optional attendance and referee metadata.
- Parallel **2. Mannschaft** fixture list with the same rhythm.
- **News** cards: image, date, headline, short club attribution (“SC Cham”).
- **Terminkalender** event entries (e.g. “Chamer Weihnachtsmarkt”).
- **Statistics** grid (“> 550 Junioren”, team counts, training hours) — numeric display as marketing facts.
- Footer: postal address, phone, email on neutral footer band.

### 1.2 Typography (VERIFIED CSS + INTERPRETATION)

| Finding | Tag | Detail |
| --- | --- | --- |
| Stylesheet | **VERIFIED CSS** | `/css/home.css?…` linked from homepage (large minified Webflow-style bundle). |
| CSS variables present | **VERIFIED CSS** | Minified bundle references layout tokens such as `--padding-global`. |
| Body `font-family` | **GAP** | Not extracted as a discrete rule in this audit (single-line minified file). |
| Team headings in content | **OBSERVED** | “1. Mannschaft”, “2. Mannschaft” — title case with period ordinals, not all-caps body. |
| Fixture team names in HTML text | **OBSERVED** | Opponent names appear in sentence case in news; fixture list emphasises **schedule metadata** over giant crest boards. |

### 1.3 Visual language (INTERPRETATION)

- **Light canvas:** editorial club site; imagery and white/neutral sections dominate (OBSERVED from page structure and image URLs).
- **Hierarchy through type scale and spacing**, not heavy card chrome on the public schedule list.
- **Competition + datetime + venue** trio is the primary scan pattern for matches — aligns with SCE activity card metadata rails.

### 1.4 Mobile / responsive (GAP)

- Public fetch only; no device emulation in `SCE-DS2-00`. **INTERPRETATION:** Webflow-style sites typically stack fixture lists vertically with full-width rows.

---

## 2. FC Allschwil (fcallschwil.ch)

### 2.1 Homepage structure (OBSERVED)

- Hero: club name, tagline (“Fussball für alle …”), community positioning copy.
- **Nächste Events** — dated cards (e.g. Sponsorenanlass, Waldweihnacht, UHU-Turnier).
- **Nächste Spiele** — multiple fixtures per day; each row shows **uppercase team names** (e.g. `FC ALLSCHWIL Junioren D-7 D2` vs `FC THERWIL D7 SCHWARZ`), **kickoff time** centred/prominent, link to full schedule.
- **Unsere Teams** — compact team initials rail (`1M`, `2M`, `JA`).
- **Gemeinde narrative** sections with statistic tiles (`>800 MITGLIEDER`, `33 TEAMS`).
- Footer implied via Next.js app shell (OBSERVED: `/_next/static/…` chunk CSS).

### 2.2 Typography (VERIFIED CSS)

| Property | Value | Tag |
| --- | --- | --- |
| Primary webfont family | `purista-web` (Adobe Typekit kit `onf8jdq`) | **VERIFIED CSS** |
| Weights loaded | 400, 600, 700 (+ italic 400) | **VERIFIED CSS** |
| Stylesheet endpoints | `https://use.typekit.net/onf8jdq.css`, Next immutable CSS chunks | **VERIFIED CSS** |

**INTERPRETATION:** Purista’s condensed grotesque feel is **functionally similar** to SCE’s already-shipped **Barlow Condensed** display role — DS 2.0 does not require importing Purista if Barlow Condensed is applied consistently to team and fixture titles.

### 2.3 Team name presentation (OBSERVED)

- Fixture list copy uses **explicit uppercase** team strings in visible text — closest external analogue to SCE’s **TeamName = uppercase + italic** non-negotiable (italic not confirmed from HTML text alone; may be CSS).

### 2.4 Visual language (INTERPRETATION)

- **White / clean marketing site** built on Next.js — closer to product “public club face” than SCE’s authenticated dark workspace.
- **Time-first scan** in “Nächste Spiele” (OBSERVED).
- **Events** use title + calendar chip pattern — analogous to `SceClubEventCard` title + schedule row.

---

## 3. Side-by-side principles

| Dimension | SC Cham | FC Allschwil | SCE DS 2.0 takeaway |
| --- | --- | --- | --- |
| Canvas | Light public editorial | Light public marketing | **REC:** White-first authenticated canvas (doc 03) |
| Fixture hierarchy | Datetime · venue · competition | Uppercase teams · time | **REC:** Typed match card with schedule prominence |
| Team naming | Ordinals (“1. Mannschaft”) | Uppercase multi-line team strings | **REC:** `TeamName` primitive (uppercase + italic) |
| Display font | Not verified in audit | Purista (Typekit) | **REC:** Barlow Condensed (already in repo) |
| Body font | Not verified in audit | Likely system/Next stack | **REC:** Inter (already in repo) |
| Navigation | Public site nav (not fully fetched) | Public site nav | **REC:** Uppercase, icon-free **app** header labels (distinct from marketing site) |
| Cards | News + calendar tiles | Event + fixture rows | **REC:** Shared activity shell, four variants |

---

## 4. Differences to preserve (do not clone)

1. **SCE is an operational admin product** — density, RBAC, season context, and planning tools are not present on public club sites.
2. **Do not import tenant colors globally** — SC Cham / FC Allschwil palettes stay tenant examples only (`06-tenant-branding-architecture.md`).
3. **Infoboard / venue signage** remain dark, high-contrast systems — reference sites are not signage benchmarks.

---

## 5. Recommendations for SCE (consolidated)

| ID | Recommendation | Priority |
| --- | --- | --- |
| R-01 | Default authenticated canvas to **white / neutral section washes** | P1 |
| R-02 | Match cards: **datetime + venue + competition** scan order (SC Cham) | P1 |
| R-03 | Fixture identity: **uppercase team presentation** (FC Allschwil) via presentation layer | P1 |
| R-04 | Apply **Barlow Condensed** to display roles already loaded in `app/layout.tsx` | P1 |
| R-05 | Reduce decorative nav motion/icons in **header labels**; keep functional utilities | P1 |
| R-06 | Event lists: dated section headers + compact rows (both references) | P2 |

---

## 6. Research coverage statement

| Area | SC Cham | FC Allschwil |
| --- | --- | --- |
| Homepage | Yes | Yes |
| Header / mega menus | Partial (HTML only) | Partial |
| Match / fixture cards | Yes (list content) | Yes |
| Training / schedule | Not on homepage | Not on homepage |
| Tournament listings | Not on homepage | UHU-Turnier event noted |
| Event cards | Terminkalender | Nächste Events |
| News cards | Yes | “Aktuelles” referenced |
| Team pages | Section headings only | Team initials rail |
| Mobile layout | Not emulated | Not emulated |
| Footer | Yes (address) | Limited in fetch |
| Computed CSS deep dive | Partial (minified CSS) | Typekit font verified |

No factual claims were invented for pages that could not be retrieved.
