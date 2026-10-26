# SCE-FINANCE-06 — Financial Publishing & Sharing

| Field | Value |
| --- | --- |
| **Programme** | FIN-06 — Financial Publishing & Sharing |
| **Package** | **FIN-06A** complete; **FIN-06B** — Publication Snapshot & Versioning |
| **Status** | **FIN-06A COMPLETE / PO APPROVED** (PR **#916** → **STAGE**); **FIN-06B COMPLETE / PO APPROVED** (PR **#917** → **STAGE**); **FIN-06B-R7 FINAL CLOSURE PASS**; **FIN-06C PDF / EXPORT COMPLETE / PO APPROVED** (PR **#918** → **STAGE**); **FIN-06C controlled sharing & email distribution NOT STARTED**; **FIN-06 programme IN PROGRESS** |
| **Predecessor** | **FIN-05 COMPLETE / RELEASE CLOSED** (PR **#915** → **STAGE**) |
| **Closure branch** | `cursor/sce-finance-06a-publishing-sharing-architecture-48cd` |
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

**LOCK:** Financial **data**, **live reports**, **publications**, **shares**, and **distributed artifacts** are **distinct concepts**. Do not collapse them into one generic “report” entity.

A **publication** is a **versioned, immutable, auditable snapshot** of an approved reporting state.

**Publishing does not mean:** merely opening another copy of the live Erfolgsrechnung; exporting the current report without preserving its state; or rebuilding an old publication from current Finance data.

**Publishing means:** `LIVE REPORT → PUBLISH → IMMUTABLE OFFICIAL VERSION`.

FIN-06B establishes that immutable official-version foundation. The complete user-facing outcome (`LIVE REPORT → PUBLISH → OFFICIAL VERSION → DISTRIBUTE`) is intentionally completed in **FIN-06C** — publication without useful distribution/export remains infrastructure, not the full product value.

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

### Audience complexity guard (FIN-06A lock)

**DOMAIN DEPTH ≠ USER-FACING COMPLEXITY.**

The canonical audience model may support sophisticated access policy internally. Future UX must **not** require ordinary users to understand low-level permission architecture. Translate policy into a small, understandable decision set appropriate to context (for example *Intern*, *Bestimmte Personen*, *Link teilen*, *Öffentlich* — illustrative only, **not** canonical labels for FIN-06A).

Do **not** expose all audience enum values mechanically in a dropdown simply because the domain supports them.

```text
COMPLEXITY SHOULD EXIST IN THE SYSTEM, NOT IN THE USER'S HEAD.
```

## UX terminology guard (FIN-06 onward)

Existing Finance terminology already distinguishes:

| Label | Meaning | FIN-06 role |
| --- | --- | --- |
| **Berichte** | Financial reporting / analysis | UNDERSTAND / ANALYSE (FIN-05 live workspace) |
| **Freigaben** | Approvals / financial decision approvals | APPROVE / GOVERN DECISIONS — **not** report sharing |
| **Teilen** | (future) Distribution / controlled sharing of **published** artifacts | **FIN-06C** — not FIN-06B |
| **Veröffentlichungen** | Formal versioned publication history | **FIN-06B** (inspection); distribution actions **FIN-06C** |

Do **not** casually reuse **Freigaben** to mean report sharing. This is an information-architecture guard for later FIN-06 packages — FIN-06A did **not** redesign navigation or expose Teilen / Veröffentlichungen product UI.

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

## Product Owner UAT (FIN-06A closure)

| Gate | Result |
| --- | --- |
| **FIN_06A_PO_UAT** | **PASS** |

Surfaces reviewed: Finance → Einrichtung; Finance capability configuration; Finance navigation; Finance → Berichte / Erfolgsrechnung; comparative reporting summary; attention/variance presentation; P&L/account presentation.

| Finding | Result |
| --- | --- |
| **BLOCKING_VISUAL_DEFECTS** | **NONE** |
| **FIN_05_VISUAL_REGRESSION** | **NONE OBSERVED** |
| **PREMATURE_PUBLISHING_UI** | **NONE** — no Teilen, Veröffentlichungen, publication/sharing/audience/public-link management workspace exposed prematurely |
| **ARCHITECTURE_UI_BOUNDARY** | **PASS** — FIN-06A remained architecture/foundation; Finance navigation coherent |

Manual browser UAT by engineering agents is **not** part of closure — Product Owner owns visual sign-off.

## FIN-06B — publication snapshot & versioning (implemented)

**FIN-06B-R3 (2026-10-25):** Designated STAGE required migration
`20261025140000_sce_finance_06a_publishing_sharing_foundation` before Preview publication
persistence. R3 adds bounded German publication action errors, explicit success/inspection UX,
and automated end-to-end publication execution coverage.

**FIN-06B-R4 — published report inspection & discoverability (PO visual UAT = PASS, 2026-10-25):**
Product Owner verified on designated STAGE / PR **#917** Preview: **Veröffentlichungen** on Finance
→ Berichte; Version **1** discoverable and reopenable; inspection shows frozen Management P&L (not
metadata-only). Version 1 baseline (**FY 2026**, Management P&L / Erfolgsrechnung): Expected /
Forecast result **161'533 CHF**; Approved Budget **150'000 CHF**; Actual **7'776 CHF**; Forecast vs
Budget **+11'533 CHF** favorable. Representative stored lines (historical — do not mutate Version
1): Mitgliedsbeiträge Forecast **212'694**; total income Forecast **262'694**; total expenses
Forecast **101'161**; Personal / Betrieb / Weitere Einnahmen / Beispiel X as captured at
publication. R4 engineering: presentation read model from `snapshotPayloadJson` only; no live
FIN-05 rebuild on historical reads.

**FIN-06B-R5 — immutability checkpoint (PO visual UAT = PASS, 2026-10-25):** After controlled STAGE
mutation of **Current Forecast** (Mitgliedsbeiträge **212'694 → 213'694 CHF**), Product Owner
confirmed Version **1** still shows **161'533 / +11'533 / 212'694** while live reporting shows
**162'533 / +12'533 / 213'694**. Version 1 did **not** follow the live mutation. Guarded operator
script: `scripts/sce-finance-06b-r5-stage-immutability-uat.ts`. Automated proof:
`lib/finance/__tests__/finance-06b-r5-immutability.test.ts`.

**FIN-06B-R6 — Version 2 UAT (PO visual UAT = PASS, 2026-10-25):** Product Owner created
**Version 2** through **Finance → Berichte → Veröffentlichen** (UI: *Veröffentlichung erstellt* /
*Version 2 ist als feste Momentaufnahme verfügbar*). Version 2 captures live state B (**162'533** /
**+12'533** / **213'694** Mitgliedsbeiträge; total income **263'694**; total expenses **101'161**).
Version **1** remains state A (**161'533** / **+11'533** / **212'694**). Instructions:
`docs/finance/SCE-FINANCE-06B-R6-PO-VERSION-2-UAT.md`. Prep script:
`scripts/sce-finance-06b-r6-stage-version2-uat-prep.ts`. Versioning contract:
`lib/finance/__tests__/finance-06b-r6-versioning-contract.test.ts`.

**FIN-06B-R7 — final closure (PO visual UAT = PASS, 2026-10-25):** Product Owner **Michael**
completed the full A→B→V2 immutability walkthrough. Closure evidence:
`docs/finance/SCE-FINANCE-06B-R7-FINAL-CLOSURE.md`. STAGE inspect-only verification:
`scripts/sce-finance-06b-r7-stage-publication-closure-verify.ts`. Contract:
`FINANCE_06B_R7_RELEASE_CLOSURE` in `finance-publishing-sharing-architecture-contract.ts`.

| FIN-06B final gate | Result |
| --- | --- |
| **FIN-06B FINAL PRODUCT OWNER VISUAL UAT** | **PASS** |
| **FIN-06B PUBLICATION IMMUTABILITY** | **PASS** |
| **FIN-06B VERSIONING** | **PASS** |
| **PR #917** | **READY TO MERGE** (when automated release gates green) |

```text
FIN-06B FINAL PRODUCT OWNER VISUAL UAT = PASS
FIN-06B PUBLICATION IMMUTABILITY = PASS
FIN-06B VERSIONING = PASS
```

First vertical slice: **Management P&L / Erfolgsrechnung** for one finance year (`MANAGEMENT_PNL` scope).

| Concern | Implementation |
| --- | --- |
| Snapshot schema | `sce.finance.publication.snapshot.v1` — `build-finance-publication-snapshot-v1.ts` |
| Source authority | `loadFinanceManagementPnlReadModel` (FIN-05) — **no duplicated P&L engine** |
| Capture / persist | `publishFinanceManagementPnlSnapshot` — `finance-publication-service.ts` |
| Versioning | `FinancePublication` lineage + monotonic `FinancePublicationVersion.versionNumber` per publication; prior `PUBLISHED` → `SUPERSEDED` |
| Immutability | Published `snapshotPayloadJson` is read-only; corrections require a new version |
| Read path | `loadFinancePublicationVersionSnapshot` serves **stored JSON only** — no live FIN-05 re-run |
| Presentation | `buildFinancePublishedManagementPnlInspectionReadModel` — snapshot → read-only UI (R4) |
| Discoverability | **Veröffentlichungen** on reports workspace when history exists (R4) |
| Permissions | Publish: `finance.reporting.publish`; inspect history: `finance.view` + `finance.publication.view`; VIEW/SHARE ≠ PUBLISH |
| Tenant isolation | All queries scoped by `tenantId`; foreign IDs → safe not-found |
| Audit metadata | `publishedByUserId`, `publishedAt`, `versionNumber`, `sourceMetadataJson`, `snapshotSchemaVersion` |
| UI slice | `/dashboard/finance/reports` — **Veröffentlichen** + **Veröffentlichungen** + inspection sheet (no sharing/export/approval) |

Automated immutability proof: `lib/finance/__tests__/finance-06b-publication-snapshot-versioning.test.ts`.
R4 guards: `lib/finance/__tests__/finance-06b-r4-publication-inspection.test.ts`.
R5 acceptance flow: `lib/finance/__tests__/finance-06b-r5-immutability.test.ts`.
R6 versioning contract: `lib/finance/__tests__/finance-06b-r6-versioning-contract.test.ts`.

### FIN-06C — published artifacts & distribution (in progress)

**FIN-06C PDF / export slice — final closure (PO visual UAT = PASS, 2026-10-26):** Product Owner **Michael** approved the locked publication PDF design through **R5R3R1** (baseline commit **`3c6f169f`**). On-demand PDF from immutable snapshot only; tenant-primary branding; actual-draw geometry/collision guards; V1/V2 immutability preserved. Closure evidence: [`SCE-FINANCE-06C-PDF-EXPORT-FINAL-CLOSURE.md`](SCE-FINANCE-06C-PDF-EXPORT-FINAL-CLOSURE.md). Contract: `FINANCE_06C_PDF_EXPORT_RELEASE_CLOSURE`.

| FIN-06C PDF / export gate | Result |
| --- | --- |
| **FIN-06C PDF / EXPORT PO VISUAL UAT** | **PASS** |
| **IMMUTABILITY / snapshot-only PDF path** | **PASS** |
| **PR #918** | **MERGE AUTHORIZED** when automated closure gates green |

**FIN-06C-R1 (PDF artifact):** **COMPLETE / PO APPROVED** — on-demand PDF from immutable snapshot via `finance-publication-artifact-service.ts` and `/api/dashboard/finance/publications/[publicationId]/versions/[versionNumber]/pdf`. No artifact persistence row; pipeline remains `Publication Version → snapshotPayloadJson → Publication Presentation → PDF`. See [`SCE-FINANCE-06C-R1-PDF-ARTIFACT.md`](SCE-FINANCE-06C-R1-PDF-ARTIFACT.md).

### FIN-06C product direction (remaining slices)

**Primary product outcome:** A published financial report becomes an **official immutable artifact that can be distributed**.

```text
LIVE REPORT → PUBLISH → OFFICIAL VERSION → DISTRIBUTE
```

Publication without distribution is **infrastructure**, not the complete user outcome. The user should understand: *“I have made this report official and can now send it.”* SCE owns snapshotting, immutability, version numbering, historical preservation, permissions, artifact generation, and distribution integrity (**complexity in the system, not in the user's head**).

| FIN-06C slice | Intent |
| --- | --- |
| **PDF herunterladen** | **COMPLETE / PO APPROVED** — professional downloadable document (e.g. `FC Allschwil – Erfolgsrechnung FY 2026 – Version 2.pdf`) |
| **Controlled sharing (FIN-06D R1)** | **IMPLEMENTED / PO UAT PENDING** — `FinancePublicationShare` binds to **FinancePublicationVersion**; external route `/share/finance/publication/{token}`; PDF via `/api/share/finance/publication/{token}/pdf`; raw token shown once; SHA-256 digest stored |
| **Email / distribution** | **NOT STARTED** — of a **specific publication version** |

**PDF architecture lock:** `Publication Version → Snapshot → Publication Presentation → PDF`. **Never** `Publication Version → Current FIN-05 Read Model → PDF`. Semantic invariance: `PDF(V1)` today equals `PDF(V1)` after live finance changes (byte identity not required when metadata differs).

**Permission boundaries (unchanged):** `finance.view`, `finance.publication.view`, `finance.reporting.publish`, `finance.reporting.share`, `finance.share.manage` — VIEW ≠ SHARE ≠ PUBLISH; publish does not imply unrestricted external sharing; sharing does not mutate the publication.

**UX direction (FIN-06C, not 06B):** Primary **Veröffentlichen**; quieter **Veröffentlichte Berichte (N)**; in-publication actions **PDF herunterladen**, **Teilen**, **Per E-Mail senden**; history status **Aktuell** / **Ersetzt**. Do not expose `snapshotPayloadJson`, schema version, or database IDs.

**Artifact presentation:** Document-like identity (organisation, title, period, version, date, currency); content hierarchy CONCLUSION → KEY SUMMARY → MANAGEMENT P&L → context; no investigation/edit controls, app navigation, or internal IDs.

**Out of scope for FIN-06C:** generic document management, email marketing, FIN-08 invoicing, FIN-11 statutory output, generic BI.

Contract constants: `FINANCE_06C_*` in `finance-publishing-sharing-architecture-contract.ts`. Tests: `finance-06c-product-handoff-architecture.test.ts`.

### FIN-06B scope lock (R6)

FIN-06B remains: **publication snapshot + versioning + historical inspection + discoverability**. FIN-06B does **not** implement PDF, email, share links, recipient management, public access, download center, or FIN-09/FIN-11 surfaces.

## FIN-06 package plan (remainder)

| Package | Focus | Status |
| --- | --- | --- |
| **06A** | Architecture foundation | **COMPLETE / PO UAT PASS** |
| **06B** | Publication snapshot & versioning | **COMPLETE / PO APPROVED** (PR **#917**) |
| **06C** | Published artifacts & distribution | **IN PROGRESS** (**R1 PDF** implemented; **R2 PDF design/accessibility** implemented / PO UAT pending) |
| **06D** | Controlled publication sharing | **R1 IMPLEMENTED / PO UAT PENDING** |
| **06E** | Distribution / export surfaces | NOT STARTED |
| **06F** | Privacy, audience & policy hardening | NOT STARTED |
| **06G** | UX / responsive / release hardening | NOT STARTED |
| **06H** | Programme closure | NOT STARTED |

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
FIN-06A — COMPLETE · PO APPROVED · MERGED TO STAGE (PR #916)
FIN-06B — COMPLETE · PO APPROVED · PR #917 → STAGE
FIN-06B-R4 — PO VISUAL UAT PASS
FIN-06B-R5 — IMMUTABILITY CHECKPOINT PASS
FIN-06B-R6 — VERSION 2 UAT PASS
FIN-06B-R7 — FINAL CLOSURE PASS
FIN-06 — IN PROGRESS
FIN-06C-R1 — IMPLEMENTED · PO UAT PENDING (PDF download)
FIN-06C — IN PROGRESS
```
