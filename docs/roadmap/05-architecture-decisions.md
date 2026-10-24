# SportClubEvo Architecture Decision Records

> **Document type:** Architecture Decision Record (ADR) log  
> **Status:** Active  
> **Last updated:** 2026-10-23  
> **Maintained by:** SportClubEvo engineering team

---

## About ADRs

Each entry in this document records a significant architectural decision — the context that led to it, the decision itself, and the consequences. Once accepted, an ADR is locked. It is not reopened without a formal new ADR that supersedes it.

ADR statuses: **Accepted** | **Superseded** | **Deprecated** | **Proposed**

---

## ADR-001 — Season Is the Leading Entity

**Status:** Accepted

### Context

Sports clubs operate in seasons (e.g. summer season, winter season, annual league year). Teams, squad membership, training schedules, match fixtures, and resource planning all change between seasons. Without a leading temporal entity, queries become complex and cross-season data leaks become common.

### Decision

`Season` is the leading entity for all planning, squad membership, and scheduling. Every `TeamSeason`, `PlayerSquadMember`, `TrainerTeamMember`, and planning record is anchored to a `Season`. Queries that span multiple seasons must be explicit.

### Consequences

- All scheduling and membership queries include a season filter.
- Season transitions (end of season, new season setup) are explicit operations.
- Reporting across seasons is possible but requires deliberate cross-season query design.
- The admin UI exposes a season selector that controls the active planning context.

---

## ADR-002 — Multi-Tenant Architecture Is Mandatory

**Status:** Accepted

### Context

SportClubEvo is designed to serve many sports clubs (tenants) from a single platform. FC Allschwil is the first tenant, but the architecture must accommodate future tenants from day one. A single-tenant-first approach would require expensive and error-prone retrofitting later.

### Decision

Every feature is built multi-tenant from its first commit. All database queries that access tenant-scoped data must include a `tenantId` filter. No tenant's data may be accessible to another tenant. Tenant identity is carried in the session (`session.user.activeTenantId`, derived exclusively from active `TenantMembership` rows — see RPERM-04) and must be validated server-side on every request. Dashboard pages obtain it through the single helper `requireTenantContext()` / `getActiveTenant()` (`lib/tenants/active-tenant.ts`) rather than reading the session field directly.

### Consequences

- Every API route that returns tenant-scoped data must include `tenantId` in the where clause.
- Platform admin routes (cross-tenant) are explicitly identified and access-controlled.
- Public API routes must also filter by `tenantSlug` or `tenantId` derived from the request context.
- New features are reviewed for tenant isolation before merge.
- Known gap: some public API routes have TODO items for tenant filtering (tracked in `03-technical-debt.md`).

---

## ADR-003 — Public Website Consumes WebApp API Only

**Status:** Accepted

### Context

The FC Allschwil public website needs to display operational content (news, teams, fixtures, events, sponsors). Without a clear boundary, website editors editing content directly on the website creates duplicated, inconsistent, and unapproved data. The WebApp already holds the authoritative operational data.

### Decision

The public website is a read-only consumer of the WebApp public API. Website editors do not edit operational content directly on the website. Only content that has passed the WebApp review workflow (Draft → In Review → Published) may be delivered to the public website. The `approvedDataOnly` flag on the `Tenant` model enforces this at the API level.

### Consequences

- The public website has no write path to operational content.
- Cache invalidation is triggered from the WebApp on publish/unpublish (mechanism TBD — see `03-technical-debt.md`).
- The public API contract (`docs/public-website-feed-contract-v1.md`) must be maintained.
- Breaking changes to the public API require a version bump to `/v2/`.

---

## ADR-004 — Tenant Branding Is Configurable; UX System Is Shared

**Status:** Accepted

### Context

Each club needs its own visual identity (logo, primary colour, secondary colour). However, building a fully custom UI per tenant would be unmaintainable. The shared UX system must remain consistent and high-quality.

### Decision

The `Tenant` model carries `logoUrl`, `primaryColor`, and `secondaryColor`. These are injected as CSS custom properties at runtime by the admin shell layout. All UI components consume the CSS variables — they do not reference tenant-specific colours directly. The UX system (component library, typography, spacing) is shared and not configurable per tenant.

### Consequences

- New UI components must use CSS variables for brand colours, not hardcoded values.
- Tenants get meaningful visual personalisation without the cost of a fully custom UI.
- The CSS variable injection in `(admin)/layout.tsx` is the single injection point — it must not be bypassed.
- The shared UX system defines the quality baseline; per-tenant overrides are limited to the defined variables.

---

## ADR-005 — Week Planner Is Resource-Based, Not a Calendar Clone

**Status:** Accepted

### Context

Early product discussions considered building the Week Planner as an Outlook-style calendar. This would be familiar to users but would fail to model the real-world constraints of a club: pitches have finite space, dressing rooms have finite capacity, time slots have hard boundaries.

### Decision

The Week Planner is a resource allocation tool, not a general-purpose calendar. It models real-world resources (pitches, dressing rooms, time slots) and enforces constraints (no double-booking, half/full pitch modes, conflict detection). The conflict engine (`lib/wochenplan/conflict-engine.ts`) is the authoritative source for allocation validity.

### Consequences

