import { getSenderDomainAuthorization } from "@/lib/email/mailer";
import { resolveBillingEmailIdentity } from "./resolve-billing-email-identity";

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^<>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export type BillingEmailIdentityReport = {
  resendApiKeyConfigured: boolean;
  emailFromConfigured: boolean;
  emailFromValue: string | null;
  billingEmailFromConfigured: boolean;
  billingEmailFromValue: string | null;
  billingReplyToConfigured: boolean;
  billingReplyToValue: string | null;
  resolvedFrom: string;
  resolvedReplyTo: string | null;
  billingFromDomainVerified: boolean | "UNKNOWN";
};

export async function buildBillingEmailIdentityReport(): Promise<BillingEmailIdentityReport> {
  const emailFrom = process.env.EMAIL_FROM?.trim() || null;
  const billingEmailFrom = process.env.BILLING_EMAIL_FROM?.trim() || null;
  const billingReplyTo =
    process.env.BILLING_REPLY_TO?.trim() ||
    process.env.BILLING_REPLY_TO_EMAIL?.trim() ||
    "billing@sportclubevo.com";

  const identity = await resolveBillingEmailIdentity();

  const billingFromCandidate =
    billingEmailFrom ?? "SportClubEvo Billing <billing@sportclubevo.com>";
  const billingAddress = extractEmailAddress(billingFromCandidate);
  const authorization = await getSenderDomainAuthorization(billingAddress);

  return {
    resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    emailFromConfigured: Boolean(emailFrom),
    emailFromValue: emailFrom,
    billingEmailFromConfigured: Boolean(billingEmailFrom),
    billingEmailFromValue: billingEmailFrom,
    billingReplyToConfigured: Boolean(
      process.env.BILLING_REPLY_TO?.trim() || process.env.BILLING_REPLY_TO_EMAIL?.trim(),
    ),
    billingReplyToValue: billingReplyTo,
    resolvedFrom: identity.from,
    resolvedReplyTo: identity.replyTo ?? null,
    billingFromDomainVerified:
      authorization === "VERIFIED"
        ? true
        : authorization === "NOT_VERIFIED"
          ? false
          : "UNKNOWN",
  };
}
