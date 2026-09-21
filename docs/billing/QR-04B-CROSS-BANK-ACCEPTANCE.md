# BILLING-QR-04B — Cross-bank acceptance

Operational acceptance for **one synthetic** SportClubEvo Swiss QR invoice scanned through representative Swiss banking channels. This supplements — and does **not** replace — QR-04A external SIX validation.

## What QR-04A already proves

**External SIX validation: PASS** against **QR;2.3;CH** (see `docs/billing/QR-04A-SIX-EXTERNAL-VALIDATION-RESULT.md`).

## What QR-04B can prove

Only the channels actually tested with recorded evidence, for example:

> Successfully parsed by UBS, Raiffeisen and PostFinance during cross-bank acceptance testing.

Never claim that every Swiss bank or device is guaranteed to work.

Intended conclusion after successful QR-04B evidence:

> SCE Swiss QR invoices conform to the applicable SIX QR-bill standard and have additionally been successfully parsed in representative Swiss banking channels.

## Canonical fixture (synthetic only)

| Field | Expected value |
| --- | --- |
| Case ID | `sce-realistic-chf` |
| Creditor | SportClubEvo Platform GmbH |
| Amount | 429.00 |
| Currency | CHF |
| Reference type | QRR |
| Reference | `273282026000002025434650072` |
| Message | SportClubEvo Abonnement SYNTH-2026-000042 |

Generate artifacts (local, gitignored):

```bash
npm run billing:qr-04b:generate
```

Output directory: `artifacts/billing-qr-04b/` — use **`sce-realistic-chf.pdf`** for bank scanning. SHA-256 values are in `manifest.json`.

**Do not initiate or confirm a payment** for this test. Stop at the payment review / confirmation screen.

---

## Manual test instructions (Michael)

1. Run `npm run billing:qr-04b:generate` on branch `cursor/billing-qr-04b-cross-bank-acceptance` (or use artifacts from CI/local generation at the QR-04B HEAD).
2. Open **`artifacts/billing-qr-04b/sce-realistic-chf.pdf`** on a device suitable for scanning.
3. Open the target banking app or web channel (UBS, Raiffeisen, or PostFinance).
4. Choose QR invoice / QR-bill scanning (wording varies by bank).
5. Scan the QR on the PDF payment part.
6. Verify **creditor**, **amount**, **currency**, and **reference** against the table above.
7. Continue only until the **final payment review / confirmation** screen.
8. **Do not** confirm or send the payment.
9. Capture a screenshot showing successful parsing where permitted.
10. Record **PASS** or **FAIL** in the checklist below (and update `manifest.json` bank channel results only after evidence review).

Do **not** include in evidence: account balances, account numbers, unrelated transactions, login or authentication data, or other personal banking information.

---

## Cross-bank checklist

**PASS** = QR detected, fields parsed, payment review screen reached **before** confirmation.  
**FAIL** = QR not detected, parse error, or wrong fields.  
**NOT TESTED** = no evidence yet.

### UBS

| Field | Value |
| --- | --- |
| Test date | |
| Bank / channel | UBS |
| Mobile / web | |
| QR detected | |
| QR parsed | |
| Creditor displayed | |
| Amount displayed | |
| Currency displayed | |
| Reference displayed | |
| Payment screen reached before confirmation | |
| Error / warning | |
| **Result** | **NOT TESTED** |
| Evidence note | |

### Raiffeisen

| Field | Value |
| --- | --- |
| Test date | |
| Bank / channel | Raiffeisen |
| Mobile / web | |
| QR detected | |
| QR parsed | |
| Creditor displayed | |
| Amount displayed | |
| Currency displayed | |
| Reference displayed | |
| Payment screen reached before confirmation | |
| Error / warning | |
| **Result** | **NOT TESTED** |
| Evidence note | |

### PostFinance

| Field | Value |
| --- | --- |
| Test date | |
| Bank / channel | PostFinance |
| Mobile / web | |
| QR detected | |
| QR parsed | |
| Creditor displayed | |
| Amount displayed | |
| Currency displayed | |
| Reference displayed | |
| Payment screen reached before confirmation | |
| Error / warning | |
| **Result** | **NOT TESTED** |
| Evidence note | |

---

## Status

**QR-04B status:** WAITING FOR MANUAL CROSS-BANK EVIDENCE

Do not mark any bank **PASS** without actual test evidence from the steps above.
