import type {
  BillingCommunicationDirection,
  BillingCommunicationStatus,
  InvoiceDeliveryStatus,
} from "@prisma/client";

export function presentBillingCommunicationDirection(
  direction: BillingCommunicationDirection,
): { label: string; isOutbound: boolean } {
  if (direction === "OUTBOUND") {
    return { label: "Ausgehend", isOutbound: true };
  }
  return { label: "Eingehend", isOutbound: false };
}

export function presentBillingCommunicationStatus(
  status: BillingCommunicationStatus,
): { label: string; tone: "default" | "success" | "warning" | "muted" } {
  switch (status) {
    case "PENDING":
      return { label: "Ausstehend", tone: "muted" };
    case "SENT":
      return { label: "Gesendet", tone: "success" };
    case "RECEIVED":
      return { label: "Empfangen", tone: "success" };
    case "FAILED":
      return { label: "Fehlgeschlagen", tone: "warning" };
    default:
      return { label: "Unbekannt", tone: "default" };
  }
}

export function presentInvoiceDeliveryStatusForTimeline(
  status: InvoiceDeliveryStatus,
): { label: string; tone: "default" | "success" | "warning" | "muted" } {
  switch (status) {
    case "SENDING":
      return { label: "Versand ausstehend", tone: "muted" };
    case "SENT":
      return { label: "Versand erfolgreich", tone: "success" };
    case "FAILED":
      return { label: "Versand fehlgeschlagen", tone: "warning" };
    default:
      return { label: "Versand", tone: "default" };
  }
}

export function formatBillingCommunicationDateTime(iso: string | Date | null): string {
  if (!iso) return "—";
  const date = iso instanceof Date ? iso : new Date(iso);
  return new Intl.DateTimeFormat("de-CH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
