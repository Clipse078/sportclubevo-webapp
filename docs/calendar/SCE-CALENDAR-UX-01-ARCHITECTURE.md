# SCE-CALENDAR-UX-01 — Personal Calendar Architecture Audit

**Programme:** SCE CALENDAR UX (architecture phase only)  
**Route:** `/dashboard/kalender`  
**Repository baseline:** `d54ef75cc3dd36523acc57ae4a2ff0e93d912f42` (STAGE)  
**Machine-readable contract:** [`SCE-CALENDAR-UX-01-source-matrix.json`](./SCE-CALENDAR-UX-01-source-matrix.json)

This document traces the **current** personal calendar implementation, defines the **personal relevance contract**, proposes a **normalized view model** and **FM26-inspired target UX** for SportClubEvo (without copying FM visual identity). No runtime changes are in scope for UX-01.

---

## 1. Current architecture

### 1.1 Page entry and boundaries

| Layer | Location | Role |
|--------|----------|------|
| **Route (RSC)** | `app/(admin)/dashboard/kalender/page.tsx` | Auth, tenant, permissions, month range, data loading, `PageShell` |
| **Workspace (Server)** | `components/admin/kalender/PersonalKalenderWorkspace.tsx` | Title, filter links (`Alle` / `Termine` / `Aufgaben`), unsupported empty state |
| **Month view (Client)** | `components/admin/kalender/PersonalKalenderMonthView.tsx` | Selected day state, task-by-day grouping, composes shared calendar |
| **Shared month UI (Client)** | `components/ui/calendar/PersonalProgrammeMonthCalendar.tsx` | Month grid + selected-day programme panel |
| **Grid primitive (Client)** | `components/ui/calendar/MonthActivityGrid.tsx` | 7-column Mon–Sun grid, nav, personal vs matchcenter cell variants |
| **Activity markers (Client)** | `components/ui/calendar/PersonalProgrammeActivityIndicator.tsx` | Tiny chips / icon markers / `+N` overflow |

**Server/client split:** All fetching happens in the RSC page. Client components receive serialized `PersonalProgrammeItem[]`, `PersonalCalendarItem[]` (tasks), URL state, and timezone. Month navigation uses **full page** `<Link>` hrefs (no client-side month cache).

### 1.2 Data loading on `/dashboard/kalender`

```
parsePersonalKalenderUrlState(searchParams)
resolvePersonalProgrammeMonthGridRange(month, tenant TZ) → rangeStart/rangeEnd (full grid weeks)
resolvePersonalContext(tenantId, userId)
getRequestEffectivePermissions → permissionKeys

if quelle ∈ {alle, termine}:
  loadPersonalProgramme({ from: rangeStart, to: rangeEnd, ... })
if quelle ∈ {alle, aufgaben}:
  loadTaskDeadlineProjections({ range, tasksViewAuthorized })
```

**Not loaded on this page (but exists elsewhere):**

- `loadPersonalAgenda` (dashboard widget path) — merges calendar entries, tasks, **participation RSVP deadlines**
- `loadParticipationDeadlineProjections`

### 1.3 Canonical programme aggregation (Termine)

**Owner:** `lib/personal-agenda/load-personal-programme.ts`

Parallel adapters (after `resolvePersonalContext` + sporting team scope):

1. `adapters/team-event-programme-adapter.ts` — Prisma `Event` (`MATCH`, `TOURNAMENT`, `OTHER`)
2. `adapters/training-programme-adapter.ts` — `listTrainingSessions()` → `TrainingSession`
3. `adapters/meeting-programme-adapter.ts` — Prisma `Meeting` (participant or organizer)

Dedupe by `PersonalProgrammeItem.id`, sort via `programme-sort.ts`.

**Dashboard parity:** `lib/dashboard/personal-command-center.ts` uses the same `loadPersonalProgramme` for Mein Programm + cockpit calendar preview (merged query range: feed horizon ∪ month grid).

### 1.4 URL and filters

**Owner:** `lib/personal-agenda/kalender-url.ts`

| Query | Semantics |
|-------|-----------|
| `monat=YYYY-MM` | Visible month (defaults to **server local** `now` month if invalid/missing — see §16 risks) |
| `quelle=alle \| termine \| aufgaben` | Controls **server-side** fetch slices |

