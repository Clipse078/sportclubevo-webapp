import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { generateInvoicePdfFromDocumentData } from "../invoice-pdf/generate-invoice-pdf";
import { renderSwissQrCodePng } from "../invoice-pdf/swiss-qr-code-image";
import {
  isIBANValid,
  isQRIBAN,
  isQRReferenceValid,
  isSCORReferenceValid,
} from "swissqrbill/utils";
import { computeComplianceFingerprint } from "./compliance-fingerprint";
import {
  buildSyntheticSceRealisticInvoicePdfInputs,
  externalValidationExcludedCases,
  externalValidationMatrixCases,
  SYNTHETIC_QR_IBAN,
  type ExternalValidationMatrixCase,
} from "./fixtures/external-validation-matrix-fixtures";
import { runSwissQrCompliance } from "./run-swiss-qr-compliance";
import { resolveCreditorPaymentAccount } from "./validate-swiss-qr-bill";
import {
  SIX_IG_QR_BILL_2_3_EFFECTIVE_DATE,
  SIX_IG_QR_BILL_2_3_VALID_UNTIL,
  SIX_IG_QR_BILL_2_4_EFFECTIVE_DATE,
  SIX_IG_QR_BILL_2_4_SIC_RELEASE_DATE,
  SIX_IG_QR_BILL_VERSION,
  SIX_QR_BILL_OFFICIAL_SOURCES,
  SIX_QR_PAYLOAD_VERSION,
  SIX_QR_VALIDATION_PORTAL_INPUT_FORMATS,
  SIX_QR_VALIDATION_PORTAL_URL,
} from "./six-qr-bill-standard";

export type SwissQrComplianceLifecycleState =
  | "UNVALIDATED"
  | "PENDING_EXTERNAL_SIX_VALIDATION"
  | "SIX_VALIDATED"
  | "REVALIDATION_REQUIRED";

export type SwissQrExternalValidationManifest = {
  schemaVersion: "billing-qr-04a-v1";
  engine: {
    name: "SportClubEvo Swiss QR Compliance Engine";
    repository: string;
    commitSha: string;
    qr03BaselineSha: string;
    complianceFingerprint: {
      algorithm: string;
      sha256: string;
      inputFiles: Array<{ path: string; sha256: string }>;
      dependencies: Array<{ name: string; version: string }>;
    };
    standard: {
      issuer: "SIX";
      name: "Swiss Implementation Guidelines QR-bill";
      version: typeof SIX_IG_QR_BILL_VERSION;
      payloadVersion: typeof SIX_QR_PAYLOAD_VERSION;
      effectiveDate: string;
      v24EffectiveDate: string;
      v24SicReleaseDate: string;
      v23ValidUntil: string;
      structuredAddressRequiredFrom: string;
      officialSources: typeof SIX_QR_BILL_OFFICIAL_SOURCES;
      validationPortal: {
        url: typeof SIX_QR_VALIDATION_PORTAL_URL;
        terminology: "validation and self-control (not formal SIX certification)";
        registrationRequired: true;
        supportedInputFormats: typeof SIX_QR_VALIDATION_PORTAL_INPUT_FORMATS;
        supportedApiFound: false;
      };
    };
  };
  validation: {
    lifecycleState: SwissQrComplianceLifecycleState;
    status: "PENDING_EXTERNAL_SIX_VALIDATION";
    validatedAt: null;
    sixEvidence: null;
  };
  governance: {
    revalidationTriggers: string[];
    excludedFromExternalPack: typeof externalValidationExcludedCases;
    monthlyInvoiceModel:
      "Every invoice passes domain validation, canonical serialization, QR decode equality, and fail-closed delivery without per-invoice SIX portal use.";
    v24Adoption: "REVALIDATION_REQUIRED before activating IG v2.4 behaviour.";
  };
  artifacts: Array<{
    caseId: string;
    referenceType: string;
    currency: string;
    purpose: string;
    files: Array<{
      artifactType: "spc.txt" | "qr.png" | "pdf";
      filename: string;
      sha256: string;
      canonicalPayloadSha256: string | null;
    }>;
    internalValidationStatus: "PASSED";
    externalSixValidationStatus: "PENDING";
  }>;
  principalSixUpload: {
    caseId: string;
    firstFile: string;
    rationale: string;
  };
  crossBankCandidate: {
    caseId: string;
    pdfFilename: string;
    pdfSha256: string;
    note: "Use this unchanged PDF after SIX validation for UBS, Raiffeisen, and PostFinance recognition checks.";
  };
};

