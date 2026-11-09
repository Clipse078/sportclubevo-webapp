# SCE-DS2-05B — White surface & contrast hardening

| Field | Value |
| --- | --- |
| **Package** | `SCE-DS2-05B` |
| **Predecessor** | `SCE-DS2-05A` (merged PR #942) |
| **Successor** | `SCE-DS2-06` — module sweeps (do not start in this package) |
| **Target branch** | `STAGE` |
| **Theme hook** | `[data-sce-theme="white"]` + `SCE_WHITE_EDITION` |

## Objective

Complete the White Edition iteration across authenticated dense UI: pure white panels, readable text, and shared functional surfaces (forms, tables, dialogs, dashboard cockpit) without altering dark-default behaviour when the flag is off.

## Delivered

1. **Dashboard cockpit** — `.sce-dashboard-cockpit-card` moves dark glass to CSS; white theme uses flat white cards (`--sce-color-surface-standard`).
2. **Functional surfaces** — `sce-functional-surface-styles.ts` white-first inner rows/chips; theme-scoped CSS for badges and hovers.
3. **Global primitives** — white overrides for integrated lists, surface utilities, form placeholders/disabled states, data-table shells, dialog variants, decorative card accent bars hidden.
4. **Contrast** — extended `SCE_WHITE_EDITION_CONTRAST_PAIRS`; violet dashboard icon accent darkened for AA on white.
5. **Automation** — `sce-ds2-05b-white-surface-contrast.test.ts` + contrast matrix; governance suites unchanged for dark default.

## Acceptance

| Check | Expected |
| --- | --- |
| Flag off | Dark v1.0 glass cockpit + navy canvas (05A baseline) |
| Flag on | White cockpit cards, white form fields, readable placeholders |
| DS-08 dense tests | PASS |
| DS2-01 / 05A tests | PASS |
| Build + typecheck + eslint (changed files) | PASS |

## Out of scope

- DS2-06 per-module migrations
- Infoboard / kiosk shells
- Production env auto-enable
