# SCE Activity Presentation Inventory

> **Package:** SCE-UI-ROLLOUT-01A  
> **Method:** Repository search + import tracing (see [`SCE-UI-ROLLOUT-01A.md`](../roadmap/SCE-UI-ROLLOUT-01A.md) §2)

**Summary counts:**

| Metric | Approx. |
|--------|---------|
| Surfaces inspected | **45+** distinct routes/components |
| Activity presentation implementations | **62+** files (components + lib adapters) |
| Tab/navigation patterns (context + parallel) | **18+** |
| Shared workspace primitives | **5** core (`SceWorkspaceSurface`, `SceWorkspaceSection`, `SceFeatureCard`, `SceSectionHeader`, semantic icons) |
| Duplicate formatter clusters | **6** domains |
| Legacy register entries | **28** (see [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md)) |

---

## 1. Workspace model adoption

| Surface | Header | Context nav | Workspace surface | Classification |
|---------|--------|-------------|-------------------|----------------|
| Activity detail (4 kinds) | Activity header in shells | `ActivityDetailNavigation` | `SceWorkspaceSurface` + sections | **CANONICAL** |
| Communication hub | Module header | Internal sections | Reference per SCE-UI-STANDARD-01 | **CANONICAL** |
| Matchcenter list | Toolbar | Filter rail (not tabs) | Legacy list chrome | **PARTIAL** |
| Training management | Toolbar | Filters | Mixed | **PARTIAL** |
| Team cockpit | Team header | `TeamCockpitNav` | Mixed cards | **PARTIAL** |
| Dashboard | Cockpit | None | Module cards | **LEGACY** |
| Person detail | Header | Local tabs | Legacy | **LEGACY** |
| Infoboard kiosk | Kiosk header | None | Custom CSS modules | **NOT_APPLICABLE** (display channel) |

---

## 2. Tab implementations inventory

| FILE / COMPONENT | DOMAIN | STATE SOURCE | URL MODEL | PERMISSION | DIRTY | RESPONSIVE | CLASS | MIGRATION |
|------------------|--------|--------------|-----------|------------|-------|------------|-------|-----------|
| `ActivityDetailNavigation.tsx` | Activity | `useActivityDetailTab` | `?tab=` | Config flags | Yes | nowrap scroll | **CANONICAL** | Extend in 01B |
| `TrainingSessionActivityTabShell.tsx` | Training | Provider | `?tab=` | Shell props | Yes | scroll | **CANONICAL** | Keep |
| `SpieleMatchRecordWorkspace.tsx` | Match | Provider | `?tab=` | Squad flags | Yes | scroll | **CANONICAL** | Keep |
| `TurniereTournamentActivityTabShell.tsx` | Tournament | Provider | `?tab=` | Hauptteam squad | Yes | scroll | **CANONICAL** | Keep |
| `ClubEventActivityTabShell.tsx` | Club Event | Provider | `?tab=` | Collaboration | Yes | scroll | **CANONICAL** | Keep |
| `TeamCockpitNav.tsx` | Team | Route | Path segments | Layout | No | scroll | **PARTIAL** | 01L |
| `WorkspaceDiscoveryTabs.tsx` | Workspace | URL | `?hub=` | Server | No | — | **N/A** filter | Keep |
| `WorkspaceLifecycleNavigation.tsx` | Workspace | URL | `?view=` | Server | No | — | **N/A** | Keep |
| `SpieleManagementFilterRail.tsx` | Matchcenter | URL | filters | Server | No | wrap chips | **FILTER** | 01H |
| `PersonDetailTabs.tsx` | Person | useState | none | Server | No | — | **LEGACY** | 01L |
| `RegistrationDrawerTabShell.tsx` | Registration | local | none | — | No | — | **LEGACY** | Backlog |
| `ClubDirectoryFilterBar.tsx` | Directory | URL | segmented | — | No | — | **FILTER** | Keep |
| `RolesAdminTabs.tsx` | Admin | Route | path | RBAC | No | — | **ROUTE** | 01L |

---

## 3. Activity presentation matrix (representative rows)

Columns abbreviated: **VM** = view-model/formatter, **CAN** = CANONICAL | PARTIAL | LEGACY

### TRAINING

