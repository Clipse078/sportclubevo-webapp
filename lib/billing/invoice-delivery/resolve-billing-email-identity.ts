import { getSenderDomainAuthorization } from "@/lib/email/mailer";
import { isInfomaniakBillingSmtpTransportSelected } from "./billing-email-transport-selection";

function parseFormattedFrom(from: string): { displayName: string; emailAddress: string } {
  const match = from.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (match) {
    return {
      displayName: match[1]?.trim() || match[2]!.trim(),
      emailAddress: match[2]!.trim().toLowerCase(),
    };
  }
  return { displayName: from, emailAddress: from.toLowerCase() };
}

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^<>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export type BillingEmailIdentity = {
  from: string;
  replyTo: string | undefined;
};

/**
 * Resolves a billing-specific From/Reply-To without forcing unverified sender domains.
 */
const DEFAULT_BILLING_FROM = "SportClubEvo Billing <billing@sportclubevo.com>";
const DEFAULT_BILLING_REPLY_TO = "billing@sportclubevo.com";

export function resolveBillingFromAndReplyToFromEnv(): BillingEmailIdentity {
  const billingFromOverride = process.env.BILLING_EMAIL_FROM?.trim();
  const from = billingFromOverride ?? DEFAULT_BILLING_FROM;
  const replyTo =
    process.env.BILLING_REPLY_TO?.trim() ||
    process.env.BILLING_REPLY_TO_EMAIL?.trim() ||
    DEFAULT_BILLING_REPLY_TO;
  return { from, replyTo };
}

export async function resolveBillingEmailIdentity(): Promise<BillingEmailIdentity> {
  if (isInfomaniakBillingSmtpTransportSelected()) {
    const { requireBillingSmtpConfig } = await import("./billing-smtp-config");
    requireBillingSmtpConfig();
    return resolveBillingFromAndReplyToFromEnv();
  }

  const platformFrom = process.env.EMAIL_FROM?.trim();
  if (!platformFrom) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  const billingFromOverride = process.env.BILLING_EMAIL_FROM?.trim();
  const billingAddressCandidate = billingFromOverride ?? DEFAULT_BILLING_FROM;

  const billingAddress = extractEmailAddress(billingAddressCandidate);
  const authorization = await getSenderDomainAuthorization(billingAddress);

  let from: string;
  if (authorization === "VERIFIED") {
    from = billingFromOverride
      ? billingFromOverride
      : `SportClubEvo Billing <${billingAddress}>`;
  } else {
    const platform = parseFormattedFrom(platformFrom);
    from = `SportClubEvo Billing <${platform.emailAddress}>`;
  }

  const replyTo =
    process.env.BILLING_REPLY_TO?.trim() ||
    process.env.BILLING_REPLY_TO_EMAIL?.trim() ||
    DEFAULT_BILLING_REPLY_TO;

  return { from, replyTo };
}
