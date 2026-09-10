/**
 * Shared helpers for platform billing read API routes.
 */

import { NextResponse } from "next/server";
import {
  STRIPE_ERROR_HTTP_STATUS,
  StripeIntegrationError,
  toSafePublicStripeError,
} from "@/lib/integrations/stripe/errors";

export function billingStripeErrorResponse(error: unknown): NextResponse {
  if (error instanceof StripeIntegrationError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: STRIPE_ERROR_HTTP_STATUS[error.code] },
    );
  }

  const safe = toSafePublicStripeError(error);
  return NextResponse.json(
    { error: safe.message, code: safe.code },
    { status: STRIPE_ERROR_HTTP_STATUS[safe.code] },
  );
}