| SURFACE | ROUTE | FILE | DATA SOURCE | VM | CAN | MIGRATION TARGET |
|---------|-------|------|-------------|-----|-----|------------------|
| Management list | `/dashboard/training` | `TrainingSessionRow.tsx` | API management view | `management-training-presentation.ts` | PARTIAL | 01E STANDARD |
| Session detail | `.../sessions/[id]/edit` | `TrainingSessionActivityTabShell` | Server load | Mixed | CANONICAL tabs | 01E content |
| Planning hub block | planning-hub | `PlanningHubActivityBlock.tsx` | Hub aggregate | Hub formatters | PARTIAL | 01H |
| Wochenplan | wochenplan | `WochenplanEventCard.tsx` | Board DTO | Local styling | LEGACY | 01H |
| Mein Programm | dashboard | `PersonalProgrammeAgendaRow.tsx` | Programme adapter | `builders.ts` | PARTIAL | 01I COMPACT |
| Calendar | calendar | `MonthActivityGrid.tsx` | Calendar DTO | Partial presentation | PARTIAL | 01J MICRO |
| Activity detail consume | `/dashboard/activity/training-session/[id]` | `SportingActivityDetailContent.tsx` | `load-training-detail` | design + presentation | CANONICAL | 01C unify |
| Infoboard | kiosk | `InfoboardScreen1.tsx` | publish loader | `mapTrainingItem` | PARTIAL | 01K |

### MATCH

| SURFACE | ROUTE | FILE | DATA SOURCE | VM | CAN | MIGRATION TARGET |
|---------|-------|------|-------------|-----|-----|------------------|
| Spielplanung row | matchcenter | `SpieleManagementMatchRow.tsx` | `management-view` | `SpieleManagementMatchIdentity` / inline | PARTIAL | 01D |
| Result row | matchcenter | `SpieleManagementResultRow.tsx` | same | inline crests | PARTIAL | 01D |
| Legacy card | matchcenter | `MatchCard.tsx` | summary DTO | home/away explicit | PARTIAL | 01D |
| Record header | `.../matchcenter/[id]` | `SpieleMatchRecordWorkspace` | Record DTO | crest pair | CANONICAL | 01D align MatchClubPair |
| Team upcoming | teams | `TeamUpcomingMatchRow.tsx` | cockpit data | home/away | PARTIAL | 01J |
| Week planner | planner | `WeekplannerMatchIdentityCard.tsx` | planner DTO | home/away | PARTIAL | 01H |
| Dashboard today | dashboard | `DashboardTodayEventCards.tsx` | command center | `compact-schedule-presentation` | PARTIAL | 01I |
| Mein Programm | dashboard | `SportingActivityIdentity.tsx` | presentation embed | fixtureLine | PARTIAL | 01I |
| Activity detail | `/dashboard/activity/event/[id]` | `SportingActivityDetailContent` | `load-event-detail` | `MatchClubPair` | **CANONICAL** | 01C |
| Infoboard | kiosk | `InfoboardScreen1/2` | canonical loader | `matchPresentation` / **FAIL fallback** | FAIL/PARTIAL | 01D+01K |
| Public website | public | `public-team-matches-mapper.ts` | API | home/away export | PASS | 01K |

### TOURNAMENT

| SURFACE | ROUTE | FILE | DATA SOURCE | VM | CAN | MIGRATION TARGET |
|---------|-------|------|-------------|-----|-----|------------------|
| Management row | tournamentcenter | `TurniereManagementRow.tsx` | management-view | `TournamentManagementIdentity` | PARTIAL | 01F |
| Record | `.../edit` | `TurniereTournamentActivityTabShell` | Event + participants | organiser identity | CANONICAL tabs | 01F |
| Planning hub | planning-hub | aggregated dialog | Hub | risk MATCH leakage in clusters | PARTIAL | 01H audit |
| Programme | dashboard | adapters in `builders.ts` | programme | organiser field | PARTIAL | 01I |
| Infoboard | kiosk | Screen1 tournament block | loader | organiser | PARTIAL | 01K |

### CLUB EVENT

| SURFACE | ROUTE | FILE | DATA SOURCE | VM | CAN | MIGRATION TARGET |
|---------|-------|------|-------------|-----|-----|------------------|
| Card | veranstaltungen | `VeranstaltungCard.tsx` | list API | local | LEGACY | 01G |
| List row | veranstaltungen | `VeranstaltungListRow.tsx` | list API | local | LEGACY | 01G |
| Edit shell | `.../edit` | `ClubEventActivityTabShell` | server | NAV-01 | CANONICAL tabs | 01G body |
| Planning hub | planning-hub | navigation | `getVeranstaltungHref` | — | PARTIAL | 01H |
| Generic Event module | events | `EventListCard.tsx` | legacy hub | generic | LEGACY | Deprecate path |

---

## 4. Duplicated logic register (formatters)

| Concern | Locations | TARGET |
|---------|-----------|--------|
| Date/time range | `time-range.ts`, local `format` in rows, dashboard | **01C** single formatter |
| Venue/resource | `location.ts`, training facility batch, wochenplan cards | **01C** + ADR-07 |
| Match fixture line | `builders.ts`, `management-match-presentation`, row inline | **01C** |
| Home/away crest layout | `MatchClubPair` vs ~10 inline layouts | **01D** |
| Activity status labels | matchcenter, tournaments, training, programme | **01C** status mapper table |
| Route href | `href.ts`, `matchcenter/navigation`, `veranstaltung-navigation`, planning-hub | **01C** navigation policy |
| Type pill colours | `activity-type-pill`, legacy green match in calendar | **SCE-ACTIVITY-COLOR-01** / 01C |
| Logo fallback | `ClubCrest`, inline `<img onError>` | **01D** shared |

