/**
 * lib/integrations/stripe/errors.ts
 *
 * Sanitized Stripe integration error model. Never expose API keys, payment
 * method details, or full customer/invoice payloads in messages.
 */

export type StripeIntegrationErrorCode =
  | "STRIPE_NOT_CONFIGURED"
  | "STRIPE_CONFIGURATION_INVALID"
  | "STRIPE_UNAVAILABLE"
  | "STRIPE_AUTHENTICATION_FAILED"
  | "STRIPE_RESOURCE_NOT_FOUND"
  | "STRIPE_RATE_LIMITED"
  | "STRIPE_INVALID_RESPONSE"
  | "NO_BILLING_ACCOUNT"
  | "INVOICE_NOT_OWNED_BY_TENANT"
  | "INTERNAL_ERROR";

export const STRIPE_ERROR_HTTP_STATUS: Record<
  StripeIntegrationErrorCode,
  number
> = {
  STRIPE_NOT_CONFIGURED: 503,
  STRIPE_CONFIGURATION_INVALID: 503,
  STRIPE_UNAVAILABLE: 503,
  STRIPE_AUTHENTICATION_FAILED: 502,
  STRIPE_RESOURCE_NOT_FOUND: 404,
  STRIPE_RATE_LIMITED: 503,
  STRIPE_INVALID_RESPONSE: 502,
  NO_BILLING_ACCOUNT: 404,
  INVOICE_NOT_OWNED_BY_TENANT: 404,
  INTERNAL_ERROR: 500,
};

export class StripeIntegrationError extends Error {
  public readonly code: StripeIntegrationErrorCode;

  constructor(code: StripeIntegrationErrorCode, message: string) {
    super(message);
    this.name = "StripeIntegrationError";
    this.code = code;
  }
}

export class StripeConfigurationError extends StripeIntegrationError {
  constructor(
    code: Extract<
      StripeIntegrationErrorCode,
      "STRIPE_NOT_CONFIGURED" | "STRIPE_CONFIGURATION_INVALID"
    >,
    message: string,
  ) {
    super(code, message);
    this.name = "StripeConfigurationError";
  }
}

export function toSafePublicStripeError(error: unknown): {
  code: StripeIntegrationErrorCode;
  message: string;
} {
  if (error instanceof StripeIntegrationError) {
    return { code: error.code, message: error.message };
  }

  if (error instanceof Error) {
    const lower = error.message.toLowerCase();
    if (lower.includes("rate limit")) {
      return {
        code: "STRIPE_RATE_LIMITED",
        message: "Stripe rate limit reached.",
      };
    }
    if (lower.includes("timeout") || lower.includes("timed out")) {
      return {
        code: "STRIPE_UNAVAILABLE",
        message: "Stripe request timed out.",
      };
    }
    if (
      lower.includes("fetch failed") ||
      lower.includes("econnrefused") ||
      lower.includes("network") ||
      lower.includes("enotfound")
    ) {
      return {
        code: "STRIPE_UNAVAILABLE",
        message: "Stripe is not reachable.",
      };
    }
  }

  return {
    code: "INTERNAL_ERROR",
    message: "An unexpected error occurred in the Stripe integration.",
  };
}

function messageLooksLikeSecret(value: string): boolean {
  return /sk_(live|test)_[A-Za-z0-9]+/.test(value);
}

/**
 * Maps a Stripe SDK error to a safe domain error without leaking secrets or PII.
 */
export function mapStripeSdkError(error: unknown): StripeIntegrationError {
  if (error instanceof StripeIntegrationError) {
    return error;
  }

  const err = error as {
    type?: string;
    statusCode?: number;
    code?: string;
    message?: string;
  };

  if (err.type === "StripeAuthenticationError" || err.statusCode === 401) {
    return new StripeIntegrationError(
      "STRIPE_AUTHENTICATION_FAILED",
      "Stripe authentication failed.",
    );
  }

  if (err.type === "StripeRateLimitError" || err.statusCode === 429) {
    return new StripeIntegrationError(
      "STRIPE_RATE_LIMITED",
      "Stripe rate limit reached.",
    );
  }

  const rawMessage = typeof err.message === "string" ? err.message : "";
  if (messageLooksLikeSecret(rawMessage)) {
    return new StripeIntegrationError(
      "STRIPE_INVALID_RESPONSE",
      "Stripe returned an invalid error response.",
    );
  }

  if (err.type === "StripeInvalidRequestError" && err.statusCode === 404) {
    return new StripeIntegrationError(
      "STRIPE_RESOURCE_NOT_FOUND",
      "Stripe resource not found.",
    );
  }

  if (
    err.type === "StripeConnectionError" ||
    err.type === "StripeAPIError" ||
    err.statusCode === 503
  ) {
    return new StripeIntegrationError(
      "STRIPE_UNAVAILABLE",
      "Stripe is temporarily unavailable.",
    );
  }

  return new StripeIntegrationError(
    "STRIPE_INVALID_RESPONSE",
    "Stripe returned an unexpected response.",
  );
}
