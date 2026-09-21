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
  externalValidationMatrixCases,
  SYNTHETIC_QR_IBAN,
  SYNTHETIC_QRR_REF,
  type ExternalValidationMatrixCase,
} from "./fixtures/external-validation-matrix-fixtures";
import { runSwissQrCompliance } from "./run-swiss-qr-compliance";
import { resolveCreditorPaymentAccount } from "./validate-swiss-qr-bill";
import {
  SIX_IG_QR_BILL_VERSION,
  SIX_QR_PAYLOAD_VERSION,
  SIX_QR_BILL_OFFICIAL_SOURCES,
} from "./six-qr-bill-standard";

/** Same canonical fixture as QR-04A SIX pack — primary cross-bank scan target. */
export const CANONICAL_CROSS_BANK_CASE_ID = "sce-realistic-chf";

export type CrossBankChannelId = "UBS" | "RAIFFEISEN" | "POSTFINANCE";

export type CrossBankChannelResult = "PASS" | "FAIL" | "NOT_TESTED";

export type SwissQrCrossBankAcceptanceManifest = {
  schemaVersion: "billing-qr-04b-v1";
  purpose:
    "Operational cross-bank scan/parse acceptance for one synthetic SCE Swiss QR invoice (does not replace SIX validation).";
  prerequisite: {
    qr04aExternalSixValidation: "PASS";
    sixReferenceStandard: "QR;2.3;CH";
    qr04aEvidenceDoc: "docs/billing/QR-04A-SIX-EXTERNAL-VALIDATION-RESULT.md";
  };
  canonicalFixture: {
    caseId: typeof CANONICAL_CROSS_BANK_CASE_ID;
    syntheticOnly: true;
    paymentReviewExpectations: {
      creditorName: string;
      amountDisplay: string;
      currency: string;
      referenceType: "QRR";
      reference: string;
      unstructuredMessage: string;
    };
  };
  engine: {
    repository: string;
    commitSha: string;
    stageBaselineSha: string;
    complianceFingerprint: {
      algorithm: string;
      sha256: string;
    };
    standard: {
      issuer: "SIX";
      igVersion: typeof SIX_IG_QR_BILL_VERSION;
      payloadVersion: typeof SIX_QR_PAYLOAD_VERSION;
      officialSources: typeof SIX_QR_BILL_OFFICIAL_SOURCES;
    };
  };
  internalValidation: {
    complianceEngine: "PASS";
    swissqrbillOracle: "PASS";
    qrEncodeDecodeRoundTrip: "PASS";
    pdfQrExtractRoundTrip: "PASS";
  };
  artifacts: Array<{
    artifactType: "spc.txt" | "qr.png" | "pdf";
    filename: string;
    sha256: string;
    canonicalPayloadSha256: string | null;
  }>;
  bankChannels: Record<
    Lowercase<CrossBankChannelId>,
    {
      bank: CrossBankChannelId;
      result: CrossBankChannelResult;
      checklistDoc: "docs/billing/QR-04B-CROSS-BANK-ACCEPTANCE.md";
    }
  >;
  nonClaims: string[];
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

function resolveCanonicalCase(): ExternalValidationMatrixCase {
  const matrixCase = externalValidationMatrixCases.find((c) => c.caseId === CANONICAL_CROSS_BANK_CASE_ID);
  if (!matrixCase?.generatePdf) {
    throw new Error(`Missing PDF-enabled canonical fixture ${CANONICAL_CROSS_BANK_CASE_ID}`);
  }
  return matrixCase;
}

export type GenerateCrossBankAcceptancePackOptions = {
  repoRoot: string;
  outDir: string;
  commitSha: string;
  stageBaselineSha: string;
  repositoryUrl?: string;
};

export type GenerateCrossBankAcceptancePackResult = {
  outDir: string;
  manifest: SwissQrCrossBankAcceptanceManifest;
  generatedFiles: string[];
};

export async function generateCrossBankAcceptancePack(
  options: GenerateCrossBankAcceptancePackOptions,
): Promise<GenerateCrossBankAcceptancePackResult> {
  const { repoRoot, outDir, commitSha, stageBaselineSha } = options;
  await mkdir(outDir, { recursive: true });

  const matrixCase = resolveCanonicalCase();
  const fingerprint = computeComplianceFingerprint(repoRoot);
  const generatedFiles: string[] = [];

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
  const pdfFilename = `${baseName}.pdf`;

  await writeFile(path.join(outDir, spcFilename), compliance.canonicalPayload, "utf8");
  generatedFiles.push(spcFilename);

  const png = await renderSwissQrCodePng(compliance.canonicalPayload);
  await writeFile(path.join(outDir, qrFilename), png);
  generatedFiles.push(qrFilename);

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

  await writeFile(path.join(outDir, pdfFilename), Buffer.from(pdfBytes));
  generatedFiles.push(pdfFilename);

  const artifactEntries: SwissQrCrossBankAcceptanceManifest["artifacts"] = [
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
    {
      artifactType: "pdf",
      filename: pdfFilename,
      sha256: sha256Hex(Buffer.from(pdfBytes)),
      canonicalPayloadSha256,
    },
  ];

  const manifest: SwissQrCrossBankAcceptanceManifest = {
    schemaVersion: "billing-qr-04b-v1",
    purpose:
      "Operational cross-bank scan/parse acceptance for one synthetic SCE Swiss QR invoice (does not replace SIX validation).",
    prerequisite: {
      qr04aExternalSixValidation: "PASS",
      sixReferenceStandard: "QR;2.3;CH",
      qr04aEvidenceDoc: "docs/billing/QR-04A-SIX-EXTERNAL-VALIDATION-RESULT.md",
    },
    canonicalFixture: {
      caseId: CANONICAL_CROSS_BANK_CASE_ID,
      syntheticOnly: true,
      paymentReviewExpectations: {
        creditorName: "SportClubEvo Platform GmbH",
        amountDisplay: "429.00",
        currency: "CHF",
        referenceType: "QRR",
        reference: SYNTHETIC_QRR_REF,
        unstructuredMessage: "SportClubEvo Abonnement SYNTH-2026-000042",
      },
    },
    engine: {
      repository: options.repositoryUrl ?? "https://github.com/Clipse078/sportclubevo-webapp",
      commitSha,
      stageBaselineSha,
      complianceFingerprint: {
        algorithm: fingerprint.algorithm,
        sha256: fingerprint.fingerprintSha256,
      },
      standard: {
        issuer: "SIX",
        igVersion: SIX_IG_QR_BILL_VERSION,
        payloadVersion: SIX_QR_PAYLOAD_VERSION,
        officialSources: SIX_QR_BILL_OFFICIAL_SOURCES,
      },
    },
    internalValidation: {
      complianceEngine: "PASS",
      swissqrbillOracle: "PASS",
      qrEncodeDecodeRoundTrip: "PASS",
      pdfQrExtractRoundTrip: "PASS",
    },
    artifacts: artifactEntries,
    bankChannels: {
      ubs: {
        bank: "UBS",
        result: "NOT_TESTED",
        checklistDoc: "docs/billing/QR-04B-CROSS-BANK-ACCEPTANCE.md",
      },
      raiffeisen: {
        bank: "RAIFFEISEN",
        result: "NOT_TESTED",
        checklistDoc: "docs/billing/QR-04B-CROSS-BANK-ACCEPTANCE.md",
      },
      postfinance: {
        bank: "POSTFINANCE",
        result: "NOT_TESTED",
        checklistDoc: "docs/billing/QR-04B-CROSS-BANK-ACCEPTANCE.md",
      },
    },
    nonClaims: [
      "Does not prove universal compatibility with every Swiss bank or device.",
      "Does not replace QR-04A external SIX validation (QR;2.3;CH).",
      "Bank PASS requires manual evidence recorded in QR-04B-CROSS-BANK-ACCEPTANCE.md.",
    ],
  };

  const manifestFilename = "manifest.json";
  await writeFile(path.join(outDir, manifestFilename), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  generatedFiles.push(manifestFilename);

  return { outDir, manifest, generatedFiles: generatedFiles.sort() };
}