- The Week Planner UI is designed around resource grids, not calendar event flows.
- Conflict detection runs before every save and before every publish action.
- Time slots are tenant-configurable, not free-form.
- This model is more powerful for club operations but has a steeper onboarding curve than a calendar UI.

---

## ADR-006 — Organisation Builder Is Generic, Not Vereinsleitung-Specific

**Status:** Accepted

### Context

The `OrgUnit` model was initially discussed as a Vereinsleitung (board/governance) tool. However, sports clubs have many types of org units — committees, departments, working groups, sponsor groups — that are not governance-specific.

### Decision

`OrgUnit` and `OrgUnitMembership` are generic structural entities. They represent any organisational grouping within a club. The Vereinsleitung module uses them, but it does not own them. Permission scoping controls which org units are visible to which roles.

### Consequences

- The same `OrgUnit` model serves governance, operational, and social groupings.
- UI filters and permission rules distinguish between org unit types.
- Future modules (e.g. Sponsor portal, Volunteer management) can use `OrgUnit` without schema changes.

---

## ADR-007 — Public API Must Be Versioned

**Status:** Accepted

### Context

The public website and InfoBoard are external consumers of the WebApp API. If API response shapes change without versioning, external consumers break silently. This is especially problematic once the mobile app is consuming the same endpoints.

### Decision

All externally-consumed API routes follow the `/api/public/v1/` path prefix. Breaking changes require a new version prefix (`/v2/`). The `/v1/` routes are stable contracts. The public API contract is documented in `docs/public-website-feed-contract-v1.md`.

### Consequences

- All new external-facing routes must be placed under `/api/public/v1/` or a later version.
- Existing routes that do not follow this pattern are tracked as technical debt (see `03-technical-debt.md`).
- Deprecation of a version requires a migration notice period and documented consumer migration path.

---

## ADR-008 — Federation Imports Use Adapter Architecture

**Status:** Accepted

### Context

Swiss football clubs receive fixture and player data from federation systems (e.g. FVNWS via Clubcorner). Different federations and leagues use different data formats and APIs. Hardcoding Clubcorner import logic into the core application would make adding new federation sources expensive.

### Decision

Federation imports use an adapter pattern. Each federation source (Clubcorner, CSV, future sources) is an adapter that transforms source data into the SportClubEvo canonical event and player models. The import pipeline (`app/api/events/import/**`) accepts adapters; the core application is source-agnostic.

### Consequences

- New federation sources require a new adapter, not changes to core logic.
- The `EventImportRun` model tracks import history regardless of source.
- CSV import is available as a fallback adapter for any federation that does not have a direct integration.

---

## ADR-009 — One Reusable PeoplePicker Across the Platform

**Status:** Accepted

### Context

Many features require selecting people: assigning a trainer to a team, adding a participant to a meeting, linking a person to an initiative, selecting a player for a squad. Without a shared component, each feature builds its own people-selection UI, leading to inconsistent UX and duplicated search logic.

### Decision

One shared `PeoplePicker` component is used everywhere a person needs to be selected. It encapsulates search, display, and selection logic. Per-module people-selection components are not built.

### Consequences

- Any person-selection UI change is made once and applies everywhere.
- The `PeoplePicker` must support tenant-scoped queries (it must never show people from other tenants).
- Feature teams must use the shared component; new per-module pickers are rejected in code review.

---

## ADR-010 — No Duplicated Business Logic or Formatting Helpers

**Status:** Accepted

### Context

As the codebase grows, formatting functions (date formatting, currency formatting, name formatting) and business rules (permission checks, status calculations) tend to be re-implemented locally in components or pages. This leads to inconsistencies and bugs when the underlying rule changes.

### Decision

Every formatter, validator, and business logic helper lives once in `lib/`. Components and pages import from `lib/`. No business logic is defined inline in components. If a helper does not exist in `lib/`, it is created there before use.

### Consequences

- `lib/` is the single source of truth for business rules and formatting.
- Code review rejects duplicated logic in components or pages.
- The `lib/` directory structure organises helpers by domain (`lib/auth`, `lib/tenant-runtime`, `lib/wochenplan`, etc.).

---

## ADR-011 — STAGE Is the Trusted Development Source

**Status:** Accepted

### Context

Drift between local branches and the canonical branch is a major source of bugs and deployment failures. Without a strict anti-drift policy, developers work on stale state and merge conflicts accumulate.

### Decision

`STAGE` is the only trusted development source. Development never begins from `master`, stale local branches, or unverified state. Before any work begins: verify current branch is `STAGE`, verify `STAGE` matches `origin/STAGE`, stop immediately if there is local drift or uncommitted work. Feature branches are created from `STAGE` using the `cursor/<name>-fc79` naming convention.

### Consequences

- All feature branches are created from `STAGE`.
- Agents and developers must verify clean state before starting work (documented in AGENTS.md).
- `STAGE` receives all PRs; `master` is not used as a development branch.
- The `StageEnvironmentBanner` component surfaces the current environment in the admin UI.

---

## ADR-012 — Never Modify Passwords During Normal Development or Test Work

**Status:** Accepted

### Context

Development and test workflows occasionally generate scripts or automation that reset or change user passwords. In a multi-tenant production environment, accidental password resets can lock real users out of the system. Auth credentials are treated as inviolable during normal development work.

### Decision

