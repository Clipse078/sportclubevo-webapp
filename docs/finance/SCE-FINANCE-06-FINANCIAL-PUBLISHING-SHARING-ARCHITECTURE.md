# SCE-FINANCE-06 — Financial Publishing & Sharing

| Field | Value |
| --- | --- |
| **Programme** | FIN-06 — Financial Publishing & Sharing |
| **Package** | **FIN-06A** — Publishing & Sharing Architecture Foundation |
| **Status** | **FIN-06A IMPLEMENTED** — architecture, permissions, additive persistence, foundation UI, automated gates |
| **Predecessor** | **FIN-05 COMPLETE / RELEASE CLOSED** (PR **#915** → **STAGE**) |
| **Architecture contract** | `lib/finance/publishing/finance-publishing-sharing-architecture-contract.ts` |
| **Tests** | `lib/finance/__tests__/finance-06a-publishing-sharing-architecture.test.ts` |
| **Foundation route** | `/dashboard/finance/publishing` |

## Purpose

FIN-06 answers a different question from FIN-05:

| Programme | Question |
| --- | --- |
| **FIN-05** | What do the current financial sources tell us? |
| **FIN-06** | What financial information has the organisation intentionally shared or formally published, with whom, and in what approved state? |

```text
COMPLEXITY SHOULD EXIST IN THE SYSTEM, NOT IN THE USER'S HEAD.
SIMPLE UNDERSTANDING. SHALLOW NAVIGATION. DEEP CAPABILITY.
```

**LOCK:** Financial data, live reports, shares, and publications are **distinct concepts**. Do not collapse them into one generic “report” entity.

## Conceptual model

### A. Source financial data

Canonical operational sources remain owned by FIN-01…FIN-05 (structure, approved budget, actual, current forecast, automatic forecast, scenarios, expected financial events, FIN-05 read models). FIN-06 **consumes** these sources; it is **not** source authority.

### B. Live report / live view

A FIN-05 analytical surface generated from **current** canonical source data. It may change as sources change. This is **not** a publication. Primary live workspace: `/dashboard/finance/reports`.

### C. Share

A controlled access mechanism allowing an authorised audience to view specified financial information. A share **may** reference a live/current view when policy permits — **live share may reflect current data**. Sharing does **not** automatically imply immutable publication. Persistence foundation: `FinanceFinancialShare`.

### D. Publication

A formal, approved, **versioned** financial output representing the financial state intentionally published at a specific point in time.

**LOCK:** Published financial report = **versioned, auditable snapshot of approved reporting scope**.

A publication **must not** silently change because actual, forecast, budget, structure labels, hierarchy, or later corrections change. Corrections require a **new publication/version**. Persistence foundation: `FinancePublication` + `FinancePublicationVersion`.

## Snapshot authority (FIN-06A decision)

Publication reads must not reconstruct historical meaning from mutable live domain state on every request (SCE-SCALE-01 alignment).

| Principle | Decision |
| --- | --- |
| Snapshot content | Canonical financial/reporting **semantics** — not React presentation state |
| Schema version | `sce.finance.publication.snapshot.v1` (`FinancePublicationSnapshotPayloadV1`) |
| Minimum payload | Tenant/publication identity, version, title, reporting period/scope, currency, timestamps, publisher, approval/audience policy, source reference metadata, hierarchy labels, totals, comparative measures, explanatory metadata |
| Scope | **Does not** duplicate the entire Finance database |
| Serving | Prepare bounded snapshot once at publication time; serve stored snapshot on repeat reads |

Full field list: `FINANCE_PUBLICATION_SNAPSHOT_AUTHORITY` in the architecture contract.

## LIVE SHARE vs publication (release-critical)

| | Live share | Publication |
| --- | --- | --- |
| Data | May track **current** authorised reporting | **Immutable** snapshot |
| Evolution | May evolve with source data | Does not silently evolve |
| Access | May be revoked / expire | Historical versions remain auditable |
| UX | Must be labelled **live/current** where surfaced | Must be labelled **published** — never present live share as formal publication |
| Withdrawal | Revocation does not rewrite historical publication meaning | Supersession creates new version; old remains auditable |

Architecture guards: `FINANCE_LIVE_SHARE_VS_PUBLICATION_GUARDS`.

## Permissions

**LOCK:** VIEW ≠ SHARE ≠ PUBLISH.

| Capability | Canonical key |
| --- | --- |
| View financial reports (live) | `finance.view` |
| View publication history | `finance.publication.view` (requires `finance.view`) |
| Share financial reports | `finance.reporting.share` |
| Publish financial reports | `finance.reporting.publish` |
| Manage / revoke shares | `finance.share.manage` |

Checks are **server authoritative**. No role-name hardcoding (President, Treasurer, etc.). Restricted states must not leak totals or scope through metadata, previews, or errors (`finance-publishing-restricted-state.ts`).

## Audience model

Minimum canonical audience classes (extensible via policy, not FCA-specific):

- `INTERNAL_AUTHENTICATED`
- `SPECIFIC_USERS`
- `SPECIFIC_ROLES`
- `ORGANISATION_MEMBERS`
- `LINK_RESTRICTED`
- `PUBLIC`

**Who** may access is separate from **what** financial scope they may access.

## Disclosure / publishing policy

Tenant-configurable boundary (`FinanceDisclosurePolicy`): permission-aware, audience-aware, scope-aware, privacy-aware, country-informed via **adapters** — **never country-hardcoded** in FIN-06 core.

FIN-06A establishes persistence and architecture only — **not** a full policy engine.

## Reporting scope

Shares and publications require explicit scope (finance year, report type, optional groups/accounts, measure inclusion, comparison basis, hierarchy detail). Bounded FIN-05 reporting surfaces only — **no generic BI / report builder**.

Validation: `assertFinancePublishingReportingScope`.

## Publication lifecycle

Canonical statuses: `DRAFT`, `READY`, `PUBLISHED`, `SUPERSEDED`, `REVOKED`.

Semantics: preparation ≠ publication; published snapshot immutable; supersession preserves audit; revocation/withdrawal does not rewrite historical meaning; casual deletion of audit history forbidden.

Transitions: `assertFinancePublicationLifecycleTransition`.

## Auditability

Preserve creator, publisher/approver, timestamps, scope, version, source semantic version, audience/disclosure state, supersession/revocation history. No credentials or unnecessary PII in audit payloads.

## Sharing security (architecture)

- Secure random tokens; store **hashes** (`finance-share-link-token.ts`)
- Tenant-scoped lookups; revocation; avoid enumeration
- No sensitive financial state in URL parameters
- No financial metadata before authorization
- Complete public sharing UX deferred beyond FIN-06A

## Design direction (FIN-06 onward)

Respect **FINANCE_VISUAL_BENCHMARK** (Szenarien + Zeitplanung): design **grammar**, not identical layouts. FIN-06A foundation UI uses Finance workspace surfaces without card-soup admin dashboards. **SCE-DESIGN-02 not started.**

## Persistence (FIN-06A additive)

| Model | Role |
| --- | --- |
| `FinanceDisclosurePolicy` | Tenant policy boundary |
| `FinancePublication` | Publication container + lifecycle |
| `FinancePublicationVersion` | Immutable snapshot versions |
| `FinanceFinancialShare` | Live share foundation |

Migration: `20261025140000_sce_finance_06a_publishing_sharing_foundation`.

## FIN-06 package plan (remainder)

| Package | Focus |
| --- | --- |
| **06A** | Architecture foundation (**this package**) |
| **06B** | Publication snapshot & versioning |
| **06C** | Controlled live sharing |
| **06D** | Publication governance & history |
| **06E** | Distribution / export surfaces |
| **06F** | Privacy, audience & policy hardening |
| **06G** | UX / responsive / release hardening |
| **06H** | Programme closure |

## Boundaries

| Area | Owner |
| --- | --- |
| FIN-05 source & live reporting | FIN-05 (unchanged authority) |
| FIN-07 commitments | NOT STARTED |
| FIN-08 receivables | NOT STARTED |
| FIN-09 liquidity | NOT STARTED |
| FIN-10 funds/grants | NOT STARTED |
| FIN-11 statutory accounting | NOT STARTED |
| Generic BI | Forbidden in FIN-06 core |

## FIN-06A out of scope

Complete publishing UI, complete live sharing UI, PDF/email/notifications, statutory statements, liquidity, accounting journal, generic BI, SCE-DESIGN-02, FIN-06B onward implementation.

## Validation

Run on feature branch:

- `npm run test -- lib/finance/__tests__/finance-06a-publishing-sharing-architecture.test.ts`
- FIN-05 regression suites under `lib/finance/__tests__/`
- Finance architecture / tenant isolation guards
- `npm run test:design-system`
- Changed-path ESLint
- `NODE_OPTIONS=--max-old-space-size=8192 npm run build`
- Permissions apples-to-apples: `npm run test -- lib/permissions`

## Result

```text
FIN-06A — FINANCIAL PUBLISHING & SHARING ARCHITECTURE FOUNDATION
IMPLEMENTED · AUTOMATED GATES PASS · PR OPEN · PRODUCT OWNER REVIEW PENDING
```