| Filter | Server fetch | Month grid programme rows | Selected-day programme panel | Selected-day tasks |
|--------|--------------|---------------------------|------------------------------|-------------------|
| `alle` | programme + tasks | programme markers | programme list | tasks list (if any) |
| `termine` | programme only | programme | programme | hidden |
| `aufgaben` | tasks only | empty programme; counts from tasks | empty programme (“Keine Termine…”) | tasks |

Tasks contribute to `activityCountByDay` but **do not** render as stacked blocks in cells today.

### 1.5 Month grid and date math

| Concern | Owner |
|---------|--------|
| Monday-first grid, 5–6 rows | `lib/calendar/month-grid.ts` (`buildMonthGridCells`, `buildMonthGridDates`) |
| Month label / param parsing (shared with Matchcenter) | `lib/matchcenter/month-range.ts` |
| Programme query window for grid | `resolvePersonalProgrammeMonthGridRange` → first/last grid day via `getDayWindow(dayKey)` |
| Day bucketing for items | `lib/personal-agenda/programme-day-key.ts` → `toLocalDateKey` in tenant TZ |
| Training session date filter | `training-programme-range.ts` → UTC-midnight date keys for `listTrainingSessions` |

### 1.6 Presentation and styling

| Concern | Owner |
|---------|--------|
| Source type colors / chip classes | `programme-source-presentation.ts` |
| Activity SCE icons | `lib/planning/activity-sce-icon.ts`, `ActivitySceIcon` |
| Selected-day row UI | `PersonalProgrammeAgendaRow.tsx` |
| i18n | `next-intl` namespace `PersonalDashboard.calendar` |

### 1.7 Permission gates (page level)

- Page: `auth()` required; `getActiveTenant()`; implicit admin shell (same as dashboard).
- Tasks: `PERMISSIONS.TASKS_VIEW` gates task query only.
- Programme: per-row authorization in adapters (see §4); **no** route-level `events.view` block — empty programme if unauthorized at row level.

### 1.8 Ownership map (summary)

```
/dashboard/kalender/page.tsx
  ├── resolvePersonalContext          → lib/dashboard/personal-context/*
  ├── loadPersonalProgramme           → lib/personal-agenda/load-personal-programme.ts
  │     ├── team-event-programme-adapter   → prisma.event
  │     ├── training-programme-adapter     → listTrainingSessions
  │     └── meeting-programme-adapter      → prisma.meeting
  ├── loadTaskDeadlineProjections     → lib/personal-agenda/task-projections.ts
  └── PersonalKalenderWorkspace
        └── PersonalKalenderMonthView
              └── PersonalProgrammeMonthCalendar
                    └── MonthActivityGrid + PersonalProgrammeActivityIndicator
```

---

## 2. Current source inventory

See **source matrix JSON** for field-level contract. Summary:

| Semantic | Model | Included on `/dashboard/kalender` |
|----------|--------|-----------------------------------|
| **TRAINING** | `TrainingSession` | Yes |
| **MATCH** | `Event` (type MATCH) | Yes |
| **TOURNAMENT** | `Event` (type TOURNAMENT) | Yes |
| **EVENT** | `Event` (type OTHER) | Yes |
| **MEETING** | `Meeting` | Yes |
| **TASK** | `Task` (assignee, due date) | Yes (partial UX — see §1.4) |
| **PARTICIPATION** | RSVP deadline projections | No (dashboard agenda only) |
| **Legacy Event TRAINING** | `Event` | No (by design) |
| **Manual calendar entity** | — | None in schema |
| **Facility / workspace / reminders** | — | Not aggregated |

---

## 3. Personal relevance rules

### 3.1 How a person connects to items (current)

**Context resolution:** `resolvePersonalContext` loads:

- Linked `Person` (`person.userId`)
- Active `tenantMembership`
- **Sporting teams:** `TrainerTeamMember`, `PlayerSquadMember` → `TRAINER` / `PLAYER` + `teamSeasonIds`
- **PersonAssignment** → org + optional team (`PERSON_ASSIGNMENT` kind — **not** sporting unless function maps to trainer/player via `mergeSportingAssignmentTeamSeasonScopes`)
- **OrgUnitMembership** (user and person) — tracked for org context labels, **not** used to widen team event relevance

**Sporting relevance gate:** `isSportingPersonalTeamRelationship` — only `TRAINER` or `PLAYER` kinds (`sporting-assignment.ts`).

