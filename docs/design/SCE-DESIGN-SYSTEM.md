# SCE Design System v1.0 — Master Entry Point

> **Programme:** [`SCE-UI-ROLLOUT-01+`](../roadmap/SCE-UI-ROLLOUT-01.md)  
> **Established by:** SCE-UI-ROLLOUT-01B (Context Tabs foundation)

---

## Design principle

**One SCE. One navigation language. One activity language. One visual family.**

---

## Foundational hierarchy

```text
Atmospheric background
  → Context header (identity)
  → Context navigation (tabs)
  → Workspace surface
  → Sections / cards
  → Fields / actions
```

Detailed workspace rules: [`SCE-WORKSPACE-SURFACE-STANDARD.md`](./SCE-WORKSPACE-SURFACE-STANDARD.md)

---

## Canonical primitives (01B baseline)

| Pattern | Canonical module | Standard |
|---------|------------------|----------|
| Context tabs | `lib/context-tabs`, `components/sce/context-tabs/SceContextTabs.tsx` | [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md) |
| Binary on/off settings | `SwitchToggle`, `SwitchThumb` (`components/ui/SwitchToggle.tsx`) | **SCE Control Standard — Toggle First** (this document) |
| Activity tab registries | `lib/activity-navigation/configs.ts` | Activity keys on generic contract |
| Workspace surface | `SceWorkspaceSurface` | [`SCE-WORKSPACE-SURFACE-STANDARD.md`](./SCE-WORKSPACE-SURFACE-STANDARD.md) |
| Activity presentation | `lib/sporting-activity-presentation/canonical` (`SceActivityPresentationModel`) | [`SCE-ACTIVITY-PRESENTATION-STANDARD.md`](./SCE-ACTIVITY-PRESENTATION-STANDARD.md) — **01C** |

---

## Activity presentation (01C)

Canonical pipeline for every SCE sporting activity surface:

```text
domain data (authoritative)
  → typed adapter / resolver (01C)
  → SceActivityPresentationModel (discriminated: MATCH | TRAINING | TOURNAMENT | CLUB_EVENT)
  → shared activity component family (01D–01G)
  → density renderer (HERO | STANDARD | COMPACT | MICRO)
```

**Rules:**

1. Future modules **must consume** `resolveSceActivityPresentation` / `SceActivityPresentationModel` (or the Activity Detail bridge `resolveSceActivityPresentationFromDetail`) when representing an SCE activity — not ad-hoc title/subtitle strings.
2. **Match identity** is always fixture-authoritative: **home left, away right** via `buildMatchClubIdentityPair` — never tenant-relative reordering.
3. **Training location** uses structured `SportingActivityLocation` and `formatSceActivityLocationHierarchy` (host → venue → resource).
4. **Tournament organiser** remains visible via `buildTournamentOrganiserClubIdentity` — tournaments are not matches.
5. **Routes** use `buildSceActivityRoute` / existing `buildSportingActivityDetailHref*` — no duplicate URL policy in cards.
6. **Formatting** (locale strings) stays at the presentation boundary; adapters preserve structured schedule/location/status.