Do not reset passwords, change authentication secrets, modify production credentials, or run bootstrap/seed scripts outside of a controlled, explicitly authorised operation. If authentication is broken, stop and report the exact issue — do not attempt to fix it by modifying credentials.

### Consequences

- Bootstrap and seed scripts exist (`prisma/bootstrap-admin.ts`, `prisma/seed.ts`) but are only run under explicit authorisation.
- Agents and developers are instructed not to run these scripts during normal development tasks.
- Authentication issues are escalated rather than self-healed with credential resets.

---

## ADR-013 — Open by Default, Restrictable by Creator (SCE Access Principle)

**Status:** Accepted (partial implementation)

### Context

Collaborative management records in SportClubEvo (Tasks, Files, Meetings, Initiatives) should default to organisation-wide visibility so teams can coordinate without hidden silos. Creators who need tighter confidentiality must be able to restrict visibility deliberately to an organisation unit or a bounded set of people.

### Decision

New records default to whole-organisation visibility. Optional, creator-selected restrictions include organisation unit scope and specific people (exact mechanics per domain). This ADR states the cross-module product principle; each domain implements it in its own security package.

**Implementation status:**

| Domain | Status |
| --- | --- |
| Tasks | Implemented (AUFGABEN-06F1-A3): new root Tasks default to `CLUB` / `orgUnitId = null`; creator may choose `ORG_UNIT` or `ASSIGNEES_ONLY`. |
| Files / Workspace | Deferred to Phase 10 Workspace Security |
| Meetings | Not implemented (future Meeting authorization package) |
| Initiatives | Not implemented (future Initiative domain/security package) |

Task `ASSIGNEES_ONLY` currently limits visibility to creator plus explicit assignees only; arbitrary viewer-only grants are future work.

### Consequences

- Task creation paths must apply server-side defaults; UI pre-selection alone is insufficient.
- Changing creation defaults does not backfill existing records or weaken explicit confidential Tasks.
- Personal projections (e.g. Meine Aufgaben) and notifications remain driven by assignment and mention rules, not visibility scope alone.

---

## SCE-UI-ROLLOUT programme ADRs (ADR-01 … ADR-10)

Product-wide UI unification decisions for packages **01B–01N** are recorded in [`docs/design/SCE-UI-ROLLOUT-ADRS.md`](../design/SCE-UI-ROLLOUT-ADRS.md) (established by **SCE-UI-ROLLOUT-01A**).

---

## ADR-014 — Tournament Fixture vs Schedule Separation and Deterministic Scheduling Engine

**Status:** Accepted

### Context

Tournament Center already models a multi-team tournament as `Event(type=TOURNAMENT)` with participants and facility allocations ([`SCE-ACTIVITY-CREATE-01F`](./SCE-ACTIVITY-CREATE-01F.md)). The product needs automatic pitch/time planning without duplicating facilities, collapsing fixtures into generic activities, or using non-deterministic / LLM-based scheduling.

### Decision

1. **Separate domains:** **Fixture** (who plays whom, stable fixture identity) vs **Schedule assignment** (when/where on a pitch). Fixtures may exist without assignments; assignments may change without changing fixture pairing.
2. **Pure engine:** Implement fixture generation and schedule optimisation in a **pure TypeScript** module (`lib/tournament-scheduling/`) with no Prisma, React, permissions, or LLM inside the algorithm core. Persistence and authorization wrap the engine in application services.
3. **Hard vs soft:** **Hard constraints are never violated** to improve fairness or compactness. Soft objectives use **measurable metrics** and a **deterministic** tie-break / lexicographic objective order.
4. **Resource truth:** Physical venue identity flows through canonical `FacilityResource` and existing availability / conflict primitives (`TournamentResourceAllocation`). The **scheduler grid** uses tournament-owned **`TournamentPitch`** (1:n logical labels per tournament — **01D-R1**). `FacilityResource` ≠ `TournamentPitch`.
5. **Smart generator (01D-R2):** Product flow is configure → SCE generates → review → optional manual adjust → lock → partial regenerate → publish. **Automatic generation is primary**; deterministic engines only (**no LLM**). Fixture generators (Round Robin, Smart Mix, future group/knockout) are separate from feasibility (01D) and schedule optimisation (01E).
6. **Versioning:** Approved schedules are **versioned**; publication and external channels consume an approved version, not mutable working drafts.
7. **No LLM scheduling:** Fixture and schedule generation are constraint-driven and testable.

Full contracts and audit: [`SCE-TOURNAMENT-PLANNER-01A`](./SCE-TOURNAMENT-PLANNER-01A.md).

### Consequences

- Later packages add `TournamentFixture` / schedule version persistence (01B+) without replacing Event as tournament root.
- Programme and Wochenplaner remain separate surfaces until planner UI packages integrate approved schedule views.
- Diagnostics use structured codes; user-facing German copy lives outside the engine.
- Performance and size limits (participants, fixtures, pitches) are enforced at UI + service boundaries.

---

## ADR-015 — Tournament Programme Architecture and Generic Playing Format

**Status:** Accepted

### Context

Tournament Planner **01** (ADR-014) separates fixtures from schedule assignments and uses tournament-owned logical `TournamentPitch` rows distinct from `FacilityResource`. Product research for Swiss youth rotation formats (multi-size fields, subteams, alternative activities) requires a **programme-level** model without replacing 01 generators, feasibility, optimiser, or Spielplan outputs. Hard-coded federation enums (e.g. `THREE_V_THREE`, `FF12_ROTATION`) would overfit reference material and block other sports and user-defined formats.

