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
