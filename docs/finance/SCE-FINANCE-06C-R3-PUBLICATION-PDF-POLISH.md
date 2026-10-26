# SCE-FINANCE-06C-R3 — Publication PDF PO-Approved Visual Design

| Field | Value |
| --- | --- |
| **Programme** | FIN-06 — Financial Publishing & Sharing |
| **Package** | FIN-06C-R3 — Publication PDF polish (PO-approved visual target) |
| **Status** | **IMPLEMENTED / PO UAT PENDING** |
| **Branch** | `cursor/sce-finance-06c-distribution-export` |
| **Predecessor** | FIN-06C-R2 (design & accessibility hardening) |

## Approved visual target

R3 implements the Product Owner-approved two-page financial publication composition (FC Allschwil reference): tenant-first masthead with crest, hero forecast conclusion, management assessment, driver cards, income on page 1, expenses/result/evidence on page 2, restrained SportClubEvo footer endorsement.

**Information hierarchy:** Tenant identity → Report identity → Hero conclusion → Management interpretation → Financial evidence → Publication evidence.

## Brand hierarchy (locked)

| Role | Treatment |
| --- | --- |
| **Tenant / organisation** | Primary — masthead name + canonical crest (upper-right) |
| **SportClubEvo** | Secondary — small footer mark + “Erstellt mit SportClubEvo” |

## Logo sourcing

- **Tenant crest:** `loadTenantPublicationLogo()` — trusted Vercel Blob URLs (`*.public.blob.vercel-storage.com`) or same-origin `/public` paths; magic-byte validation; PNG/JPEG only; no arbitrary external URLs; graceful skip on failure.
- **SCE footer mark:** canonical `lib/billing/invoice-pdf/assets/sportclubevo-footer-logo.png` via `loadScePublicationMark()`.
- Helpers: `fitImageWithinBounds`, `embedPublicationPdfImage`, `drawPublicationImage`.

## Page architecture

Content-driven pagination (no forced page count). PO baseline (FCA) targets **two pages**:

1. Masthead, hero, management assessment, driver cards, income statement (+ total).
2. Continuation header, expenses, result band, wesentliche Abweichungen, Publikationsinformationen, snapshot notice.

Larger hierarchies paginate naturally (table headers repeat after breaks).

## Hero fix (R2 defect)

Explicit vertical layout bands (`publication-pdf-hero-layout.ts`): label → forecast value → variance semantic band → budget / actual supporting columns. Automated non-overlap guard in R3 tests.

## Character safety

- Table variance column: **Abw. Budget** (DE) / **Var. Budget** (EN) — no Δ glyph.
- `pdfSafeText` WinAnsi normalization retained; tests audit German glyphs and delta stripping.

## Table rules

Position column label; right-aligned numerics; currency once (`Beträge in {currency}`); section totals ruled; result row pale-blue band emphasis.

## Driver & deviation rules

Snapshot-derived drivers only (`derive-publication-variance-drivers-from-semantic` / comparative intelligence). Driver cards: Positiver / Negativer Treiber with textual favorability. **Wesentliche Abweichungen** uses factual classification strings only (no invented operational causes).

## Publication metadata

Structured block: Organisation, Finanzjahr, Berichtstyp, Version, Veröffentlicht am, PDF erstellt am — no internal IDs.

## Snapshot explanation

Localized immutable-snapshot notice for Vereinsleitung (no technical FIN-05 / JSON vocabulary).

## Accessibility

Unchanged R2 capability matrix: searchable text, metadata, language, contrast, textual favorability, page numbering. Logos decorative in pdf-lib context. No PDF/UA claim.

## Immutability

R3 is presentation-only. PDF(V1) ≠ PDF(V2) financially; `snapshotPayloadJson` unchanged by PDF generation; no live FIN-05 loader at PDF time.

## Permission reconciliation

No FIN-06 permission model changes in R3. `lib/permissions` diff vs `origin/STAGE` empty; `finance-permission-reconciliation` regression tests pass on feature branch.

## Roadmap status

| Package | Status |
| --- | --- |
| FIN-06C-R1 | IMPLEMENTED |
| FIN-06C-R2 | IMPLEMENTED |
| FIN-06C-R3 | IMPLEMENTED / PO UAT PENDING |
| FIN-06C | IN PROGRESS |
| FIN-06 | IN PROGRESS |

## PO UAT checklist

1. Tenant crest clearly dominant; SCE footer small.
2. Hero: zero text collisions.
3. No `? Budget` or Δ in table header.
4. German characters intact in extracted text.
5. Forecast + variance + budget/actual readable at a glance.
6. Management assessment concise; driver cards balanced.
7. Professional table alignment; two-page composition for FCA.
8. Metadata + snapshot notice understandable.
9. V1/V2 financial semantics unchanged (161'533 / 162'533 etc.).

## Automated tests

- `lib/finance/__tests__/finance-06c-r3-publication-pdf-polish.test.ts`
- `lib/finance/__tests__/finance-06c-r2-publication-pdf-design.test.ts` (updated)
- `lib/finance/__tests__/finance-06c-r1-publication-pdf-artifact.test.ts` (regression)