### Decision

1. **Programme evolution:** Tournament Planner **02** extends 01 toward **advanced tournament programme generation** along the pipeline PARTICIPANTS → PLAYING FORMATS → PLAYING UNITS → ROUNDS → ASSIGNMENTS → PITCHES/STATIONS → TIMING → SPIELPLAN. All **01 entities and engines remain**; 02 is additive.
2. **Generic playing format:** The core semantic is **`playersPerSide`** (integer, defensive technical validation band 1–22 in 02A — not a product maximum). Display labels such as `3v3` are derived. No hard-coded `THREE_V_THREE` / `3V3_6V6` enums. Optional federation presets sit **above** the generic engine, not inside core types.
3. **Playing format optionality:** `PlayingFormat` on logical `TournamentPitch` is **optional by default**. Unspecified format is valid for normal and legacy tournaments. No global requirement, no default assignment, no silent inference from category or pitch name. Advanced programme formats (e.g. future ROTATION) **may** require format on relevant pitches when their semantics depend on it; Round Robin / Smart Mix / Groups / Knockout do **not** require format merely because 02 exists.
4. **Logical pitch invariant:** `TournamentPitch` stays tournament-owned and schedule-facing. Playing format attaches to logical pitches (future persistence); physical venue truth remains `FacilityResource` / allocations. One physical resource may map to several logical pitches with different formats.
5. **Participant vs unit:** `TournamentParticipant` remains registration identity; **`TournamentParticipantUnit`** (02C) represents tournament-local schedulable units (FULL / SUBUNIT) with explicit **parent capacity overlap** via `doParticipantUnitsOverlapCapacity` — subunits may play simultaneously; full team + subunit must not. Implicit full-team compatibility when no units are persisted.
6. **Rotation:** **ROTATION** is a **first-class** programme format with its own generator family — **not** a variant of Smart Mix (opponent balancing).
7. **Single schedule truth:** Canonical programme remains on **`TournamentScheduleVersion`**. Match rows continue via **`TournamentFixtureAssignment`**. Future non-fixture slots (alternative activity, rest/idle) attach to the **same** version as programme assignments — no parallel Team-Spielplan persistence.
8. **Stations:** Future **`TournamentStation`** covers match pitch references, alternative activities, and rest/idle without replacing `TournamentPitch` as the match location primitive.
9. **Timing:** `IN_ROUND_PHASE` is distinct from tournament window, round duration, match duration, transition, team rest, and tournament break.
10. **Backward compatibility:** **Unspecified** playing format remains valid for existing and new normal tournaments until an **explicitly selected** advanced programme format requires explicit format metadata.

Contracts: [`SCE-TOURNAMENT-PLANNER-02A`](./SCE-TOURNAMENT-PLANNER-02A.md), `lib/tournament-scheduling/tournament-programme-architecture.ts`.

### Consequences

- **02B** adds nullable `playersPerSide` on `TournamentPitch`, Creator/Planung/output adoption, and defensive validation — without ADR-014 rollback or schedule semantics for normal TP01 formats.
- **02C** adds `TournamentParticipantUnit` persistence, capacity primitive, Planung Spielteam configuration; predefined template mapping and fixture unit references deferred to **02D**.
- **02D (revised delivery)** — predefined Spielplan templates & instant generation: participant count selects an approved template; template defines Felder, rounds, pairings, and field assignments; real teams map to template positions. No generic rotation generator is required for TP02 closure.
- **02E (revised delivery)** — Spielplan UX, outputs & final hardening; **TP02 closes after 02E**.
- **Removed from required TP02 delivery:** generic rotation generator (former 02D), stations & alternative activities (former 02E), advanced timing & in-round phases (former 02F), fair programme optimiser (former 02G). Optional contract types (e.g. `TournamentStation`) may remain for documentation without implying those packages ship in TP02.
- 02A remains documentation + pure contracts only for its slice.
- Architecture tests guard against Swiss-only enums and parallel schedule truth.
- Team-Spielplan and public views remain **projections** of the canonical programme.

---

## SCE Finance programme ADRs (ADR-016 … ADR-033)

Established by **SCE-FINANCE-01A** and corrected in **FIN-01A-R1** ([`SCE-FINANCE-01A.md`](./SCE-FINANCE-01A.md)). Contracts: `lib/finance/finance-architecture.ts`, `lib/finance/finance-archetypes.ts`.

---

## ADR-016 — SCE Finance vs Full Accounting Boundary

**Status:** Accepted

### Context

Sports organisations need management finance (budget, income statement, unit economics) but often retain country-specific accounting products for statutory ledger, VAT, and formal closing. Building a full GL in v1 would delay sport-aware planning and duplicate professional tools.

### Decision

SCE Finance is an **organisation-aware financial operating system** for **management finance** (plan, understand, control, forecast). It is **sport-agnostic**, **country-agnostic at core**, and **tenant-configurable**. It **does not** replace statutory accounting in FIN-01. v1 explicitly excludes: full general ledger, full balance sheet, VAT accounting, payroll ledger, and bank reconciliation. Architecture must remain **balance-sheet aware** for future asset/liability/reserve representation without implementing a statutory ledger. Future **accounting integration** (export, mapping, API) must not assume SCE is the statutory SoT.