| Source | Personal relevance (must pass before authorization) |
|--------|-----------------------------------------------------|
| TrainingSession | `teamSeasonId` ∈ user's sporting `teamSeasonIds` |
| Team Event | `teamId` sporting + `teamSeasonId` ∈ that team's seasons |
| Meeting | User ∈ `MeetingParticipant` OR `createdByUserId` |
| Task | User ∈ `TaskAssignee` |
| Participation (elsewhere) | Authorized `personId`(s) for user + actionable attendance candidate |

**Explicit non-rules (documented in code):**

- `permissionKeysArePersonalRelevance` → always `false` (`relevance.ts`)
- Club admin / `events.view` **does not** add teams or events to personal calendar
- Org-only functionaries without sporting assignment do **not** see team training/matches in personal programme

### 3.2 Target personal relevance (recommended — not implemented in UX-01)

Preserve current sporting-team + direct meeting/task/participation relationships. Do **not** expand to:

- All tenant events visible via admin permissions
- Org-unit-wide calendars
- Task creator/follower unless product explicitly adds assignee-equivalent rules later

**Open product question:** Should org-assigned officials with `PERSON_ASSIGNMENT` on a team receive that team's programme when function is non-sporting? **Current:** only if assignment merges into sporting scope via function key rules.

---

## 4. Authorization vs relevance

| Layer | Question | Implementation |
|-------|----------|----------------|
| **Relevance** | Why is this mine? | `personal-context/relevance.ts`, meeting participant queries, task assignee filter |
| **Authorization** | Am I allowed to see this resource? | `event-projection-access.ts`, `training-projection-access.ts`, `meeting-projection-access.ts` |

**Order in adapters:** relevance filter → authorization filter → map to `PersonalProgrammeItem`.

**Coupling risks:**

1. **`calendar-entries.ts`** uses `personalContext.teams.length` (all team kinds) to skip adapter calls, while adapters use **sporting-only** scope — harmless but slightly inconsistent.
2. **Meeting path** combines personal role (participant/organizer) with `canSeeMeeting` visibility — correct layering.
3. **Tasks** require `tasks.view` permission even though assignee filter is already personal — intentional gate.

**Verdict:** Authorization and relevance are **largely separated** for programme sources; admin permissions do not flood personal calendar.

---

## 5. Normalized target view model (design only)

Smallest presentation-independent model derived from existing types:

```typescript
/** UX-02 target — extends current PersonalProgrammeItem + task fields; no new DB enums */
type CalendarItemSemanticType =
  | "TRAINING"
  | "MATCH"
  | "TOURNAMENT"
  | "EVENT"
  | "MEETING"
  | "TASK"
  | "PARTICIPATION"; // optional UX-02 inclusion

type CalendarItemStatus =
  | "scheduled"
  | "cancelled"
  | "postponed"
  | "completed"
  | "live";

type NormalizedCalendarItem = {
  /** Stable: programmeResourceKey or task:uuid or participation id */
  id: string;
  sourceType: string; // e.g. training-session, event, meeting, task
  sourceId: string;
  semanticType: CalendarItemSemanticType;

  title: string;
  subtitle?: string;
  contextLabel?: string; // "why am I seeing this?"

  startAt: string; // ISO instant
  endAt?: string | null;
  allDay: boolean;

  status?: CalendarItemStatus;
  taskStatus?: string; // TaskStatus when semanticType TASK

  team?: { id?: string; name?: string };
  orgUnit?: { id?: string; name?: string }; // reserved; rarely populated today
  location?: string; // venue / pitch / meeting location
  opponentName?: string;
  homeAway?: string | null;
  competitionLabel?: string; // future: from Event.competitionLabel

  deepLink: string;
  iconKey: string; // SCE Icon System V2 / activity icon mapping

  /** Sort key: startAt ms, semantic order, id */
};
```

**Proposed canonical owner for UX-02:** `lib/personal-agenda/load-personal-calendar-month.ts` (new) wrapping:

- `loadPersonalProgramme` → map to `NormalizedCalendarItem[]`
- `loadTaskDeadlineProjections` → map tasks
- Optional flag: participation projections (product decision)

Reuse `personalProgrammeItemToCalendarItem` as an interim mapper; evolve toward one type for mobile + desktop.

---

## 6. Source → semantic type mapping

