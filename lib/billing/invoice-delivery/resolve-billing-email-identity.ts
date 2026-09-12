import { getSenderDomainAuthorization } from "@/lib/email/mailer";

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
export async function resolveBillingEmailIdentity(): Promise<BillingEmailIdentity> {
  const platformFrom = process.env.EMAIL_FROM?.trim();
  if (!platformFrom) {
    throw new Error("EMAIL_FROM is not configured.");
  }

  const billingFromOverride = process.env.BILLING_EMAIL_FROM?.trim();
  const billingAddressCandidate =
    billingFromOverride ?? "SportClubEvo Billing <billing@sportclubevo.com>";

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
    "billing@sportclubevo.com";

  return { from, replyTo };
}
