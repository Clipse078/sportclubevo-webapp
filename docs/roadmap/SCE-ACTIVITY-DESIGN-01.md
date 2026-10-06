# SCE-ACTIVITY-DESIGN-01 — Unified Activity Experience

> **Document type:** Product roadmap — follow-up to SCE-ACTIVITY-UX-01  
> **Status:** Accepted direction — **not** part of PR #792 / SCE-ACTIVITY-UX-01 implementation  
> **Last updated:** 2026-10-03  
> **Maintained by:** SportClubEvo product team

---

## Relationship to SCE-ACTIVITY-UX-01

**SCE-ACTIVITY-UX-01** (merged to STAGE) established the canonical **presentation read-model** (`lib/sporting-activity-presentation/`), semantic activity identity colors, compact hierarchy for Dashboard → Mein Programm, and shared `SportingActivityIdentity` on Planning → Trainings / Spiele / Turniere management lists.

**SCE-ACTIVITY-DESIGN-01** is the next umbrella: unify activity **experience** (design system, detail layer, management cards, Wochenplaner density, consume vs manage navigation) across all surfaces. Implementation is split into sub-packages **01A–01E** below.

Architecture reference for the UX-01 foundation: [`docs/architecture/SCE-SPORTS-ACTIVITY-PRESENTATION.md`](../architecture/SCE-SPORTS-ACTIVITY-PRESENTATION.md).

---

## Product principle — read vs manage

> **A sporting activity is a domain object, not an edit form.**

Opening an activity must provide a **canonical read experience** (Activity Detail). **Editing** is a **privileged action** on that object.

The Activity Detail layer is the common bridge between:

- Dashboard (Mein Programm)
- Mein Kalender
- Wochenplaner
- Team surfaces
- Attendance
- Communication
- Notifications
- future Spielerpool
- future Mobile

Activity Detail must be designed **independently** of current desktop management forms. Normal users must see only **personally and role-relevant** information — not administrative/source fields merely because they exist on the canonical record.

**Examples of admin-only information** (must not appear in normal Activity Detail):

- Raw SFV identifiers
- Sync/import metadata
- Source-system internals
- Administrative publication controls
- Internal allocation metadata
- Technical event fields
- Management-only status controls

---

## Semantic activity colors (canonical)

Preserve across all future packages:

| Kind | Identity color |
|------|----------------|
| Training | **blue** |
| Spiel (Match) | **red** |
| Turnier (Tournament) | **orange** |

Historical inconsistency (e.g. match green in some programme/calendar code vs red on Infoboard) is tracked separately as **SCE-ACTIVITY-COLOR-01** — migrate to shared design-system tokens, not surface-specific mappings.

---

## SCE-ACTIVITY-DESIGN-01A — Activity Design System + ClubIdentity

**Goal:** One canonical visual system across personal and planning surfaces.

**Status (STAGE):** **Foundation implemented** — presentation primitives and contracts in `lib/sporting-activity-design/` + `components/sporting-activity/`. Existing UX-01 consumers are not fully migrated; 01B–01D adopt these building blocks incrementally.

### 01A architecture (implemented)