### Consequences

- FIN-01 delivers budgets and **management income statement** reporting (localized labels such as Erfolgsrechnung / P&L), not double-entry bookkeeping.
- Platform **Billing** (`Invoice`, payment rails) remains the commercial invoicing boundary — integrated later, not merged into management finance tables.
- PO must not interpret Finance as “replace statutory accounting” in v1.

---

## ADR-017 — Financial Dimensions Architecture

**Status:** Accepted

### Context

Amounts may attribute to Season, OrgUnit, Team/Group, Person, Activity, Event, Tournament, Sponsor, Project, Facility, Fund, Funding Source, Cost Center, or **tenant-defined custom dimensions**. No sporting or org dimension is **required** for finance. Dozens of nullable FKs on every row are hard to validate; pure EAV loses referential integrity.

### Decision

Use **`FinancialPosting`** (amount + account + measure + finance year/version) plus **`FinanceDimensionAssignment`** rows:

- **Typed domain kinds** (optional per posting): `SEASON`, `ORG_UNIT`, `TEAM_OR_GROUP`, `PERSON`, `ACTIVITY`, `CLUB_EVENT`, `TOURNAMENT`, `MATCH`, `SPONSOR_ORGANISATION`, `FINANCE_PROJECT`, `FACILITY_RESOURCE`, `FUND`, `FUNDING_SOURCE`, `FINANCE_COST_CENTER`
- **Custom dimensions**: `FinanceCustomDimensionDefinition` + `FinanceCustomDimensionValue` referenced from assignments with `kind=CUSTOM`
- Exactly **one** entity id per assignment row (service-layer validation; optional DB check constraints per kind in FIN-01B).
- Multiple assignments per posting allowed (e.g. Project + Cost Center + custom Program).
- **No duplicate** Team/OrgUnit/Person tables — FKs reference existing SCE models when used.

Alternatives rejected: (A) wide nullable FK row — poor ergonomics; (B) untyped-only JSON dimensions — weak audit/reporting.

### Consequences

- Reporting aggregates by dimension via assignment joins; irrelevant dimensions stay unused per tenant.
- Import assistants map spreadsheet columns → assignments + cost centers (FCA is one reference case).
- New **typed** kinds require enum + validator; **custom** dimensions are tenant-managed within guardrails.

---

## ADR-018 — Financial Year vs Sporting Season

**Status:** Accepted

### Context

ADR-001 anchors **sporting** planning to `Season`. Accounting years may follow calendar, association, or club statutes (e.g. 1.1.–31.12. vs August–July). Equating them causes budget leakage across sporting transitions.

### Decision

Introduce **`FinanceYear`** (tenant-scoped configurable date range, tenant base currency) as the budget/management-income-statement container. **`Season` remains authoritative for sport when the tenant uses seasons**. Optional links associate finance years with seasons — **not** 1:1 required. Calendar year, fiscal year, July–June, or custom boundaries are **tenant configuration**. Postings may carry `seasonId` as an optional dimension when sport context matters.

### Consequences

- Multi-year planning spans multiple `FinanceYear` rows.
- FCA workbook season labels must be mapped explicitly during import (see ADR-025).
- Queries must filter by both finance year and season deliberately.

---

## ADR-019 — Budget, Version, and Scenario Architecture

**Status:** Accepted

### Context

Approved annual budgets must not be silently edited. Tenants need named scenarios (Conservative, Growth, Facility Expansion, …) and audit trails.

### Decision

- **`Budget`**: container per `FinanceYear` (and tenant).
- **`BudgetScenario`**: **tenant-named** rows; optional canonical semantic flag (`BASELINE`, `COMPARISON`) — **not** hardcoded scenario types such as SANIERUNG or INVESTITION_JUGEND in core enums.
- **`BudgetVersion`**: lifecycle `DRAFT → SUBMITTED → APPROVED → LOCKED`. **Approved/Locked lines are immutable**; changes create **`BudgetRevision`** (new version or amendment package) with who/when/before/after.
- **`BudgetLine`**: amount per account + measure BUDGET + dimension assignments.

Scenarios support clone/compare/promote in FIN-04; FIN-01A only fixes the model. FCA scenario labels map via import/localization — not product schema.

### Consequences

- Services reject in-place edits on locked versions.
- Audit events required on status transitions (FIN-01B+).

---

## ADR-020 — Cost Center Architecture

**Status:** Accepted

### Context

OrgUnit hierarchy (Organisation Builder) describes governance and sport structure, not always finance structure.

### Decision

Introduce **`FinanceCostCenter`** (tenant-scoped **user-managed** tree: create, rename, reparent, reorder, archive, reactivate, delete-when-safe). Optional links to OrgUnit, Team, Event, Tournament, Facility, Project — **none required**. Cost center **names are tenant data**; no business logic on literal labels. Cost center reporting rolls up independently of organigram layout.

OrgUnit/Team/Event may **link** to a cost center, but are not cost centers by default.

### Consequences

- Unit/event economics use cost centers + optional dimensions — not mandatory team navigation.
- Historical postings keep references when centers are archived; silent delete and cascade delete of financial history are **forbidden** (see ADR-026).

---

