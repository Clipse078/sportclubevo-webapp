import type { InvoiceDeliveryAggregateStatus } from "./invoice-delivery-types";

export function presentInvoiceDeliveryAggregateStatus(
  status: InvoiceDeliveryAggregateStatus,
): { label: string } {
  switch (status) {
    case "NOT_SENT":
      return { label: "Noch nicht gesendet" };
    case "SENDING":
      return { label: "Wird gesendet" };
    case "SENT":
      return { label: "Gesendet" };
    case "FAILED":
      return { label: "Fehlgeschlagen" };
    default:
      return { label: status };
  }
}