Parallel local presentation models require an ADR exception ([`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md)).

Automated guardrails: `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01c-architecture.test.ts`.

---

## Canonical Match card family (01D)

| Item | Contract |
|------|----------|
| **Component** | `SceMatchCard` (`components/sporting-activity/SceMatchCard.tsx`) |
| **Model** | `SceMatchPresentationModel` via `resolveSceMatchPresentation` — **no parallel Match card model** |
| **Densities** | `HERO` · `STANDARD` · `COMPACT` · `MICRO` — policy from `SCE_ACTIVITY_DENSITY_CONTRACT` |
| **Rich skeleton** | `HERO`, `STANDARD`, and `COMPACT` are **scale variants of one DOM** (`SceMatchRichCardContent` + `SCE_MATCH_RICH_DENSITY_SCALE`) — not separate layouts |
| **MICRO** | Only permitted **structural** variant (inline fixture row) for genuinely constrained contexts |
| **Bounded width** | Rich cards use density max-width tokens (`max-w-lg` / `max-w-md` / `max-w-sm`); surfaces use grids/columns — cards must not stretch to full page width |
| **Surface layout** | Grouping, columns, readiness rails, and actions belong to the **surface** — they must not relocate competition, badges, fixture, schedule, or location inside the card |
| **Identity grammar** | **HOME** name/crest · **vs** · **AWAY** crest/name — fixture-authoritative (`homeLeftAwayRightInvariant`) |
| **Crests** | `ClubCrest` / `ClubIdentity` from 01C — cards do not resolve logo URLs locally |
| **SCE Match crest rule** | When a **valid club logo** exists, render the **full crest artwork** with **`object-contain`**, preserving aspect ratio. Real crests **MUST NOT** appear inside avatar-style **circular pills** (`rounded-full`, circular masks, or circular crop). **Circular initials/icon treatment is reserved for missing or broken crest fallbacks** only. |
| **Results** | Show only when 01C `result` is non-null; **no fake 0:0** for upcoming fixtures |
| **SCE Match result rule** | A real match score (including **0:0**) is the **primary numeric focal point** of completed/live match presentation. Result typography **MUST** use the canonical match density scale (`resultTextClass` / `sceMatchCenterTypographyScale`) — **HERO `text-5xl`**, **STANDARD `text-3xl`**, **COMPACT `text-2xl`**, **MICRO `text-lg`** — and be **materially larger** than VS text and schedule/competition metadata. Scores use semantic token **`--sce-match-result-foreground`** (warm ivory; **same for win/loss/draw**). **Do not** style scores as accent/orange decoration or outcome green/red. |
| **Match operational composition** | Matchcenter / Spiele **open-points** and **Spielvorbereitung** panels are **secondary** operational UI. They **MUST NOT** sit beside the canonical `SceMatchCard` in a layout that compresses card width or distorts fixture identity. Stack operational panels **below** the full-width bounded card (or an clearly separated secondary area). No absolute overlap on neighbouring cards; decorative status lines stay inside the operational panel. |
| **Match crest completeness** | When club/provider data resolves a crest, `SceMatchPresentationModel.fixture.*.logoUrl` **MUST** carry it for **upcoming, live, and completed** matches and across Team / Matchcenter / Wochenplaner consumers. **Tenant team display names** (e.g. Junioren B1) use the **owning club crest** (`Tenant.logoUrl` / internal `canonicalTeamId`), not a team-initial glyph, when available. Lifecycle or result state **MUST NOT** drop crest URLs that the identity layer already resolved. |
| **SCE CLUB VISUAL IDENTITY** | See rules below — participant name ≠ club crest; one canonical resolver; `ClubCrest` renders only. |
| **Crest resolution (upstream)** | **`lib/sporting-data/sce-club-visual-identity.ts`** (`resolveSceClubCrestUrl`, `resolveTenantClubCrestUrl`, `loadSceClubCrestResolutionContext`) is the single crest source. Match read models populate `externalLogoUrl`; presentation uses **`resolveMatchSideClubLogoUrl` → `ClubIdentity` → `ClubCrest`** only. **Initials** when canonical resolution and image load both fail — never because a consumer skipped relations. |

### SCE CLUB VISUAL IDENTITY (product-wide)

1. **Participant display name** (e.g. Junioren B1, FC Therwil C2) and **owning-club visual identity** are separate — never invent a “team crest” from the participant label.
2. **Owning club** supplies the crest (tenant Verein for internal teams; ExternalClub / canonical Verein for opponents).
3. **`lib/sporting-data/sce-club-visual-identity.ts`** owns crest URL resolution — consumers do not chain `externalLogoUrl ?? Tenant.logoUrl ?? …` locally.
4. **`ClubCrest`** owns rendering only — no logo URL logic in cards, rows, or Infoboard-specific crest resolvers when they represent the same club concept.
5. **Real crest** = full uncropped artwork, **`object-contain`**, transparent background preserved; square **layout bounds** only.
6. **Real crest MUST NOT** use circular masks, avatar pills, or `rounded-full` on the image silhouette.
7. **Initials / neutral icon** only when canonical resolution yields no asset **or** the image genuinely fails to load — not while a valid URL is present.
8. **No name matching or hardcoded club→URL maps** in UI modules — only canonical directory / provider relationships.
9. **Same rules** for Matchcenter, Team Cockpit, Wochenplaner, tournaments, standings enrichment, Infoboard/public feeds.
10. **Tenant internal teams** use **`getTenantClubCrestUrlCached`** (`Tenant.logoUrl` → tenant SFV Verein `ExternalClub.logoUrl`).
| **Status** | `matchLifecycle` via `resolveSceMatchLifecycleStatus` — **Heute** (warning), **Morgen** (info), **Live** (success), **Beendet** (success), **Abgesagt** (danger); rendered with DS `Badge` (`SceMatchCardStatus`) — text first, colour supplementary |
| **Tenant context** | **Heim** / **Auswärts** on `contextBadges` — quiet `ActivityContextBadge`; never reorder fixture sides |
| **Result context** | **Sieg** / **Unentschieden** / **Niederlage** on `contextBadges` — semantic badge, not a second fixture layout |
| **Routes** | `model.route.consumeHref` for primary navigation — no local href builders |
| **Responsive** | Truncation + grid reflow; narrow-safe (see preview gallery) |
| **Accessibility** | Fixture `aria-label`, decorative crests when adjacent text exists, focus ring on card link |
| **Preview / UAT** | `/sce-preview/match-card` (deterministic fixtures, no DB) |

Representative integration (01D R5): Activity Detail (HERO), Team → Nächste Spiele (STANDARD grid), Team → Resultate (COMPACT grid), Team → Übersicht next/last (COMPACT), Matchcenter Spielplanung + Resultate (bounded card grids + operational panels), Planner “Planung bearbeiten” match summary (COMPACT); all via `scePresentation` / `resolveSceMatchPresentation`.

Automated guardrails: `components/sporting-activity/__tests__/sce-ui-rollout-01d-match-card.test.tsx`, `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01d-architecture.test.ts`.

Future Match surfaces (**01H–01L**) must adopt `SceMatchCard` — not local card variants.

---

## Canonical Training card family (01E)

| Item | Contract |
|------|----------|
| **Component** | `SceTrainingCard` (`components/sporting-activity/SceTrainingCard.tsx`) |
| **Model** | `SceTrainingPresentationModel` via `resolveSceTrainingPresentationFromLegacy` / typed management & Wochenplaner adapters — **no parallel Training card model** |
| **Densities** | `HERO` · `STANDARD` · `COMPACT` · `MICRO` — policy from `SCE_ACTIVITY_DENSITY_CONTRACT` |
| **Rich skeleton** | `HERO` and `STANDARD` share one rich DOM; `COMPACT` uses the management/list grid variant; `MICRO` is the only other structural variant |
| **Identity grammar** | Training title → team → schedule → location → status — **never** home/away, VS, or result semantics |
| **Location** | Structured `SportingActivityLocation` + `formatSceActivityLocationHierarchy` (club/host → venue → resource) with clean degradation |
| **Schedule** | `schedulePresentation`: `SESSION` (instant `schedule`) vs `RECURRING_DEFINITION` (weekday rhythm + time label) — do not render epoch placeholders for series |
| **Status** | Domain-backed labels (`Aktiv`, `Inaktiv`, …) via `SceTrainingCardStatus` / DS `Badge` — text first |
| **Routes** | `model.route.consumeHref` only — no local href builders |
| **Management boundary** | `SceTrainingCard` owns **presentation**; Trainings management rows keep actions, filters, weekday column, facility column, and status column |
| **MICRO / planner** | Narrow-safe team + time + resource; full planner grid adoption deferred to **01H** (`PlanningHubActivityBlock` remains legacy identity until then) |
| **Preview / UAT** | `/sce-preview/training-card`, `/sce-preview/weekplanner-training` |

Representative integration (01E): Activity Detail training embed (HERO), Trainings management row identity (`COMPACT`, status in row column), Wochenplaner “Planung bearbeiten” training summary (`WeekplannerTrainingIdentityCard`).

Automated guardrails: `components/sporting-activity/__tests__/sce-ui-rollout-01e-training-card.test.tsx`, `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01e-architecture.test.ts`.

Future Training surfaces (**01H–01L**) must adopt `SceTrainingCard` — not local card variants.

---

## Canonical Tournament card family (01F)

| Item | Contract |
|------|----------|
| **Component** | `SceTournamentCard` (`components/sporting-activity/SceTournamentCard.tsx`) |
| **Model** | `SceTournamentPresentationModel` via `resolveSceTournamentPresentation` / Wochenplaner adapter — **no parallel Tournament card model** |
| **Densities** | `HERO` · `STANDARD` · `COMPACT` · `MICRO` — policy from `SCE_ACTIVITY_DENSITY_CONTRACT` |
| **Identity grammar** | Tournament title → **organiser** (always when data exists) → optional **Hauptteam** → schedule → location → status — **never** Match semantics (no VS, home/away pairing, scores) |
| **Organiser invariant** | Organiser is a first-class field (`ClubIdentity`); must remain visible at HERO, STANDARD, COMPACT, and identifiable at MICRO — not tooltip-only |
| **Hauptteam** | Distinct from organiser; do not substitute organiser with Hauptteam or venue |
| **Location** | Venue → resource on card; **omit** organiser/host from location line when organiser is rendered separately |
| **Schedule** | Concrete `schedule.startAt` / `endAt` from domain — no Training-style recurring definition |
| **Status** | Domain-backed labels via `SceTournamentCardStatus` / DS `Badge` — text first |
| **Routes** | `model.route.consumeHref` / `manageHref` — no local href builders |
| **Management boundary** | `SceTournamentCard` owns **identity/context presentation**; `TurniereManagementRow` owns date column, context rail (schedule/location), operational status/visibility, and action menu |
| **TOURNAMENT_LIST_ROW_COMPOSITION** | Four zones on `/dashboard/tournamentcenter`: **date** (compact weekday/day/month) · **identity** (`SceTournamentCard` `surface="list-row"` — type, crest, title, organiser, Hauptteam only) · **context** (calendar date, time range, location icons; status + visibility) · **action** (row menu). **Desktop (xl+):** DATE \| IDENTITY \| CONTEXT \| ACTION on one row. **Tablet (md–lg):** DATE \| IDENTITY \| ACTION with CONTEXT under identity. **Mobile:** stack. Tablet grid placement uses `md:max-xl:` so xl desktop column/row placement is explicit. No duplicated organiser/Hauptteam/time/location/status; no nested card shell in list-row |
| **List-row surface** | `surface="list-row"` — embedded presentation: no competing border/background; `max-w-none`; organiser crest uses list-row sizing (`planner` bounds) |
| **Organiser crest pipeline** | Domain `resolveTournamentOrganizerIdentity` → `organizerLogoUrl` on DTO / Weekplanner item → `buildTournamentOrganiserClubIdentity` → `resolveTournamentOrganiserCrestUrlFromDomain` → `ClubCrest`. **No** consumer-local `tenantLogoUrl` bypass; preview fixtures must supply domain organiser fields |
| **Club crest** | Organiser `ClubIdentity` → canonical `ClubCrest` at HERO/STANDARD/COMPACT and MICRO when width allows; **no** Tournament-local logo resolver; real crests use `object-contain` (no circular mask on PNG/SVG); initials/icon fallback only when no usable crest |
| **Semantic hierarchy** | Tournament type pill (orange/gold) → title → organiser + crest → Hauptteam (team accent) → date/time → location → status text |
| **Preview / UAT** | `/sce-preview/tournament-card`, `/sce-preview/weekplanner-tournament` |

Representative integration (01F): Activity Detail tournament embed (HERO), Turniere management row identity (`COMPACT`, status in row column), Wochenplaner “Planung bearbeiten” tournament summary (`WeekplannerTournamentIdentityCard`).

Automated guardrails: `components/sporting-activity/__tests__/sce-ui-rollout-01f-tournament-card.test.tsx`, `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01f-architecture.test.ts`.

Future Tournament surfaces (**01H–01L**) must adopt `SceTournamentCard` — not local card variants.

---

## Canonical Club Event card family (01G)

| Item | Contract |
|------|----------|
| **Component** | `SceClubEventCard` (`components/sporting-activity/SceClubEventCard.tsx`) |
| **Model** | `SceClubEventPresentationModel` via `resolveSceClubEventPresentation` / `resolveSceClubEventPresentationFromLegacy` — **no parallel Club Event card model** |
| **Activity label** | **VERANSTALTUNG** (`activityKind: EVENT` on `ActivityTypePill`) |
| **Densities** | `HERO` · `STANDARD` · `COMPACT` · `MICRO` — policy from `SCE_ACTIVITY_DENSITY_CONTRACT` |
| **Identity grammar** | Event title (primary) → optional **organiser/host** → schedule → location → lifecycle **status** — **never** Match (VS, home/away, scores), Tournament-only (Hauptteam, organiser invariant crest), or Training-only (recurrence/coach) semantics |
| **Organiser / crest** | Optional `ClubIdentity`; crest only when a usable logo exists — **not** mandatory; event title stays primary |
| **All-day** | Domain `schedule.allDay` → **Ganztägig** via `formatClubEventTimingLabel` / `formatSceClubEventTimeLabel` — never fake `00:00–23:59` |
| **Location** | `formatSceActivityLocationHierarchy` on resolved `SportingActivityLocation`; omit organiser from location line when shown as secondary identity; no raw resource keys |
| **Status vs publication** | Lifecycle `status` on card (`SceClubEventCardStatus`); publication/visibility labels stay in management row columns — do not collapse |
| **Routes** | `model.route.consumeHref` / `manageHref` from `buildSceActivityRoute("CLUB_EVENT", …)` |
| **Event audience («Gültig für»)** | Optional `model.audience` (`CLUB_WIDE` \| `SELECTED_ORG_UNITS`) — authoritative organisational scope (Teams + OrgUnits via `ClubEventOrganisationalAudience*` relations). **Separate** from organiser, publication, participation, and authorization. Render via `SceClubEventAudienceLine` (contextual identity — **not** a second activity accent). Reduced density: compact labels e.g. «3 Organisationseinheiten» / «2 Teams». Parent OrgUnit selection = **exact unit** (no silent descendant expansion). |
| **Management boundary** | `SceClubEventCard` owns **identity** (`list-row`); `VeranstaltungListRow` owns date block, **context zone** (schedule/location), lifecycle + publication — no duplicated schedule/location on the card in list rows |
| **VERANSTALTUNGEN_LIST_ROW_COMPOSITION** | **Date** (weekday/day/month + compact time) · **Identity** (`SceClubEventCard` `list-row` — VERANSTALTUNG pill, title, organiser/audience) · **Context** (date line, time/Ganztägig, location, status + publication). Responsive grid reuses Turniere row contract (without action column) |
| **Detail context** | Edit workspace header uses `SceClubEventCard` `surface="context-header"` (`VeranstaltungEditPlanningHeader`) — canonical hierarchy, not ad-hoc subtitle strings |
| **Preview / UAT** | `/sce-preview/club-event-card` |

Representative integration: Veranstaltungen create/edit (`ClubEventOrganisationalAudienceEditor`), management list + edit context header. Persistence: [`SCE-CLUB-EVENT-AUDIENCE-01`](../roadmap/SCE-CLUB-EVENT-AUDIENCE-01.md) — no parallel organisational hierarchy; `Event.teamId` remains compatibility-only.

Automated guardrails: `components/sporting-activity/__tests__/sce-ui-rollout-01g-club-event-card.test.tsx`, `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01g-architecture.test.ts`.

Future Club Event surfaces (**01H–01K**) must adopt `SceClubEventCard` — not local card variants.

---

## Club Event create/edit workflow (Audience-01 R1)

| Item | Contract |
|------|----------|
| **Navigation** | Canonical `SceContextTabs` / `SceContextTabsBoundary` — **no** parallel form-tab or wizard stepper |
| **Create route** | `/dashboard/veranstaltungen/new` with `?tab=` URL continuity (`uebersicht` · `gueltigkeit` · `termin` · `ressourcen` · `publikation`) |
| **Edit route** | Activity detail tabs (`ClubEventActivityTabShell`) remain authoritative; **Übersicht** stacks Grunddaten · Gültigkeit · Termin sections; Ressourcen/Planung · Publikation/Mehr unchanged |
| **Dirty guard** | `SceContextDirtyGuardProvider` on create + edit shells |
| **Actions** | Persistent **Abbrechen** / **Veranstaltung erstellen** (or save) outside tab panels — not gated by active tab |
| **Create scope** | Tab panels contain **create-time** fields only — no post-create placeholders (Teilnehmer · Aufgaben · Zusammenarbeit); those surfaces stay on persisted edit/activity context |
| **Gültigkeit** | `ClubEventOrganisationalAudienceEditor` + `SceSegmentedControl` scope · `SceChipMultiSelectorField` targets — applicability wording, not marketing «Zielgruppe» |
| **Termin** | `VeranstaltungScheduleFields` + canonical **Wiederholung** / **Ganztägig** switches (`SwitchThumb`) — no checkboxes |
| **Recurrence UX** | Natural-language interval/end controls (e.g. «Alle … Wochen/Monate», «Nach … Terminen») · **Zusammenfassung** with `formatClubEventRecurrenceSummaryDe` + bounded occurrence preview from canonical generation — no raw RRULE; short tab content is acceptable (no filler panels) |
| **Series model** | `ClubEventSeries` + materialized `Event` occurrences (`clubEventSeriesId` + `clubEventOccurrenceDateKey`); programme consumers read occurrences, not rules |
| **Recurrence indicator** | Restrained «Wiederkehrend» on series members in edit context — same `SceClubEventCard` family, no new activity color |

Automated guardrails: `lib/events/__tests__/club-event-recurrence.test.ts`, `lib/veranstaltungen/__tests__/club-event-create-workflow.test.ts`.

---

## SCE Activity Creation (**FOUNDATION_IMPLEMENTED** — 01B; domain adoption **01C+**)

Product principle: **«One creation language, domain-specific workflows.»**

The Activity Composer is an **adaptive container** for canonical domain creation workflows — not a generic CRUD generator, forced wizard, generic Activity API, or four independent modals.

Full contracts: [`SCE-ACTIVITY-CREATION.md`](./SCE-ACTIVITY-CREATION.md) · Architecture: [`SCE-ACTIVITY-CREATE-01A.md`](../roadmap/SCE-ACTIVITY-CREATE-01A.md) · **ADR-11** (**Accepted**)

### Nested interaction rule (Activity Composer)

A modal **Activity Composer must not launch another independent modal, dialog, sheet, or drawer** over itself for normal creation interactions. Prefer inline controls, combobox/search, popover, expandable region, or Composer-owned embedded panel. If the interaction is genuinely too complex, use **full-page `/new` mode** — not stacked dialogs. **Club Event organisational audience selector** is the first mandated application (**01C**).

| Item | Status | Notes |
|------|--------|-------|
| **`SceActivityComposer`** shell (overlay / page / fullscreen) | **FOUNDATION_IMPLEMENTED** | `components/sce/activity-composer/` + `SceModalOverlay` |
| **SCE Guided Activity Composer** (`guidedWorkflow` on create definition) | **CANONICAL (01E-R1)** | Progress «Schritt X von Y», step states (current/completed/error), footer «Zurück» / «Weiter», draft save on every step, domain primary action **only** on final **Übersicht** review — freely navigable, clearly guided; no locked wizard |
| **`SceActivityComposerWorkflowNav`** | **CANONICAL (01E-R1)** | Workflow presentation over Context Tabs (`aria-current="step"`) |
| **`MatchCreateMatchupSelector`** | **CANONICAL (01E-R1, Match)** | Football matchup identity — HOME left / AWAY right, large bare crests, composer-safe opponent picker |
| **SCE Activity Date & Time Input** (`SceActivityDateInput`, `SceActivityTimeInput`, `SceActivityDateTimeInput`) | **CANONICAL (01E-R2)** | Manual DD.MM.YYYY date + 24h HH:MM time; calendar assists (does not replace typing); no browser-native combined `datetime-local` in SCE activity creation composers |
| **Creation contract** (`SceActivityCreateDefinition`) | **FOUNDATION_IMPLEMENTED** | `lib/sce/activity-composer/` — not JSON CRUD |
| **Context tabs on create** | **REUSABLE** | `SceContextTabs` — Club Event reference on STAGE |
| **Guided Training/Match/Tournament create** | **EXISTING** | Migrate to tabs in 01D–01F before overlay parity |
| **Full-page `/new` routes** | **EXISTING** | Remain canonical deep links |
| **Dirty guard** | **FOUNDATION_IMPLEMENTED** | Reuses `SceContextDirtyGuardProvider` for close/backdrop/Escape |
| **Nested Sheet selectors** | **Gate — refactor in 01C** | Audience picker must not stack on composer overlay |
| **Toggle First on create** | **EXISTING** target | No new binary checkboxes in composer adoption |
| **Activity identity header** | **FOUNDATION_IMPLEMENTED** | `ActivityTypePill` in composer header |
| **Domain create workflows on production `/new`** | **NOT YET IMPLEMENTED** | 01C–01F adoption |

PO visual UAT for 01B foundation: **`/sce-preview/activity-composer`**, **`/sce-preview/activity-composer/page-mode`**.

**Presentation geometry (01B-R1):**

| Mode | Contract |
|------|----------|
| **Overlay** | Stable bounded creation workspace; scroll only in composer body (`.sce-scroll-region-dark`) |
| **Page** | Natural content-driven flow — same tabs/workflow, no overlay height inheritance |
| **Fullscreen** | Viewport-filling responsive adaptation |

*Shared workflow does not require identical container geometry.*

**Draft / action / governance contract (01B-R2 + 01B-R3):**

| Topic | Contract |
|-------|----------|
| Lifecycle | START → COMPOSE → optional draft → **commit validation** → direct publish **or** submit for **Freigabe** |
| Principle | *Saving preserves work. Submitting commits the activity. Publication follows effective governance policy.* |
| Footer | Ghost **Abbrechen** · secondary draft save · policy-aware primary (`Training erstellen` vs **Zur Freigabe einreichen**) |
| Validation vs approval | **Draft/commit validation** (form) ≠ **governance approval** (optional, admin-controlled, creator-specific) |
| Governance default | **DIRECT_PUBLISH** — approval never globally mandatory |
| Validators | 1:n pool per activity type; **ANY_ONE** approve in V1; no self-approval |
| Approval UX | **Not** a Composer content tab — workflow state + future **Freigaben** inbox |
| Admin (future) | Person-centric + governance-centric views over **one** policy store; create = Toggle; publication mode = single-choice |
| Dirty vs draft | Dirty = local changes; draft = persisted incomplete activity |
| Autosave | **Not in 01B** — explicit persistence only |
| Success | `DRAFT_SAVED` \| `PUBLISHED` \| `SUBMITTED_FOR_APPROVAL` (`CREATED` legacy alias) |
| Domain persistence | **01C+** — governance DB deferred unless 01C gate requires it |

---

## Activity card semantic color language (01D R10 / 01F / 01G)

Shared **information hierarchy** for Match, Training, Tournament, and Club Event cards — one SCE semantic visual language. Cards stay domain-specific in layout and identity grammar; **color encodes meaning**, not decoration.

| Concept | Module | Tailwind / token contract | Used for |
|---------|--------|---------------------------|----------|
| **ACTIVITY_TYPE_ACCENT** | `ActivityTypePill` / `activity-color-tokens` | Training blue · Match red · Tournament orange · Club Event violet | Activity kind only — not schedule/location |

**Activity-type marker contract (01D R10A):** one shared `ActivityTypePill` primitive on Match, Training, and Tournament cards. Labels are fixed SCE vocabulary (not free-form identity subtitles):

| Activity kind | Card label | Semantic accent |
|---------------|------------|-----------------|
| `MATCH` | **SPIEL** | match red |
| `TRAINING` | **TRAINING** | training blue |
| `TOURNAMENT` | **TURNIER** | tournament orange |
| `CLUB_EVENT` | **VERANSTALTUNG** | club event violet (`--sce-club-event`) |

Density rules suppress the pill only via the shared activity density contract — not Match-only exceptions.
| **PRIMARY_IDENTITY** | `activity-card-semantic-tokens` → `SCE_ACTIVITY_PRIMARY_IDENTITY_FOREGROUND_CLASS` | `text-[var(--foreground)]` | Club names (match fixture), tournament title, training title |
| **SECONDARY_IDENTITY** | `SCE_ACTIVITY_SECONDARY_IDENTITY_FOREGROUND_CLASS` | `text-[var(--text-2)]` | Match competition, tournament organiser, quiet type context |
| **TEAM_CONTEXT** | `SCE_ACTIVITY_TEAM_CONTEXT_FOREGROUND_CLASS` | info-tinted `color-mix` on foreground | Hauptteam, training team emphasis |
| **SCHEDULE** | `SCE_ACTIVITY_SCHEDULE_FOREGROUND_CLASS` + density `scheduleTextClass` / `scheduleIconClass` | `text-[var(--text-2)]`, **date and time share weight** (`font-medium` on rich rows) | Calendar + clock rows |
| **LOCATION** | `SCE_ACTIVITY_LOCATION_FOREGROUND_CLASS` via `sceActivityLocationTextClass` / `sceActivityLocationIconClass` | cooler info tint on schedule base | MapPin + venue/resource line |
| **FIXTURE_SEPARATOR** | `SCE_ACTIVITY_FIXTURE_SEPARATOR_FOREGROUND_CLASS` | `text-[var(--muted)]` | Match **VS** only — subordinate to crests/names |
| **MATCH_RESULT** | match density scale | `--sce-match-result-foreground` | Scores only — not status badge colors |
| **STATUS** | `SceMatchCardStatus`, `SceTrainingCardStatus`, `SceTournamentCardStatus` | DS `Badge` semantics | Text first; lifecycle/warning/danger — never color alone |
| **WARNING / SUCCESS (Match ops)** | Matchcenter open-points / preparation panels | existing amber/emerald operational semantics | **Not** flattened into generic card foregrounds |

**Rules:**

1. Consume `lib/sporting-activity-presentation/canonical/activity-card-semantic-tokens.ts` and density scale modules — **no ad-hoc `color-mix` or hex** on card surfaces.
2. **Do not** import Tournament orange or Training blue into Match fixture/result presentation.
3. Location lines **must** use location tokens — not raw schedule classes without the location tint.
4. **`CANONICAL_ACTIVITY_LOCATION`** — structured `SportingActivityLocation` + `formatSceActivityLocationHierarchy` (host → venue → resource). Presentation uses **human-facing labels** only; raw resource keys/slugs/enums (e.g. `KUNSTRASEN_2`) **never** render. Each hierarchy level must belong to the **same authoritative activity location**. **Match** home/away venue ownership is resolved in `buildMatchSportingActivityLocation` before cards consume the model; tenant operational pitch allocation applies to **HOME** matches only and must not leak into **AWAY** external venues. **Provider location text (01D R10B):** for **AWAY** / external matches, SFV (or other provider) `venueName` / `location` strings are **authoritative** — preserve them as supplied (e.g. `Sportzentrum Tannenbrunn, Sissach - 2`). Do **not** strip pitch-like suffixes such as ` - 2` from provider venue text merely because they resemble internal pitch metadata. Do **not** append tenant operational resource codes (e.g. `KUNSTRASEN_2` from FC Allschwil allocation) to away presentation. **HOME** matches may use tenant venue/resource hierarchy with registry human labels (e.g. `Im Brüel · Kunstrasen 2`). Import tail cleanup via `sanitizeImportedVenuePresentation` applies only to comma-before-dash import artifacts (e.g. `, - 3` at end), not to legitimate provider ` - N` suffixes embedded in the venue string. Shared location **visual** semantics do not imply shared domain-resolution logic (Training vs Match vs Tournament).
5. Club Event cards consume the same schedule/location/status tokens; activity accent uses `--sce-club-event` / `club-event-violet` on `ActivityTypePill` only (including MICRO — no local violet badge markup).
6. **Event audience ≠ publication ≠ participation ≠ organiser** — only `model.audience` renders scope; publication stays in management context columns.
7. Future Sponsor cards should extend this table, not introduce a parallel palette.

Automated guardrails: `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01d-r10-semantic-alignment.test.ts`.

---

## Controls — binary state (Toggle First)

**SCE Control Standard — Toggle First** (established with SCE-UI-ROLLOUT-01B closure, 2026-10-11):

SCE must **not** introduce **checkboxes** for binary on/off **settings** or persistent boolean **application state**.

Binary state and boolean settings must use the canonical SCE **Toggle/Switch** pattern (`SwitchToggle` / `SwitchThumb`).

### Requirements

1. **Toggle/Switch** is the SCE canonical binary-state control.
2. **New binary checkboxes are prohibited** for settings (see compliance gate below).
3. A toggle must communicate the **current state** clearly (on/off), not only the action.
4. Labels must describe the **setting or state** (e.g. “Website sichtbar”), not merely “Yes/No”.
5. State must remain understandable **without relying on colour alone** (label + switch position / `aria-checked`).
6. **Keyboard accessibility** is required (Space/Enter toggles; label association via `htmlFor` where used).
7. **Visible focus** is required on the switch control.
8. **Disabled** state must be visually and semantically distinguishable.
9. **Touch targets** must remain usable on mobile (minimum interactive size per workspace standards).
10. **Immediate effect** vs **save-required** effect must be behaviourally clear (copy, section context, or explicit save affordance — do not imply instant persistence when a form still requires “Speichern”).
11. **Do not use toggles for navigation** (use routes, links, or context tabs).
12. **Do not use toggles for tab / filter / view switching** (use context tabs, filters, or segmented controls).
13. **Do not use toggles as a substitute for multi-selection** (see below).

### Good uses (toggle)

- Website / Infoboard enabled or disabled
- Public / private visibility
- Notifications enabled / disabled
- Feature enabled / disabled
- “Person ist aktiv”, captain flags, and similar **on/off** settings

### Do not use a checkbox for these

### Multi-selection (not toggle)

When the interaction is **selecting multiple independent items** (bulk table rows, choosing several recipients, pick-N lists), use the appropriate SCE **multi-selection** pattern (table selection checkboxes, picker lists, etc.).

**Do not** misrepresent multi-selection as a single toggle.

### Control choice matrix

| Problem | Canonical pattern |
|---------|-------------------|
| **Binary state** (setting on/off) | **Toggle/Switch** |
| **Context navigation** (detail sections) | **Context tabs** |
| **Filter / view mode** | Filter rail, segmented control, or domain-appropriate filter |
| **Single choice** (one of N) | Radio group, select, or menu |
| **Multi-selection** | Checkbox lists / table selection where multi-select is the model |
| **Action** | Button or menu action |

### Legacy binary checkboxes

Existing binary-setting checkboxes in the product are **legacy UI**. They should migrate to `SwitchToggle` during the relevant SCE-UI-ROLLOUT adoption package or **01N** cleanup — **not** as part of unrelated packages.

Inventory and migration tracking for control-level legacy lives in [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md) (**control backlog** — separate from the 01A register totals).

Row-selection and bulk-operation checkboxes are **out of scope** for Toggle First migration.

---

## Design system ownership

- Shared interaction and visual patterns belong in the SCE design system.
- Future modules **must consume** existing canonical patterns before introducing new ones.
- Parallel tab/card/workspace frameworks require an ADR ([`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md)).

