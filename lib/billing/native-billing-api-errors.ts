import { NextResponse } from "next/server";
import {
  NativeBillingConflictError,
  NativeBillingNotFoundError,
  NativeBillingValidationError,
} from "./native-billing-types";

export function nativeBillingErrorResponse(error: unknown): NextResponse {
  if (error instanceof NativeBillingValidationError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof NativeBillingNotFoundError) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  if (error instanceof NativeBillingConflictError) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return NextResponse.json({ error: "Interner Fehler." }, { status: 500 });
}
