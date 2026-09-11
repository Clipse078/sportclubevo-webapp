import type {
  BillingContractStatus,
  BillingInterval,
  InvoiceStatus,
  SwissVatTreatment,
} from "@prisma/client";
import type { BillingStatusTone } from "./billing-status-presentation";

export type NativeBillingStatusPresentation = {
  label: string;
  tone: BillingStatusTone;
};

const NATIVE_INVOICE_STATUS: Record<InvoiceStatus, NativeBillingStatusPresentation> = {
  DRAFT: { label: "Entwurf", tone: "muted" },
  FINALIZED: { label: "Finalisiert", tone: "default" },
  OPEN: { label: "Offen", tone: "warning" },
  PARTIALLY_PAID: { label: "Teilweise bezahlt", tone: "warning" },
  PAID: { label: "Bezahlt", tone: "success" },
  OVERDUE: { label: "Überfällig", tone: "warning" },
  VOID: { label: "Storniert", tone: "muted" },
  CREDITED: { label: "Gutgeschrieben", tone: "muted" },
};

const BILLING_CONTRACT_STATUS: Record<BillingContractStatus, NativeBillingStatusPresentation> = {
  DRAFT: { label: "Entwurf", tone: "muted" },
  ACTIVE: { label: "Aktiv", tone: "success" },
  PAUSED: { label: "Pausiert", tone: "default" },
  TERMINATED: { label: "Beendet", tone: "muted" },
};

const SWISS_VAT_TREATMENT_LABELS: Record<SwissVatTreatment, string> = {
  STANDARD_81: "MWST 8.1 %",
};

const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  MONTHLY: "Monatlich",
};

function normalizeDomainEnumKey(value: string): string {
  return value.trim().toUpperCase().replace(/-/g, "_");
}

export function presentNativeInvoiceStatus(
  status: InvoiceStatus | string | null | undefined,
): NativeBillingStatusPresentation {
  if (!status) {
    return { label: "Unbekannt", tone: "muted" };
  }
  const key = normalizeDomainEnumKey(String(status)) as InvoiceStatus;
  return (
    NATIVE_INVOICE_STATUS[key] ?? {
      label: "Unbekannt",
      tone: "muted",
    }
  );
}

export function presentBillingContractStatus(
  status: BillingContractStatus | string | null | undefined,
): NativeBillingStatusPresentation {
  if (!status) {
    return { label: "Unbekannt", tone: "muted" };
  }
  const key = normalizeDomainEnumKey(String(status)) as BillingContractStatus;
  return (
    BILLING_CONTRACT_STATUS[key] ?? {
      label: "Unbekannt",
      tone: "muted",
    }
  );
}

export function presentSwissVatTreatment(
  treatment: SwissVatTreatment | string | null | undefined,
): string {
  if (!treatment) {
    return "—";
  }
  const key = normalizeDomainEnumKey(String(treatment)) as SwissVatTreatment;
  return SWISS_VAT_TREATMENT_LABELS[key] ?? "Unbekannt";
}

export function presentBillingInterval(
  interval: BillingInterval | string | null | undefined,
): string {
  if (!interval) {
    return "—";
  }
  const key = normalizeDomainEnumKey(String(interval)) as BillingInterval;
  return BILLING_INTERVAL_LABELS[key] ?? "Unbekannt";
}

export function presentInvoiceDisplayNumber(
  invoiceNumber: string | null | undefined,
  status?: InvoiceStatus | string | null,
): string {
  const trimmed = invoiceNumber?.trim();
  if (trimmed) {
    return trimmed;
  }
  const normalizedStatus =
    status != null ? normalizeDomainEnumKey(String(status)) : null;
  if (normalizedStatus === "DRAFT" || normalizedStatus == null) {
    return "Entwurf";
  }
  return "Noch keine Rechnungsnummer";
}

export function formatBillingDateDisplay(
  value: Date | string | null | undefined,
): string {
  if (!value) {
    return "—";
  }
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatBillingPeriodDisplay(
  periodStart: Date | string,
  periodEnd: Date | string,
): string {
  return `${formatBillingDateDisplay(periodStart)} – ${formatBillingDateDisplay(periodEnd)}`;
}

/** @internal Exported for exhaustive mapping tests. */
export const NATIVE_INVOICE_STATUS_KEYS = Object.keys(
  NATIVE_INVOICE_STATUS,
) as InvoiceStatus[];

/** @internal Exported for exhaustive mapping tests. */
export const BILLING_CONTRACT_STATUS_KEYS = Object.keys(
  BILLING_CONTRACT_STATUS,
) as BillingContractStatus[];

/** @internal Exported for exhaustive mapping tests. */
export const SWISS_VAT_TREATMENT_KEYS = Object.keys(
  SWISS_VAT_TREATMENT_LABELS,
) as SwissVatTreatment[];