---

## Domain extension rule

A module may introduce **genuinely new domain UX**. It may **not** independently redefine an existing SCE pattern (context tabs, workspace surfaces, activity cards, status semantics, action hierarchy, forms, dialogs, responsive behaviour, accessibility behaviour) without an explicit design-system ADR.

---

## Future-module compliance contract

Every future SCE package must declare **`SCE_DESIGN_SYSTEM_COMPLIANCE`** in its closure report:

| Field | Description |
|-------|-------------|
| Canonical primitives consumed | e.g. `SceContextTabs`, `SceWorkspaceSurface` |
| Canonical navigation pattern | Context tabs / route tabs / filters (justify if not context tabs) |
| Canonical workspace pattern | Dark workspace + sections |
| New UX primitives introduced | List + justification |
| Responsive compliance | PASS / deferred with package id |
| Accessibility compliance | PASS / deferred with package id |
| Legacy / parallel pattern introduced | **YES/NO** |
| **`BINARY_CONTROL_COMPLIANCE`** | **PASS** / **FAIL** |
| **`NEW_BINARY_CHECKBOXES`** | Count; must be **0** unless an approved design-system exception exists |
| **`CANONICAL_TOGGLES_USED`** | **YES** / **NO** / **NOT_APPLICABLE** (when package introduces no binary settings) |
| **`MULTI_SELECTION_PATTERN`** | **canonical** / **not_applicable** / **exception_documented** |

