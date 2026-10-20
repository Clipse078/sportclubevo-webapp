# SCE Design System — Product-wide Migration Matrix (DS-01)

> Priorities: **P0** structural/a11y/serious UX · **P1** major visual/architecture · **P2** polish/tokenisation · **P3** low-impact  
> Supersedes nothing in [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md) — extends it with DS programme packaging.

## PO visual direction — product-wide rollout (DS-01-R1)

Evaluate every major area against Communication-derived visual principles (`COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES`, `PRODUCT_WIDE_ROLLOUT_TARGET = YES`). **Do not implement migrations in DS-01** — classifications guide DS-02 through DS-10.

| PRODUCT_AREA | PRIMARY_ROUTES / MODULE | VISUAL_DIRECTION_CLASSIFICATION | TARGET (DS packages) | NOTES |
| --- | --- | --- | --- | --- |
| Dashboard | `/dashboard`, today modules | **ALIGNED_WITH_REFINEMENT** | DS-02, DS-04 | Module KPI cards; migrate `DashboardTodayEventCards` (see rows below) |
| Mein Programm | `/dashboard/mein-programm` | **ALREADY_ALIGNED** | DS-02 tokens | Programme engine + three-row list-row |
| Club | Club dashboard, directory | **ALIGNED_WITH_REFINEMENT** | DS-03, DS-04 | Adopt workspace/header calm hierarchy |
| Teams | Team cockpit, programme | **DOMAIN_SPECIFIC_BUT_ALIGNED** | DS-03 | Retain route-tab cockpit; align surfaces/accent |
| Match | Matchcenter, Spiele | **ALREADY_ALIGNED** | DS-04, DS-07 | `SceMatchCard`; legacy `MatchCard.tsx` row below |
| Training | Trainingscenter | **ALREADY_ALIGNED** | DS-04 | `SceTrainingCard`; management row refinement |
| Tournament | Turniere, planung | **ALREADY_ALIGNED** | DS-04 | Cards + `SceTournamentFixturePresentation` densities |
| Club Event | Veranstaltungen | **ALIGNED_WITH_REFINEMENT** | DS-04 | Canonical cards; `VeranstaltungCard` legacy |
| Wochenplaner | Week planner | **NEEDS_DESIGN_SYSTEM_MIGRATION** | DS-04, DS-08 | `WochenplanEventCard`; keep **DENSE** tier |
| Planning Hub | Planning hub calendar | **NEEDS_DESIGN_SYSTEM_MIGRATION** | DS-04, DS-08 | `PlanningHubActivityBlock`; operational density |
| Tournament Planner | Planung board, matrices | **DOMAIN_SPECIFIC_BUT_ALIGNED** | DS-08 | Preserve grids, DnD, locks — SCE language only |
| Communication | `/dashboard/communication`, email-sender | **ALREADY_ALIGNED** | DS-05, DS-07 | **Primary visual reference** — tokenise Button/readiness |
| Publishing | Website, homepage builder | **ALIGNED_WITH_REFINEMENT** | DS-07, DS-08 | Empty-state duplication |
| Admin | Settings, seasons, governance | **ALIGNED_WITH_REFINEMENT** | DS-03, DS-07 | Mixed legacy forms |
| Personen & Zugänge | People directory | **ALIGNED_WITH_REFINEMENT** | DS-07, DS-08 | **COMPACT/DENSE** — not hub whitespace |
| Roles / Permissions | Roles admin, matrix | **ALIGNED_WITH_REFINEMENT** | DS-03, DS-05, DS-08 | Tabs migrate; matrix stays dense |
| Facilities | Pitches, resources | **ALIGNED_WITH_REFINEMENT** | DS-08 | Table tokens |
| Documents | Person documents, DAM | **NEEDS_DESIGN_SYSTEM_MIGRATION** | DS-07 | Local empty states |
| Infoboard | Kiosk / public screens | **ALIGNED_WITH_REFINEMENT** | DS-10 polish | ~~P0~~ match presentation **CLOSED DS-04** |
| Sponsor / Commercial (future) | CMS banner config | **LEGACY_REPLACE** | DS-05 | Minimal surface; toggle audit |
| Team / Person workspaces (future) | Person detail, team workspace | **ALIGNED_WITH_REFINEMENT** | DS-03, DS-04 | Context tabs + calm headers |

**Preserved regardless of rollout:** `AppShellNavigation`, `SceContextTabs`, activity card family, `SceActivityComposer`, tournament operational patterns (`DOMAIN_SPECIFIC_LAYOUTS_PRESERVED = YES`).

---

## Legacy / architecture migration rows (unchanged DS-01 audit)