## ADR-021 — Actual, Forecast, and Commitment Measures

**Status:** Accepted

### Context

Clubs distinguish Plan, Ist, Prognose, and later Verpfügbar (budget − actual − commitments). Treating forecast as ad-hoc columns blocks reporting.

### Decision

**`FinancialMeasureKind`**: `BUDGET | ACTUAL | FORECAST | COMMITMENT` on **`FinancialPosting`** (same account + dimension spine). **Available** (FIN-04) is derived: `BUDGET − ACTUAL − open COMMITMENT` with rules to avoid double-count when commitment converts to actual.

Forecast may be manual or derived later — not AI in FIN-01.

**FIN-04 programme principle (accepted with FIN-04A closure):** *SCE generates the projection. The organisation owns the forecast.*

| Concept | Role |
| --- | --- |
| **SCE projection** | System-generated expectation from financial/operational evidence (FIN-04B+) |
| **Current forecast** | Organisation's accepted management expectation (FIN-04A) |
| **Scenario** | Alternative what-if view (FIN-04D) |

SCE projection must **never** silently overwrite current forecast; forecast updates from projection require **explicit user action**. Approved budget and actual remain independent measures (see [`SCE-FINANCE-04A-IMPLEMENTATION.md`](../finance/SCE-FINANCE-04A-IMPLEMENTATION.md)).

### Consequences

- Management income statement compares measures uniformly.
- Liquidity timing (payment dates) is a separate future layer (ADR-016 boundary).

---

## ADR-022 — Money and Currency Representation

**Status:** Accepted

### Context

Floating-point money causes rounding bugs. SCE billing already uses integer minor units.

### Decision

All finance amounts: **`amountMinor` safe integer** + **`currency`** ISO 4217 code. Tenant base currency is **configurable** (`Tenant.currency` or dedicated finance settings) — **no hardcoded CHF** in core. Display via shared formatters in `lib/` (align with `formatBillingMoney`). No FX trading in FIN-01; multi-currency reserved for future integration exports.

### Consequences

- Prisma fields use `Int` minor units; aggregation in integer math.
- Architecture tests reject non-integer money in contracts.

---

## ADR-023 — Personnel Finance Privacy

**Status:** Accepted

### Context

`people.view` must not expose compensation. Person workspace already gates **Finanzen** tab with `people.finance.view`.

### Decision

Three visibility layers:

1. **Organisation aggregate** — `finance.view` / income statement totals.
2. **Team / cost-center aggregate** — `finance.view` + scope (OrgUnit/Team/cost center assignment).
3. **Individual compensation** — requires **`people.finance.view`** (and manage via **`people.finance.manage`**). **`finance.personnel.view`** may gate aggregate personnel planning rows without line-item names where product requires.

Budget owners scoped to OrgUnit/Team/cost center via future **`FinanceScopeGrant`** aligned with existing RBAC — not a parallel auth system.

### Consequences

- FIN-01 UI must not show person names on salary lines without explicit permission.
- Aggregated trainer honorar per team is allowed at team level without per-person breakdown for restricted roles.

---

## ADR-024 — Accounting Integration Boundary

**Status:** Accepted

### Context

Clubs will keep statutory SoT in external accounting. SCE must remain authoritative for **club operational** plan and management actuals entered or imported for sport dimensions.

### Decision

FIN-01 defines integration **seams**, not a provider:

- CSV/Excel export of management income statement and budget lines
- Future: account mapping table (SCE account → external ledger account)
- Future: journal export / API / payment reconciliation

SCE does **not** become statutory ledger in v1. Statutory balance sheet, VAT, and formal closing remain external unless a future ADR supersedes.

### Consequences

- FIN-07 owns provider selection; FIN-01B avoids hard-coding Bexio/Abacus.
- Duplicate invoice engine not required for management budget.

---

## ADR-025 — FCA Excel Migration Strategy

**Status:** Accepted

### Context

FC Allschwil manages planning in `FC_Allschwil_Budget_26-27_Draft_v2.xlsx`. Adoption requires import, not manual re-entry. Workbook is **reference input**, not product schema. **FCA_WORKBOOK_PROGRAMMATIC_ANALYSIS** remains **PENDING** until the file is available to the analyzer in a validated run.

### Decision

**Finance Import Assistant** (future FIN-01 import subpackage):

1. Upload workbook → programmatic inspect (existing analyzer script).
2. Sheet/row classifier → map to tenant **`FinancialAccount`** tree (from template or scratch).
3. Map columns to **optional dimensions** and **measures** (Budget / Actual / prior year).
4. Preview + validation + idempotent import run record.

Do **not** ship generic AI spreadsheet parsing in FIN-01A. FIN-01A delivers analyzer + mapping model + ambiguity catalog.

**Workbook path:** `docs/finance/reference/FC_Allschwil_Budget_26-27_Draft_v2.xlsx` (local/PO attachment — not committed unless authorised).

### Consequences

- Category labels from FCA are **examples / import mapping**, not universal SCE core semantics.
- Import must resolve column headers → canonical entities via mapping UI — never assume football team columns globally.
- Re-run analyzer when PO supplies workbook to refresh sheet inventory. Missing workbook does **not** block generic architecture.

---

## ADR-026 — Tenant-Owned Finance Structure

**Status:** Accepted (FIN-01A-R1)