function sha256Hex(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

function assertSwissqrbillOracle(matrixCase: ExternalValidationMatrixCase, creditorAccount: string): void {
  if (!isIBANValid(creditorAccount)) {
    throw new Error(`Oracle IBAN invalid for ${matrixCase.caseId}`);
  }
  if (matrixCase.data.reference.type === "QRR") {
    if (!isQRIBAN(creditorAccount)) {
      throw new Error(`Oracle QR-IBAN expected for ${matrixCase.caseId}`);
    }
    if (!isQRReferenceValid(matrixCase.data.reference.value ?? "")) {
      throw new Error(`Oracle QRR invalid for ${matrixCase.caseId}`);
    }
  }
  if (matrixCase.data.reference.type === "SCOR") {
    if (!isSCORReferenceValid(matrixCase.data.reference.value ?? "")) {
      throw new Error(`Oracle SCOR invalid for ${matrixCase.caseId}`);
    }
  }
}

export type GenerateExternalValidationPackOptions = {
  repoRoot: string;
  outDir: string;
  commitSha: string;
  qr03BaselineSha: string;
  repositoryUrl?: string;
};

export type GenerateExternalValidationPackResult = {
  outDir: string;
  manifest: SwissQrExternalValidationManifest;
  generatedFiles: string[];
};

const REVALIDATION_TRIGGERS = [
  "SIX Implementation Guidelines QR-bill version change (including v2.3 → v2.4)",
  "Canonical serializer change",
  "Swiss QR validator or rules change",
  "QR renderer (PNG) change",
  "Swiss cross recognition asset change",
  "Payment-part QR geometry or layout change",
  "PDF embedding or rendering affecting QR",
  "QR generation dependency change (qrcode, pngjs, swissqrbill)",
  "Relevant encoding dependency change",
  "Reference or checksum algorithm change (QRR, SCOR, IBAN)",
  "Structured address serialization change",
  "Amount serialization change",
  "Currency behaviour change at product boundary",
  "Compliance fingerprint change",
] as const;

export async function generateExternalValidationPack(
  options: GenerateExternalValidationPackOptions,
): Promise<GenerateExternalValidationPackResult> {
  const { repoRoot, outDir, commitSha, qr03BaselineSha } = options;
  await mkdir(outDir, { recursive: true });

  const fingerprint = computeComplianceFingerprint(repoRoot);
  const generatedFiles: string[] = [];
  const manifestArtifacts: SwissQrExternalValidationManifest["artifacts"] = [];

  for (const matrixCase of externalValidationMatrixCases) {
    const compliance = await runSwissQrCompliance(matrixCase.data, { verifyQrArtifact: true });
    if (!compliance.ok) {
      throw new Error(
        `Internal validation failed for ${matrixCase.caseId}: ${JSON.stringify(compliance.issues)}`,
      );
    }

    const creditorAccount = resolveCreditorPaymentAccount(matrixCase.data);
    assertSwissqrbillOracle(matrixCase, creditorAccount);

    const canonicalPayloadSha256 = sha256Hex(compliance.canonicalPayload);
    const baseName = matrixCase.caseId;
    const spcFilename = `${baseName}.spc.txt`;
    const qrFilename = `${baseName}.qr.png`;

    await writeFile(path.join(outDir, spcFilename), compliance.canonicalPayload, "utf8");
    generatedFiles.push(spcFilename);

    const png = await renderSwissQrCodePng(compliance.canonicalPayload);
    await writeFile(path.join(outDir, qrFilename), png);
    generatedFiles.push(qrFilename);

    const files: SwissQrExternalValidationManifest["artifacts"][number]["files"] = [
      {
        artifactType: "spc.txt",
        filename: spcFilename,
        sha256: sha256Hex(compliance.canonicalPayload),
        canonicalPayloadSha256,
      },
      {
        artifactType: "qr.png",
        filename: qrFilename,
        sha256: sha256Hex(png),
        canonicalPayloadSha256,
      },
    ];

    if (matrixCase.generatePdf) {
      const pdfInputs = buildSyntheticSceRealisticInvoicePdfInputs();
      const { pdfBytes } = await generateInvoicePdfFromDocumentData({
        ...pdfInputs,
        spcPayload: compliance.canonicalPayload,
        creditorAccount: SYNTHETIC_QR_IBAN,
        isVoid: false,
        includeSwissPaymentSection: true,
      });

      const pdfCompliance = await runSwissQrCompliance(matrixCase.data, {
        verifyQrArtifact: false,
        verifyPdfArtifact: true,
        pdfBytes,
      });
      if (!pdfCompliance.ok) {
        throw new Error(
          `PDF QR validation failed for ${matrixCase.caseId}: ${JSON.stringify(pdfCompliance.issues)}`,
        );
      }

      const pdfFilename = `${baseName}.pdf`;
      await writeFile(path.join(outDir, pdfFilename), Buffer.from(pdfBytes));
      generatedFiles.push(pdfFilename);
      files.push({
        artifactType: "pdf",
        filename: pdfFilename,
        sha256: sha256Hex(Buffer.from(pdfBytes)),
        canonicalPayloadSha256,
      });
    }

    manifestArtifacts.push({
      caseId: matrixCase.caseId,
      referenceType: matrixCase.referenceType,
      currency: matrixCase.currency,
      purpose: matrixCase.purpose,
      files,
      internalValidationStatus: "PASSED",
      externalSixValidationStatus: "PENDING",
    });
  }

  const principalCaseId = "sce-realistic-chf";
  const principalFirstFile = "sce-realistic-chf.spc.txt";
  const crossBankPdf = manifestArtifacts
    .find((a) => a.caseId === principalCaseId)
    ?.files.find((f) => f.artifactType === "pdf");

  if (!crossBankPdf) {
    throw new Error("Missing cross-bank PDF artifact for sce-realistic-chf");
  }

  const manifest: SwissQrExternalValidationManifest = {
    schemaVersion: "billing-qr-04a-v1",
    engine: {
      name: "SportClubEvo Swiss QR Compliance Engine",
      repository: options.repositoryUrl ?? "https://github.com/Clipse078/sportclubevo-webapp",
      commitSha,
      qr03BaselineSha,
      complianceFingerprint: {
        algorithm: fingerprint.algorithm,
        sha256: fingerprint.fingerprintSha256,
        inputFiles: fingerprint.fileInputs,
        dependencies: fingerprint.dependencyInputs,
      },
      standard: {
        issuer: "SIX",
        name: "Swiss Implementation Guidelines QR-bill",
        version: SIX_IG_QR_BILL_VERSION,
        payloadVersion: SIX_QR_PAYLOAD_VERSION,
        effectiveDate: SIX_IG_QR_BILL_2_3_EFFECTIVE_DATE,
        v24EffectiveDate: SIX_IG_QR_BILL_2_4_EFFECTIVE_DATE,
        v24SicReleaseDate: SIX_IG_QR_BILL_2_4_SIC_RELEASE_DATE,
        v23ValidUntil: SIX_IG_QR_BILL_2_3_VALID_UNTIL,
        structuredAddressRequiredFrom: SIX_IG_QR_BILL_2_3_EFFECTIVE_DATE,
        officialSources: SIX_QR_BILL_OFFICIAL_SOURCES,
        validationPortal: {
          url: SIX_QR_VALIDATION_PORTAL_URL,
          terminology: "validation and self-control (not formal SIX certification)",
          registrationRequired: true,
          supportedInputFormats: SIX_QR_VALIDATION_PORTAL_INPUT_FORMATS,
          supportedApiFound: false,
        },
      },
    },
    validation: {
      lifecycleState: "PENDING_EXTERNAL_SIX_VALIDATION",
      status: "PENDING_EXTERNAL_SIX_VALIDATION",
      validatedAt: null,
      sixEvidence: null,
    },
    governance: {
      revalidationTriggers: [...REVALIDATION_TRIGGERS],
      excludedFromExternalPack: externalValidationExcludedCases,
      monthlyInvoiceModel:
        "Every invoice passes domain validation, canonical serialization, QR decode equality, and fail-closed delivery without per-invoice SIX portal use.",
      v24Adoption: "REVALIDATION_REQUIRED before activating IG v2.4 behaviour.",
    },
    artifacts: manifestArtifacts,
    principalSixUpload: {
      caseId: principalCaseId,
      firstFile: principalFirstFile,
      rationale:
        "Primary realistic SportClubEvo CHF QR-IBAN / QRR payload for official SIX portal self-control.",
    },
    crossBankCandidate: {
      caseId: principalCaseId,
      pdfFilename: crossBankPdf.filename,
      pdfSha256: crossBankPdf.sha256,
      note: "Use this unchanged PDF after SIX validation for UBS, Raiffeisen, and PostFinance recognition checks.",
    },
  };

  const manifestFilename = "manifest.json";
  await writeFile(path.join(outDir, manifestFilename), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  generatedFiles.push(manifestFilename);

  const sixChecklist = buildSixValidationChecklist(manifest);
  const sixChecklistFilename = "SIX-VALIDATION-CHECKLIST.md";
  await writeFile(path.join(outDir, sixChecklistFilename), sixChecklist, "utf8");
  generatedFiles.push(sixChecklistFilename);

  const crossBankChecklist = buildCrossBankChecklist(manifest);
  const crossBankFilename = "CROSS-BANK-VALIDATION-CHECKLIST.md";
  await writeFile(path.join(outDir, crossBankFilename), crossBankChecklist, "utf8");
  generatedFiles.push(crossBankFilename);

  return { outDir, manifest, generatedFiles: generatedFiles.sort() };
}

function buildSixValidationChecklist(manifest: SwissQrExternalValidationManifest): string {
  const lines: string[] = [
    "# SIX QR-bill validation checklist (BILLING-QR-04A)",
    "",
    "SportClubEvo engine state: **PENDING_EXTERNAL_SIX_VALIDATION** — do not record SIX_VALIDATED until official portal evidence exists.",
    "",
    "## Portal",
    "",
    `- URL: ${manifest.engine.standard.validationPortal.url}`,
    "- Registration/login: **required** (per SIX Swiss QR Code Validation Guide).",
    `- Supported uploads: QR payload **text file**; QR image **PNG / JPG / IMG** (PDF is **not** listed as a direct portal input — validate PDF only via SCE internal PDF QR decode).`,
    `- Terminology: ${manifest.engine.standard.validationPortal.terminology}`,
    "",
    "## How to record results",
    "",
    "After each upload, note portal outcome in QR-04B evidence (date, screenshot/export, case ID). Update `manifest.json` only in QR-04B after external evidence review — not before.",
    "",
    "## Recommended upload order",
    "",
    `**First file to upload:** \`${manifest.principalSixUpload.firstFile}\` (case \`${manifest.principalSixUpload.caseId}\`).`,
    "",
    manifest.principalSixUpload.rationale,
    "",
    "---",
    "",
  ];

  for (const artifact of manifest.artifacts) {
    lines.push(`## CASE: ${artifact.caseId}`);
    lines.push("");
    lines.push(`**Proves:** ${artifact.purpose}`);
    lines.push("");
    for (const file of artifact.files) {
      if (file.artifactType === "pdf") {
        continue;
      }
      lines.push(`### Upload: \`${file.filename}\``);
      lines.push("");
      lines.push(`- SHA-256: \`${file.sha256}\``);
      lines.push("- **Expected:** No validation errors reported by the SIX QR-bill validation portal for IG QR-bill v2.3 / payload 0200.");
      lines.push("- **Record result in:** QR-04B external evidence log (case ID + filename + SHA-256).");
      lines.push("");
    }
    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}

function buildCrossBankChecklist(manifest: SwissQrExternalValidationManifest): string {
  return [
    "# Cross-bank validation checklist (prepare only — QR-04A)",
    "",
    "Execute **after** SIX portal validation of the same engine baseline. **Do not execute payments.** Recognition/parsing only.",
    "",
    "## Artifact (unchanged Swiss standard — not bank-specific)",
    "",
    `- Case ID: \`${manifest.crossBankCandidate.caseId}\``,
    `- PDF file: \`${manifest.crossBankCandidate.pdfFilename}\``,
    `- SHA-256: \`${manifest.crossBankCandidate.pdfSha256}\``,
    "",
    manifest.crossBankCandidate.note,
    "",
    "## Banks",
    "",
    "| Bank / app | Date | Artifact SHA-256 | QR recognized | Payment fields parsed | IBAN/QR-IBAN parsed | Recipient parsed | Amount parsed | Reference parsed | Scanner warning | Result | Evidence note |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    "| UBS | | | | | | | | | | | |",
    "| Raiffeisen | | | | | | | | | | | |",
    "| PostFinance | | | | | | | | | | | |",
    "",
    "**Payment execution required:** No — QR-04 acceptance is recognition/parsing only unless explicitly authorized later.",
    "",
  ].join("\n");
}
