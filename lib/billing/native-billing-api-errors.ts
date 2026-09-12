import { NextResponse } from "next/server";
import { BillingBankAccountDecryptionError } from "./billing-bank-account-crypto";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "./native-billing-types";
import { BillingFieldCryptoError } from "./billing-field-crypto";
import { SwissIbanError } from "./swiss-qr/swiss-iban";
import { SwissReferenceCompatError } from "./swiss-qr/swiss-reference-compat";

export function nativeBillingErrorResponse(error: unknown): NextResponse {
  if (error instanceof NativeBillingValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.code ? { code: error.code } : {}),
      },
      { status: 400 },
    );
  }
  if (error instanceof SwissIbanError || error instanceof SwissReferenceCompatError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof NativeBillingNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof NativeBillingConflictError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.dependencyCounts ? { dependencies: error.dependencyCounts } : {}),
        ...(error.bankAccountDependencyCounts
          ? { dependencies: error.bankAccountDependencyCounts }
          : {}),
      },
      { status: 409 },
    );
  }
  if (
    error instanceof BillingBankAccountDecryptionError ||
    error instanceof BillingFieldCryptoError
  ) {
    return NextResponse.json(
      { error: "Bankverbindung konnte nicht gelesen werden." },
      { status: 503 },
    );
  }
  return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
}
