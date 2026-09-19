import { z } from "zod";
import { NativeBillingValidationError } from "@/lib/billing/native-billing-types";

const MAX_RECIPIENT_COUNT = 15;

const emailSchema = z.string().email();

export function extractEmailAddress(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^<>]+)>/);
  return (match?.[1] ?? trimmed).trim().toLowerCase();
}

export function normalizeRecipientInput(values: string[] | undefined): string[] {
  if (!values?.length) {
    return [];
  }
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    if (/[\r\n]/.test(raw)) {
      throw new NativeBillingValidationError("Ungültige Empfängerangabe.");
    }
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const address = extractEmailAddress(trimmed);
    const parsed = emailSchema.safeParse(address);
    if (!parsed.success) {
      throw new NativeBillingValidationError(`Ungültige E-Mail-Adresse: ${trimmed}`);
    }
    const key = parsed.data.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(parsed.data);
  }
  return normalized;
}

export function validateBillingCommunicationRecipients(input: {
  to: string[];
  cc?: string[];
}): { to: string[]; cc: string[] } {
  const to = normalizeRecipientInput(input.to);
  const cc = normalizeRecipientInput(input.cc);
  if (to.length === 0) {
    throw new NativeBillingValidationError("Mindestens ein gültiger Empfänger (An) ist erforderlich.");
  }
  const total = new Set([...to, ...cc]);
  if (total.size > MAX_RECIPIENT_COUNT) {
    throw new NativeBillingValidationError("Zu viele Empfänger.");
  }
  const ccWithoutTo = cc.filter((address) => !to.includes(address));
  return { to, cc: ccWithoutTo };
}

export function assertNoHeaderInjection(value: string, fieldLabel: string): string {
  const trimmed = value.trim();
  if (/[\r\n]/.test(trimmed)) {
    throw new NativeBillingValidationError(`Ungültige Eingabe (${fieldLabel}).`);
  }
  return trimmed;
}

export function joinRecipientListForTransport(addresses: string[]): string {
  return addresses.join(", ");
}
