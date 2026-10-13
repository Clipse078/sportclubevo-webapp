# SCE Activity Presentation Standard

> **Programme:** SCE-UI-ROLLOUT-01+  
> **Implementation gate:** **01C** (contract); **01D–01G** (card families)  
> **Related:** [`SCE-ACTIVITY-DESIGN-01`](../roadmap/SCE-ACTIVITY-DESIGN-01.md), [`SCE-SPORTS-ACTIVITY-PRESENTATION.md`](../architecture/SCE-SPORTS-ACTIVITY-PRESENTATION.md)

---

## 1. Purpose

Define the **canonical view-model and presentation pipeline** so the same underlying activity is recognized everywhere without independent per-surface formatting.

```text
domain record (authoritative)
  → canonical presentation resolver (01C)
  → SportingActivityPresentation (+ extensions)
  → activity card family / density renderer (01D–01G)
  → surface-specific layout (Dashboard, Matchcenter, …)
```

Presentation is **derived**. It must not mutate provider-owned fields (ADR-08).

---

## 2. Existing shared model (baseline)

| Layer | Module | Role |
|-------|--------|------|
| Serializable contract | `lib/sporting-activity-presentation/types.ts` — `SportingActivityPresentation` | Programme/calendar embedding (UX-01) |
| **Canonical 01C model** | `lib/sporting-activity-presentation/canonical` — `SceActivityPresentationModel`, `resolveSceActivityPresentation` | Typed discriminated contract for all kinds |
| Builders | `lib/sporting-activity-presentation/builders.ts`, `compact.ts`, `format.ts` | Row/card text lines (legacy consumers until 01D–01G) |
| Management adapters | `management-match-presentation.ts`, `management-training-presentation.ts`, `management-tournament-presentation.ts`, `management-club-event-presentation.ts` | Spiele/Trainings/Turniere/Veranstaltungen lists |
| Location | `location.ts` | Host → venue → resource |
| Time | `time-range.ts` | Schedule formatting |
| Design / crests | `lib/sporting-activity-design/*` | `ClubIdentity`, `MatchClubPair`, density |
| Detail load | `lib/sporting-activity-detail/*` | Activity Detail consume path |
| UI primitives | `components/sporting-activity/*` | Identity, meta rails, pills |

**01C** unifies resolver entry point; today adapters are **partially centralized**.

---

## 3. Canonical presentation contract

### 3.1 Common fields (all activity kinds)

| Field | Type / notes |
|-------|----------------|
| `activityId` | Stable id (session id, event id, match id as appropriate) |
| `activityType` | `TRAINING` \| `MATCH` \| `TOURNAMENT` \| `CLUB_EVENT` (map Prisma `Event.type` + training session) |
| `resourceKey` | e.g. `training-session:{id}`, `event:{id}` — navigation dedupe key |
| `title` / identity | Primary human label |
| `teamContext` | Participating / Hauptteam / own-team where relevant |
| `schedule` | `startAt`, `endAt`, `meetingAt`, `allDay` |
| `status` | SCE operational presentation status (mapped, not raw enum alone) |
| `hostOrOrganiser` | Club/host/organiser display |
| `location` | `SportingActivityLocation` structured hierarchy |
| `navigationTarget` | `{ consumeHref, manageHref?, defaultTab? }` |
| `semanticIcon` | From `sce-activity-semantic-icons` / activity kind |
| `permissions` | Optional capability snapshot for actions on cards (read-only flags) |

### 3.2 Match-specific extensions

| Field | Rule |
|-------|------|
| `homeClubIdentity` / `awayClubIdentity` | `buildMatchClubIdentityPair` — **home left, away right always** |
| `competitionLabel` | League/cup context |
| `result` | Score/result display when known |
| `matchStatus` | Lifecycle distinct from participation availability |
| `homeAwayInvariant` | Boolean audit flag — must be true when crest UI renders |

### 3.3 Training-specific

| Field | Rule |
|-------|------|
| `trainingIdentity` | Team + session title |
| `trainingStatus` | Mapped via `normalize-training-status` |
| `location` | Full hierarchy; compact may show truncated line with ellipsis |