| Concern | Source of truth |
|--------|-------------------|
| **ClubIdentity contract** | `lib/sporting-activity-design/club-identity.ts` — `displayName`, optional `id` / `externalAssociationId`, `logoUrl`, `fallbackIdentity` (initials or neutral icon). Built via adapters from match sides, tournament organiser fields, or name-only input — **not** a new persistence entity. |
| **Match-side logo URL** | `resolveMatchSideClubLogoUrl` — own team → `Tenant.logoUrl`; external → `MatchcenterSide.externalLogoUrl` (Club Directory chain). Re-exported from `lib/matchcenter/club-identity.ts` for legacy imports. |
| **Tournament organiser logo URL** | `resolveTournamentOrganiserClubLogoUrl` — **`Event`-derived `organizerLogoUrl` only** (populated by `lib/tournaments/tournament-service.ts` / `lib/tournaments/club-identity.ts`). No substitution from participating SCE team or HOME tenant branding at presentation time. |
| **External / SFV crest data** | Persisted on `ExternalClub.logoUrl` / `ExternalTeam.logoUrl`; canonical Verein fallback via `lib/club-directory/logo.ts` and `lib/club-directory/canonical-logo-resolution.ts` at **load** boundaries (Infoboard, public feeds, tournament service) — not per-row network fetch. |
| **Fallback crest** | `ClubCrest` — initials from `deriveClubIdentityFallbackLabel` (prefers `shortName` when compact); `onError` hides broken images. No “Logo fehlt” copy. |
| **Match home/away** | `buildMatchClubIdentityPair` + `MatchClubPair` — **home always left, away always right**, independent of tenant position. |
| **Tournament organiser** | `buildTournamentOrganiserClubIdentity` — organiser name + crest distinct from participating team (`SportingActivityPresentation.team`). |
| **Training** | Unchanged UX-01 identity (`SportingActivityIdentity` text hierarchy); no mandatory crest on training rows in 01A. |
| **Density** | `SportingActivityDensity`: `compact` \| `planner` \| `management` — layout only; maps to UX-01 formatter via `mapSportingActivityDensityToPresentationDensity`. |
| **Activity colors** | `lib/sporting-activity-design/activity-color-tokens.ts` delegates to `lib/sporting-activity-presentation/activity-type-pill.ts` (Training blue, Spiel red, Turnier orange). Repository-wide migration remains **SCE-ACTIVITY-COLOR-01**. |

**Shared UI primitives:** `ClubCrest`, `ClubIdentityDisplay`, `MatchClubPair`, `ActivityTypePill` under `components/sporting-activity/`.

**Deferred to 01B–01E:** Activity Detail, management card redesign, Wochenplaner planner blocks, consume vs manage navigation, permission hardening.

**Surfaces (target consumers, not all migrated in 01A):**

- Mein Programm
- Mein Kalender
- Wochenplaner
- Planning → Trainings
- Planning → Spiele
- Planning → Turniere

**Dependency:** SCE-ACTIVITY-UX-01 presentation layer and `SportingActivityIdentity` component.

---

## SCE-ACTIVITY-DESIGN-01B — Activity Detail Experience

**Status (closure):** **Implemented on STAGE via PR #794** — Activity Detail read layer, Mein Programm + Mein Kalender consume navigation, on-demand detail loading, participant-facing filtering. **Human UAT PASS** for consume architecture and Training / Match / Tournament detail (Michael, Club Admin). **Cross-role permission matrix UAT deferred to 01E** (Michael’s FCA identity is Club Admin only; do not weaken admin permissions for testing).

**Goal:** Click on a sporting activity → **OPEN ACTIVITY**, not **EDIT ACTIVITY**.

**Scope:** Permission-aware read/detail experience for Training, Match, and Tournament.

**Entry points (current and future):**

- Mein Programm
- Mein Kalender
- Wochenplaner
- Team / activity surfaces
- Notifications / deep links (future)
- Mobile (future)

**Layout targets:**

- **Desktop:** large side sheet / detail panel.
- **Mobile:** full-screen activity detail.

**Content guidelines (normal user, role-relevant only):**

| Kind | Detail should include (when permitted & relevant) |
|------|---------------------------------------------------|
| **Training** | Activity/team, date/time, club, venue, facility/resource, address/maps, meeting time, trainer/contact, participant notes, personal participation/attendance |
| **Match** | Home/away club logos and names, kickoff/end, home/away context, competition, host/location, address/maps, meeting time, own team, personal participation, relevant participant information |
| **Tournament** | Organiser logo/name, tournament name, date/time, location, address/maps, own participating team, meeting time, format where relevant, personal participation, participant information |

**Bearbeiten** in Activity Detail appears **only** for users with appropriate **management capabilities** (e.g. Spielbetrieb Koordinator — use canonical permissions, do not hardcode role names).

