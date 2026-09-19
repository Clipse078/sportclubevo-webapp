import type { SwissQrComplianceCode } from "./swiss-qr-compliance-codes";

export class SwissQrComplianceError extends Error {
  readonly name = "SwissQrComplianceError";

  constructor(
    readonly code: SwissQrComplianceCode,
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

/** Operator-safe failure when invoice delivery must be blocked. */
export class SwissQrComplianceBlockedError extends Error {
  readonly name = "SwissQrComplianceBlockedError";

  constructor(
    readonly code: SwissQrComplianceCode,
    message: string,
    readonly userMessage: string,
  ) {
    super(message);
  }
}

export type SwissQrComplianceIssue = {
  code: SwissQrComplianceCode;
  message: string;
  field?: string;
};

export type SwissQrComplianceResult =
  | { ok: true; canonicalPayload: string }
  | { ok: false; issues: SwissQrComplianceIssue[] };
