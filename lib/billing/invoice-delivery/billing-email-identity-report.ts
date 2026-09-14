import { getSenderDomainAuthorization } from "@/lib/email/mailer";
import { getRuntimeEnvironment } from "@/lib/env";
import { getSelectedBillingEmailTransport } from "./billing-email-transport-selection";
import { getBillingSmtpConfigReadiness } from "./billing-smtp-config";
import {
  isBillingTestDeliveryEnabled,
  getBillingTestRecipientConfigured,
} from "./billing-test-delivery-guards";
import {
  resolveBillingEmailIdentity,
  resolveBillingFromAndReplyToFromEnv,
} from "./resolve-billing-email-identity";

function extractEmailAddress(value: string): string {
  const match = value.match(/<([^<>]+)>/);
  return (match?.[1] ?? value).trim().toLowerCase();
}

export type BillingEmailIdentityReport = {
  transportSelected: "resend" | "infomaniak_smtp";
  resendApiKeyConfigured: boolean;
  billingEncryptionKeyConfigured: boolean;
  emailFromConfigured: boolean;
  emailFromValue: string | null;
  billingEmailFromConfigured: boolean;
  billingEmailFromValue: string | null;
  billingReplyToConfigured: boolean;
  billingReplyToValue: string | null;
  resolvedFrom: string;
  resolvedReplyTo: string | null;
  billingFromDomainVerified: boolean | "UNKNOWN";
  smtp: {
    hostConfigured: boolean;
    portConfigured: boolean;
    userConfigured: boolean;
    passwordConfigured: boolean;
    encryptionConfigured: boolean;
    encryption: string | null;
  };
  testDeliveryEnabled: boolean;
  testRecipientConfigured: boolean;
};

export async function buildBillingEmailIdentityReport(): Promise<BillingEmailIdentityReport> {
  const transportSelected = getSelectedBillingEmailTransport();
  const emailFrom = process.env.EMAIL_FROM?.trim() || null;
  const billingEmailFrom = process.env.BILLING_EMAIL_FROM?.trim() || null;
  const billingReplyTo =
    process.env.BILLING_REPLY_TO?.trim() ||
    process.env.BILLING_REPLY_TO_EMAIL?.trim() ||
    "billing@sportclubevo.com";

  const runtime = getRuntimeEnvironment();
  const smtpReadiness = getBillingSmtpConfigReadiness();

  let identity: { from: string; replyTo: string | undefined };
  let billingFromDomainVerified: boolean | "UNKNOWN";

  if (transportSelected === "infomaniak_smtp") {
    identity = resolveBillingFromAndReplyToFromEnv();
    billingFromDomainVerified = "UNKNOWN";
  } else {
    identity = await resolveBillingEmailIdentity();
    const billingFromCandidate =
      billingEmailFrom ?? "SportClubEvo Billing <billing@sportclubevo.com>";
    const billingAddress = extractEmailAddress(billingFromCandidate);
    const authorization = await getSenderDomainAuthorization(billingAddress);
    billingFromDomainVerified =
      authorization === "VERIFIED"
        ? true
        : authorization === "NOT_VERIFIED"
          ? false
          : "UNKNOWN";
  }

  return {
    transportSelected,
    resendApiKeyConfigured: Boolean(process.env.RESEND_API_KEY?.trim()),
    billingEncryptionKeyConfigured: runtime.hasBillingEncryptionKey,
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
    billingFromDomainVerified,
    smtp: {
      hostConfigured: smtpReadiness.hostConfigured,
      portConfigured: smtpReadiness.portConfigured,
      userConfigured: smtpReadiness.userConfigured,
      passwordConfigured: smtpReadiness.passwordConfigured,
      encryptionConfigured: smtpReadiness.encryptionConfigured,
      encryption: smtpReadiness.encryption,
    },
    testDeliveryEnabled: isBillingTestDeliveryEnabled(),
    testRecipientConfigured: getBillingTestRecipientConfigured(),
  };
}