### 01B implementation (merged to STAGE)

**Human UAT (confirmed PASS)**

- Activity Detail consume architecture; Mein Programm opens detail (not edit).
- Training, Match, and Tournament Activity Detail behave as designed.
- Consume surface excludes large management/admin experience; semantic presentation preserved.
- Organiser crest presentation; management modules remain separately available.
- Club Admin retains Planning access.

**R1 corrections (implemented)**

- Duplicate sheet title removed; training hierarchy and date/time improved.
- Club context on training detail; unsafe facility-only **Route öffnen** removed.
- Mein Team improved; tournament organiser repetition reduced; misleading Teams count removed; sparse detail polish.

**Architecture**

- Canonical read model: `SportingActivityDetail` in `lib/sporting-activity-detail/` (server-composed; no Prisma/domain leakage to the client).
- Presentation reuse: `SportingActivityPresentation` + 01A `ClubIdentity` / `MatchClubPair` / tournament organiser identity.
- UI shell: SCE `Sheet` with activity-detail width (`~680px` max), scroll body, Escape/backdrop close, focus restore to trigger on close.
- Contextual navigation: `SportingActivityDetailProvider` in authenticated admin shell intercepts links to activity detail routes and loads via `GET /api/dashboard/sporting-activity-detail` (on-demand; dashboard initial load unchanged).
- Direct / deep links: `/dashboard/activity/training-session/[sessionId]` and `/dashboard/activity/event/[eventId]` render full page detail (mobile-friendly card layout).

**Read vs manage**

- Mein Programm + Mein Kalender (selected-day agenda) deep links now target Activity Detail for TRAINING / MATCH / TOURNAMENT.
- Management editors (`/dashboard/training/sessions/.../edit`, `/dashboard/planner/edit/...`) unchanged; no Bearbeiten slot wired in 01B (reserved for 01E).

**Participant data boundary**

- Included when canonical data exists: schedule, location lines, team, meeting time (events), trainers (training), organiser crest (tournament), participation (when `ParticipationResponse` exists), participant `description` / series description.
- Excluded: SFV IDs, sync timestamps, import/source metadata, publication/admin controls, raw policy JSON.

**Participation**

- Reuses `respondToPersonalParticipationAction` when actor may respond for linked person; otherwise read-only status.

**Performance**

- Detail fetched only on open (sheet) or on direct route navigation; programme adapters unchanged except `deepLink` targets.

**Deferred**

- 01C management cards, 01D Wochenplaner block UX, 01E permission/navigation hardening + Bearbeiten, FACILITY-MODEL-01 hierarchy.

---

## SCE-ACTIVITY-DESIGN-01C01D — Unified Activity Visual System & Planning Rollout

**Status (STAGE):** **CLOSED — Human UAT PASSED (03.10.2026)** — merged via PR #795. Shared meta rail, compact/programme/calendar parity, Wochenplaner canonical colors, management cards (Trainings / Spiele / Turniere / Veranstaltungen), create/edit identity summaries. Activity Detail (01B) unchanged except shared-component compatibility.

**Human UAT (Michael, Club Admin — 03.10.2026):** Mein Programm, Wochenplaner (+ Training/Match editors), Trainings management, Matchcenter, Tournamentcenter, Veranstaltungen — Training blue / Spiel red / Turnier orange; non-wrapping `HH:mm–HH:mm`; no fabricated end times; trainings time dedupe; neutral context badges; football-native match identity; clear tournament organiser; canonical editor identity headers.

**Delivered primitives:** `SportingActivityMetaRail`, `EventDomainMetaRail`, `SportingActivityFormIdentitySummary`, `SpieleManagementMatchIdentity`, `TournamentManagementIdentity`; `SportingActivityIdentity` supports `showTypeLine` / meta-rail split.

**SCE-ACTIVITY-COLOR-01 (partial close):** Planning Hub Wochenplaner blocks + touched management surfaces use canonical `--sce-info` / `--sce-secondary` / `--sce-primary` tokens. Remaining non-planning legacy consumers (e.g. some calendar marker dots) stay on **SCE-ACTIVITY-COLOR-01** until migrated.