**Target gate:** `SCE_DESIGN_SYSTEM_COMPLIANCE = PASS`

Any introduction of a **new binary checkbox** for settings must fail **`BINARY_CONTROL_COMPLIANCE`** unless an explicit architecture / design-system exception is approved and recorded (ADR or package closure exception).

Automated guardrails (01B / 01C):

- Context tabs: `lib/context-tabs/__tests__/context-tabs-architecture.test.ts`
- Binary control standard (doc + canonical primitive): `lib/design-system/__tests__/sce-binary-control-standard.test.ts`
- Activity presentation model: `lib/sporting-activity-presentation/canonical/__tests__/sce-ui-rollout-01c-architecture.test.ts`

Product-wide static enforcement of “no new setting checkboxes” is deferred to a future UI rollout / design-system hardening package if AST-based rules are required; the compliance contract and Toggle First rule are authoritative from 01B closure onward.

---

## SCE Club & Team Selector (01E-R3)

One canonical engine for club and team selection across SCE — **visual-first**, **browse-first**, **search-assisted**, **crest-led**, backed by the **same Club Directory data** as `/dashboard/vereine` (no parallel opponent lists or Match-specific caches).

| Principle | Rule |
|-----------|------|
| **VISUAL-FIRST** | Crest + club name on grid cards (`ClubLogo` bare — no avatar chrome) |
| **BROWSE-FIRST** | Eligible clubs visible when the selector opens; search **filters** that universe |
| **SEARCH-ASSISTED** | Case-insensitive normalized match on name / shortName / alternativeName |
| **CANONICAL-DATA** | `GET /api/clubs/selectable` + Club Directory query service (Vereine source of truth) |
| **ONE-ENGINE** | `SceClubTeamSelectorDialog` modes: `CLUB_ONLY` · `TEAM_ONLY` · `CLUB_THEN_TEAM` |
| **KEYBOARD-ACCESSIBLE** | Dialog focus trap, Esc, return focus to invoking control |
| **RESPONSIVE** | Grid columns adapt (≈2–6); full-screen-friendly on small viewports |

**Composer subordinate dialog exception:** Activity creation may open this selector as an **elevated** modal (`Dialog` `stackLayer="elevated"`) above the Activity Composer. It must not close the composer or trigger leave-intent guards; focus returns to «Team ändern» / «Gegner ändern» on dismiss.

Modules:

- `components/sce/club-team-selector/*`
- `lib/sce/club-team-selector/*`
- `app/api/clubs/selectable/*`

Future club/team pickers **must** consume this engine unless an ADR documents an exception.

---

## Related documents

- [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md)
- [`SCE-ACTIVITY-PRESENTATION-STANDARD.md`](./SCE-ACTIVITY-PRESENTATION-STANDARD.md)
- [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md)
- [`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md)
