# SCE-FINANCE-06C-R5R2 — Financial Statement Document Grid & Vertical Rhythm

| Field | Value |
| --- | --- |
| **Package** | FIN-06C-R5R2 |
| **Status** | **IMPLEMENTED / PO UAT PENDING** |
| **Predecessor** | FIN-06C-R5R1 (result overlap fix) |
| **Branch** | `cursor/sce-finance-06c-distribution-export` |

## Intent

R5R1 removed literal collision between the Ergebnis band and Publikationsinformationen. R5R2 fixes the **document layout model**: the financial statement is one semantic table system ending in a terminal Ergebnis row, followed by compact publication evidence.

## Design rationale (research-backed, non-normative)

- Tightly spaced or irregular table layouts create visual and PDF structural ambiguity; table structure should be authored correctly at generation time, not patched with ad hoc offsets.
- Meaningful graphical boundaries (rules, band edges) must remain perceivable in print; ultra-light hairlines must not carry sole responsibility for structure.
- Color must not be the sole carrier of financial meaning; textual variance semantics and table hierarchy remain primary.
- The report should remain understandable in grayscale; this does not assert PDF/UA compliance (pdf-lib limitation unchanged).

## Layout model

```
STATEMENT
  Income section → subtotal
  Expense section → subtotal (no closing rule when Ergebnis follows)
  Terminal Ergebnis row (one top separator, pale-blue band, shared column grid)
EVIDENCE
  Publikationsinformationen (secondary heading)
  Compact metadata + width-limited immutability notice
```

## Vertical rhythm

Spacing resolves through `publicationPdfVerticalSpaceMm` tokens (`2xs` … `xl`) in `publication-pdf-vertical-spacing.ts`. Statement row advance and result band height live in `publication-pdf-statement-layout.ts`.

## Locked (unchanged)

Masthead, hero, management, drivers, numeric values, column right edges, palette tokens, footer architecture, immutability/versioning semantics.