### Context

Organisations must own cost center trees, account hierarchies, and reporting structures without code deploys or SCE support.

### Decision

Finance structure entities (`FinanceCostCenter`, `FinancialAccount`, `FinancialReportingGroup`, scenario names) are **tenant-managed configuration** with RBAC (`finance.structure.manage`). Lifecycle: create, rename, move/reparent, reorder, archive, reactivate, delete-when-safe. **Product deployment is not required** for structure changes.

### Consequences

- FIN-01B+ implements Structure Builder UX (see ADR-028).
- Services enforce dependency-aware delete and archive rules (ADR-020).

---

## ADR-027 — Canonical vs Configurable Financial Semantics

**Status:** Accepted (FIN-01A-R1)

### Context

Flexibility must not collapse into untyped strings. Reporting and future accounting integration need stable typed semantics.

### Decision

- **Canonical (typed)**: account semantics (`INCOME`, `EXPENSE`, `ASSET`, `LIABILITY`, `EQUITY`, `TRANSFER`, `OTHER`), measure kinds, budget version status, optional scenario semantic flags.
- **Configurable (tenant data)**: display names, hierarchy shape, localization labels (Ertrag/Aufwand, P&L sections), template-derived trees.
- **Management income statement** is the canonical report; Swiss Erfolgsrechnung is a **supported localization**, not a global requirement.

### Consequences

- No hardcoded Ertrag/Aufwand/Sanierung enums in core contracts.
- Templates seed tenant data; tenants may rename/reparent freely.

---

## ADR-028 — Capability-Driven Finance UX

**Status:** Accepted (FIN-01A-R1)

### Context

Hardcoded German navigation (Übersicht, Erfolgsrechnung, Teams & Bereiche) embeds FC Allschwil / football assumptions.

### Decision

Finance modules and navigation derive from **enabled capabilities**, **permissions**, and **tenant settings**. Contextual team/org/event/personnel analysis appears when relevant — not as globally mandatory nav. Progressive complexity: small orgs see Overview + Budget + Income & Expenses; advanced orgs enable Projects, Funds, Liquidity, etc.

**FIN-01B Structure Builder** (architecture recommendation): tree/table hybrid with inline rename, drag reparent, inspector for semantics/links, command search, archive/delete guards, keyboard accessible.

### Consequences

- `/dashboard/finance` shell reads capability manifest — no fixed five-tab German IA in contracts.
- Design System v1.0 components only; binary settings use canonical toggles.

---

## ADR-029 — Localization and Optional Templates

**Status:** Accepted (FIN-01A-R1)

### Context

Country and sport templates help onboarding but must not become core schema assumptions.

### Decision

Separate **core financial model** from **localization layer** (language, terminology, currency defaults, country templates, tax/accounting mapping hints). Optional starter templates (small org, team sport, federation, start from scratch) copy into **tenant configuration**; tenants may modify all resulting structure.

### Consequences

- CHF, J+S, Gemeinde, Swiss VAT examples live in localization/reference — not core enums.
- `SCE-FINANCE-TERMINOLOGY.md` documents localization examples, not immutable core names.

---

## ADR-030 — Funds, Funding Sources, and Restrictions

**Status:** Accepted (FIN-01A-R1)

### Context

Grants, subsidies, donations, and purpose-bound reserves need first-class architecture without hardcoding Swiss providers.

### Decision

Model **`FinanceFund`**, **`FundingSource`**, and optional **`FinanceFundRestriction`** (purpose-bound vs unrestricted). Provider names (J+S, municipality, federation) are **tenant/localization data**. Postings may assign fund/funding source dimensions.

### Consequences

- FIN-08 expands governance workflows; FIN-01A only fixes seams.
- Restricted vs unrestricted reporting is architecture-supported, not FIN-01 implemented.

---

## ADR-031 — Finance Projects

**Status:** Accepted (FIN-01A-R1)

### Context

Capital projects, camps, and programmes span years, cost centers, and org slices without requiring teams or seasons.

### Decision

**`FinanceProject`** is sport-independent, optional everywhere, may link multiple org units/teams/events/funding sources, and spans multiple finance years.

### Consequences

- Project P&L is filtered postings — no separate non-configurable project types in core.

---

## ADR-032 — Account Hierarchy and Reporting Structure Lifecycle

**Status:** Accepted (FIN-01A-R1)

### Context

“What kind of activity?” (account) is separate from “where does it belong?” (cost center).

### Decision

**`FinancialAccount`** hierarchical tree with `nodeKind` GROUP|POSTING and **canonical semantic** per node; **`FinancialReportingGroup`** for rolled-up management income statement lines. Same user-managed lifecycle as cost centers (ADR-026). Delete-when-safe with historical integrity.

### Consequences

- No universal Ertrag/Aufwand/Material tree in core — templates only.

---

## ADR-033 — Custom Reporting Dimensions

**Status:** Accepted (FIN-01A-R1)

### Context

Tenants need Region, Program, Campaign, etc., without abandoning typed domain FKs.

### Decision

**`FinanceCustomDimensionDefinition`** (tenant-scoped, typed metadata) and **`FinanceCustomDimensionValue`** (hierarchical optional) referenced from **`FinanceDimensionAssignment`** with `kind=CUSTOM`. Not a free-form JSON bag on postings.

### Consequences