| Repository source | Prisma / service | `semanticType` | Notes |
|-------------------|------------------|----------------|-------|
| TrainingSession | `TrainingSession` | TRAINING | Not `Event` TRAINING |
| Match | `Event.type = MATCH` | MATCH | |
| Tournament | `Event.type = TOURNAMENT` | TOURNAMENT | |
| Veranstaltung | `Event.type = OTHER` | EVENT | `eventTypeToProgrammeSourceType` |
| Meeting | `Meeting` | MEETING | Filter UX may group under Termine |
| Task due | `Task.dueAt` | TASK | allDay presentation |
| RSVP deadline | participation projection | PARTICIPATION or TASK | TBD |

### Edge cases (current behavior + UX-02 notes)

| Case | Current | UX-02 recommendation |
|------|---------|------------------------|
| All-day Veranstaltung | `Event.allDay` preserved | Multi-line block; use tenant TZ inclusive rules from schema comment |
| Missing end time | `endsAt` null | Show open-ended; duration not inferred |
| Cancelled / postponed | Shown with `status` | Status badge + non-color cue |
| Postponed match | `Event.status` | Same row; deep link to planner |
| Recurring training | Many `TrainingSession` rows | One block per session; no series collapse in v1 |
| Multi-day tournament | Single `Event` row | If product needs span, derive additional **display** days in normalization (no DB change) |
| Task due without time | `allDay: true` | Date-only label |
| Midnight / TZ boundary | `personalProgrammeDayKey` + grid UTC-noon trick | Keep tenant TZ as single source of truth |
| Training reschedule | DTO uses effective start | Already via `listTrainingSessions` |
| ARCHIVED events | Excluded | Keep excluded |
| Draft / unpublished events | Hidden unless manage perms | Keep review gate |

---

## 7. Reusable services assessment

| Area | Location | Verdict |
|------|----------|---------|
| **Personal programme load** | `load-personal-programme.ts` | **REUSABLE** — canonical Termine aggregation |
| **Calendar entry wrapper** | `calendar-entries.ts` | **PARTIALLY_REUSABLE** — duplicates adapter orchestration; merge into single month loader |
| **Personal agenda (dashboard)** | `load-personal-agenda.ts` | **PARTIALLY_REUSABLE** — adds tasks + participation; kalender page should not fork a third path |
| **Programme → calendar map** | `programme-to-calendar.ts` | **REUSABLE** |
| **Month grid math** | `lib/calendar/month-grid.ts` | **REUSABLE** |
| **Month UI shell** | `MonthActivityGrid.tsx` | **PARTIALLY_REUSABLE** — extend personal cell variant for event blocks |
| **Dashboard cockpit calendar** | `PersonalProgrammeMonthCalendar.tsx` | **REUSABLE** with density prop (`cockpit` vs `workspace`) |
| **Matchcenter month** | `SpieleManagementMonthCalendar.tsx` | **NOT_APPROPRIATE** — team operational density, not personal relevance |
| **Wochenplan / public feeds** | `lib/publishing/*` | **NOT_APPROPRIATE** — publication policy, not personal |
| **Training canonical read** | `listTrainingSessions` | **REUSABLE** — do not duplicate occurrence logic |
| **Planner date utils** | `lib/planner/date-utils.ts` | **REUSABLE** |
| **Feed grouping** | `programme-feed-groups.ts` | **REUSABLE** for list/agenda modes, not month cells |

**Duplication findings:**

- Three orchestration paths: `loadPersonalProgramme`, `loadPersonalCalendarEntryProjections`, inline kalender page composition.
- Day key helpers: `matchDayKeyInTimezone` vs `personalProgrammeDayKey` vs `toLocalDateKey` — related but intentional; document single bucketing API for UX-02.
- Matchcenter vs personal both use `buildMonthGridDates` but different cell rendering — good sharing at geometry layer.

**Recommended canonical owner:** `loadPersonalProgramme` + unified **`loadPersonalCalendarMonthBundle`** returning `{ items: NormalizedCalendarItem[], range, meta }` consumed by dashboard, kalender, and future mobile BFF.

---

## 8. Target desktop UX (FM26-inspired, SCE identity)

### 8.1 Information architecture

```
┌─────────────────────────────────────────────────────────────┐
│ CALENDAR TOOLBAR: ◀  Heute  ▶   September 2026             │
│                    [ Alle | Termine | Aufgaben ]            │
├─────────────────────────────────────────────────────────────┤
│ Mo   Tu   We   Th   Fr   Sa   Su                            │
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐   ← real day cells     │
│ │17│ │  │ │  │ │  │ │  │ │  │ │  │                         │
│ │Tr│ │  │ │Ma│ │  │ │  │ │  │ │  │   ← stacked event blocks│
│ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘ └──┘                         │
└─────────────────────────────────────────────────────────────┘
```

