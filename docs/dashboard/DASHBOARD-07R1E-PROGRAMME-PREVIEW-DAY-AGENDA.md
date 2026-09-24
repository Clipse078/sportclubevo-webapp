# DASHBOARD-07R1E — Programme Preview + Interactive Day Agenda

**Branch:** `cursor/dashboard-d-personal-workspace-discovery`  
**PR:** #706 (base `STAGE`)  
**Depends on:** DASHBOARD-07R1D (canonical `TrainingSession` in personal programme/calendar)

---

## Authenticated human findings (post-07R1D)

**Pass (unchanged):**

- Canonical `TrainingSession` trainings in Mein Programm
- Trainings blue in Mein Kalender
- Sep 27 F2 Blitzturnier visible
- Personally relevant multi-team activities additive

**New UX (07R1E):**

| Finding | Remediation |
|---------|-------------|
| Mein Programm too long | Dashboard preview shows **next 3** upcoming personal items only |
| Redundant context copy (`Junioren F2 · Trainer/in · …`) | Removed from dashboard row **presentation**; DTO `contextLabel` retained |
| Calendar `+N` not inspectable | Every day selectable; compact **selected-day agenda** below month grid |

---

## Programme preview contract

| Rule | Detail |
|------|--------|
| Input | Authorized `PersonalProgrammeItem[]` (same loader as calendar) |
| Filter | Existing forward programme window (`resolvePersonalProgrammeRange`) |
| Sort | Canonical `sortPersonalProgrammeItems` / feed groups |
| Display cap | **3 items** at `PersonalDashboardWorkspace` via `limitProgrammeFeedGroupsToPreview` |
| Loader | `loadPersonalProgramme()` **unchanged** — full universe for calendar + selected day |

---

## Alle anzeigen

- Label: `PersonalDashboard.programme.viewAll` (DE/EN/FR/IT)
- Style: same as Meine Aufgaben `viewAll →`
- Destination: `buildPersonalKalenderHref("/dashboard/kalender", { month, quelle: "termine" })` — canonical full personal Kalender (Termine)

---

## Selected-day agenda

- Data: derive from **same** `PersonalProgrammeItem[]` passed to calendar (`groupPersonalProgrammeItemsByDay`)
- **No** second DB query, per-day fetch, or client fetch on click
- Presentation: `PersonalProgrammeAgendaRow` (time, semantic marker, title, type, venue, deep link)
- Empty day: `PersonalDashboard.calendar.emptyDay` — “Keine Termine an diesem Tag.”

---

## Multi-team Wednesday reference (test actor)

User has **Junioren F2** and **Senioren 40+** relationships (intentional STAGE test allocation).

**30 Sep 2026:**

- 15:45 Junioren F2 Training
- 18:45 Senioren 40+ Training

Calendar cell: primary Training chip + **`+1`** (two distinct authorized items, one visible source-type slot).  
Clicking the day lists **both** in chronological order — expected, not a relevance defect.

---

## Count semantics

| Activities | Grid |
|------------|------|
| 0 | No marker |
| 1 | Single semantic indicator, no `+N` |
| 2 (distinct) | Primary marker + `+1` when same source-type family |
| 3+ | Bounded markers + overflow per existing contract |

Only **genuine duplicate projection** of the same canonical activity may dedupe — not two different trainings.

---

## Programme / calendar parity

| Surface | Universe |
|---------|----------|
| Loader | Full authorized range (programme window ∪ month grid) |
| Mein Programm | First **3** upcoming preview items |
| Mein Kalender grid | All authorized items in loaded month/grid range |
| Selected day | All authorized items for tenant-local `selectedDayKey` |

---

## Zero disclosure & multi-team

All DASHBOARD-01 … 07R1D guarantees preserved:

- Relationship establishes relevance; authorization establishes visibility
- Unrelated teams, Club Admin-only, technical VIEW/MANAGE-only, cross-tenant, removed relationships → **no** count leak
- Legitimate multi-team relationships remain **additive** (no primary-team-only filter)

---

## Performance contract

| Constraint | Status |
|------------|--------|
| NEW_DB_QUERY | NO |
| PER_DAY_QUERY | NO |
| CLIENT_DAY_FETCH | NO |
| SECOND_PROGRAMME_LOADER | NO |
| N_PLUS_ONE | NO |
| Preview cap location | `PersonalDashboardWorkspace` presentation boundary |

---

## Tests

- `lib/personal-agenda/__tests__/dashboard-07r1e-programme-preview-day-agenda.test.tsx`
- `lib/personal-agenda/__tests__/programme-feed-groups.test.ts` (preview limit)
- `components/admin/dashboard/__tests__/dashboard-06-composition.test.ts` (selected-day panel + preview limit)
- Regression suites listed in `dashboard-07-acceptance.test.ts`

---

## Roadmap

07 → 07R1 → 07R1A → 07R1B → 07R1C → 07R1D → **07R1E** → 07R2 human final acceptance → merge → MOBILE-D
