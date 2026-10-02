# SCE-ACTIVITY-DESIGN-01 — Unified Activity Experience

> **Document type:** Product roadmap — follow-up to SCE-ACTIVITY-UX-01  
> **Status:** Accepted direction — **not** part of PR #792 / SCE-ACTIVITY-UX-01 implementation  
> **Last updated:** 2026-10-02  
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

---

## SCE-ACTIVITY-DESIGN-01C — Match & Tournament Management Cards

**Goal:** Football-native management list/card presentation without replacing operational data.

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

**Goal:** Separate **CONSUME** from **MANAGE** in navigation and authorization.

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

Required future hierarchy:

**Site → Facility → Resource**

Example: *Im Brüel* → *Kunstrasen 2* → *Kunstrasen 2 A*

Not in SCE-ACTIVITY-UX-01 scope.

### SCE-ACTIVITY-COLOR-01

Audit and migrate historical color inconsistency across consumers to shared design-system tokens:

- Training = blue
- Spiel = red
- Turnier = orange

---

## Suggested execution order

1. **01A** — Design system + ClubIdentity (tokens, logos, density variants)
2. **01B** — Activity Detail (read layer; unblocks consume navigation)
3. **01E** — Permission & navigation hardening (parallel with 01B where possible)
4. **01C** — Match & Tournament management cards
5. **01D** — Wochenplaner planner blocks + training management polish

**SCE-ACTIVITY-COLOR-01** and **FACILITY-MODEL-01** can proceed on independent tracks when engineering capacity allows.
