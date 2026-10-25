# SCE-FINANCE-05G — Reporting Visual Intelligence & Responsive Hardening

| Field | Value |
| --- | --- |
| **Status** | **COMPLETE** — Product Owner visual UAT **PASS** — merge **APPROVED** subject to closure gates |
| **Product Owner visual UAT** | **PASS** |
| **R1** | **NOT REQUIRED** (approved desktop visual result) |
| **PR** | **#914** → **STAGE** |
| **Branch** | `cursor/sce-finance-05g-visual-intelligence-responsive-hardening` |
| **Implementation HEAD** | `c4ec5f2e0ac41597e15eef425a98e700dc30e4d0` |
| **Base** | `STAGE` @ `03670d20` (FIN-05F / PR **#913** contained) |
| **Scope** | Presentation, hierarchy, responsive behaviour, accessibility hardening — **no new financial semantics** |

## Product principle (unchanged)

```text
SIMPLE UNDERSTANDING.
SHALLOW NAVIGATION.
DEEP CAPABILITY.

SCE HANDLES THE COMPLEXITY SO THE USER CAN MAKE THE DECISION.
```

## Accepted visual model (Product Owner)

### Overview hierarchy

```text
FINANCIAL OUTLOOK
→ ATTENTION
→ IMPORTANT VARIANCES
→ EXPECTED FINANCIAL MOVEMENTS
```

### Reporting hierarchy

```text
COMPARATIVE SUMMARY
→ WORAUF ACHTEN
→ MANAGEMENT P&L
→ INVESTIGATION
→ EVIDENCE
```

Desktop responsive presentation shown during PO UAT is **accepted**. Manual browser UAT by engineering agents is **not** part of closure — PO owns visual sign-off.

## Purpose

FIN-05G improves how existing Finance intelligence is perceived, prioritised, compared, scanned, and understood across viewport sizes. FIN-05A–05F semantics remain canonical.

## Visual intelligence lock (post-closure)

| Area | Lock |
| --- | --- |
| **Financial outlook** | Conclusion-first; expected result and forecast-vs-approved-budget interpretation primary; actual remains period/grain-aware context — not a generic KPI dashboard |
| **Attention** | Surfaces exceptions requiring understanding/action; avoid repeated context strips, generic meta commentary, dashboard filler |
| **Important variances** | Bounded, decision-oriented favourable/unfavourable drivers — not giant full-width analytical cards |
| **Reporting comparative summary** | Expected result and forecast-vs-budget variance primary; approved budget and actual supporting context |
| **Management P&L** | Canonical FIN-05C/F semantics — columns **Budget · Actual · Current Forecast · Variance**; financial meaning unchanged |
| **Investigation** | FIN-05E account/group investigation remains the single drill-down mechanism |
| **Expected financial movements** | **Discrete event timeline** — not a liquidity graph (see boundary below) |

## Expected financial movements vs liquidity (architectural boundary)

**EXPECTED FINANCIAL EVENT TIMELINE ≠ LIQUIDITY GRAPH.**

The Finance Overview timeline answers: *What financial movements are expected, and when?*

| Allowed | Forbidden in FIN-05G / Overview |
| --- | --- |
| Discrete events (point markers, bounded intervals) | Connecting discrete events with a line to imply a graph |
| Unscheduled amounts surfaced separately | Running balance, liquidity, accounting recognition inference |
| Presentation window trim (lead empty days) | Fake monthly phasing, synthetic intermediate values |

Future **FIN-09** continuous liquidity may use line / subtle area visualization only when SCE has authoritative cash-flow semantics:

```text
projected cash balance(t)
= opening liquidity
+ cumulative cash inflows through t
− cumulative cash outflows through t
```

FIN-09 may communicate opening liquidity, projected balance, peaks/troughs, zero crossings, and drill-down to cash events — **none of this belongs in FIN-05G**.

Annual budget or current forecast must **not** be divided into months to fabricate liquidity. Expected events without sufficient cash timing evidence must not be treated as precisely timed liquidity. Accounting recognition and cash timing remain separate concepts.

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
- Events remain discrete (stems/intervals); **no line chart**.
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
| Continuous value through time | **Not in FIN-05G** — reserved for FIN-09 when liquidity semantics exist |
| Discrete financial events | Overview timeline preserved |
| Category magnitude | Tables / lists only |
| Variance contribution | Ranked list / attention drivers only |

## Responsive model (automated lock)

| Viewport | Behaviour |
| --- | --- |
| Wide / standard desktop | Calm wide layouts; bounded attention/driver width; no unnecessary stretching; P&L readable |
| Tablet | Investigation affordances usable; adequate touch targets; comparative hierarchy intact |
| Mobile | Progressive disclosure; financial meaning available without every desktop column at once; timeline chronological; no page-level horizontal overflow |

## Accessibility

- Semantic headings preserved; favourability text remains alongside color.
- Driver investigation buttons retain `aria-label`.
- Table semantics unchanged; keyboard focus rings on interactive drivers.

## Architecture boundaries

All changes are React presentation / read-model display only. No new reporting queries, variance engines, or React-side financial calculations.

FIN-05G must **not** introduce: generic BI, liquidity/cash/bank semantics, statutory accounting, publication/sharing (FIN-06), source editing, new forecasting/scenario engines, new financial hierarchy, or new infrastructure.

## Semantic integrity (unchanged)

| Measure | Role |
| --- | --- |
| Approved budget | Governance baseline |
| Actual | Recorded reality with authoritative period/grain |
| Current forecast | Organisation-owned expectation |
| Automatic forecast | Separate system-generated projection |
| Scenario | Hypothetical alternative |
| Primary comparison | Current forecast vs approved budget |
| Actual YTD vs annual budget | Context only unless period compatibility exists |

No fake monthly phasing. No `Date.now()` as financial cutoff authority. Missing ≠ zero. Restricted ≠ zero.

## Validation

Focused guards: `lib/finance/__tests__/finance-05g-visual-intelligence-responsive-hardening.test.ts`  
Component coverage: `FinanceManagementPnlPanel.test.tsx` (comparative summary + mobile disclosure).

## Binary control

`NEW_BINARY_CHECKBOXES = 0` — no binary checkboxes introduced in FIN-05G.

## Next

**FIN-05H** — Release hardening & closure (**NEXT / NOT STARTED**). Do not conflate FIN-05H scope with FIN-05G visual work.