---

## 5. Match home/away audit

### PASS (preserves canonical order)

- `lib/sporting-activity-design/match-identity.ts` — `buildMatchClubIdentityPair`
- `components/sporting-activity/MatchClubPair.tsx`
- `components/sporting-activity/SpieleManagementMatchIdentity.tsx`
- `components/sporting-activity/detail/SportingActivityDetailContent.tsx`
- `components/admin/matchcenter/MatchCard.tsx`
- `MatchcenterResultRow`, `SpieleManagementResultRow`, `MatchcenterSpielplanungRow`, `MatchInspector`
- `SpieleMatchRecordWorkspace.tsx` (header)
- `WeekplannerMatchIdentityCard.tsx`
- `TeamUpcomingMatchRow`, `TeamResultRow`
- `lib/sporting-activity-presentation/management-match-presentation.ts`
- `lib/publishing/presentation/infoboard-match-presentation.ts` (when used)
- `lib/dashboard/compact-schedule-presentation.ts` (when `matchPresentation` set)

### PARTIAL

- `SportingActivityIdentity.tsx` — text `fixtureLine` only (order preserved when builder correct)
- `builders.ts` fallback fixtureLine — away uses opponent–ownTeam as home–away semantics
- Most Matchcenter rows — correct sides, duplicate layout vs `MatchClubPair`

### FAIL

- `components/infoboard/screen1/InfoboardScreen1.tsx` — without `matchPresentation`, tenant team row presented as home
- `components/infoboard/screen2/InfoboardScreen2.tsx` — tenant + vs opponent

### UNKNOWN

- Any surface fed incomplete DTO without `matchPresentation` — **mitigation:** enforce loader population in 01K

---

## 6. Training location audit

| Surface | Shows full hierarchy? | Notes |
|---------|----------------------|-------|
| Activity detail | Often yes | `detail-location.ts` |
| Mein Programm compact | Partial | May show single line |
| Management training row | Partial | venue/resource varies |
| Wochenplan card | Often resource/category only | LEGACY-ACTIVITY-LOCATION-001 |

**Target:** resolver always has full hierarchy; density chooses display line (`formatLocationForDensity` — 01C).

---

## 7. Tournament / Club Event semantic risks

| Risk | Evidence | Status |
|------|----------|--------|
| Organiser disappears | Some compact rows omit `context.organiser` | PARTIAL — 01F |
| Tournament as Match | Planning cluster cards — audit in 01H | PARTIAL |
| Hauptteam ≠ displayed team | NAV-01 R2.1 fixed header; list rows may differ | PARTIAL |
| Club Event as generic Event | `EventListCard` vs Veranstaltung | LEGACY split — 01G adapter |

---

## 8. Shared components classification

| Component | Decision | Reason |
|-----------|----------|--------|
| `SceWorkspaceSurface` | **KEEP** | Workspace foundation |
| `SceWorkspaceSection` | **KEEP** | Section rhythm |
| `SceFeatureCard` | **EXTEND** | Activity cards may compose inside |
| `SceSectionHeader` | **KEEP** | |
| `ActivityDetailNavigation` | **EXTRACT** → universal context tabs (01B) | Canonical |
| `SportingActivityIdentity` | **EXTEND** | Programme compact identity |
| `MatchClubPair` | **KEEP** — canonical match crest UI | ADR-05 |
| `MatchCard` | **DEPRECATE** after 01D | Duplicate of pair layout |
| `VeranstaltungCard` | **REPLACE** in 01G | Not on presentation model |
| `WochenplanEventCard` | **MIGRATE** 01H | Local styling |
| `PersonDetailTabs` | **REPLACE** 01L | No URL tabs |

---

## 9. Permission-aware UI (sample)

| Surface | Mechanism |
|---------|-----------|
| Activity tabs | `buildActivityTabNavigationConfig` visibility flags |
| Match Aufgebot | `matchSquadAvailable`, integrated workspace |
| Tournament Aufgebot | `tournamentSquadAvailable`, Hauptteam resolution |
| Card actions | Mixed — often implicit via route; **01C** standardize capability DTO |

Backend authority: API routes under `/api/matchcenter`, `/api/tournamentcenter`, match-squad, participation.

---

## 10. Data integrity / provider ownership

| Data | Owner | Presentation rule |
|------|-------|-------------------|
| SFV match sides | Provider sync | Map to home/away identities; never swap |
| Manual matches | Domain | Same pair model |
| External club logos | `ExternalClub` / directory | Resolve at load |
| Tournament organiser | `Event` organizer fields | `buildTournamentOrganiserClubIdentity` |
| Cancellation | Event status | Mapped label; don't hide organiser |

No schema changes required for 01A–01N presentation rollout.
