# TRAININGCENTER-UX-03 — Single Training Session SCE Design Rebuild

## Previous UX problems

- Large white form cards inside the dark SCE shell
- Weak hierarchy between back link, title, actions, and form blocks
- Narrow `max-w-[900px]` column with unused horizontal canvas on desktop
- Inconsistent controls (legacy gray borders vs SCE tokens)
- Participation block felt like a separate legacy form tool

## New information architecture

1. **Back link** — lightweight navigation to `/dashboard/training`
2. **Breadcrumbs** — Planung → Trainings → Einzeltraining (i18n)
3. **Compact header** — session title, team/date/time context, «Zur Serie» + Wochenplaner actions
4. **Edit workspace (desktop)** — 12-column grid: ~7–8 cols «Datum & Zeit», ~4–5 cols «Teilnahme»
5. **Resources** — full-width SCE panel below the grid (unchanged business semantics)

## Reused SCE primitives

- `TRAINING_FORM_MAX_WIDTH_CLASS`, `TRAINING_FORM_WORKSPACE_SURFACE_CLASS` from `training-form-layout.ts`
- `fca-input`, `fca-button-primary`, `fca-button-secondary`
- `PageBreadcrumbs`, `TrainingSessionEditHeader` (pattern aligned with series edit header)
- `SectionCard`-style surfaces via training form workspace tokens

## Responsive model

- **Desktop / laptop:** header + 12-col grid (7/5 or 8/4 at xl)
- **Tablet / narrow:** single column in DOM order (date/time → participation → resources)
- `min-w-0` on grid sections; no fixed desktop-only field widths beyond compact time columns

## Business logic preservation

- `getTrainingSession` loader and `requireAnyPermission(TRAININGS_VIEW | TRAININGS_MANAGE)` unchanged
- Reschedule PATCH contract unchanged (`TrainingSessionEditForm`)
- Participation PATCH auto-save unchanged (`ParticipationRequestConfigEditor`)
- Allocation override APIs unchanged
- No schema or migration changes

## Authorization

- Server-side permission gate unchanged; UI `canManage` only disables controls

## i18n & accessibility

- New copy under `TrainingCenter.sessionEdit` in `de`, `en`, `fr`, `it`
- One logical `h1` in the session header; section `h2` for date/time and participation
- Labelled inputs, focus rings on links/buttons, test ids retained for regression tests

## Tests

- `lib/training/__tests__/training-session-edit-presentation.test.ts` — title/context formatting
- `components/admin/training/__tests__/TrainingSessionEditPage.legacy-surfaces.test.ts` — SCE route contract
- Existing TrainingCenter + dashboard deeplink sentinels (R1D/R1E) re-run in CI

## TRAININGCENTER-UX-03R1 — Human visual acceptance remediation

Human visual acceptance **failed** after UX-03: the page was dark but still read as a tall administration form (card stacking, low density, oversized controls).

### Remediation focus

- **Density / composition** — compressed header (single back line + one `h1`), tighter panel padding, `items-start` / `self-start` grid so the schedule column does not stretch beside a taller participation panel
- **Date/time defect** — shared datetime grid + `min-w-[10.5rem]` date input so localized dates do not clip beside the calendar affordance
- **Participation** — compact session-edit layout; secondary helper copy removed from the dense panel
- **Resources** — progressive disclosure: compact current-allocation rows with quiet `Serienstandard` / `Abweichend` badges; picker/search only after **Ändern**; decorative drag handles removed
- **Inheritance** — one section-level intro sentence; per-field/resource explanatory repetition removed
- **Responsive** — lg+ side-by-side schedule + participation; stacked on narrow viewports; resource row wraps state/action below info when needed

DASHBOARD-07R2 remains pending (human visual recheck required after this remediation).
