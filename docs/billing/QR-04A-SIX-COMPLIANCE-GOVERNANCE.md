# BILLING-QR-04A — SIX compliance governance

## Lifecycle states (engine-level, repository metadata)

| State | Meaning |
| --- | --- |
| `UNVALIDATED` | Engine not yet prepared for external validation. |
| `PENDING_EXTERNAL_SIX_VALIDATION` | Internal pack ready; awaiting official SIX portal evidence (QR-04A/04B). |
| `SIX_VALIDATED` | Official SIX validation evidence recorded — **never set without evidence**. |
| `REVALIDATION_REQUIRED` | Compliance-relevant change detected; external validation must be repeated. |

SportClubEvo is **not** “SIX certified” unless SIX explicitly grants formal certification. Portal use is **validation / self-control**.

## Permanent model

```
EXTERNALLY VALIDATE ENGINE
        ↓
LOCK VALIDATED GOLDEN BASELINE
        ↓
AUTOMATICALLY VALIDATE EVERY INVOICE
        ↓
FAIL CLOSED
        ↓
CI PROTECTS BASELINE (vitest lib/billing)
        ↓
REVALIDATE ONLY AFTER COMPLIANCE-RELEVANT CHANGE
```

## Per-invoice automatic compliance

Every Swiss QR invoice (manual send and recurring generation paths) passes:

1. Authoritative billing snapshots → `SwissQrBillData`
2. Strict domain validation (`validateSwissQrBillData`)
3. Canonical serialization (`serializeCanonicalSwissQrPayload`)
4. QR generation + independent decode + payload equality
5. Fail-closed delivery (`assertInvoiceSwissQrDeliveryCompliance`) before transport

No per-invoice SIX portal interaction is required.

**Data changes that do not invalidate the engine baseline:** invoice number, amount within valid range, debtor swap to another valid debtor, new valid QRR, dates, tenant, billing period.

## Revalidation triggers

Revalidation is required when any of the following change:

- SIX IG version (including deliberate v2.3 → v2.4 activation)
- Canonical serializer
- Validator / rules
- QR PNG renderer
- Swiss cross asset
- Payment-part QR geometry
- PDF embedding affecting QR
- QR-related dependencies (`qrcode`, `pngjs`, `swissqrbill`)
- Reference/checksum algorithms
- Address or amount serialization
- CHF product currency behaviour
- **Compliance fingerprint** (`computeComplianceFingerprint`)

Fingerprint algorithm: `lib/billing/swiss-qr-compliance/compliance-fingerprint.ts`.

## CI / release governance

This repository does not use GitHub Actions for billing. Regression protection is:

- `npx vitest run lib/billing` (golden valid/invalid, QR decode, PDF QR equality, QR-03A delivery fail-closed)
- `npm run deploy:check` (lint + build + deployment preflight) on release paths

When opening compliance-relevant PRs, reviewers compare `manifest.json` / fingerprint output from:

```bash
npm run billing:qr-04a:generate
```

A changed fingerprint without QR-04B revalidation is a release blocker for Swiss QR billing.

## v2.4

Current engine target: **SIX IG QR-bill v2.3**, payload **0200**.

IG v2.4 (effective **2026-11-14**, SIC release **2026-11-13**) requires explicit engineering acceptance and **REVALIDATION_REQUIRED** even if CHF payload rules are unchanged.

## Monthly invoice guarantee (engineering)

SportClubEvo does **not** guarantee every third-party scanner will behave identically.

SportClubEvo **does** guarantee by architecture that:

1. Every generated Swiss QR invoice is validated against implemented SIX v2.3 rules.
2. Invalid invoices fail closed before delivery.
3. QR artifacts are decoded and compared to the canonical payload.
4. The compliance engine maintains an externally SIX-validated golden baseline (after QR-04B).
5. Compliance-relevant engine changes require revalidation.
6. Normal monthly invoice data changes do not require manual SIX validation.

## External validation pack

Generate locally (not committed by default):

```bash
npm run billing:qr-04a:generate
```

Output: `artifacts/billing-qr-04a/`

Stop after preparation — **do not** submit to SIX portal from automation.
