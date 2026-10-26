# SCE-FINANCE-06C-R1 — Versioned PDF Artifact

| Field | Value |
| --- | --- |
| **Programme** | FIN-06 — Financial Publishing & Sharing |
| **Package** | FIN-06C-R1 — Distribution & Export Foundation + Versioned PDF Artifact |
| **Status** | **IMPLEMENTED** (superseded for visual design by FIN-06C-R2) |
| **Branch** | `cursor/sce-finance-06c-distribution-export` |
| **Predecessor** | FIN-06B COMPLETE / PO APPROVED (PR **#917**) |

## Canonical invariant

```text
FinancePublicationVersion
  → snapshotPayloadJson
  → FinancePublicationPresentation
  → FinancePublicationArtifact (PDF)
```

**PDF(Vn) represents Vn, not current live Finance.**

Historical PDF generation must not call FIN-05 live loaders. Download does not mutate snapshots or increment version numbers.

## Artifact persistence (R1 decision)

R1 generates PDF **on demand** from the stored publication snapshot. No `FinancePublicationArtifact` database row is required yet. Source publication version is explicit in the PDF metadata, download route, and filename. Future persisted artifacts and delivery audit remain compatible with this model.

## Technology

| Choice | Detail |
| --- | --- |
| **Library** | `pdf-lib` (already used for billing invoices) |
| **Runtime** | Server-side Node on Vercel |
| **Fonts** | Standard Helvetica / Helvetica-Bold (WinAnsi — German umlauts and Latin accents) |
| **Page** | A4 portrait, light print-oriented layout |
| **Alternatives considered** | Browser print (rejected — not a durable artifact); headless Chromium (rejected — weight/runtime); external PDF SaaS (rejected — unnecessary dependency) |

## Permissions

PDF download uses existing **publication visibility**: `finance.view` + `finance.publication.view`. No new permission key in R1. VIEW ≠ SHARE ≠ PUBLISH unchanged.

## Product Owner UAT checklist

1. Open **Finance → Berichte → Veröffentlichungen**.
2. Confirm each version shows **Ansehen** and **PDF herunterladen**.
3. Download **Version 1** PDF — verify professional layout, FC Allschwil identity, Erfolgsrechnung, FY 2026, Version 1, expected result **161'533 CHF**, variance **+11'533 CHF**, Mitgliedsbeiträge **212'694 CHF**, publication timestamp, readable P&L, sensible pagination.
4. Download **Version 2** PDF — verify Version 2, expected result **162'533 CHF**, variance **+12'533 CHF**, Mitgliedsbeiträge **213'694 CHF**.
5. Confirm Version 1 PDF still reflects state A while Version 2 reflects state B.
6. Check filenames are useful and professional.
7. Check for clipping, overflow, tiny text, or broken characters.

**Stop after PO visual UAT** — do not merge until authorized.

## Automated tests

`lib/finance/__tests__/finance-06c-r1-publication-pdf-artifact.test.ts`
