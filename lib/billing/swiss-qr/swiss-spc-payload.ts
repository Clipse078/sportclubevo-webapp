import type { BillingReferenceStrategy } from "@prisma/client";
import type { SwissStructuredAddress } from "./swiss-structured-address";
import {
  serializeCanonicalSwissQrPayload,
  type CanonicalSwissQrPayloadInput,
} from "../swiss-qr-compliance/serialize-canonical-swiss-qr-payload";
import { SwissQrComplianceError } from "../swiss-qr-compliance/swiss-qr-compliance-error";

export class SwissSpcPayloadError extends Error {
  readonly name = "SwissSpcPayloadError";
}

export type SwissSpcPayloadInput = CanonicalSwissQrPayloadInput & {
  additionalInformation?: string | null;
};

function mapComplianceError(error: unknown): never {
  if (error instanceof SwissQrComplianceError) {
    throw new SwissSpcPayloadError(error.message);
  }
  throw error;
}

/** @deprecated Prefer {@link serializeCanonicalSwissQrPayload} — kept for existing imports. */
export function buildSwissSpcPayload(input: SwissSpcPayloadInput): string {
  try {
    return serializeCanonicalSwissQrPayload({
      creditorAccount: input.creditorAccount,
      creditor: input.creditor,
      amountMinor: input.amountMinor,
      currency: input.currency,
      debtor: input.debtor,
      referenceType: input.referenceType,
      reference: input.reference,
      unstructuredMessage: input.additionalInformation ?? input.unstructuredMessage ?? null,
      billingInformation: input.billingInformation ?? null,
    });
  } catch (error) {
    mapComplianceError(error);
  }
}

export type { SwissStructuredAddress } from "./swiss-structured-address";