**Borrow from FM26:** density, cell geometry, vertical stacking, month-at-a-glance operability, compact toolbar.

**Keep SCE:** navy/electric-blue shell, glass surfaces, typography, Icon System V2, restrained orange accent, `currentColor` icons, authenticated shell (Navigation V2 untouched).

**Do not copy:** FM purple, fonts, artwork, game chrome.

### 8.2 Event block information hierarchy

| semanticType | Priority (top → bottom) |
|--------------|-------------------------|
| TRAINING | time · Training · team · facility |
| MATCH | time · competition/type · fixture/opponent · H/A |
| TOURNAMENT | time · Turnier · team · location |
| EVENT | time or “Ganztägig” · title · location/context |
| MEETING | time · title · location |
| TASK | due label · title · status only if actionable |

### 8.3 Overflow contract

- Render as many **readable blocks** as cell height allows (measure in UX-03).
- When truncated: explicit **`+N weitere`** control → opens day drawer/popover with full list.
- Avoid icon-only `+N` as the default steady state.
- **Desktop:** expand on click/hover optional; **Mobile:** tap `+N` → agenda sheet.

### 8.4 Selected-day interaction (target)

**Current:** Permanent panel below grid with `emptyDay` copy; tasks split to separate section on kalender page.

**Target:**

- Month grid owns viewport height.
- **No large empty placeholder** for quiet days.
- Detail via **drawer / side panel / popover** on demand, or inline expansion below grid **only when** day has items or user invokes create (future).
- Programme row component (`PersonalProgrammeAgendaRow`) reusable inside drawer.

### 8.5 Filter contract (target)

Keep **`Alle | Termine | Aufgaben`** unless product adds type chips later.

| Filter | Includes semantic types |
|--------|-------------------------|
| Termine | TRAINING, MATCH, TOURNAMENT, EVENT, MEETING |
| Aufgaben | TASK (+ optionally PARTICIPATION if product confirms) |

Counts on toolbar optional UX-03 polish; server filter semantics stay as today.

---

## 9. Responsive / mobile foundation

| Breakpoint | Target |
|------------|--------|
| Large desktop | Full month grid + stacked blocks |
| Tablet / narrow desktop | Same grid; reduce block lines; overflow `+N` earlier |
| Mobile web | **Recommended: A + D hybrid** — compact month (1–2 lines per cell max) + **selected-day agenda sheet** as primary reading surface; optional week strip swipe later |

Normalized `NormalizedCalendarItem[]` from server enables native app reuse without desktop-only fields.

---

## 10. Performance

### Current

- **Per month navigation:** 1 RSC request; ~4 DB/service calls (`Promise.all` ×3 adapters + tasks).
- **Range:** Bounded to visible grid (~35–42 days), not whole club history.
- **N+1:** Avoided in adapters (batch `findMany`, `listTrainingSessions`).
- **Overfetch:** Dashboard command center merges 14-day feed with month grid — kalender page only fetches grid range (good).
- **Client cost:** `useMemo` grouping by day; rerender on selected day state only in client subtree.
- **Cache:** None specific; Next.js RSC cache default — month links are full navigation.

### Target contract (UX-02/03)

- Single bundle loader per month param.
- No duplicate adapter triple-call from `calendar-entries` + `loadPersonalProgramme` on same request.
- Optional: prefetch adjacent month on hover (UX-04).
- Cap range to `MAX_PERSONAL_PROGRAMME_RANGE_DAYS` (366) — already enforced.

---

## 11. Timezone / locale

| Topic | Current |
|-------|---------|
| Tenant TZ | `tenantContext.timezone ?? "Europe/Zurich"` on kalender page |
| User TZ | Not separately stored; tenant TZ used for bucketing |
| First day of week | Monday (`weekStartsOn: 1`) |
| Labels | `de-CH` / date-fns `de` in calendar components |
| Grid day keys | UTC-noon civil parts + `matchDayKeyInTimezone` — avoids server/browser local drift |
| Default `monat` param | **`parsePersonalKalenderUrlState` uses `now` in server local TZ** — mismatch risk vs tenant TZ near month boundaries |

