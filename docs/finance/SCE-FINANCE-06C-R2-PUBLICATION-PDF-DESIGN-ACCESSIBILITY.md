# SCE-FINANCE-06C-R2 — Publication PDF Design & Accessibility Hardening

| Field | Value |
| --- | --- |
| **Programme** | FIN-06 — Financial Publishing & Sharing |
| **Package** | FIN-06C-R2 — Publication PDF design & accessibility hardening |
| **Status** | **IMPLEMENTED / PO UAT PENDING** |
| **Branch** | `cursor/sce-finance-06c-distribution-export` |
| **Predecessor** | FIN-06C-R1 (PDF artifact foundation) |

## Product objective

R1 delivered a technically correct, snapshot-authoritative PDF. Product Owner visual UAT rated **functional generation PASS** but **visual/product quality FAIL / refinement required**.

R2 reframes the artifact as an **official financial publication** (club-owned, SportClubEvo-published) using information hierarchy:

**Conclusion → Key numbers → Why → Financial detail → Publication evidence**

## PO R1 visual assessment (recorded)

| Area | Result |
| --- | --- |
| Publication history UX | PASS |
| V1/V2 snapshot/PDF correctness | PASS |
| PDF functional generation | PASS |
| PDF visual/product quality | **FAIL — refinement required (R2)** |

## Architecture (unchanged)

```text
FinancePublicationVersion
  → snapshotPayloadJson
  → FinancePublicationPresentation
  → PDF
```

**Forbidden:** `FinancePublicationVersion → live FIN-05 read model → PDF`

Material drivers and management interpretation in R2 are derived from **immutable snapshot semantic payload** (`derive-publication-variance-drivers-from-semantic.ts`) using FIN-05B ranking semantics — no live loader at PDF time.

## Publication design grammar

- Light A4 print document; generous whitespace; restrained rules (no card/border soup).
- Masthead: club identity primary; SportClubEvo secondary (footer attribution).
- Hero: expected forecast result dominant; variance + textual favorability second; budget/actual supporting.
- Management assessment: overall conclusion + largest material favorable/unfavorable drivers (snapshot-derived).
- Statement table: wide label column; right-aligned numerics; single currency line (`Beträge in {currency}`); zeros remain zeros; missing remains `—`.
- Metadata: single block (version, published at, PDF generated at) — no duplicated FY/title chains.

## Typography

| Role | Size (pt) | Weight |
| --- | --- | --- |
| Club name | 15 | Bold |
| Report heading | 11 | Bold |
| Hero value | 22 | Bold |
| Section headings | 10 | Bold |
| Table body | 8.5 | Regular/Bold |
| Footer | 7 | Regular |

**Font decision:** `Helvetica` / `Helvetica-Bold` via pdf-lib standard fonts (WinAnsi). No proprietary font binaries. German umlauts normalized through `pdfSafeText` (NFD strip + WinAnsi-safe fallback). Tabular figures: not available on standard Helvetica in pdf-lib; alignment achieved via right-edge column anchors.

## PDF metadata model

| Field | Source |
| --- | --- |
| Title | `{organisation} – Finanzbericht {year} – Version {n}` |
| Subject | Localized report type subtitle |
| Author | Organisation name |
| Creator / Producer | SportClubEvo |
| Creation date | PDF generation timestamp |
| Language | Tenant BCP-47 (`setLanguage`) |

Publication timestamp remains the authoritative financial moment; PDF generation timestamp is separate in the publication info block.

## Accessibility capability matrix (pdf-lib 1.17.1)

