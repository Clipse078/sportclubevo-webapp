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

## Related documents

- [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md)
- [`SCE-ACTIVITY-PRESENTATION-STANDARD.md`](./SCE-ACTIVITY-PRESENTATION-STANDARD.md)
- [`SCE-UI-LEGACY-REGISTER.md`](./SCE-UI-LEGACY-REGISTER.md)
- [`SCE-UI-ROLLOUT-ADRS.md`](./SCE-UI-ROLLOUT-ADRS.md)
