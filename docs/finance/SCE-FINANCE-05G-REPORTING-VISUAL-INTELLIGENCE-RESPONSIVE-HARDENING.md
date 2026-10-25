# SCE-FINANCE-05G — Reporting Visual Intelligence & Responsive Hardening

| Field | Value |
| --- | --- |
| **Status** | **IMPLEMENTED** — Product Owner visual UAT **PENDING** |
| **Branch** | `cursor/sce-finance-05g-visual-intelligence-responsive-hardening` |
| **Base** | `STAGE` @ `03670d20` (FIN-05F / PR #913 contained) |
| **Scope** | Presentation, hierarchy, responsive behaviour, accessibility hardening — **no new financial semantics** |

## Purpose

FIN-05G improves how existing Finance intelligence is perceived, prioritised, compared, scanned, and understood across viewport sizes. FIN-05A–05F semantics remain canonical.

## Visual audit (pre-change)

| Surface | Findings |
| --- | --- |
| **Overview** | Strong conclusion-first outlook; drivers and timeline used heavy functional cards; attention items repeated dense context strips; driver columns stretched on wide desktop. |
| **Reporting** | Approved flow (summary → attention → P&L → investigation) but comparative summary used four equal grid columns; driver pair separated by full workspace width. |
| **Budget / Actual / Forecast / Timing / Structure / Settings** | Not redesigned wholesale; shared surface tokens already present via `finance-workspace-surfaces.ts`. |

Cross-cutting: border/card repetition on Overview attention + drivers; money typography consistent in formatters but hierarchy uneven between summary and tables; mobile P&L hid Actual column without inline fallback.

## Changes made

### Reporting comparative summary

- New shared `FinanceComparativeSummarySection` (`data-finance-comparative-summary`).
- **Expected result** and **forecast vs budget variance** lead in a primary column; **budget** and **actual** read as supporting context.
- Preserves all FIN-05F labels and semantic markers (`data-finance-comparative-primary-variance`, grain explanation, actual evidence).

### “Worauf achten” / attention

- Bounded driver grid (`max-w-2xl`, two-column on `sm+`) so favourable/unfavourable drivers stay visually paired on wide desktop.
- Shared layout tokens in `finance-comparative-attention-layout.ts`.
- Max-three insight model unchanged; no duplicate “Wesentliche Abweichungen” section.

### Management P&L

- Mobile progressive disclosure: account rows expose actual + variance under the name (`data-finance-pnl-mobile-measure`) while full matrix columns remain on `md+`.
- Root panel marks `data-finance-responsive-root` + `overflow-x-hidden`.

### Finance Overview

- Attention block: single summary strip with titled header instead of three separate context strips.
- Drivers: summary strip surface + bounded driver grid (aligned with Reporting).
- Untimed footer: subtle dense inset instead of detached border-only footer.
- Responsive root overflow guard.

### Expected-event timeline

- Presentation-only window trim when ≥21 days empty lead before first event (`resolveFinanceOverviewEventTimelinePresentationWindow`).
- Events remain discrete (stems/intervals); no line chart.
- `data-finance-overview-timeline-trimmed` when lead trimmed.

### Investigation sheet

- Interpretation sentence hierarchy strengthened (`text-base font-semibold`); semantics unchanged.

### Shared primitives

- `finance-money-typography.ts` — canonical amount hierarchy classes.
- `finance-comparative-summary-section.tsx` — comparative summary UI.
- `finance-comparative-attention-layout.ts` — attention driver layout.

## Deliberately not made

- No variance contribution chart (existing two-driver attention model retained).
- No new settings or binary checkboxes.
- No liquidity, statutory accounting, publication, generic BI, or source-editing surfaces.
- No wholesale redesign of Budget, Actual, Forecast, Timing, Structure, Settings workspaces.

## Visual grammar compliance

| Pattern | Treatment |
| --- | --- |
| Continuous value through time | Not introduced in 05G |
| Discrete financial events | Overview timeline preserved |
| Category magnitude | Tables / lists only |
| Variance contribution | Ranked list / attention drivers only |

## Responsive model

| Viewport | Behaviour |
| --- | --- |
| Wide / standard desktop | Bounded attention/driver width; comparative summary two-zone layout |
| Tablet | Same components; touch targets preserved on driver investigation buttons |
| Mobile | P&L actual/variance inline; timeline chronological list; sheet width caps unchanged |

## Accessibility

- Semantic headings preserved; favourability text remains alongside color.
- Driver investigation buttons retain `aria-label`.
- Table semantics unchanged; keyboard focus rings on interactive drivers.

## Architecture boundaries

All changes are React presentation / read-model display only. No new reporting queries, variance engines, or React-side financial calculations.

## Validation

Focused guards: `lib/finance/__tests__/finance-05g-visual-intelligence-responsive-hardening.test.ts`  
Component coverage: `FinanceManagementPnlPanel.test.tsx` (comparative summary + mobile disclosure).

## Next

**FIN-05H** — not started (await programme definition).
