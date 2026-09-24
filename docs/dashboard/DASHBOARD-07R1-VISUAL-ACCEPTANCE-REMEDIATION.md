# DASHBOARD-07R1 — Authenticated Visual Acceptance Remediation

**Branch:** `cursor/dashboard-d-personal-workspace-discovery`  
**Base:** `STAGE` @ `a49190300247ca766160ab402c8b6dc96596b4be`  
**Remediation HEAD:** see PR #706  

---

## Prior automated acceptance

DASHBOARD-07 **automated acceptance passed** at `f2431d236f9f250678cd6cee36c789fb7d2a0c8c` (security matrix, sentinel suites, static gates, documentation).

## Human visual acceptance reopen

Subsequent **authenticated human visual review** on the reference tenant (FC Allschwil preview) reopened programme closure:

1. Personal club imagery / emotional identity removed in DASHBOARD-06 compact header.
2. Composition too empty at laptop/desktop widths (Schnellzugriff card, programme/calendar dead space, oversized empty Attention/Tasks).
3. **Blocking defect:** Mein Programm showed Blitzturnier on **27 Sep 2026 09:30** (TOURNAMENT) while Mein Kalender cell **27** showed no visible activity indicator.

**DASHBOARD-07R1** is the remediation phase. **Mobile-D remains blocked** until DASHBOARD-07R2 final human closure.

---

## Personal identity decision

| Topic | Decision |
|-------|----------|
| Previous image | User-scoped dashboard hero (`User.dashboardHeroImageUrl` via `getUserDashboardHeroState`) |
| New header | `PersonalIdentityHeader` (~180–240px clamp), cover image + dark readability gradient |
| Fallback | SCE gradient + optional tenant crest (`Tenant.logoUrl`) — no broken image |
| Context | Club · season · date integrated in header (no detached chip row) |
| FCA logic | None — tenant-safe |

---

## Composition corrections

- Schnellzugriff: lightweight command launcher (`flex-wrap`, no native horizontal scrollbar dependency).
- Programme + calendar: aligned primary workspace; calendar sticky on large screens; programme timeline/agenda presentation.
- Attention + tasks: side-by-side action layer on `md+`, compact empty states (~70–110px footprint).
- Wide layout: `max-w-[1520px]` content rail for intentional density at 1920px.

---

## Calendar defect — root cause & fix

**Observed:** Programme feed and calendar share `PersonalProgrammeItem[]`, but occupied days could appear empty in the month grid.

**Root cause:** Client-side calendar grouping called `personalProgrammeDayKey()` with `startsAt` values that arrived from the RSC boundary as **ISO strings**. `Intl.DateTimeFormat.formatToParts()` rejects non-Date values, so `groupPersonalProgrammeItemsByDay()` produced **no activity map** on the client while server-built programme feed groups still showed the event.

**Fix:** `coerceProgrammeInstant()` in `lib/personal-agenda/programme-day-key.ts` normalizes serialized timestamps before tenant-local day-key resolution.

**Grid stability:** `buildMonthGridCells()` resolves tenant-local keys from civil Y-M-D with UTC-noon anchors so grid keys do not depend on host/browser local timezone.

**Duplicate query:** None introduced — same `loadPersonalProgramme()` dataset.

### Sep 27 regression fixture

| Field | Value |
|-------|--------|
| Timezone | `Europe/Zurich` |
| Local date | `2026-09-27` |
| Local time | `09:30` |
| UTC instant | `2026-09-27T07:30:00.000Z` |
| sourceType | `TOURNAMENT` |
| title | `Blitzturnier` |

Tests: `lib/personal-agenda/__tests__/dashboard-07r1-sep27-calendar.test.ts`, calendar component tests.

---

## Calendar interaction / presentation

- Operational in-cell markers (type label chip or occupancy bar, bounded multi-event `+N`).
- Accessible labels: e.g. `27. September, 1 Termin: Blitzturnier` via i18n (`dayAriaOneActivityNamed`).
- Programme ↔ calendar coordination preserved (selected day highlights feed group).

---

## DASHBOARD-07R1A — Semantic calendar activity presentation

**Goal:** Keep the DASHBOARD-07R1 data path unchanged while making personal calendar days scannable via a **single canonical presentation map** for programme `sourceType` values. Color is supplementary; localized type labels (`Training`, `Spiel`, `Turnier`, …) remain in text and ARIA.

### Canonical palette (presentation-only)

| sourceType | Semantic color |
|------------|----------------|
| `TRAINING` | Blue (`--sce-info`) |
| `MATCH` | Green (`--sce-success`) |
| `TOURNAMENT` | SCE orange (`--sce-primary`) |
| `EVENT` | Violet / purple |
| `MEETING` | Cyan / teal |

Helper: `getProgrammeSourcePresentation()` in `lib/personal-agenda/programme-source-presentation.ts` — returns marker/chip/tint class contracts and stable `paletteKey` tokens for tests. **No DB persistence**, not stored on `PersonalProgrammeItem`.

### Multiple events on one day

- Up to **three** distinct source-type markers (bars), in canonical programme sort order.
- **`+N`** when the authorized activity count exceeds visible marker slots (duplicate types may consolidate visually; full count stays in `aria-label`).
- No overflow clipping in the grid cell.

### Today / selected / event type independence

| State | Treatment |
|-------|-------------|
| **Today** | Subtle primary ring (unchanged intent). |
| **Selected** | Strong selected ring + surface; **semantic chip/marker remains visible**. |
| **Event type** | Tinted chip (single event) or semantic bars (multi). |

### Shared `MonthActivityGrid` boundary

- Generic grid stays generic: **matchcenter** variant unchanged (sky occupancy dot).
- Personal semantics live in `PersonalProgrammeMonthCalendar` + `PersonalProgrammeActivityIndicator`.
- Programme timeline (`PersonalProgrammeFeed`) reuses the **same** marker accent mapping (small dot only).

### Sep 27 acceptance case (Europe/Zurich)

| Field | Value |
|-------|--------|
| Local date | `2026-09-27` |
| Local time | `09:30` |
| sourceType | `TOURNAMENT` |
| title | `Blitzturnier` |
| In-cell label | `Turnier` (existing i18n type label) |
| Presentation | `tournament-orange` palette on chip/marker |

Tests: `programme-source-presentation.test.ts`, `PersonalProgrammeMonthCalendar.test.tsx`, `MonthActivityGrid.test.tsx`, `dashboard-07r1-sep27-calendar.test.ts`.

---

## Security preservation

No changes to personal relevance, permission ≠ relevance, zero disclosure, quick-access pinning semantics, or authorization boundaries. Calendar still receives authorized programme items only.

---

## Status

**DASHBOARD-07R1** — pending final human visual pass (**DASHBOARD-07R2**).