- Balances referential integrity, query performance, and tenant isolation vs pure EAV.

---

## ADR-034 — SCE Projection Engine (FIN-04B)

**Status:** Accepted — **FIN-04B COMPLETE + MERGED + PO UAT PASS** (PR **#903** → **STAGE**)

### Context

FIN-04A established organisation-owned **current forecast** independent of budget and actuals. Clubs still need SCE to propose expectations from evidence without volunteer manual recalculation. Projection must remain distinct from forecast, scenario, and budget; governance and FIN-06 publication require traceability when projections influence management decisions.

### Decision

1. **Semantic split:** **SCE projection** (system-generated) ≠ **current forecast** (organisation-owned) ≠ **scenario** (FIN-04D what-if). Principle: *SCE generates the projection. The organisation owns the forecast.*
2. **No silent overwrite:** SCE projection must never silently mutate current forecast, approved budget, or actuals. Adoption requires explicit user action (**Automatische Prognose übernehmen**).
3. **Engine:** Numerical / statistical / driver-based calculation with traceable provenance — **not** an LLM as the canonical calculator. LLM may assist explanation later.
4. **Data honesty:** Explicit **data sufficiency** (`SUFFICIENT` / `LIMITED` / `INSUFFICIENT`) with reason codes; no fabricated precision or fake ranges when unavailable. Naive YTD annualisation is **not** default intelligence.
5. **Grain:** Published projection aligns with FIN-04A annual `FinanceYear` + `FinancialAccount` grain; finer calculation grain allowed internally without fake monthly published forecast rows.
6. **Persistence:** **Versioned snapshot hybrid** — explicit generate/refresh writes immutable projection versions with **actualsThroughDate** cutoff; reads serve snapshots (staleness when evidence changes). **`FinanceProjection.currentProjectionVersionId`** is canonical (not MAX version inference). Structured **`FinanceProjectionEvidence`** + **`FinanceProjectionReasonCode`** — not an unstructured JSON dump.
7. **Forecast adoption (FIN-04B-06):** Accepting an SCE projection creates a **new** organisation **`FinanceForecastVersion`** (prior → `SUPERSEDED`, new → `CURRENT`). Projection version remains immutable; adoption provenance in **`FinanceProjectionAdoption`** links projection version, source/target forecast versions.
8. **Isolation:** Tenant financial evidence only; no cross-tenant evidence in FIN-04B. Currency follows finance context — no FX in FIN-04B. Projection version **currency** frozen on snapshot.
9. **Capability / permissions:** Remains under **`FORECASTING`**; view via `finance.forecast.view`, generate/refresh/apply via `finance.forecast.manage` (distinct actions in code).
10. **Identity:** Do **not** store SCE projection in `FinanceForecastVersion.scenarioKey` (reserved for FIN-04D scenarios). **`FinanceProjection*`** models are separate from **`FinanceForecast*`** (FIN-04B-02 migration).
11. **UX placement:** SCE assist inside existing **Prognose** workspace; German labels **Aktuelle Prognose** vs **Automatische Prognose** (tenant-facing; internal `FinanceProjection*` naming unchanged).
12. **FIN-04B-04 engine:** Deterministic **`sce-projection-v1`** — methodology selected **per financial account**; version may be **`MIXED`**. Historical seasonal pattern preferred when evidence supports it; **run rate** is an explicit conservative fallback; **`NONE`** / null amount is valid. Budget and current forecast are **not** predictive fallbacks. Generated snapshots remain **immutable** (new version on refresh).
13. **FIN-04B-07 hardening:** Data sufficiency remains separate from **Prognosesicherheit**; structured explainability includes confidence reasoning; **`FinanceForecast.currentVersionId`** and **`FinanceProjection.currentProjectionVersionId`** are canonical current-version pointers; release regression suite `finance-04b-07-release-hardening.test.ts`.

Full contract: [`docs/finance/SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md`](../finance/SCE-FINANCE-04B-PROJECTION-ARCHITECTURE.md). Methodology detail: [`docs/finance/SCE-FINANCE-04B-04-METHODOLOGY.md`](../finance/SCE-FINANCE-04B-04-METHODOLOGY.md). Code locks: `lib/finance/projection/projection-architecture-contract.ts`.

### Consequences

- FIN-04B-02 migration `20261023200000_sce_finance_04b_02_projection_persistence` applied on shared STAGE.
- FIN-04B-04 migration `20261023210000_sce_finance_04b_04_projection_line_methodology` applied on shared STAGE.
- **Production** not touched at FIN-04B closure; verify scripts: `npm run finance:04b:02:stage-migration-verify`, `npm run finance:04b:04:stage-migration-verify`.
- FIN-04A manual forecast services unchanged in FIN-04B-02; adoption workflow in FIN-04B-06 must create new forecast version per decision (7).
- FIN-04C/D/05/06 must consume projection as a separate measure from current forecast and published snapshots.
- Architecture tests in `finance-04b-projection-architecture.test.ts` guard durable semantics.

---

## ADR Template

Copy this template to add a new ADR.

```
## ADR-XXX — Title

**Status:** Proposed | Accepted | Superseded | Deprecated

### Context

Why was this decision needed? What was the problem or situation?

### Decision

What was decided?

### Consequences

What are the outcomes, trade-offs, or follow-on constraints?
```