| Requirement | Classification |
| --- | --- |
| Document title metadata | **SUPPORTED_AND_IMPLEMENTED** |
| Author / creator / producer | **SUPPORTED_AND_IMPLEMENTED** |
| Subject metadata | **SUPPORTED_AND_IMPLEMENTED** |
| Document language | **SUPPORTED_AND_IMPLEMENTED** (`setLanguage`) |
| Searchable / extractable text | **SUPPORTED_AND_IMPLEMENTED** (drawn text, verified in tests) |
| Logical content order | **SUPPORTED_BUT_DEFERRED** (visual order only; no structure tree) |
| Unicode safety | **SUPPORTED_AND_IMPLEMENTED** (WinAnsi normalization; umlauts decomposed where needed) |
| Contrast | **SUPPORTED_AND_IMPLEMENTED** (dark text on light ground; favorability not color-only) |
| Color not sole semantic carrier | **SUPPORTED_AND_IMPLEMENTED** |
| Meaningful table structure / headers | **SUPPORTED_BUT_DEFERRED** (visual headers; no PDF tags) |
| Heading structure | **NOT_SUPPORTED_BY_CURRENT_STACK** (no tagged headings) |
| Reading order for assistive tech | **NOT_SUPPORTED_BY_CURRENT_STACK** (untagged PDF) |
| Page numbering | **SUPPORTED_AND_IMPLEMENTED** |
| Font embedding | **SUPPORTED_AND_IMPLEMENTED** (standard 14 fonts) |
| PDF/UA (tagged PDF) | **REQUIRES_FUTURE_PDF_ENGINE_DECISION** — pdf-lib does not provide PDF/UA tagging |

We do **not** claim PDF/UA compliance.

## Immutability contract

- R2 layout changes do not mutate `snapshotPayloadJson`.
- PDF(V1) and PDF(V2) remain financially distinct per FIN-06B PO checkpoints.
- Historical PDF generation does not invoke `loadFinanceManagementPnlReadModel`.

## Permissions

Unchanged from R1: `finance.view` + `finance.publication.view` for download. VIEW ≠ SHARE ≠ PUBLISH.

## Multi-page behaviour

Content overflow creates additional pages; table section headers repeat after page breaks; footers show `Seite x / y`. Validated with synthetic wide income hierarchy fixture in automated tests.

## Design self-review (R2)

1. Expected result identifiable quickly — **yes** (hero band).
2. Better/worse than budget without mental arithmetic — **yes** (variance + favorability text).
3. Main positive/negative drivers — **yes** (snapshot-derived drivers).
4. Detailed evidence — **yes** (full statement table).
5. Publication vs web export — **yes** (document masthead + print grammar).
6. Club owner / SCE system — **yes**.
7. Intentional whitespace — **yes** (no scale-up filler).
8. Professional numeric alignment — **yes** (column anchors).
9. Print-readable tables — **yes**.
10. Non-football tenant — **yes** (dynamic names/currency).
11. Different currency — **yes** (EUR fixture test).
12. Multi-page — **yes** (synthetic test).
13. Frozen to publication version — **yes** (architecture tests retained).

## Deferred items

- Tagged PDF / PDF-UA (future engine decision).
- Tenant crest embed (optional; masthead works without logo).
- Publication history sheet/workspace (future FIN-06C slice).
- Controlled sharing / email distribution (not FIN-06C-R2).

## PO UAT checklist

1. **Veröffentlichungen** history — Version 1 / 2 with Ansehen + PDF herunterladen.
2. Download **Version 1 PDF** — masthead, hero **161'533 CHF**, variance **+11'533 CHF**, Mitgliedsbeiträge forecast **212'694 CHF**, management drivers, table alignment, metadata/footer, German characters, filename.
3. Download **Version 2 PDF** — **162'533 CHF**, **+12'533 CHF**, Mitgliedsbeiträge **213'694 CHF**.
4. Confirm V1 unchanged by live finance edits.
5. Print preview — readability, margins, no clipping.
6. Optional: inspect multi-page behaviour if exposed via larger tenant hierarchy.

**Stop after PO visual UAT** — do not merge until authorized.

## Automated tests

- `lib/finance/__tests__/finance-06c-r2-publication-pdf-design.test.ts`
- `lib/finance/__tests__/finance-06c-r1-publication-pdf-artifact.test.ts` (regression)
