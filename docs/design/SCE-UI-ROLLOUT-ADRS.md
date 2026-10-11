# SCE-UI-ROLLOUT — Architecture Decision Records (ADR-01 … ADR-10)

> Programme: [`SCE-UI-ROLLOUT-01+`](../roadmap/SCE-UI-ROLLOUT-01.md)  
> Established by: **SCE-UI-ROLLOUT-01A**  
> Status: **Accepted** (Product Owner direction for rollout packages 01B–01N)

---

## ADR-01 — Context tabs are the canonical detail-workspace navigation pattern

**Status:** Accepted

### Context

SCE detail workspaces used heterogeneous navigation (inline sections, side rails, local state). SCE-ACTIVITY-NAV-01 proved a uniform **identity → tabs → tab workspace** model for four activity types.

### Decision

For **eligible** SCE entity/detail workspaces, **context tabs** (not primary app nav, not filter chips) are the canonical navigation pattern. Domain-specific tab labels remain allowed.

### Consequences

- 01B extracts/evolves NAV-01 rather than introducing a parallel tab framework.
- List/management hubs may keep filter/view query params; they are not context tabs.

---

## ADR-02 — SCE-ACTIVITY-NAV-01 is evolved, not replaced

**Status:** Accepted

### Context

`lib/activity-navigation` and `ActivityDetailNavigation` already implement URL sync, permission-aware visibility hooks, dirty guards, and overflow **Mehr** behaviour with PO UAT sign-off.

### Decision

Future universal context tabs **extend** this implementation (rename/extract only where clarity demands). No competing `SceContextTabs` rewrite unless extraction from existing code.

### Consequences

- 01B work starts from listed files in [`SCE-CONTEXT-TABS-STANDARD.md`](./SCE-CONTEXT-TABS-STANDARD.md).
- TeamCockpitNav remains the **visual** reference for route-segment entity tabs.

---

## ADR-03 — Activity presentation semantics are centralized before card migration

**Status:** Accepted

### Context

Many surfaces format dates, venues, statuses, and match sides locally. Partial stacks exist (`sporting-activity-presentation`, `sporting-activity-design`).

### Decision

Package **01C** delivers a single **canonical presentation resolver / view-model** consumed by all card densities. Card family packages **01D–01G** must not ship before 01C contract is stable.

### Consequences

- Duplicated formatters enter legacy register with **MUST-MIGRATE** until 01C consumers exist.
- TypeScript elegance must not collapse domain-specific fields (match vs tournament organiser vs training resource).

---

## ADR-04 — One visual activity family, four domain semantics

**Status:** Accepted

### Context

Users should recognize the same activity across Dashboard, planning, and detail. Tournament must not be presented as Match for convenience.

### Decision

**One activity design family** (`SceActivityCard` concept) with semantic variants for Training, Match, Tournament, Club Event. Shared primitives (identity, meta, status, actions) with variant-specific slots.

### Consequences

- 01D–01G implement variants, not four unrelated card systems.
- `activityKind` drives icon/color/status mapping, not generic “Event” styling alone.

---

## ADR-05 — Match identity order is fixed (HOME | HOME LOGO | VS | AWAY LOGO | AWAY)

**Status:** Accepted

### Context

Tenant-centric layouts historically risked showing “our team” first regardless of home/away.

### Decision

Canonical match identity order is **always** home then away for names and crests. No reorder for tenant club, user membership, or list context.

### Consequences

- 01D adds invariant tests across audited surfaces.
- Infoboard FAIL paths (Screen1 fallback, Screen2) are **MUST-MIGRATE**.

---

## ADR-06 — Density variants, not per-surface one-off cards

**Status:** Accepted

### Context

Surfaces need hero, standard, compact, and micro presentations of the same activity.

### Decision

Card family supports **HERO | STANDARD | COMPACT | MICRO** densities mapping to existing `SportingActivityDensity` (`compact` | `planner` | `management`) plus explicit hero/micro aliases in 01C.

### Consequences

- Mandatory/optional/hidden fields defined per density in presentation standard.
- Same `resourceKey` must be recognizable at every density.

---

## ADR-07 — Canonical location semantics are shared and density-aware

**Status:** Accepted

### Context

Training and events expose club/host, venue, and resource at different granularities.

### Decision

Presentation layer preserves hierarchy **host/organiser → venue → resource**. UI may compress display per density but must not invent or drop levels at the resolver incorrectly.

### Consequences

- 01E (Training) migrates location formatters to shared `SportingActivityLocation` derivation.
- Wochenplan/planner micro lines document which levels appear per density.

---

## ADR-08 — Provider/domain state remains authoritative; presentation is derived

**Status:** Accepted

### Context

SFV matches, manual matches, external clubs, and tournament Hauptteam fields are provider-owned.

### Decision

Presentation adapters are **read/derive only** unless a future domain package explicitly changes behaviour. No UI unification mutates stored provider fields.

### Consequences

- Status translation layers map provider → SCE operational labels without overwriting source enums.
- External logo resolution stays at load boundaries (`club-directory`, tournament service).

---

## ADR-09 — UI unification never substitutes for backend authorization

**Status:** Accepted

### Context

Hidden tabs or disabled actions must not imply security.

### Decision

Shared components receive **capability flags** or action tokens from authorized server contexts. Backend checks remain canonical for mutations.

### Consequences

- Document HIDDEN vs READ_ONLY vs DISABLED vs ACTION_NOT_AUTHORIZED in context tab and card contracts.
- No client-only permission engines duplicated across modules.

---

## ADR-10 — Migration is incremental; legacy removal follows consumer migration

**Status:** Accepted

### Context

Big-bang UI rewrites risk regression across Matchcenter, planning, and Infoboard.

### Decision

Migrate surface-by-surface per 01H–01L. Legacy components/formatters are **deprecated** in register until consumers move; removal only in **01N** when register clears **MUST-MIGRATE**.

### Consequences

- 01A documents legacy IDs; no mass deletion in inventory phase.
- Each package ships with scoped tests on touched surfaces.
