# BILLING-QR-04B — Cross-bank acceptance

Operational acceptance for **one synthetic** SportClubEvo Swiss QR invoice scanned through representative Swiss banking channels. This supplements — and does **not** replace — QR-04A external SIX validation.

## What QR-04A already proves

**External SIX validation: PASS** against **QR;2.3;CH** (see `docs/billing/QR-04A-SIX-EXTERNAL-VALIDATION-RESULT.md`).

## What QR-04B can prove

Only the channels actually tested with recorded evidence.

Never claim that every Swiss bank or device is guaranteed to work.

**SIX standards validation** (QR-04A) is the bank-independent compliance evidence: it confirms the QR-bill payload and image conform to **QR;2.3;CH** in the official SIX Swiss QR-bill Validation Portal.

**Practical banking-channel parsing** (QR-04B) is additional evidence that a real bank app can read the same artifact and reach the normal payment workflow without a visible QR validation error. It does **not** replace SIX validation and does **not** imply formal SIX certification of SCE.

## Conclusion (QR-04B)

| Check | Result |
| --- | --- |
| Official SIX external validation against **QR;2.3;CH** | **PASS** (QR-04A) |
| UBS practical banking-channel parsing | **PASS** |
| Raiffeisen | **NOT TESTED** |
| PostFinance | **NOT TESTED** |

SCE Swiss QR invoices conform to the tested SIX QR-bill standard **QR;2.3;CH**, as evidenced by successful validation in the official SIX Swiss QR-bill Validation Portal. The same canonical synthetic QR artifact was additionally successfully parsed by UBS mobile banking and reached the normal payment workflow without a visible QR validation error.

**Not claimed:** all Swiss banks were tested; every Swiss bank is guaranteed to accept the invoice; Raiffeisen or PostFinance were tested; SIX formally certified SCE.

---

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

**Canonical artifact (QR-04B bank test):** `sce-realistic-chf.pdf`

**PDF SHA-256:** `8c5aa76e03d8ee326f19e1222f7bbd7dc723f3334685c3031f71860c47043b5f`

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
10. Record **PASS** or **FAIL** in the checklist below.

Do **not** include in evidence: account balances, account numbers, unrelated transactions, login or authentication data, or other personal banking information. Prefer textual recording of observed fields; do not commit banking screenshots unless redacted and required by an existing repository convention.

---

## Cross-bank checklist

**PASS** = QR detected, fields parsed, payment review screen reached **before** confirmation.  
**FAIL** = QR not detected, parse error, or wrong fields.  
**NOT TESTED** = no evidence yet (or test access unavailable).

### UBS

| Field | Value |
| --- | --- |
| Test date | 2026-09-21 |
| Bank / channel | UBS mobile banking |
| Mobile / web | Mobile |
| QR detected | YES |
| QR parsed | YES |
| Creditor displayed | YES — visible as “SportClubEvo Plat…” |
| QR-IBAN displayed | YES — visible beginning “CH69 3000 5235 73…” |
| Amount displayed | CHF 429.00 |
| Currency displayed | CHF |
| Payment screen reached before confirmation | YES — normal QR payment workflow; could proceed to next review step |
| Error / warning | None visible (no QR validation error; no QR warning) |
| Payment executed | **NO** (test stopped before confirmation; no payment initiated or settled) |
| **Result** | **PASS** |
| Evidence note | User-observed manual test on canonical `sce-realistic-chf.pdf` (SHA-256 above). No personal banking data stored in this repository. |

### Raiffeisen

| Field | Value |
| --- | --- |
| Test date | — |
| Bank / channel | Raiffeisen |
| Mobile / web | — |
| QR detected | — |
| QR parsed | — |
| Creditor displayed | — |
| Amount displayed | — |
| Currency displayed | — |
| Reference displayed | — |
| Payment screen reached before confirmation | — |
| Error / warning | — |
| **Result** | **NOT TESTED — test access unavailable** |
| Evidence note | No online banking access for Raiffeisen; not marked PASS or FAIL. |

### PostFinance

| Field | Value |
| --- | --- |
| Test date | — |
| Bank / channel | PostFinance |
| Mobile / web | — |
| QR detected | — |
| QR parsed | — |
| Creditor displayed | — |
| Amount displayed | — |
| Currency displayed | — |
| Reference displayed | — |
| Payment screen reached before confirmation | — |
| Error / warning | — |
| **Result** | **NOT TESTED — test access unavailable** |
| Evidence note | No online banking access for PostFinance; not marked PASS or FAIL. |

---

## Status

**QR-04B status:** **PASS / READY FOR MERGE REVIEW** (UBS practical acceptance evidenced; Raiffeisen/PostFinance explicitly not tested)