### 3.4 Tournament-specific

| Field | Rule |
|-------|------|
| `tournamentIdentity` | Title distinct from match fixture |
| `organiserClubIdentity` | `buildTournamentOrganiserClubIdentity` — must not disappear per surface |
| `hauptteamContext` | `Event.team` / team season — not first participant |
| `tournamentStatus` | Not match lifecycle |

### 3.5 Club Event-specific

| Field | Rule |
|-------|------|
| `eventTitle` | Primary identity on `SceClubEventCard` |
| `organiser` | Optional `ClubIdentity` — not a mandatory crest |
| `schedule.allDay` | **Ganztägig** presentation; iCal exclusive `endAt` for multi-day all-day |
| `location` | `buildVeranstaltungenManagementActivityPresentation` + facility label merge via `formatClubEventPlayableVenueLabel` |
| `lifecycle status` | `event.status` → `SceClubEventCardStatus` |
| `publication` | `reviewStage` + channel flags — management row only, not collapsed into lifecycle badge |
| **Card family** | `SceClubEventCard` (01G) — label **VERANSTALTUNG** |

---

## 4. Density model

| Density | Mandatory | Optional | Hidden | Surfaces |
|---------|-----------|----------|--------|----------|
| **HERO** | Identity, date/time, primary status | Venue line, competition | Resource micro | Detail header, dashboard hero |
| **STANDARD** | Identity, schedule, status | Location (compressed), team | Secondary actions | Management rows, today cards |
| **COMPACT** | Title/fixture, time, status badge | One-line location | Logos optional | Mein Programm, calendar popover |
| **MICRO** | Type icon + short label + time | — | Most meta | Month grid dots, notification refs |

Mapping to code today:

- `compact` → COMPACT
- `planner` → STANDARD (Wochenplaner blocks)
- `management` → STANDARD/Hero in lists

Same `resourceKey` at all densities.

---

## 5. Activity card family (01D–01G)

Conceptual tree (implementations may reuse `components/sporting-activity`):

```text
ActivityCard (shared shell)
├── shared: SceActivityIdentity, SceActivityMeta, SceActivityStatus, SceActivityActions
├── SceMatchCard (01D) — `SceMatchPresentationModel` + densities HERO|STANDARD|COMPACT|MICRO
├── TrainingCard — team + schedule + location hierarchy
├── TournamentCard — organiser + Hauptteam badge; never Match layout
└── ClubEventCard — event identity + organiser
```

**Match (01D shipped):** `components/sporting-activity/SceMatchCard.tsx` consumes `resolveSceMatchPresentation` output; fixture row uses `MatchClubPair` / `ClubIdentityDisplay` with `data-sce-match-side` invariants. Legacy `MatchCard.tsx` (Matchcenter) remains until **01H**.

**Match crest & result (01D R9+):** Real club logos render via `ClubCrest` with **`object-contain`** inside square layout bounds — **never** as circular avatar pills. Missing/broken crests use the **circular initials/icon fallback**; while a valid URL loads, the same fallback may show underneath (no empty crest gap). Crest URLs come from **`resolveMatchSideClubLogoUrl`** (tenant internal `canonicalTeamId` → club crest; external → `externalLogoUrl`) and **must not vary by upcoming vs completed** when identity is unchanged. Completed/live **result scores** use the R9 density scale and **`--sce-match-result-foreground`** (invariant across win/loss/draw); **0:0** is valid when `result` is present. **Matchcenter open-points** panels stack **below** the canonical card — never compress card width.

### World-class card UX rules

1. **Identity before metadata** — user must see what the activity is before operational fields.
2. **Status** — text + icon; not colour alone.
3. **Icons** — recognition; labels carry meaning (`sce-activity-semantic-icons`).
4. **Orange** — interaction/accent only (ADR from SCE-UI-STANDARD-01).
5. **Primary click** — opens canonical **consume** detail (`buildSportingActivityDetailHref`) unless surface is explicitly manage-only (Matchcenter record).
6. **Secondary actions** — high-value only (e.g. availability context → `?tab=teilnahme`); defer complexity to detail workspace.
7. **Logos** — real crests: natural aspect ratio, `object-contain`, no circular pill; graceful `onError` → circular initials/icon fallback (`ClubCrest`).
8. **Long names** — truncate with tooltip/title; no layout break.
9. **Responsive** — reflow fields; do not scale unreadable desktop micro type on mobile.
10. **Loading / error / empty** — skeleton on identity block; explicit empty states for missing opponent/logo data.

