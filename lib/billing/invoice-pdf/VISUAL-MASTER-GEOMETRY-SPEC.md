# SCE invoice PDF — visual master geometry (SWISS-01E4B)

**Purpose:** PO-approved visual master implementation reference.  
**Coordinate system:** origin top-left; X right, Y down (mm).

Regenerate crops + JSON: `npx tsx scripts/generate-swiss-01e4b-handoff-artifacts.ts`

See `/opt/cursor/artifacts/swiss-01e4b-geometry-regions.json` for the latest fixture bounds (`2026-000002`).

## Protected payment section

Unchanged from 01E4A — see `render-swiss-payment-slip.ts` (210×105 mm, y=192 mm from top).

## Key creative anchors (01E4B)

| Token | mm |
| --- | --- |
| Header height | 34 |
| Header logo top | 9 |
| Title top | 43 |
| Metadata top / left | 45 / 146 |
| Address section top | 84 |
| Table top | 124 |
| Footer brand row top | 181.5 |
| Creative boundary | 192 |

## Page

| Property | mm |
| --- | --- |
| Page width | 210 |
| Page height | 297 |
| Content margin X (each side) | 12 |
| Creative area width × height | 210 × 192 |
| Payment section boundary Y (from top) | 192 |
| Payment section height | 105 |

## Protected payment section (no creative redesign)

| Region | x | y | w | h |
| --- | --- | --- | --- | --- |
| SIX payment block | 0 | 192 | 210 | 105 |
| Empfangsschein | 0 | 192 | 62 | 105 |
| Zahlteil | 62 | 192 | 148 | 105 |
| Swiss QR (Zahlteil) | ~67 | ~217 | 46 | 46 |

QR placement follows vertical centering in slip (`render-swiss-payment-slip.ts`); use generated overlay artifact for exact baseline pixels.

## Creative area components (fixture `2026-000002`, one line)

Values from `planInvoiceBodyLayoutRegions()` — canonical JSON: `/opt/cursor/artifacts/swiss-01e4a-geometry-regions.json` (regenerate via `npx tsx scripts/generate-swiss-01e4a-handoff-artifacts.ts`).

| Region ID | x | y | w | h | Notes |
| --- | --- | --- | --- | --- | --- |
| header_bar | 0 | 0 | 210 | 34 | Navy bar |
| header_logo | 12 | 9 | 44.8 | 16 | Height fixed; width approximate |
| header_ribbon_artwork | 92 | 0 | 118 | 34 | Decorative asset |
| title | 12 | 39 | 93 | 11 | "Rechnung" |
| metadata_block | 146 | 40 | 52 | 42.5 | Right column |
| address_labels | 12 | 50 | 186 | 4 | Section labels |
| recipient_block | 12 | 54 | 90 | 24 | |
| issuer_block | 108 | 54 | 90 | 24 | |
| line_items_table | 12 | 83 | 186 | 16.5 | Column right edges (mm): 96.6, 122.6, 148.6, 167.2, 197.0 |
| totals_block | 146 | 102.5 | 52 | 28.5 | Includes gross highlight |
| acknowledgement | 12 | 133 | 102.3 | 9 | Thank-you row |
| operator_branding_tulip | 12 | 188.5 | 20 | 5 | Asset missing in repo |
| website_url | 160 | 188.5 | 38 | 4 | www.sportclubevo.com |

## Layout tokens (mm unless noted)

See exports in `invoice-design-geometry.ts`, including:

- `HEADER_HEIGHT_MM` = 34  
- `PAGE_MARGIN_X_MM` = 12  
- `TITLE_BLOCK_TOP_GAP_MM`, `METADATA_*`, `ADDRESS_*`, `TABLE_*`, `TOTALS_*`, `FOOTER_BRAND_ROW_OFFSET_ABOVE_PAYMENT_MM`

Totals vertical steps: `invoice-totals-layout.ts`.

## Artifacts

Generated under `/opt/cursor/artifacts/`:

1. `swiss-01e4a-baseline-a4-full.png`
2. `swiss-01e4a-creative-area-210x192.png`
3. `swiss-01e4a-payment-section-210x105.png`
4. `swiss-01e4a-geometry-overlay.png`
5. `sce-swiss-01e-invoice-2026-000002-fixture.pdf`
