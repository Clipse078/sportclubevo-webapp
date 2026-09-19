import { renderSwissQrCodePng } from "../invoice-pdf/swiss-qr-code-image";
import {
  assertDecodedPayloadMatchesCanonical,
  decodeSwissQrPayloadFromImageBuffer,
  decodeSwissQrPayloadFromPng,
} from "./decode-swiss-qr-png";
import { extractEmbeddedPngsFromPdf } from "./extract-pdf-embedded-pngs";
import {
  serializeCanonicalSwissQrPayloadFromBillData,
} from "./serialize-canonical-swiss-qr-payload";
import type { SwissQrBillData } from "./swiss-qr-bill-data";
import { SWISS_QR_COMPLIANCE_CODES } from "./swiss-qr-compliance-codes";
import type { SwissQrComplianceResult } from "./swiss-qr-compliance-error";
import { validateSwissQrBillData } from "./validate-swiss-qr-bill";

export type SwissQrComplianceRunOptions = {
  verifyQrArtifact?: boolean;
  verifyPdfArtifact?: boolean;
  pdfBytes?: Uint8Array;
};

export async function runSwissQrCompliance(
  data: SwissQrBillData,
  options: SwissQrComplianceRunOptions = {},
): Promise<SwissQrComplianceResult> {
  const issues = validateSwissQrBillData(data);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  let canonicalPayload: string;
  try {
    canonicalPayload = serializeCanonicalSwissQrPayloadFromBillData(data);
  } catch (error) {
    return {
      ok: false,
      issues: [
        {
          code: SWISS_QR_COMPLIANCE_CODES.PAYLOAD_SERIALIZATION_FAILED,
          message: error instanceof Error ? error.message : "Serialisierung fehlgeschlagen.",
        },
      ],
    };
  }

  if (options.verifyQrArtifact !== false) {
    try {
      const png = await renderSwissQrCodePng(canonicalPayload);
      const decoded = decodeSwissQrPayloadFromPng(png);
      assertDecodedPayloadMatchesCanonical(decoded, canonicalPayload);
    } catch (error) {
      let code: (typeof SWISS_QR_COMPLIANCE_CODES)[keyof typeof SWISS_QR_COMPLIANCE_CODES] =
        SWISS_QR_COMPLIANCE_CODES.QR_GENERATION_FAILED;
      if (error instanceof Error && "code" in error) {
        const maybeCode = (error as { code: string }).code;
        if (
          maybeCode === SWISS_QR_COMPLIANCE_CODES.QR_PAYLOAD_MISMATCH ||
          maybeCode === SWISS_QR_COMPLIANCE_CODES.QR_DECODE_FAILED ||
          maybeCode === SWISS_QR_COMPLIANCE_CODES.QR_GENERATION_FAILED
        ) {
          code = maybeCode;
        }
      }
      return {
        ok: false,
        issues: [
          {
            code,
            message: error instanceof Error ? error.message : "QR-Verifikation fehlgeschlagen.",
          },
        ],
      };
    }
  }

  if (options.verifyPdfArtifact && options.pdfBytes) {
    try {
      const pngs = extractEmbeddedPngsFromPdf(options.pdfBytes);
      if (pngs.length === 0) {
        throw new Error("Kein eingebettetes PNG in der PDF gefunden.");
      }
      const decodedCandidates = pngs
        .map((png) => {
          try {
            return decodeSwissQrPayloadFromImageBuffer(png);
          } catch {
            return null;
          }
        })
        .filter((value): value is string => value !== null);

      const match = decodedCandidates.find((decoded) => {
        try {
          assertDecodedPayloadMatchesCanonical(decoded, canonicalPayload);
          return true;
        } catch {
          return false;
        }
      });

      if (!match) {
        return {
          ok: false,
          issues: [
            {
              code: SWISS_QR_COMPLIANCE_CODES.PDF_QR_VALIDATION_FAILED,
              message: "PDF-QR-Payload stimmt nicht mit dem kanonischen Payload überein.",
            },
          ],
        };
      }
    } catch (error) {
      return {
        ok: false,
        issues: [
          {
            code: SWISS_QR_COMPLIANCE_CODES.PDF_QR_VALIDATION_FAILED,
            message: error instanceof Error ? error.message : "PDF-QR-Validierung fehlgeschlagen.",
          },
        ],
      };
    }
  }

  return { ok: true, canonicalPayload };
}