**UX-02:** Default month param from tenant-local “today”; unify with `resolveMatchcenterMonthWindow`.

---

## 12. Accessibility (future implementation requirements)

- `role="grid"` / `gridcell` semantics for month; label each cell with date + activity summary (already partially via `accessibleLabel`).
- Keyboard: arrow keys move selected day; Enter opens detail; toolbar buttons in tab order.
- Focus visible on day cells and event blocks.
- Event blocks: accessible name = `{type}: {title}, {time}, {team}` — reuse `ariaLabel` fields.
- Today vs selected: ring styles **plus** text labels (“Heute”, “Ausgewählt”) in aria.
- Filters: `aria-current` on active filter (present).
- Do not rely on color alone — icons + text type labels (`typeLabel`).
- Touch targets ≥ 44px on mobile cells.

---

## 13. Deep links

| semanticType | Route |
|--------------|-------|
| TRAINING | `/dashboard/training/sessions/{id}/edit` |
| MATCH / TOURNAMENT / EVENT | `/dashboard/planner/edit/{eventId}` |
| MEETING | `/vereinsleitung/meetings/{slug}` |
| TASK | `/dashboard/aufgaben/{taskId}` |
| PARTICIPATION | `/dashboard/aufgaben?bereich=meine` |

No missing canonical route for included sources. PARTICIPATION link is generic (not entity-specific).

---

## 14. Creation / editing

**Current:** Personal calendar is **read-only aggregation** — no create on `/dashboard/kalender`.

**Target interaction:** Click block → canonical module deep link. Create actions (if permitted) route to Training / Planner / Meetings / Aufgaben — **no parallel calendar CRUD entity**.

---

## 15. Implementation seams (UX-02 touch points)

1. **New loader** — `loadPersonalCalendarMonthBundle` colocated with `load-personal-programme.ts`.
2. **Normalizer** — `normalizePersonalCalendarItem.ts` (programme + task + optional participation).
3. **UI** — new `PersonalCalendarMonthWorkspace` cell renderer (event blocks); evolve `MonthActivityGrid` `personal` variant or sibling component.
4. **Kalender page** — pass normalized items + precomputed `itemsByDayKey` (optional server-side to reduce client work).
5. **Time labels** — kalender page should build `timeLabelById` like `ClubDashboardView` (currently missing → `—` in selected panel).
6. **Tests** — extend `PersonalProgrammeMonthCalendar.test.tsx` for block layout contracts.

---

## 16. Risks and open questions

1. Include **PARTICIPATION** deadlines on full calendar or only under Aufgaben?
2. **MEETING** vs **EVENT** filter grouping for users (always Termine).
3. **Multi-day** all-day events — single cell vs span rendering (display-only).
4. **Default month TZ** bug risk on kalender URL defaults.
5. **Tasks in month cells** — product wants tasks as first-class blocks under `Alle`/`Aufgaben`.
6. **PERSON_ASSIGNMENT** non-sporting officials — intentional exclusion from team programme?

---

## 17. Recommended programme roadmap

### CALENDAR-UX-02 — Canonical aggregation + normalized view model

- Implement `NormalizedCalendarItem` loader bundle.
- Unify kalender + dashboard data path; fix time labels on kalender.
- Decide participation inclusion; update source matrix `targetIncluded`.
- Unit tests for normalization and filter semantics.

### CALENDAR-UX-03 — FM26-inspired month workspace

- Event block cells, toolbar layout, overflow `+N weitere`.
- Remove/lazy-load empty selected-day wasteland.
- SCE visual system applied to blocks (glass, typography, icons).

### CALENDAR-UX-04 — Interaction, responsive, hardening

- Mobile agenda sheet, keyboard a11y, perf prefetch, parity tests.
- Close programme documentation.

---

## Appendix A — Current vs target relevance (quick reference)

| Mechanism | Current | Target |
|-----------|---------|--------|
| Team membership (sporting) | Yes | Yes |
| Trainer / player assignment | Yes | Yes |
| Org assignment (non-sporting) | No team events | No change unless PO expands |
| Club role / admin perms | Auth only, not relevance | No change |
| Task assignee | Yes | Yes |
| Task creator/follower | No | No |
| Meeting participant/organizer | Yes | Yes |
| Event invitee (non-meeting) | No dedicated model | No |
| Participation RSVP | Dashboard only | Product decision |

---

*End of SCE-CALENDAR-UX-01 architecture audit.*
