# Swiss QR Compliance Engine (BILLING-QR-03)

## Authoritative standard

SportClubEvo implements **SIX Implementation Guidelines QR-bill v2.3** (`SIX_IG_QR_BILL_2_3`), effective with the SIC release on **2025-11-21**. Official sources are listed in `lib/billing/swiss-qr-compliance/six-qr-bill-standard.ts`.

**The bank is not the specification.** Compliance is evaluated against SIX rules and verified with deterministic tests—not against a single financial institution’s tolerance.

## Architecture

1. **Authoritative billing data** (invoice snapshots + payment instruction + bank account)
2. **`SwissQrBillData`** canonical domain model (`lib/billing/swiss-qr-compliance/swiss-qr-bill-data.ts`)
3. **`validateSwissQrBillData`** strict SIX + SCE product validation
4. **`serializeCanonicalSwissQrPayload`** single serializer (CRLF, UTF-8)
5. **QR generation** (`renderSwissQrCodePng`)
6. **Independent QR decode** (`jsQR` + `pngjs`) and payload equality check
7. **PDF artifact check** (CI/certification): extract embedded PNG QR from generated PDF and decode
8. **Fail-closed delivery** (`assertInvoiceSwissQrDeliveryCompliance` before transport)

## Runtime vs CI

| Gate | Runtime (PDF / send) | CI / certification |
|------|------------------------|--------------------|
| Domain validation | Yes | Yes |
| Canonical serialization | Yes | Yes |
| QR generate + decode self-check | Yes | Yes |
| PDF QR decode | No (cost) | Yes |
| `swissqrbill` independent oracle | No | Yes (golden tests) |

## Standard upgrades

1. New SIX IG publication → engineering review  
2. Bump `SIX_IG_QR_BILL_VERSION` explicitly  
3. Update golden fixtures + compliance suites  
4. Independent validation + PDF certification  
5. **BILLING-QR-04** external SIX / cross-bank validation  
6. Explicit activation date—never via silent dependency upgrades  

## v2.4 forward compatibility

SIX IG **v2.4** (effective **2026-11-14**) introduces no CHF payload changes. EUR combinations tighten (IBAN/SCOR or IBAN/unstructured only). SCE remains on v2.3 until a deliberate migration after QR-04.

## QR-04 certification artifacts

Run:

```bash
tsx scripts/generate-billing-qr-03-certification-artifacts.ts
```

Outputs canonical payloads, QR PNGs, and sample PDFs under `artifacts/billing-qr-03/` (local only).

## Do not remove

Fail-closed delivery, canonical serializer, and QR self-decode exist so invoice transport cannot proceed with unverified Swiss QR payment data. Removing them reintroduces bank-specific behaviour as the implicit specification.
