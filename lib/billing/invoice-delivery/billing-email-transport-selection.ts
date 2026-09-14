export type BillingEmailTransportKind = "resend" | "infomaniak_smtp";

const INFOMANIAK_SMTP_TRANSPORT = "infomaniak_smtp";

export function getSelectedBillingEmailTransport(): BillingEmailTransportKind {
  const raw = process.env.BILLING_EMAIL_TRANSPORT?.trim().toLowerCase();
  if (raw === INFOMANIAK_SMTP_TRANSPORT) {
    return "infomaniak_smtp";
  }
  return "resend";
}

export function isInfomaniakBillingSmtpTransportSelected(): boolean {
  return getSelectedBillingEmailTransport() === "infomaniak_smtp";
}
