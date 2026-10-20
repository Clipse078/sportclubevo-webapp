# SCE-DESIGN-SYSTEM-01 — Product-wide UI Audit & Canonical Design Architecture

| Field | Value |
| --- | --- |
| **Canonical key** | `SCE-DESIGN-SYSTEM-01` |
| **Predecessor** | SCE-UI-ROLLOUT-01+ (foundations), SCE-TOURNAMENT-PLANNER-02 (**CLOSED**, STAGE `9430a8e7…`) |
| **Status** | **CLOSED / ACCEPTED / MERGED** (PR **#879** → **STAGE**; merge `108fdf6e…`) |
| **`DS01_STATUS`** | **CLOSED / ACCEPTED / MERGED** |
| **Branch** | `cursor/sce-design-system-01-product-wide-audit-architecture` (merged) |
| **Baseline STAGE** | `9430a8e7b3bfefc40872e756d7dfe6e6b9cb6f2c` |
| **Accepted audit HEAD** | `6f3554f415bd4b3aa6012dad6e79a0d31eb8f875` |
| **Closure commit** | `e2ad61756538d55cd8dd4c17c8448c576bf64c9f` |
| **STAGE merge commit** | `108fdf6e9840dcc6d53ea3f68fc11acb151b5a41` |
| **PR** | **#879** — **MERGED** |

---

## PO acceptance (final closure)

Product Owner review **PASS** — DS-01 is the **architecture baseline** for the remaining Design System programme (DS-02+).

| Field | Value |
| --- | --- |
| `PO_ARCHITECTURE_REVIEW` | **PASS** |
| `PO_VISUAL_DIRECTION_REVIEW` | **PASS** |
| `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE` | **YES** |
| `PRODUCT_WIDE_ROLLOUT_TARGET` | **YES** |
| `DARK_NAVY_SCE_LANGUAGE` | **CANONICAL_DIRECTION** |
| `RESTRAINED_ACCENT_USAGE` | **REQUIRED** |
| `LAYERED_SURFACE_HIERARCHY` | **REQUIRED** |
| `CALM_INFORMATION_HIERARCHY` | **REQUIRED** |
| `DOMAIN_SPECIFIC_LAYOUTS_PRESERVED` | **YES** |
| `PREMIUM_DOES_NOT_MEAN_OVERSIZED` | **YES** |

Architecture closure markers (PO final):

```text
PO_ARCHITECTURE_REVIEW = PASS
PO_VISUAL_DIRECTION_REVIEW = PASS
COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES
PRODUCT_WIDE_ROLLOUT_TARGET = YES
DARK_NAVY_SCE_LANGUAGE = CANONICAL_DIRECTION
RESTRAINED_ACCENT_USAGE = REQUIRED
LAYERED_SURFACE_HIERARCHY = REQUIRED
CALM_INFORMATION_HIERARCHY = REQUIRED
DOMAIN_SPECIFIC_LAYOUTS_PRESERVED = YES
PREMIUM_DOES_NOT_MEAN_OVERSIZED = YES
DS01_STATUS = CLOSED / ACCEPTED / MERGED
```

**Programme carry-forward:** `SCE_DESIGN_SYSTEM_PROGRAMME_STATUS = IN PROGRESS` · **`NEXT_PACKAGE = SCE-DESIGN-SYSTEM-03`** (Workspace / Surface / Navigation — DS-02 **CLOSED / ACCEPTED / MERGED**, PR **#880**).

---

## PO visual direction (DS-01-R1)

The Product Owner selected the **Communication** module as a **primary positive visual reference** for SCE Design System v1.0 rollout quality.

| Flag | Value |
| --- | --- |
| `COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE` | **YES** |
| `PRODUCT_WIDE_ROLLOUT_TARGET` | **YES** |
| `DARK_NAVY_SCE_LANGUAGE` | **CANONICAL_DIRECTION** |
| `RESTRAINED_ACCENT_USAGE` | **REQUIRED** |
| `LAYERED_SURFACE_HIERARCHY` | **REQUIRED** |
| `CALM_INFORMATION_HIERARCHY` | **REQUIRED** |
| `DOMAIN_SPECIFIC_LAYOUTS_PRESERVED` | **YES** |
| `TOURNAMENT_OPERATIONAL_PATTERNS_PRESERVED` | **YES** |
| `ACTIVITY_CARD_FAMILY_PRESERVED` | **YES** |
| `ACTIVITY_COMPOSER_PRESERVED` | **YES** |
| `CANONICAL_NAVIGATION_PRESERVED` | **YES** |
| `PREMIUM_DOES_NOT_MEAN_OVERSIZED` | **YES** |

Architecture closure markers (DS-01-R1):

```text
COMMUNICATION_WORKSPACE_PRIMARY_VISUAL_REFERENCE = YES
PRODUCT_WIDE_ROLLOUT_TARGET = YES
DARK_NAVY_SCE_LANGUAGE = CANONICAL_DIRECTION
RESTRAINED_ACCENT_USAGE = REQUIRED
LAYERED_SURFACE_HIERARCHY = REQUIRED
CALM_INFORMATION_HIERARCHY = REQUIRED
DOMAIN_SPECIFIC_LAYOUTS_PRESERVED = YES
TOURNAMENT_OPERATIONAL_PATTERNS_PRESERVED = YES
ACTIVITY_CARD_FAMILY_PRESERVED = YES
ACTIVITY_COMPOSER_PRESERVED = YES
CANONICAL_NAVIGATION_PRESERVED = YES
PREMIUM_DOES_NOT_MEAN_OVERSIZED = YES
```

**Primary reference routes:** `/dashboard/communication` · `/dashboard/communication/email-sender`

**Objective:** Extract Communication’s successful **visual principles** (dark layered workspace, calm hierarchy, restrained accent, readiness/status patterns) into canonical DS rules and apply **systematically** across SportClubEvo — **without** copying the hub grid layout onto unrelated domains.

**Explicitly preserved (not replaced by Communication layout):** `AppShellNavigation` / NAVBAR-UPGRADE-01 · `SceContextTabs` · activity card family · `SceTournamentFixturePresentation` · Programme Engine · `SceActivityComposer` / `SceModalOverlay` · tournament planner operational density.

R1 **supplements** the evidence-based DS-01 audit; it does **not** replace route inventory, registry counts, migration matrix priorities, or P0 findings.

---

## Mission

Establish the **factual current state** of the SportClubEvo webapp UI and define the **canonical architecture** that subsequent Design System packages (DS-02+) will implement.

**Core principle:** AUDIT FIRST → DEFINE CANONICAL SYSTEM SECOND → MIGRATE PRODUCT THIRD.

**Explicitly out of scope for DS-01:**

- Mass visual rewrite or screen redesign
- Sponsor / Commercial module implementation
- Match Squad maturity
- Mobile App product stream
- Second parallel design system
- DS-02 foundations implementation
- PO manual UAT / Cursor screenshots

---

## Audit methodology

1. **Route & module inventory** — `app/**/page.tsx` (256 routes), admin shell, public/infoboard, auth, print.
2. **Component family grep** — `Sce*` primitives, `components/ui/*`, sporting-activity cards, composer, nav shell.
3. **Token source review** — `app/globals.css`, `@theme`, overlay tokens, activity palettes.
4. **Legacy register reconciliation** — [`SCE-UI-LEGACY-REGISTER.md`](../design/SCE-UI-LEGACY-REGISTER.md) (28 entries).
5. **Control audit** — `type="checkbox"` vs `SwitchToggle` usage across TSX.
6. **Classification** — CANONICAL / CANONICAL_REFINE / LEGACY_MIGRATE / DUPLICATE / DOMAIN / DEPRECATE per UI family.
7. **Deliverables** — master doc update, primitive registry, migration matrix, guardrail tests, proposed DS-02–DS-11 sequence.

---

## Product UI inventory (summary)

| Product area | Primary routes / modules | Audit verdict |
| --- | --- | --- |
| **Dashboard / personal** | `/dashboard`, Mein Programm, programme engine, personal agenda | **Mixed** — programme rows canonical; dashboard module cards need card family adoption |
| **Teams** | Team cockpit, programme, matches, trainings, squad, staff, documents | **Strong** on match/training presentation integrations; cockpit nav is domain-specific route tabs |
| **Activities** | Match / Training / Tournament / Club Event detail, cards, composer, `/new` | **Canonical** presentation pipeline (01C–01G); composer + overlay layering accepted |
| **Planning** | Wochenplaner, planning hub, day/season planner, Trainingsplaner | **Mixed** — hub blocks and Wochenplan shells partially legacy; tournament planung post-02E canonical |
| **Tournament center** | Turniere list, planung, Spielplan, composer | **Canonical** fixture presentation (`SceTournamentFixturePresentation`); list-row composition standard |
| **Admin** | Personen & Zugänge, roles, facilities, seasons, workspace governance | **Mixed** — dense operational UI; permission editor domain-specific; tabs partially legacy |
| **Communication** | Hub, inbox, campaigns, vorlagen, zielgruppen, email-sender | **Primary visual reference (R1)** — layered workspace + calm hub; readiness panel on email-sender; legitimate checkbox multi-select |
| **Documents** | Person documents, media DAM | **Legacy empty patterns** — local empty states |
| **Publishing** | Website, homepage builder, infoboard admin | **Mixed** — builder empty-state duplication; infoboard channel separate |
| **Sponsor / commercial** | CMS sponsor banner config only | **Minimal surface** — audit-only, no new module |
| **Auth / system** | Login, permissions, errors | **Domain** auth layout; error UX needs actionable migration |

**Global chrome:** NAVBAR-UPGRADE-01 (`AppShellNavigation`), season Row 2, `SceActivityCreateMenu`, impersonation/governance banners — **canonical; do not replace**.

---

## Foundations audit

| Layer | Source of truth | Tokenised? | Conflicts / gaps |
| --- | --- | --- | --- |
| **Colors** | `--sce-*`, `--surface*`, semantic `--sce-success/warning/danger/info`, activity palettes in CSS | **Partial** | Residual `emerald-*`, hard-coded hex in planning-hub pickers |
| **Typography** | Tailwind defaults + local classes | **Partial** | Planner dense vs readable admin not formalised as tokens |
| **Spacing** | `--space-*`, page `--sce-page-gutter` | **Yes** | Repeated `p-4 md:p-5` recipes in admin |
| **Radii** | `--radius-xs` … `--radius-pill` | **Yes** | Some legacy `rounded-md` only |
| **Shadows** | `--shadow-xs` … `--shadow-xl`, `--sce-surface-shadow*` | **Yes** | |
| **Focus** | `focus-visible:ring-[var(--sce-primary)]` pattern widespread | **Partial** | Not all legacy forms |
| **Breakpoints** | Tailwind + `usePrimaryNavLayoutTier` | **Yes** | Some desktop-only admin forms |
| **Z-index / overlay** | `sce-overlay-layering.ts` | **Yes** | Nested modal risk in comm/admin — prefer popover/combobox |
| **Motion** | Nav icon animations CSS, transition on toggles | **Partial** | |
| **Icons** | lucide-react primary | **Yes** | Local SVGs in infoboard designer |
| **Crest sizing** | `ClubCrest` bounds + density scales | **Yes** | Infoboard fallback bypasses model |

**DS-02** will consolidate hard-coded Tailwind colour/spacing into documented token consumption — **not done in DS-01**.

---

## Surface architecture (target hierarchy)

Based on existing architecture (not a new wrapper framework). **Communication** (`SCE_DASHBOARD_MODULE_PAGE_SURFACE` layout + `PageShell` + `CommunicationContentSurface` panels) is a **positive reference** for WORKSPACE → PAGE → SECTION → PANEL layering — reconciled with:

```text
APP (atmospheric --sce-app-background)
  → CHROME (navbar two-row, tenant identity)
  → WORKSPACE (SceWorkspaceSurface / SCE_DASHBOARD_MODULE_PAGE_SURFACE / tournament dense surfaces)
  → PAGE (PageShell + width mode: operational | readable | dashboard)
  → SECTION (FormSection, context header, CommunicationWorkspaceHeader)
  → PANEL / CARD (activity cards, admin cards, elevated dialogs, hub capability surfaces)
  → CONTROLS & ACTIONS
```

Tournament operational surfaces additionally use `SCE_TOURNAMENT_*_SURFACE_CLASS` tokens — **domain extension**, not a parallel system.

**R1 principle:** `LAYERED_SURFACE_HIERARCHY = REQUIRED` · `DARK_NAVY_SCE_LANGUAGE = CANONICAL_DIRECTION` · depth via surface tokens and restrained borders, not decorative noise.

---

## Navigation audit

| Pattern | Verdict |
| --- | --- |
| Desktop L1 + on-demand L2/L3 panel | **CANONICAL** — NAVBAR-UPGRADE-01 |
| Mobile bottom nav + drawer | **CANONICAL_REFINE** |
| `SceContextTabs` | **CANONICAL** |
| Activity navigation registries | **CANONICAL** |
| Person / roles local tabs | **LEGACY_MIGRATE** → context tabs (P1–P2) |
| Filter rails (Spiele, Turniere) | **DOMAIN** — not context tabs |
| Breadcrumbs | **Sparse** — standardise in DS-03 |

---

## Card & information presentation audit

| Family | Verdict |
| --- | --- |
| `SceMatchCard` / Training / Tournament / Club Event | **CANONICAL** — HERO/STANDARD/COMPACT/MICRO + list-row |
| `SceTournamentFixturePresentation` | **CANONICAL** — standard/compact/grid densities |
| `MatchCard.tsx`, `VeranstaltungCard`, dashboard today cards | **LEGACY_MIGRATE** |
| Person / team / admin KPI cards | **CANONICAL_REFINE** / **DOMAIN** |
| Stat cards / module capability cards | **DOMAIN** on shared Card/Button |

**Density strategy:** ONE component family, purpose-built densities (lesson from Tournament Planner 02E) — **do not** force identical physical dimensions.

---

## Activity semantics

| Kind | Label | Token | Status |
| --- | --- | --- | --- |
| MATCH | SPIEL | match-red | **Canonical** — `ActivityTypePill`, composer, programme |
| TRAINING | TRAINING | training-blue | **Canonical** |
| TOURNAMENT | TURNIER | tournament-orange | **Canonical** |
| CLUB_EVENT | VERANSTALTUNG | club-event-violet | **Canonical** |

Textual semantics enforced in presentation model and pills — **never colour alone**. Residual historical calendar greens tracked in LEGACY-COLOR-001.

---

## Crests & identity audit

- **Canonical:** `lib/sporting-data/sce-club-visual-identity.ts`, `ClubCrest`, `ClubIdentity`, club-team selector `ClubLogo`.
- **Person avatars:** separate primitive — photos/initials in person modules (**not** crest rules).
- **High risk:** Infoboard fallback branches without presentation model (**P0**).
- **No new** tournament-specific crest resolver (TP02E verified).

---

## Forms & controls audit

### BINARY_CONTROL_AUDIT

| Metric | Value |
| --- | ---: |
| `type="checkbox"` occurrences (TSX/JSX) | **87** |
| Files with checkbox | **54** |
| Files using `SwitchToggle` | **~30** |
| **LEGACY_BINARY_CHECKBOX_COUNT** (estimated setting checkboxes pending toggle migration) | **~32** |
| Multi-selection / row-selection patterns (legitimate checkbox) | **~22** files |

**CANONICAL_TOGGLE_IMPLEMENTATIONS:** `components/ui/SwitchToggle.tsx` (`role="switch"`) — used in training/tournament/team settings, people access governance sections, publication controls, permission preview, veranstaltung recurrence, tournament planung settings, etc.

**Toggle First:** documented in master doc; compliance fields below. DS-01 **does not** convert checkboxes product-wide.

---

## Actions & dialogs audit

- **Buttons:** `components/ui/Button.tsx` — primary/secondary patterns widely adopted; local raw `<button className="…">` still common in planning-hub (**P2** tokenisation).
- **Composer:** `SceActivityComposer` + `SceModalOverlay` — **canonical**; elevated club selector documented.
- **Nested modals:** risk in communication/admin — prefer inline search, combobox, composer-owned panels (**DS-06**).

---

## Status & feedback audit

- **Badges:** canonical for activity lifecycle; `AdminStatusPill` duplicates semantics (**DUPLICATE**).
- **Toasts:** present; not uniformly used for save confirmation.
- **Empty states:** **90+** local implementations — highest-value consolidation target for **DS-07**.
- **ERROR_UX_MIGRATION:** inventory flagged — generic internal errors, billing API pattern; future system must prefer actionable copy (what happened + what to do).

---

## Tables, lists & planners

- **Principle:** PREMIUM ≠ OVERSIZED — maintain **comfortable / compact / dense** tiers.
- **Canonical examples:** Spiele management row, Turniere list-row, programme operational rows, tournament planung grid.
- **Legacy:** undifferentiated wide admin tables without sticky/header tokens — **DS-08**.

---

## Responsive audit

| Class | Examples |
| --- | --- |
| **RESPONSIVE** | Navbar tiers, activity cards, composer mobile full-screen, tournament spielplan mobile timeline |
| **ADAPTIVE** | Turniere list-row grid breakpoints, page width modes |
| **DESKTOP_ONLY_LEGACY** | Some admin forms, wide permission matrices |
| **MOBILE_RISK** | Dense planner matrices on small tablets — scroll/pinch acceptable; not Mobile App scope |

---

## Accessibility audit (prioritised)

| Risk | Priority | Package |
| --- | --- | --- |
| Activity tabs missing arrow-key navigation | **P0** | DS-09 |
| Infoboard match fallback semantic layout | **P0** | DS-04/10 |
| Focus visible on all legacy form controls | P1 | DS-09 |
| Dialog focus trap / restoration (composer + selector) | P1 | DS-06 (tests exist for overlay) |
| Colour-only status | Mitigated by text-first badges — audit residual icons | P2 |

Full WCAG remediation **not** in DS-01 — migration plan only.

---

## System states architecture (recommendation)

Target **one SCE feedback family** (implement in DS-07). **Email-sender Versandbereitschaft** (`EmailSenderWorkspace`, `buildEmailSenderReadinessPresentation`) is an additional **positive reference** for configuration/readiness surfaces:

| State | Current | Target |
| --- | --- | --- |
| SUCCESS / READY | Email-sender checklist `pass`, readiness headline | Canonical readiness panel + `Badge` (replace `AdminStatusPill` duplicate) |
| WARNING / INCOMPLETE | Checklist `warn` / `fail`, fallback sender | Icon + text rows; restrained semantic colour |
| INFORMATION | Summary copy under heading | Short explanation + structured rows |
| LOADING | Mixed spinners, `LoadingSkeleton`, planning ring | Unified skeleton + inline loader |
| EMPTY | Many local components | `SceEmptyState` (+ optional illustration slot) |
| NO RESULTS | Filtered empty in planning hub only | Shared filtered-empty primitive |
| ERROR | Inline + toast | Actionable error panel component |
| PERMISSION DENIED | Route-level + inline | Standard denied surface |

Readiness checklist rows: **icon + label + optional detail + screen-reader state label** — **no colour-only meaning** (align DS-07 with Communication email-sender pattern).

---

## Duplication audit (high value)

1. Repeated Tailwind surface recipes (`border-[var(--sce-surface-border)]` clusters) — token utility classes in DS-02.
2. Parallel empty-state components — DS-07.
3. `AdminStatusPill` vs `Badge` — DS-07.
4. Local date/status formatters — 01C presentation boundary.
5. Inline primary buttons in planning-hub — use `Button` variants.

---

## Canonical primitive registry

Full registry: [`SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md`](../design/SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md)

| Classification | Count |
| --- | ---: |
| **CANONICAL_PRIMITIVES_COUNT** | **38** |
| **CANONICAL_WITH_REFINEMENT_COUNT** | **24** |
| **LEGACY_MIGRATION_COUNT** | **18** |
| **DUPLICATE_PATTERN_COUNT** | **11** |
| **DOMAIN_SPECIFIC_PATTERN_COUNT** | **14** |
| **DEPRECATION_CANDIDATE_COUNT** | **6** |

---

## Legacy migration matrix

Full matrix: [`SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md`](../design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md)

---

## Target architecture (DS v1.0)

1. **Tokens live in** `app/globals.css` (+ future `lib/design-system/tokens` re-exports for TS consumers in DS-02).
2. **Canonical primitives** — registry table; activity cards + presentation model + nav shell + composer + context tabs + ClubCrest + SwitchToggle.
3. **Refinement** — generic Card, Button, empty/loading, tables, typography scale.
4. **Deprecation** — `MatchCard.tsx`, `VeranstaltungCard`, Infoboard presentation fallback, redundant status pills.
5. **Variants/densities** — documented per primitive (activity HERO→MICRO; fixture standard/compact/grid; page width modes).
6. **Domain semantics** — extend via presentation model + ActivityTypePill, not forked card architectures.
7. **Responsive** — `PageShell` width modes + nav layout tiers + composer breakpoint contract.
8. **Accessibility** — primitive owners document focus/aria; DS-09 adds conformance tests for canonical components.
9. **No parallel components** — ADR required ([`SCE-UI-ROLLOUT-ADRS.md`](../design/SCE-UI-ROLLOUT-ADRS.md)).
10. **Consumption** — feature packages import from `components/ui`, `components/sce/*`, `components/sporting-activity/*`, `lib/sporting-activity-presentation/canonical`.
11. **Compliance testing** — DS-11 automated lint/AST where feasible; package closure fields until then.
12. **Exceptions** — documented in ADR + registry DOMAIN rows.

---

## Governance

### SCE_DESIGN_SYSTEM_COMPLIANCE (future package closure)

| Field | Purpose |
| --- | --- |
| `SCE_DESIGN_SYSTEM_COMPLIANCE` | PASS / FAIL |
| `CANONICAL_PRIMITIVES_USED` | List |
| `NEW_PRIMITIVES_INTRODUCED` | List + justification |
| `NEW_PRIMITIVES_JUSTIFICATION` | ADR link |
| `RESPONSIVE_COMPLIANCE` | PASS / deferred |
| `ACCESSIBILITY_COMPLIANCE` | PASS / deferred |
| `PARALLEL_PATTERN_INTRODUCED` | YES/NO |
| `BINARY_CONTROL_COMPLIANCE` | PASS / FAIL |
| `NEW_BINARY_CHECKBOXES` | Count (0 unless exception) |
| `CANONICAL_TOGGLES_USED` | YES / NO / N/A |
| `MULTI_SELECTION_PATTERN` | canonical / n/a / exception |
| `WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE` | PASS when using canonical activity card **family** (no parallel card architecture) |

**Enforcement path:** DS-01 defines contract → DS-11 adds CI guardrails → interim manual closure on each package.

**DS-01 package compliance (this deliverable):**

| Field | Value |
| --- | --- |
| `SCE_DESIGN_SYSTEM_COMPLIANCE` | **PASS** (architecture docs only) |
| `WORLD_CLASS_ACTIVITY_CARD_COMPLIANCE` | **PASS** (audit preserves one family; no new parallel card framework) |
| `BINARY_CONTROL_COMPLIANCE` | **PASS** (no new setting checkboxes introduced) |
| `NEW_BINARY_CHECKBOXES` | **0** |
| `CANONICAL_TOGGLES_USED` | **NOT_APPLICABLE** |
| `MULTI_SELECTION_PATTERN` | **not_applicable** |

---

## Proposed Design System package sequence

| Package | Scope | Notes |
| --- | --- | --- |
| **DS-01** | Audit & architecture + **R1 PO visual direction** | **This package** (docs/guardrails only) |
| **DS-02** | Foundations & tokens | Consolidate CSS + Tailwind recipes; encode dark/navy + accent restraint |
| **DS-03** | Workspace / surface / navigation | Roll Communication workspace tokens product-wide; context tab migrations |
| **DS-04** | Cards & information presentation | Feature capability card pattern; legacy card removal; infoboard model |
| **DS-05** | Forms & controls | Toggle migration waves; map Communication action hierarchy to `Button` |
| **DS-06** | Actions, dialogs & composer | Nested modal reduction; preserve composer |
| **DS-07** | Status / feedback / loading / empty / error | Readiness panel + status rows (email-sender reference); unified empty |
| **DS-08** | Tables, lists & dense operational UI | **PREMIUM ≠ OVERSIZED** density tiers |
| **DS-09** | Responsive & accessibility | Arrow-key tabs, focus audit |
| **DS-10** | Product-wide adoption & legacy removal | Execute migration matrix visual classifications |
| **DS-11** | Governance & automated compliance | AST/eslint rules |

**R1 acceptance criteria carry-forward:** Each DS-02+ package must demonstrate alignment with PO visual flags above (dark layered surfaces, restrained accent, calm hierarchy) **without** breaking domain-specific layouts listed in [`SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md`](../design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md) visual rollout table.

Sequence may merge/split based on PO review. **DS-01 (+ R1) is PO-accepted** — **do not implement DS-02** in the DS-01 closure branch; start DS-02 only as a separate package.

---

## Risks

1. **Scope creep** — treating DS-01 as visual rewrite (mitigated by explicit out-of-scope).
2. **Parallel primitives** — future modules bypassing registry (mitigated by compliance contract + ADRs).
3. **Infoboard P0** — kiosk channel bypasses presentation model.
4. **Empty-state explosion** — without DS-07, modules keep inventing local patterns.
5. **Checkbox debt** — ~32 setting checkboxes remain until DS-05/10.

---

## Acceptance criteria (DS-01)

- [x] STAGE baseline verified; TP02 closure (PR #878) verified
- [x] Product-wide inventory documented
- [x] Primitive registry with classifications
- [x] Migration matrix with priorities
- [x] Target architecture & governance in master + roadmap docs
- [x] Proposed DS-02–DS-11 sequence
- [x] Automated guardrails for doc structure (no brittle prose tests)
- [x] `npm run build`, prisma validate/generate, focused tests pass
- [x] PR **#879** against STAGE — PO closure (merge when gates green)
- [x] No database / password / PO UAT by Cursor
- [x] **DS-01-R1:** PO Communication visual direction locked; product-wide rollout classifications; guardrails updated
- [x] **PO final:** architecture review **PASS**; visual direction **PASS**; `DS01_STATUS = CLOSED / ACCEPTED / MERGED` (PR **#879**)

---

## Related artefacts

- [`docs/design/SCE-DESIGN-SYSTEM.md`](../design/SCE-DESIGN-SYSTEM.md) — master (updated DS-01 section)
- [`docs/design/SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md`](../design/SCE-DESIGN-SYSTEM-01-PRIMITIVE-REGISTRY.md)
- [`docs/design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md`](../design/SCE-DESIGN-SYSTEM-01-MIGRATION-MATRIX.md)
- [`docs/design/SCE-UI-LEGACY-REGISTER.md`](../design/SCE-UI-LEGACY-REGISTER.md)
