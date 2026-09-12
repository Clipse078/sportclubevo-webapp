# SWISS-01E4A — Engineering baseline (frozen)

**Branch:** `cursor/sce-billing-swiss-01e-invoice-pdf-8a03`  
**PR:** #583  
**Baseline tag:** SWISS-01E3 → frozen at 01E4A preparation  
**PO visual acceptance:** not granted — this document describes engineering state only.

## Reference fixture (unchanged)

| Field | Value |
| --- | --- |
| Invoice number | `2026-000002` |
| Invoice date | 01.09.2026 |
| Service period | 01.09.2026–30.09.2026 |
| Net | CHF 199.00 |
| VAT | 8.1% / CHF 16.12 |
| Gross | CHF 215.12 |

## Protected billing domain (do not change in visual slices)

BillingCustomer, Contract, Invoice, InvoicePaymentInstruction, lifecycle, numbering, snapshots, QRR, SPC builder, QR payload, Swiss QR image generation, bank accounts, encryption, Stripe, UBS, email/delivery, STAGE/production invoice rows.

## PROTECTED SIX PAYMENT SECTION

The bottom **210 × 105 mm** Swiss QR-bill block is a regulated component.

| Metric | Value |
| --- | --- |
| Section | 210 × 105 mm |
| Empfangsschein | 62 × 105 mm |
| Zahlteil | 148 × 105 mm |
| QR code | 46 × 46 mm |

Implementation: `render-swiss-payment-slip.ts`, `constants.ts`, `swiss-qr-code-image.ts`.

**Changes require explicit Swiss QR / SIX compliance review.**  
Do not move SportClubEvo/Tulip decorative branding into this zone.  
Do not alter SPC payload or QRR resolution in PDF layer.

## Creative canvas (visual master applies here only)

| Region | Size (mm) |
| --- | --- |
| A4 page | 210 × 297 |
| Available SCE invoice design area | 210 × 192 |
| Protected payment section | 210 × 105 (y from top = 192) |

Layout tokens and bounding boxes: `invoice-design-geometry.ts`, `VISUAL-MASTER-GEOMETRY-SPEC.md`.

## Renderer architecture (01E4A)

- **Orchestration:** `generate-invoice-pdf.ts`, `invoice-pdf-service.ts`
- **Creative body:** `render-invoice-document.ts`, `draw-invoice-header.ts`, `invoice-design-geometry.ts`
- **Totals spacing:** `invoice-totals-layout.ts`
- **Protected slip:** `render-swiss-payment-slip.ts`

Deterministic placement should use mm tokens from `invoice-design-geometry.ts` (and regulated constants in `constants.ts`).

## Tulip Digital logo asset

Expected path: `public/images/branding/Logo-730036c6-150f-4549-8e03-5ea1efb24084.png`  
Status at 01E4A: **missing** — renderer skips embed; PO to supply original binary.

## Next slice (01E4B)

Implement externally approved visual master using geometry spec; no billing/SIX changes.
