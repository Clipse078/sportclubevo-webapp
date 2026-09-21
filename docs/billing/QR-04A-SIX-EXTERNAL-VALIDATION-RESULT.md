# BILLING-QR-04A — External SIX validation result

Deterministic acceptance record for the QR-04A synthetic validation suite. This is **not** formal SIX certification; it documents the outcome of the official SIX Swiss QR-bill Validation Portal self-control workflow.

## Summary

| Field | Value |
| --- | --- |
| Validation date | 2026-09-21 |
| Validator | Official SIX Swiss QR-bill Validation Portal |
| Reference standard | QR;2.3;CH |
| Overall result | **PASS** — accepted by the official SIX Swiss QR-bill Validation Portal against QR;2.3;CH |
| Data class | Synthetic / fictitious only |
| Real customer data used | **NO** |
| Real bank-client data used | **NO** |
| SPC (`.spc.txt`) validation | **PASS** |
| QR image (`.qr.png`) validation | **PASS** |
| Visible SIX errors | **NONE** |
| Visible SIX warnings | **NONE** |
| Cross-bank validation | **NOT YET PERFORMED** |
| QR-04B | **REQUIRED** (cross-bank recognition / acceptance) |

## Scope of externally validated artifacts

Nine synthetic matrix cases, each with payload (`.spc.txt`) and generated QR image (`.qr.png`), plus the principal realistic CHF case used for first portal upload:

- `sce-realistic-chf` (realistic CHF case)
- `qrr-normal-chf`
- `qrr-umlauts-chf`
- `qrr-accent-fr-it-chf`
- `qrr-boundary-fields-chf`
- `qrr-small-amount-chf`
- `qrr-large-amount-chf`
- `iban-scor-chf`
- `iban-non-chf`

Portal observation: **Validation complete** with successful validation state; no validation warnings or errors were visible for the submitted SPC and QR-image cases.

## Artifact integrity (repository)

Byte identity of the eighteen SIX-target files (nine SPC + nine QR PNG, excluding PDF) is enforced in CI via `manifest.json` SHA-256 entries produced by `npm run billing:qr-04a:generate`. Re-verification on 2026-09-21: **18/18** manifest hash matches for generated artifacts under `artifacts/billing-qr-04a/` (local output; directory is gitignored).

Compliance fingerprint at pack generation (engine baseline): see `manifest.json` → `engine.complianceFingerprint.sha256` after generation at the QR-04A merge commit.

## Explicit non-claims

- Not every Swiss bank has been tested.
- Raiffeisen, UBS, PostFinance, or any other bank acceptance has **not** been proven.
- Universal future compatibility is **not** claimed.

Cross-bank checks belong to **BILLING-QR-04B**.

## Evidence not recorded here

No fabricated screenshots, SIX result IDs, downloadable SIX reports, or certificates are stored in this repository. Only the user-observed portal outcome above is recorded.
