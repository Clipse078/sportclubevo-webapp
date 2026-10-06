# SCE-PLANNER-UX-08-07 — Responsive / Tablet + Visual Interaction Hardening

**Status:** **IN PROGRESS** — 08-07R1 Human UAT passed; 08-07R2 shipped on PR preview; awaiting final Human UAT (Michael)

**Base:** `STAGE` @ `a10278222dd6def5f92d5dd953df7b23dfdfbe7c` (includes **08-06** PR #804, **FACILITY-INTEGRITY-01A** PR #803)

**Branch:** `cursor/sce-planner-ux-08-07-responsive-tablet-visual-hardening`

---

## Purpose

Harden the existing Unified Planner (Kalender · Spielfeld · Garderobe · Liste) for realistic desktop/tablet viewports and interaction modes **without** replatforming 08-01…08-06 behaviour.

---

## Diagnosis (pre-implementation audit)

| Area | Findings |
|------|----------|
| **Shell** | Two-row toolbar already wraps at `lg`; perspective strip used horizontal scroll. Risk: sub-`lg` stacking could crowd conflict summary vs week nav; perspective tabs were below comfortable touch size (~32px). |
| **Kalender** | `min-w-[720px]` + outer `overflow-x-auto` — intentional week grid scroll on narrow viewports. Day columns `minmax(120px,1fr)`; parallel lanes shrink below `CALENDAR_MIN_ACTIVITY_WIDTH_PX` (76px) → compact cards. Sticky day header `z-20`. |
| **Spielfeld / Garderobe** | Resource day uses nested scroll (`data-sce-planner-scroll-root`) with sticky time header and sticky resource labels. Rows fixed at 38px/lane — compact blocks always `compact` mode. Horizontal min timeline width preserved. |
| **Liste** | Card rows (not table); sticky day headers; truncate on identity/resources; filters/toolbar already `flex-wrap` / `sm:flex-row`. 08-06R1 row menu could clip at viewport edge (Popover `constrainHeight`). |
| **Scroll** | Calendar: page chrome + inner horizontal scroll. Resource: vertical scroll inside workspace min-height. Liste: section sticky headers within page scroll — acceptable. |
| **Touch** | DnD remains pointer-first (08-03/04); manipulation edit affordance was hover-only on activity cards. No reliable hover on touch. |
| **Keyboard** | Activity cards focusable; row menus keyboard operable; clipped card content not exposed on focus before 08-07. |
| **Overlays** | Shared `PopoverContent` (floating-ui); Liste menu fix from 08-06 — collision padding still tight near sticky chrome. |

---

## Responsive contracts

| Viewport band | Strategy |
|---------------|----------|
| **≥1440 / ~1280** | Default dense layout; full card detail where lane width permits. |
| **~1024–768** | Shell controls wrap; perspective tabs scroll horizontally; calendar/resource **explicit** inner horizontal scroll (no page-level overflow). |
| **<768 (supported)** | Same composition; smaller touch targets upgraded to `min-h-9` on primary controls; clipped-detail disclosure for constrained cards. |

**Breakpoint approach:** Extend existing Tailwind composition (`sm`, `lg`) on shell/Liste — **no separate tablet UI**.

---

## Scroll strategy

- **Kalender:** `overflow-x-auto` on `[data-sce-planner-calendar-scroll-root]`; `min-w-[720px]` grid documents intentional horizontal scroll.
- **Spielfeld / Garderobe:** `overflow-auto` on `[data-sce-planner-scroll-root]`; sticky resource label column + sticky time ruler retained.
- **Liste:** Vertical page scroll; sticky day headings with lightweight backdrop.

---

## Clipped activity detail interaction contract

| Modality | Behaviour |
|----------|-----------|
| **Pointer** | When geometry indicates constrained card (`shouldOfferActivityClippedDetailDisclosure`), hover (220ms) shows floating detail surface. |
| **Keyboard** | Focus on activity card opens the same surface (`useFocus`). |
| **Touch** | Neutral info control (`pointer-coarse:opacity-75`, no activity colour) toggles the same surface; card tap still opens canonical activation path. |
| **Desktop info affordance (08-07R2)** | Hidden/subtle by default on fine pointer; visible on card hover/focus-within; neutral muted glyph — not Training/Spiel semantic colour. |

**Content:** `buildActivityClippedDetailModel` — reuses `schedulerDisplayIdentity`, inspection pitch/dressing labels, timing presenters, conflict/end-time operational notes.

**Geometry rule (08-07R1):** Kalender passes computed `blockLayoutPx` (lane width × height) because card CSS uses `calc(…%)`. Per-card `ResizeObserver` re-measures overflow (`scrollWidth`/`clientWidth`, content shell height) when layout changes — scoped to each card, not planner-wide polling.

**DnD on touch:** Unchanged — pointer DnD remains primary; non-DnD edit/manipulation actions remain the supported tablet path (documented; not expanded in 08-07).

---

## Overlay collision strategy

- `PopoverContent` + clipped-detail surface: `strategy: "fixed"`, `flip` + `shift` with **12px** padding (08-07), portal z-index 70 (menus) / 80 (detail).
- Liste row menu: `constrainHeight={false}` preserved from 08-06R1.

---

## Implementation map

| Piece | Location |
|-------|----------|
| Disclosure geometry + model | `lib/planning-hub/activity-clipped-detail.ts` |
| Hover/focus/touch surface | `components/admin/planning-hub/PlanningHubActivityClippedDetailSurface.tsx` |
| Activity card integration | `components/admin/planning-hub/PlanningHubActivityBlock.tsx` |
| Shell touch targets | `components/admin/planner/WeekPlannerChrome.tsx` |
| Resource day tabs | `components/admin/planning-hub/PlanningHubResourceDayView.tsx` |
| Liste toolbar/menu | `PlanningHubListeToolbar.tsx`, `PlanningHubListeRowMenu.tsx` |
| Popover collision | `components/ui/Popover.tsx` |

---

## Invariants (unchanged)

- Authorization: `deriveConflictResolutionCapabilities`, `canEditPlannerItem`, manipulation APIs — **no** responsive bypass.
- Tenant isolation / provider authority — server gates unchanged.
- Resource hierarchy / FACILITY-INTEGRITY-01A canonical labels — consumed, not reimplemented.
- 08-06 Liste operational model + TeamSeason filter — preserved.
- No bulk selection UI.

---

## Testing

| Suite | Focus |
|-------|--------|
| `activity-clipped-detail.test.ts` | Geometry + canonical detail model |
| `sce-planner-ux-08-07-responsive.test.ts` | Shell, Liste, scroll roots, popover, wiring |
| `PlanningHubActivityClippedDetailSurface.test.tsx` | Touch trigger + spacious skip |
| `PlanningHubCalendarClippedDetail.test.tsx` | Kalender runtime hover/focus/aggregate/resize (08-07R1) |
| `activity-clipped-detail-dom.test.ts` | DOM overflow + layoutWidthPx (08-07R1) |
| `sce-planner-ux-08-07r4-training-activity-cancellation.test.ts` | Per-training cancel eligibility (08-07R4) |
| `PlanningHubTrainingActivityCancellation.test.tsx` | Activity-detail cancel + conflict-card exclusion (08-07R4) |
| Existing planner regression | 08-03…08-06 suites (run in CI / local) |

Build: `NODE_OPTIONS=--max-old-space-size=8192 npm run build`

---

## Human UAT 08-07R1

| Result | Detail |
|--------|--------|
| **PASS** | Clipped-detail hover/focus operational on Kalender for individual and aggregate constrained cards; floating detail readable; constrained-card detection works on tested runtime path (PR #805 preview). |

---

## Human UAT finding 08-07R4 — canonical per-training cancellation (activity vs conflict)

| Item | Detail |
|------|--------|
| **Symptom** | R3 placed **Training absagen** on conflict-partner cards (under match identity “Senioren 30+ vs FC Dardania”), implying cancellation of a **match** or tying cancel eligibility to same-team TRAINING/MATCH edges. |
| **R3 semantic gap** | Cancellation is a capability of an **individual TRAINING session**, not of conflicts, matches, or same-team TRAINING+MATCH pairing. |
| **Activity vs conflict** | **Activity actions** (`PlanningHubActivityActions`) live on the selected activity detail pane (aggregate inspection + conflict workspace). **Conflict actions** (`PlanningHubConflictResolutionActions`) remain Spielfeld / Garderobe / Termin / Öffnen only. |
| **Eligibility** | `canCancelTrainingActivity`: `type === TRAINING` + valid `trainingSessionId` + `canManageTrainings`. No conflict, same-team, or match prerequisites. |
| **Match invariant** | MATCH rows never show **Training absagen**; provider/SFV matches are never sent through training PATCH. |
| **Mutation** | Unchanged canonical path: `PATCH /api/training-sessions/[sessionId]` `{ status: "CANCELLED" }` → `cancelTrainingSession`; single occurrence only (confirmation states series unchanged). |
| **Refresh** | `POST /api/planning-hub/planner-revalidate` + `router.refresh()` on success. |
| **R3 cleanup** | Removed `same-team-training-cancellation` offer model and conflict-card cancel UI. |
| **Regression** | `sce-planner-ux-08-07r4-training-activity-cancellation.test.ts`, `PlanningHubTrainingActivityCancellation.test.tsx`. |
| **Human UAT** | Required before close (Michael retest on 7 Oct 2026 aggregate). |

---

## Human UAT finding 08-07R3 — same-team match/training conflict cancellation (superseded by R4)

| Item | Detail |
|------|--------|
| **Symptom** | Aggregated activity inspection correctly surfaced a same-team TRAINING vs MATCH resource/time collision (e.g. Senioren 30+ Training 20:15–21:45 vs Senioren 30+ vs FC Dardania 20:15–22:15) but offered only resource/time handoffs (Spielfeld, Garderobe, Termin, Öffnen) — not the obvious operational fix **Training absagen**. |
| **Canonical identity** | Same-team detection uses **TeamSeason id** only (`WeekplannerTrainingItem.teamSeasonId` vs resolved `WeekplannerMatchItem.teamSeasonId` from the weekplanner read model, including SFV matches where `Event.teamSeasonId` was null at persistence). Display labels are never compared. |
| **Eligibility** | Focal item + conflict partner must be one TRAINING and one MATCH, with overlapping **effective activity times** (`startAt`/`endAt`), plus an existing weekplanner resource conflict edge. |
| **Authorization** | UI shows **Training absagen** only when `canManageTrainings` (same capability gate as training time mutations). Server remains authoritative via `PATCH /api/training-sessions/[sessionId]` (`TRAININGS_MANAGE`). |
| **Canonical mutation** | Reuses TRAININGCENTER-01 single-occurrence cancel: `cancelTrainingSession` → `TrainingSession.status = CANCELLED` for the **session id** on the training item — parent `TrainingSeries` recurrence is untouched. |
| **Confirmation** | Compact elevated dialog (`Training absagen?`) lists training occurrence + conflicting match; **Abbrechen** / **Training absagen** — no mutation on shortcut click alone. |
| **Post-cancel refresh** | `POST /api/planning-hub/planner-revalidate` + `router.refresh()` so aggregate/conflict inspector, counts, and Kalender/Liste read models update without full reload. Audit/notification side effects stay in the canonical training lifecycle service. |
| **Provider invariant** | Only the SCE training occurrence is cancelled; provider-owned matches are never mutated. |
| **Regression** | `sce-planner-ux-08-07r3-same-team-training-cancellation.test.ts`, `PlanningHubSameTeamTrainingCancellation.test.tsx`; existing 08-05 conflict handoff + 08-07 clipped-detail suites remain green. |

---

## Human UAT findings 08-07R2 (pre-close polish)

| Item | Detail |
|------|--------|
| **Info affordance noise** | Permanently prominent info control competed with semantic activity/conflict/selection states. **Fix:** neutral contextual disclosure — subtle on desktop until card hover/focus; discoverable on coarse pointer; keyboard focus unchanged. |
| **Mixed aggregate tooltip semantics** | Example: 9 Trainings + 1 Spiel showed misleading type header (“SPIEL”) and “10 Trainings”. **Fix:** homogeneous clusters keep type-specific headline (`7 Trainings`); mixed clusters use `{n} Aktivitäten` with no single-child type badge; conflict/count lines unchanged. |

---

## Human UAT finding 08-07R1 (release-blocking — resolved)

| Item | Detail |
|------|--------|
| **Symptom** | Kalender cards visibly truncated (parallel lanes, aggregated “N Trainings”, narrow Sunday cards) but hover/focus produced **no** clipped-detail surface on PR #805 preview. |
| **Root cause** | (1) `PlanningHubActivityBlock` derived disclosure geometry from `style.width` / `style.height`; Kalender uses `calc(${lanePercent}% - 4px)` so `parseBlockDimensionPx` fell back to **240×64** and `shouldOfferActivityClippedDetailDisclosure` returned **false** for most constrained cards. (2) `PlanningHubCalendarClusterBlock` (aggregated cards) never integrated `PlanningHubActivityClippedDetailSurface`. (3) Floating-ui hover reference sat on a wrapper **div** while the interactive target is the inner **button** — `pointerenter` does not bubble, so hover never opened even when disclosure was offered. |
| **Runtime paths** | `PlanningHubCalendarView` → `PlanningHubActivityBlock` / `PlanningHubCalendarClusterBlock` → `PlanningHubActivityClippedDetailSurface`. |
| **Correction** | Pass `blockLayoutPx` from calendar lane math; DOM overflow measurement + card-scoped `ResizeObserver`; attach `getReferenceProps()` to the card **button**; aggregate detail via `buildAggregateClippedDetailModel` + same surface (full team list, time, conflicts). |
| **Regression** | `PlanningHubCalendarClippedDetail.test.tsx`, `activity-clipped-detail-dom.test.ts`. |

---

## Human UAT matrix (Michael)

| # | Scenario |
|---|----------|
| A | Desktop Kalender — week grid, parallel activities |
| B | Tablet-width Kalender (~768–1024) — horizontal scroll + sticky headers |
| C | Spielfeld compact width — resource labels + cards |
| D | Garderobe compact width — hierarchy + occupancy bands |
| E | Liste compact width — row hierarchy + filters wrap |
| F | Parallel/clipped activity card |
| G | Mouse hover → full detail |
| H | Keyboard focus → full detail |
| I | Touch info control → full detail |
| J | Row/action menu near viewport edge |
| K | Week navigation / filters / view switcher |
| L | Conflict interaction |
| M | Read-only / permission-gated actions (automated where impersonation blocked) |

---

## Deferred findings

| Id | Notes |
|----|--------|
| **FACILITY-INTEGRITY-01** | Lifecycle propagation (create/rename/archive/delete) — separate package; 08-07 does not implement. |
| **AGGREGATION-01** | Mixed cluster card vs inspector semantics — unchanged. |
| **PEOPLE-ACCESS-IMPERSONATION-01** | No planner workaround. |
| **08-08** | Integration / release UAT gate after 08-07. |
| **SCE-COLLAB-01** | Later. |

---

## Roadmap

| Package | Status |
|---------|--------|
| 08-06 | **CLOSED** (PR #804) |
| **08-07** | **IN PROGRESS** (this branch) |
| 08-08 | **PLANNED** |