---

## 6. Activity navigation contract

| Intent | Builder |
|--------|---------|
| Consume (read) detail | `buildSportingActivityDetailHref` / `FromResourceKey` |
| Manage (edit) module | Module routes (`matchcenter`, `training/.../edit`, …) — inventory in legacy register until unified policy |
| Tab deep link | `buildActivityTabHref(manageBasePath, tabKey)` |

Examples (pattern, not hard-coded product ids):

- General card click → consume detail or manage default tab `uebersicht`.
- Squad context link → manage path + `?tab=aufgebot`.
- Availability context → `?tab=teilnahme`.
- Communication → `?tab=kommunikation`.

**Duplication risk:** two match entry paths (consume `/dashboard/activity/event/:id` vs manage `/dashboard/matchcenter/:id`) — 01C documents when each applies; 01K aligns notifications.

---

## 7. Status / badge semantics

| Layer | Owns |
|-------|------|
| Provider / domain | SFV sync status, raw `Event.status`, participation enums |
| SCE operational | `resolveSpieleStatusPresentation`, tournament/training management mappers |
| Programme personal | `lib/personal-agenda/programme-status.ts` |
| Cards | Display mapped label + semantic colour token |

**Do not merge** activity lifecycle with player availability or squad states on the same badge without explicit composite UX.

Key files: `lib/matchcenter/match-lifecycle.ts`, `lib/tournaments/management-view.ts`, `lib/training/management-presentation.ts`, `lib/match-squad/match-availability-presentation.ts`.

---

## 8. Icon semantics

Audit baseline: `lib/sce/workspace/sce-activity-semantic-icons.ts`.

| Concept | Key |
|---------|-----|
| Training / Match / Tournament / Event | Activity kind → `ActivityTypePill` colours (design tokens) |
| Team / Person | Use sparingly on cards |
| Communication / Planning / Participation / Squad | Tab/workspace sections |
| Facilities | `location`, `resources` |

Extend registry only with PO-approved semantic keys; avoid decorative per-field icons.

---

## 9. Responsive / mobile readiness (web)

Structural requirements for later Mobile app:

- Tabs: horizontal scroll, no wrap (see context tabs standard).
- Cards: flex/grid without fixed pixel widths; logos max-size constrained.
- Tables (management lists): card fallback or horizontal scroll intentional in 01M.
- No hover-only critical info.

---

## 10. Accessibility (cards + workspace)

| Area | Minimum contract |
|------|------------------|
| Cards | Semantic link or button; activity name accessible; crest `alt` from club name |
| Focus | Visible focus ring; Enter/Space activates |
| Status | Text label exposed to assistive tech |
| Workspace | Heading hierarchy h1→h2 sections; landmarks on main workspace |

Gaps recorded in 01A inventory; 01M closes.

---

## 11. Authorization on cards

Pass **action capabilities** from server (e.g. canEdit, canOpenSquad). Render:

- **HIDDEN** — action not in DOM
- **DISABLED** — visible but blocked with reason (rare on cards)
- **READ_ONLY** — navigate only

Never infer write access from visible card chrome alone.

---

## 12. Match presentation invariant (audit summary)

See [`SCE-ACTIVITY-PRESENTATION-INVENTORY.md`](./SCE-ACTIVITY-PRESENTATION-INVENTORY.md) for full surface list.

**FAIL (must fix in 01D + Infoboard loader):**

- `components/infoboard/screen1/InfoboardScreen1.tsx` — fallback tenant/opponent rows
- `components/infoboard/screen2/InfoboardScreen2.tsx` — tenant vs opponent layout

**PASS:** `MatchClubPair`, `MatchCard`, management rows with home/away sides, `management-match-presentation.fixtureLine` when pair present.