| AREA | ROUTE_OR_COMPONENT | CURRENT_PATTERN | CLASSIFICATION | TARGET_CANONICAL_PATTERN | SEVERITY | MIGRATION_PRIORITY | DEPENDENCIES | NOTES |
|------|-------------------|-----------------|----------------|---------------------------|----------|----------|--------------|-------|
| NAV | `PersonDetailTabs.tsx` | ~~Local tab shell~~ → `SceContextTabs` | CANONICAL | `SceContextTabs` + `?tab=` | MED | P1 | DS-03 | LEGACY-TABS-001 **DS03_DONE** |
| NAV | `RolesAdminTabs.tsx` | ~~Local underline tabs~~ → `SceContextTabs` | CANONICAL | `SceContextTabs` + `tabRoutes` | LOW | P2 | DS-03 | LEGACY-TABS-004 **DS03_DONE** |
| NAV | Activity detail tabs | `SceContextTabs` + activity nav | CANONICAL | — | — | — | — | Keep; extend a11y |
| NAV | `AppShellNavigation` | NAVBAR-UPGRADE-01 two-row + panel | CANONICAL | — | — | — | — | Do not parallel |
| DASHBOARD | `DashboardTodayEventCards` | Local event cards | LEGACY_MIGRATE | `Sce*Card` COMPACT | MED | P1 | DS-04 | LEGACY-MATCH-CARD-007 |
| DASHBOARD | `ClubDashboardCommandCenterAsync` | Module KPI cards | CANONICAL_REFINE | Tokenised dashboard cards | LOW | P2 | DS-02 | |
| MEIN_PROGRAMM | `PersonalProgrammeListeView` | Programme list-row + engine | CANONICAL | `SceProgrammeActivityCardShell` | — | — | — | Three-row contract |
| TEAMS | Team cockpit nav | Route-tab entity pattern | DOMAIN | Visual align with context tabs | LOW | P2 | DS-03 | CAN_RETAIN URL model |
| TEAMS | `TeamUpcomingMatchRow` (retired) | — | CANONICAL | `SceMatchCard` | — | — | — | Already migrated |
| MATCH | `MatchCard.tsx` | Legacy admin match card | LEGACY_MIGRATE | `SceMatchCard` | MED | P1 | DS-04 | LEGACY-MATCH-CARD-001 |
| MATCH | `SpieleManagementMatchRow` | Canonical list-row | CANONICAL | `SceMatchCard` COMPACT | — | — | — | Reference integration |
| MATCH | Matchcenter operational panels | Secondary panels beside card | CANONICAL | Stack below bounded card | — | — | — | Documented in DS master |
| TRAINING | `TrainingSessionManagementRow` | Mixed local meta | LEGACY_MIGRATE | `SceTrainingCard` COMPACT | MED | P1 | DS-04 | 01H scope |
| TRAINING | `TrainingCreateForm` toggles | `SwitchToggle` | CANONICAL | — | — | — | — | Toggle First exemplar |
| TOURNAMENT | `TurniereManagementRow` | List-row composition | CANONICAL | `SceTournamentCard` list-row | — | — | — | |
| TOURNAMENT | `SceTournamentFixturePresentation` | Fixture presentation layer | CANONICAL | standard/compact/grid | — | — | — | TP02E closure |
| TOURNAMENT | `TournamentManagementIdentity.tsx` | Residual local identity | LEGACY_MIGRATE | `SceTournamentCard` | MED | P2 | DS-04 | |
| CLUB_EVENT | `VeranstaltungListRow` | Canonical identity column | CANONICAL | `SceClubEventCard` list-row | — | — | — | |
| CLUB_EVENT | `VeranstaltungCard.tsx` | Grid card legacy | LEGACY_MIGRATE | `SceClubEventCard` | MED | P1 | DS-04 | LEGACY-ACTIVITY-EVENT-001 |
| PLANNING | `PlanningHubActivityBlock` | Local identity strings | LEGACY_MIGRATE | Presentation resolver + MICRO card | MED | P1 | DS-04, DS-08 | LEGACY-ACTIVITY-PLAN-001 |
| PLANNING | `WeekplannerMatchIdentityCard` | Wrapper around canonical | CANONICAL_REFINE | Direct `SceMatchCard` | LOW | P2 | DS-10 | Thin wrapper OK short-term |
| PLANNING | `WochenplanEventCard.tsx` | Category shell | LEGACY_MIGRATE | ActivityTypePill + cards | MED | P1 | DS-04 | |
| PLANNING | Tournament planung board | Grid + DnD + fixture presentation | CANONICAL | `SceTournamentFixturePresentation` grid | — | — | — | Operational density |
| ADMIN | People directory | Workspace + searchable lists | CANONICAL_REFINE | Unified empty/loading | MED | P2 | DS-07 | Many tab-local empty states |
| ADMIN | `NavAlignedPermissionEditor` | Dense permission matrix | DOMAIN | Keep density; refine toggles | LOW | P2 | DS-05 | Checkbox = multi-capability |
| ADMIN | Roles forms | Mix toggle + checkbox | CANONICAL_REFINE | Toggle First for binary caps | MED | P2 | DS-05 | |
| ADMIN | Facilities / pitches | Admin tables + forms | CANONICAL_REFINE | DS-08 table tokens | LOW | P2 | DS-08 | |
| COMM | Communication hub + email-sender | Hub workspace/cards; readiness checklist | CANONICAL / CANONICAL_REFINE | PO visual reference; DS-07 readiness; Badge not AdminStatusPill | MED | P2 | DS-03, DS-04, DS-07 | R1 primary ref: `/dashboard/communication`, `/dashboard/communication/email-sender` |
| COMM | Campaign composers | Multi checkbox + toggles | CANONICAL_REFINE | Audit binary vs multi | MED | P2 | DS-05 | ~6 checkboxes in CampaignComposer |
| COMM | Inbox list | Row selection checkboxes | DOMAIN | Checkbox legitimate | — | — | — | MULTI_SELECTION |
| DOCUMENTS | Person document tab | Local list + empty | CANONICAL_REFINE | SceEmptyState | LOW | P3 | DS-07 | |
| PUBLISHING | Homepage builder empty | Multiple local empty components | DUPLICATE | Unified empty primitive | LOW | P2 | DS-07 | 4+ variants |
| PUBLISHING | Website page list | Admin table | CANONICAL_REFINE | DS-08 | LOW | P3 | DS-08 | |
| SPONSOR | `SponsorBannerConfigForm` | Residual checkbox in CMS | LEGACY_MIGRATE | Toggle if binary setting | LOW | P3 | DS-05 | Audit only — no Sponsor module |
| AUTH | Login page | Auth layout outside admin shell | DOMAIN | Shared input/button tokens | LOW | P3 | DS-05 | |
| INFOBOARD | Screen1/2 fallback branches | Non-canonical match layout | **CLOSED DS-04** | `matchPresentation` + `InfoboardCompactMatchIdentity` | **HIGH** | ~~P0~~ **CLOSED** | DS-10 polish | LEGACY-MATCH-CARD-003/004 · `P0_INFOBOARD_MATCH_PRESENTATION = CLOSED_BY_DS04` |
| INFOBOARD | Kiosk CSS modules | Channel-specific styling | DOMAIN | Adopt presentation model | MED | P1 | DS-04 | CAN_RETAIN channel chrome |
| STATUS | `AdminStatusPill` | Parallel status styling | DUPLICATE | `Badge` variants | LOW | P2 | DS-07 | |
| STATUS | Parallel status maps | matchcenter/tournament/training | LEGACY_MIGRATE | 01C status translation | MED | P1 | DS-07 | LEGACY-FORMAT-STATUS-001 |
| ERROR | Generic API error copy | "Interner Fehler" patterns | CANONICAL_REFINE | Actionable error contract | MED | P1 | DS-07 | ERROR_UX_MIGRATION |
| FORMAT | Ad-hoc date in admin rows | Local `toLocale*` | LEGACY_MIGRATE | `time-range.ts` / presentation formatters | LOW | P2 | DS-02 | |
| FORMAT | Inline crest `<img onError>` | Outside ClubCrest | LEGACY_MIGRATE | `ClubCrest` | LOW | P2 | DS-04 | Grep-driven cleanup |
| ROUTE | Dual match URLs | consume vs manage | LEGACY_MIGRATE | `buildSceActivityRoute` policy | MED | P1 | DS-03 docs | LEGACY-ROUTE-001 |
| A11Y | Activity tabs | ~~Missing arrow-key nav~~ → implemented | CANONICAL | WAI-ARIA tabs + `SceContextTabs` | MED | ~~P0~~ **CLOSED DS-03** | DS-09 polish | LEGACY-A11Y-TABS-001 **DS03_DONE** · `P0_ACTIVITY_TAB_KEYBOARD_ACCESSIBILITY = CLOSED_BY_DS03` |
| RESPONSIVE | Legacy admin forms | Desktop-only wide layouts | DESKTOP_ONLY_LEGACY | Page width modes + stack | MED | P2 | DS-09 | |
| RESPONSIVE | Composer | Overlay vs full-page | CANONICAL | Breakpoint contract | — | — | — | Preserve 01E |

---

## Matrix summary counts (rows above + legacy register overlap)

| Metric | Value |
|--------|------:|
| Matrix rows (this document) | **45** |
| P0 | **0** open (`DS01_OPEN_P0_FINDINGS = 0`; historical P0 rows closed by DS-03 / DS-04) |
| P1 | **14** |
| P2 | **22** |
| P3 | **7** |

Full **01A register** remains **28 entries / 22 MUST_MIGRATE** until DS-10 closure reconciles.