### SCE-ACTIVITY-DESIGN-01C01D-R1 — Human UAT corrections

**Status:** **Delivered on feature branch** (PR #795, STAGE target) — presentation-only R1; no permission or Activity Detail architecture changes.

- Tournament/match **context badge** beside primary title (not a separate row under meta rail).
- **`formatSportingActivityTimeRange`** — single HH:mm–HH:mm unit on meta rails, planner blocks, management, detail schedule lines, Veranstaltungen.
- **Training blue / Spiel red / Turnier orange** enforced on planning editor identity summaries (removed legacy green Training / blue Heimspiel activity identity).
- Rollout: Mein Programm, Mein Kalender selected-day agenda, Wochenplaner individual blocks, Trainings/Spiele/Turniere management, Matchcenter, create/edit identity summaries.

**Still open:** **01E** (consume/manage matrix), **FACILITY-MODEL-01**, residual **SCE-ACTIVITY-COLOR-01** (month-cell markers / unrelated surfaces), **BUILD-PERF**, **PERFORMANCE-INFRA-01**.

### SCE-ACTIVITY-DESIGN-01C01D-R2 — Final consistency & UAT closure

**Status:** **CLOSED** (PR #795 → STAGE) — presentation-only R2; human UAT passed 03.10.2026.

- Meta rail time ranges use **non-wrapping** single-unit presentation (`whitespace-nowrap`, compact rail width tuned for `HH:mm–HH:mm`).
- Trainings management rows show canonical time **once** (meta rail); weekday/facility/status/actions preserved; variable schedules keep the ZEIT column label.
- SCE icon regression tests reconciled with 01C01D meta-rail identity (obsolete dot+icon programme expectations superseded).
- Create/edit surfaces gain **schedule line** on `SportingActivityFormIdentitySummary` (training series edit, training session edit, Veranstaltung edit timing).

**Deferred to SCE-ACTIVITY-DESIGN-02:** premium management-center card composition (Matchcenter / Tournamentcenter / Trainings / Veranstaltungen full layout).

---

## SCE-ACTIVITY-DESIGN-02 — Premium Management Activity Experience

**Status:** **OPEN** — not in PR #795.

**Purpose:** Take the semantically correct 01A / 01B / 01C01D activity system and upgrade management surfaces from functional administrative views to a premium sports operating experience.

### A. Universal information hierarchy

Every activity experience should answer, in order unless context requires otherwise:

1. **WHAT?**
2. **WHEN?**
3. **WHO?**
4. **WHERE?**
5. **WHAT DO I NEED TO DO?**

### B. Management card grid

Replace accidental full-width empty canvases with intentional internal layout:

**META | IDENTITY / FIXTURE | CONTEXT | OPERATIONS**

Responsive composition required — not a literal four-column table everywhere.

### C. Matchcenter premium card

Football-native fixture as focal object (desktop concept):

- `[SPIEL]` + `16:00–18:00`
- Home crest/name **left**, **VS**, away crest/name **right**
- Auswärts · competition · location
- Primary operational action + secondary `...`
- No giant dead space; no raw SFV metadata; status/action secondary to fixture identity

### D. Tournamentcenter premium card

- `[TURNIER]` + time range
- Organiser crest + name; tournament title + Auswärts badge
- Location; participating SCE team separate from organiser
- Geplant / Öffentlich + actions
- No misleading tournament-size semantics; fix left-heavy empty-card problem

### E. Trainings premium management row

Operationally efficient — **no duplicate time**. Identity: TRAINING, range, team, weekdays, facility/resource, status, contextual action. Preserve table scan efficiency.

### F. Veranstaltungen premium management row

Veranstaltung remains its own domain (not relabelled as sporting activity). Mature row: date/time, identity, location, publication/status, operational action. Avoid huge empty full-width cards.

### G. Five presentation jobs

| Job | Role |
|-----|------|
| **COMPACT** | Mein Programm / calendar agenda — personal consumption |
| **PLANNER** | Spatial/time/resource planning |
| **MANAGEMENT** | Scanning, operational state and actions |
| **DETAIL** | Understanding, participation, personally relevant info |
| **EDITOR** | Privileged changes |

Shared canonical identity/data semantics; **not** the same card component everywhere.

### H. Contextual primary action

One primary contextual action when useful (e.g. Vorbereitung öffnen, Planung bearbeiten, Teilnahmen ansehen). Secondary actions in `...`. Capability-driven — never role-name strings. Final permission behavior with **01E**.

### I. Interaction polish

After structure: hover, focus, clickable regions, truncation discovery, touch targets, skeleton geometry, empty states, subtle transitions. Structure before animation.

---

## SCE-STATUS-DESIGN-01 — Canonical Operational Status Semantics

**Status:** **OPEN** — document only; **not implemented in #795**.

**Purpose:** Separate **activity identity colors** from **operational status** semantics.

| Layer | Treatment |
|-------|-----------|
| **Activity identity** | Training blue, Spiel red, Turnier orange, Veranstaltung event/domain treatment |
| **Operational status** | success/ready/active, attention/open, error/conflict, inactive/archived, publication states |

Status must use semantic token + text + icon where appropriate — **never color alone**.

**Future audit consumers:** Trainings, Spiele, Turniere, Veranstaltungen, Aufgaben, Requirements, Communication, Workspace.

---

## SCE-ACTIVITY-DESIGN-01C — Match & Tournament Management Cards

**Goal:** Football-native management list/card presentation without replacing operational data.

**Note:** Largely absorbed by **01C01D** on STAGE; keep section for historical card spec reference.

**Match card:**

- HOME club **always left**, AWAY club **always right**.
- Home crest, home club/team, VS / result when applicable, away crest, away club/team.
- Red **SPIEL** identity.
- Eigener Verein / Auswärts, date/time, competition, location.
- Operational management data remains available separately (not mixed into identity card).

**Tournament card:**

- Organiser identity is the visual anchor.
- Organising club logo, tournament name, orange **TURNIER** identity.
- Eigener Verein / Auswärts, organiser, location, date/time, participating SCE team(s).
- Do **not** use participating-team logo as organiser logo unless that club actually organises the tournament.

---

## SCE-ACTIVITY-DESIGN-01D — Training Management + Wochenplaner

**Goal:** Efficient training management layout; planner-density blocks on Wochenplaner.

**Training management:** Retain efficient management layout (UX-01R8 identity is baseline, not final card system).

**Wochenplaner:** Planner-density Sporting Activity presentation — **compact recognisable blocks**, not large cards.

| Kind | Planner block (conceptual) |
|------|----------------------------|
| Training | Time, team/training, blue Training identity, resource/location |
| Match | Time, home logo/name vs away logo/name, red Spiel identity, resource/location |
| Tournament | Time, organiser logo + tournament, orange Turnier identity, location |

---

## SCE-ACTIVITY-DESIGN-01E — Permission & Navigation Hardening

**Status:** **Not started** — required before marking permission/persona matrix UAT complete.

**Goal:** Separate **CONSUME** from **MANAGE** in navigation and authorization.

### Persona matrix (required UAT / implementation scope)

Verify and harden behavior **per persona** using **canonical permissions/capabilities only** — never role-name string checks.

| Persona | Consume expectations | Manage expectations |
|--------|----------------------|---------------------|
| **Normal member / player / parent** | May consume personally relevant activities; Activity Detail is default destination; no management UI merely because activity is visible; no SFV/admin/source/publication internals; no edit without explicit management permission | No planning administration from consume surfaces |
| **Trainer** | Consumes relevant activities; trainer-specific operational actions only where separately authorized; viewing an activity must not imply planning administration; future participation/Spielerpool actions remain capability-based | Bearbeiten / editors only via granted capabilities |
| **Spielbetrieb Koordinator** | Consumes activities like other users | Operational management capabilities granted to the role; **Bearbeiten** only through canonical permissions/capabilities |
| **Club Admin** | Consumes activities | Retains broad Planning/management access; Activity Detail does not remove legitimate admin functionality; management actions remain permission/capability based |

**Never implement:**

```ts
if (roleName === "Spielbetrieb Koordinator") { ... }
if (roleName === "Club Admin") { ... }
```

Use canonical permissions/capabilities (FCA capability model, server-side enforcement on edit routes, server actions, and APIs).

**Wochenplaner (deferred from 01B):** planner block → Activity Detail consume path and consume-vs-manage navigation decision land in **01D / 01E**; current **Planning bearbeiten** behavior unchanged in 01B.

**Normal (consume) navigation:**

- Mein Programm → Activity Detail
- Mein Kalender → Activity Detail
- Wochenplaner → Activity Detail
- Future Mobile → Activity Detail

**Administrative (manage) navigation:**

- Planning → Trainings / Spiele / Turniere → management environment

**Management lists:**

- Prefer: row/card click → **Activity Detail**
- Explicit **Bearbeiten** / context action → editor (where UX permits)

**Authorization:**

- Editing must remain permission-protected.
- Do not rely on hiding UI controls alone — edit routes, server actions, and APIs must enforce authorization.
- Use canonical permissions/capabilities (not hardcoded FCA role names).

---

## Related follow-up packages (separate from DESIGN-01)

### FACILITY-MODEL-01

**Status:** **OPEN** — no hardcoded site aliases (e.g. Kunstrasen 2 → Im Brüel) in Activity Detail; consume canonical facility/resource until Site → Facility → Resource data exists.

Required future hierarchy:

**Site → Facility → Resource**

Example: *Im Brüel* → *Kunstrasen 2* → *Kunstrasen 2 A*

Not in SCE-ACTIVITY-UX-01 scope.

### SCE-ACTIVITY-COLOR-01

**Status:** **OPEN (narrowed)** — Wochenplaner + 01C01D + **SCE-CALENDAR-UX-02 month markers** canonicalized (MATCH → match-red). Remaining: any straggler Infoboard-adjacent mappings not yet on `activity-type-pill.ts`.

Audit and migrate historical color inconsistency across consumers to shared design-system tokens:

- Training = blue
- Spiel = red
- Turnier = orange

---

## SCE-CALENDAR-UX-02 — Personal Calendar World-Class Upgrade

**Status:** **CLOSED**

**Human UAT:** **PASSED** — 03.10.2026 (Product Owner)

**Accepted contract:**

- Personal calendar month presentation accepted
- Semantic activity markers accepted
- Selected-day state accepted
- Activity legend accepted
- Month navigation accepted
- Selected-day agenda accepted
- Integration with the canonical SCE activity presentation remains intact

**Out of scope / follow-up (SCE-PLANNER-UX-08 and later, not SCE-CALENDAR-UX-02):**

- Management-calendar redesign
- Wochenplaner Kalender / Spielfeld / Garderobe unified workspace
- Drag/drop and resize planning interactions
- Resource/allocation workspace redesign
- Broader management calendar presentation

**Goal:** Upgrade the personal Dashboard calendar (`Mein Kalender`) now that the canonical activity identity/presentation system is established.

**Delivered (engineering):**

- Calm month-cell **semantic dot markers** (+N overflow) with type-aware aggregation (`personal-calendar-day-marker-slots.ts`)
- Accessible day summaries (e.g. «2 Trainings, 1 Spiel») — not color-only
- **match-red** calendar markers aligned with SCE-ACTIVITY-COLOR-01 (training blue / spiel red / turnier orange)
- Selected-day agenda via `PersonalProgrammeAgendaRow` + Activity Detail consume path (unchanged)
- Shared `CalendarActivityMarkers` / `CalendarMonthLegend` on dashboard month grid; compact full Kalender mobile cells reuse markers
- Personal empty copy, month empty hint, legend, keyboard day navigation, today vs selected styling

**Core direction (intent only):**

- Personal calendar experience — not a generic club calendar
- Canonical Training / Spiel / Turnier semantics and semantic activity colors
- Clear multi-activity days and excellent selected-day agenda
- Responsive desktop/mobile design; useful density without clutter
- Interaction with canonical Activity Detail (consume path)
- Reuse `SportingActivityPresentation` / `SportingActivityIdentity` — no duplicate activity presentation architecture

---

## SCE-PLANNER-UX-08 — Unified Planning & Allocation Workspace

**Status:** **IN PROGRESS** — **08-01** foundation on branch `cursor/sce-planner-ux-08-01-unified-planning-foundation` (from post–PR #796 `origin/STAGE`).

**Packages:**

| ID | Focus |
|----|--------|
| **08-01** | Unified workspace foundation — Kalender / Spielfeld / Garderobe / Liste, shared URL state, adaptive resource timeline, scale fixtures |
| **08-02** | **Canonical Resource Manipulation** — generalize Garderobe-proven DnD/confirm flow to Spielfeld + Garderobe; resource time ≠ activity time; shared `PlanningResourceManipulation` target |
| **SCE-ICONS-02** | **Premium Navigation Icons** — minimal vector Club + Spiele nav icons; ASAP after 08-02, before 08-03 — [`SCE-ICONS-02-PREMIUM-NAVIGATION-ICONS.md`](./SCE-ICONS-02-PREMIUM-NAVIGATION-ICONS.md) |
| **08-03** | **Activity Rescheduling** — Kalender activity date/time/duration; impact-aware confirmation; SFV/authority rules; not silent dependent changes |
| **08-04** | Permission-aware drag/drop & rescheduling — **CLOSED** (Human UAT PASS 2026-10-04; PR #801 → STAGE) — [`SCE-PLANNER-UX-08-04-PERMISSION-AWARE-DND-RESCHEDULING.md`](../planning/SCE-PLANNER-UX-08-04-PERMISSION-AWARE-DND-RESCHEDULING.md) |
| **08-05** | Conflict resolution & operational actions — **CLOSED** (Human UAT PASS 2026-10-05; PR #802 → STAGE) — [`SCE-PLANNER-UX-08-05-CONFLICT-RESOLUTION-OPERATIONAL-ACTIONS.md`](../planning/SCE-PLANNER-UX-08-05-CONFLICT-RESOLUTION-OPERATIONAL-ACTIONS.md) |
| **FACILITY-INTEGRITY-01** | Facility admin ↔ planner read-model integrity (pitches + dressing rooms) — **IN PROGRESS** — broader create/rename/archive-delete propagation (pitches + dressing rooms); **01A closed**; gate before **08-08** if still outstanding — [`FACILITY-INTEGRITY-01-CANONICAL-FACILITY-RESOURCE-INTEGRITY.md`](../planning/FACILITY-INTEGRITY-01-CANONICAL-FACILITY-RESOURCE-INTEGRITY.md) |
| **08-06** | List / search / bulk operational UX — **CLOSED** (Human UAT PASS 2026-10-06; PR #804 → STAGE) — [`SCE-PLANNER-UX-08-06-LIST-SEARCH-BULK-OPERATIONAL-UX.md`](../planning/SCE-PLANNER-UX-08-06-LIST-SEARCH-BULK-OPERATIONAL-UX.md) |
| **08-07** | Responsive / tablet hardening — **IN PROGRESS** — [`SCE-PLANNER-UX-08-07-RESPONSIVE-TABLET-VISUAL-HARDENING.md`](../planning/SCE-PLANNER-UX-08-07-RESPONSIVE-TABLET-VISUAL-HARDENING.md) |
| **08-08** | Integration / Human UAT / release hardening — **PLANNED** |

**Planner follow-ups (discovered 08-04 Human UAT — not reordering 08-05):**

| Id | Focus | Status |
|----|--------|--------|
| **SCE-PLANNER-UX-AGGREGATION-01** | Mixed activity cluster presentation (card vs inspector semantic parity) | PLANNED |
| **SCE-PLANNER-UX-LIST-01** | Operational list experience | **Absorbed by 08-06** (spec retained as historical UAT notes) |
| **PEOPLE-ACCESS-IMPERSONATION-01** | Club Admin «Als Benutzer ansehen» availability (08-04 UAT observation) | OPEN / SEPARATE |

**Dependencies (not absorbed):** SCE-ACTIVITY-DESIGN-01E, SCE-ACTIVITY-DESIGN-02, FACILITY-MODEL-01, SCE-STATUS-DESIGN-01, SCE-ACTIVITY-COLOR-01 (narrowed), PERFORMANCE-INFRA-01, BUILD-PERF.

**Goal:** Unified Planning & Allocation Workspace (Wochenplaner / allocation UX). **Not in scope** for SCE-CALENDAR-UX-02 or PR #796.

**Product principles (preserved for UX-08):**

- One operational planning workspace
- Primary workspace perspectives: Kalender, Spielfeld, Garderobe, Liste
- Kalender, Spielfeld and Garderobe retain the same temporal calendar/grid context where appropriate; switching perspective changes the planning dimension and card content rather than disconnected tools
- Liste remains a separate high-density operational perspective
- Shared date/week navigation, filters, conflict state, and activity identity; canonical Training / Spiel / Turnier / Veranstaltung semantics
- Permission-aware direct manipulation (time-management vs allocation-management vs read-only); drag/drop never bypasses server authorization; optimistic UI reconciles to canonical server state; server-side conflict validation; clear rollback on failed moves; no role-name-string authorization
- Future interaction direction: drag to reschedule, drag between permitted resources, resize where semantics permit, conflict preview, clear drop targets, keyboard alternatives, undo/recovery where safe, strong responsive behaviour, dense readable planning cards

**Manipulation architecture (R4 — canonical):**

- **Kalender** = activity scheduling (*Wann?*) → **08-03** Activity Rescheduling with impact analysis.
- **Spielfeld** = primary physical-resource allocation (*Wo?*) → **08-02** Canonical Resource Manipulation.
- **Garderobe** = supporting-resource allocation (*Welche Nebenressourcen?*) → **08-02** (foundation: Garderobe manipulation on **08-01** / PR #797).
- One shared flow: direct manipulation → proposed mutation → server conflict/impact validation → user confirmation → server mutation → recovery.
- Resource moves must not silently change kickoff/training/event time; calendar moves must not silently propagate arbitrary dependent changes.
- Capabilities-based authorization only (**01E**); external/SFV authority rules in **08-03**.

Full detail: [`docs/planning/SCE-PLANNER-UX-08-01-FOUNDATION.md`](../planning/SCE-PLANNER-UX-08-01-FOUNDATION.md) (R4 sections).

**Dependency:** `origin/STAGE` HEAD after PR #796 merge.

---

## Suggested execution order

1. **01A** — Design system + ClubIdentity (**closed**)
2. **01B** — Activity Detail (**closed**)
3. **01C01D** — Unified visual rollout (**closed — human UAT 03.10.2026**)
4. **01E** — Permission & navigation hardening (**next**)
5. **SCE-CALENDAR-UX-02** — Personal calendar world-class upgrade (**closed — human UAT 03.10.2026**; PR #796 → STAGE)
6. **SCE-PLANNER-UX-08** — Unified Planning & Allocation Workspace (**upcoming**; branch from post-#796 STAGE)
7. **01C / 01D** — Residual items folded into 01C01D where implemented; any gaps tracked in follow-ups

**SCE-ACTIVITY-COLOR-01** (narrowed), **FACILITY-MODEL-01**, **SCE-ACTIVITY-DESIGN-02**, **SCE-STATUS-DESIGN-01**, **PERFORMANCE-INFRA-01**, and **BUILD-PERF** remain open on independent tracks.
