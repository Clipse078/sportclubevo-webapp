# Migration roadmap — DS 2.0 White Edition

## Migration approach comparison

### Approach A — Incremental shared-component migration (RECOMMENDED)

| Pros | Cons |
| --- | --- |
| Smaller PRs; continuous STAGE deliverability | Temporary dual-theme pockets |
| Activity/nav primitives prove white tokens early | Requires discipline on exceptions registry |
| Aligns with DS-10/11 governance and 479 dark-dependent files | Longer calendar to full coverage |

### Approach B — Global foundation first, then module migrations

| Pros | Cons |
| --- | --- |
| Single token flip | High regression blast radius |
| Theoretical consistency day one | SSR/hydration + arbitrary Tailwind classes break silently |
| | Hard to UAT 201 dashboard routes at once |

**Recommendation:** **Approach A** — sequence below. Flip `:root` defaults only after activity cards + nav contracts have white-theme test coverage (`08-risk-and-regression-matrix.md`).

---

## Executable packages

### P0 — `SCE-DS2-00` (this package)

| Field | Value |
| --- | --- |
| **Objective** | Audit + architecture documentation |
| **Scope** | `docs/design-system-v2/*` only |
| **Dependencies** | None |
| **Acceptance** | PO review of nine docs; governance CLI unchanged PASS |
| **Automated coverage** | `scripts/run-design-system-governance.ts` |
| **Complexity** | M |
| **Exclusions** | No production CSS/components |

---

### P1 — `SCE-DS2-01` White foundation tokens

| Field | Value |
| --- | --- |
| **Objective** | Introduce white-edition semantic token values + `[data-sce-theme="white"]` or default flip behind flag |
| **Scope** | `app/globals.css`, `lib/design-system/sce-foundation-contract.ts`, functional surfaces |
| **Dependencies** | `SCE-DS2-00` accepted |
| **Acceptance** | Contrast matrix pass; functional panels visible; feature flag `SCE_WHITE_EDITION` default off until PO |
| **Automated coverage** | `sce-design-system-02-foundations.test.ts`, new contrast unit tests |
| **Complexity** | L |
| **Exclusions** | Infoboard, CMS, email |

---

### P1 — `SCE-DS2-02` Typography roles + `SceTeamName`

| Field | Value |
| --- | --- |
| **Objective** | Display/body role tuning; ship `SceTeamName` primitive |
| **Scope** | `components/design-system/typography/`, sporting-activity identity lines, team admin high-traffic views |
| **Dependencies** | `SCE-DS2-01` (or parallel if flag isolates) |
| **Acceptance** | Team name matrix in doc 02 contexts ≥80% on canonical paths |
| **Automated coverage** | New primitive tests + rollout tests updated |
| **Complexity** | L |
| **Exclusions** | Stored data transforms |

---

### P1 — `SCE-DS2-03` Uppercase icon-free navigation

| Field | Value |
| --- | --- |
| **Objective** | Nav labels uppercase; remove decorative nav icons |
| **Scope** | `AdminSidebar.tsx`, `globals.css` `.sce-nav-*`, motion CSS optional deprecation |
| **Dependencies** | `SCE-DS2-01` |
| **Acceptance** | Sidebar tests; keyboard focus unchanged; utilities icons remain |
| **Automated coverage** | `AdminSidebar.test.tsx`, `AppShellNavigation.sce-icons-02.test.tsx` (update) |
| **Complexity** | M |
| **Exclusions** | `SceIcon` registry deletion (still used operationally) |

---

### P1 — `SCE-DS2-04` Activity card white refresh

| Field | Value |
| --- | --- |
| **Objective** | White shells + benchmark hierarchy for four `Sce*Card` variants |
| **Scope** | `components/sporting-activity/*`, semantic tokens, preview pages |
| **Dependencies** | `SCE-DS2-01`, `SCE-DS2-02` |
| **Acceptance** | sce-ui-rollout-01d–g pass; preview routes visually signed PO |
| **Automated coverage** | Existing sporting-activity + DS-10-r2 temporal tests |
| **Complexity** | XL |
| **Exclusions** | Infoboard cards |

---

### P2 — `SCE-DS2-05` Shared UI primitives on white

| Field | Value |
| --- | --- |
| **Objective** | Tables, dialogs, forms, dense UI on white surfaces |
| **Scope** | `lib/design-system/sce-functional-surface-styles.ts`, `SceWorkspaceChrome` |
| **Dependencies** | `SCE-DS2-01` |
| **Acceptance** | DS-08 dense tests pass; no horizontal overflow |
| **Automated coverage** | `sce-design-system-08-dense-ui.test.ts` |
| **Complexity** | L |

---

### P2 — `SCE-DS2-06` Module sweeps

| Field | Value |
| --- | --- |
| **Objective** | Planning Hub, Matchcenter rows, dashboard, finance, members |
| **Scope** | Parallel cards migrated per inventory doc 02 |
| **Dependencies** | `SCE-DS2-04`, `SCE-DS2-05` |
| **Acceptance** | Module PO sign-off per domain |
| **Automated coverage** | Domain test suites (planning-hub, matchcenter, etc.) |
| **Complexity** | XL |
| **Exclusions** | One-off scripts |

---

### P2 — `SCE-DS2-07` Consistency, a11y, governance closure

| Field | Value |
| --- | --- |
| **Objective** | Exception registry update; axe/pa11y spot suite; remove `fca-*` from admin |
| **Scope** | `sce-design-system-exception-registry.ts`, docs |
| **Dependencies** | `SCE-DS2-06` |
| **Acceptance** | Governance PASS; documented exceptions only infoboard/CMS |
| **Automated coverage** | Full governance + DS-11 tests |
| **Complexity** | M |

---

### LATER — `SCE-DS2-TENANT-STUDIO`

| Field | Value |
| --- | --- |
| **Objective** | Tenant-facing brand colour configuration UI |
| **Scope** | Admin branding, persistence, contrast validation |
| **Dependencies** | `SCE-DS2-01`, `06-tenant-branding-architecture.md` |
| **Acceptance** | PO Brand Studio UAT |
| **Automated coverage** | Contrast unit + API tests |
| **Complexity** | L |
| **Exclusions** | Arbitrary CSS injection |

---

## Recommended sequence

```text
SCE-DS2-00 (audit)
  → SCE-DS2-01 (foundation + flag)
  → SCE-DS2-02 ∥ SCE-DS2-03 (typography + nav)
  → SCE-DS2-04 (activity cards)
  → SCE-DS2-05 → SCE-DS2-06 → SCE-DS2-07
  → SCE-DS2-TENANT-STUDIO (LATER)
```

## Governance updates required

- Amend `docs/design/SCE-DESIGN-SYSTEM.md` with White Edition programme pointer when `SCE-DS2-01` starts.
- Add governance rule for raw navy hex in new components (optional `SCE-DS-GOV-SURFACE-002`).
