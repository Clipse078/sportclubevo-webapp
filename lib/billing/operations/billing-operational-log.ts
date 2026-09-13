import { resolveRuntimeIdentity } from "@/lib/server/runtime-identity";

export type BillingOperationalEvent =
  | "billing.reconciliation.import.started"
  | "billing.reconciliation.import.completed"
  | "billing.reconciliation.transaction.matched"
  | "billing.reconciliation.transaction.review_required"
  | "billing.payment.created";

export function logBillingOperationalEvent(
  event: BillingOperationalEvent,
  fields: {
    legalEntityKey: string;
    importKey?: string | null;
    transactionKey?: string | null;
    invoiceNumber?: string | null;
    amountMinor?: number | null;
    currency?: string | null;
    matchMethod?: string | null;
  },
): void {
  const runtime = resolveRuntimeIdentity();
  console.info(
    JSON.stringify({
      event,
      environment: runtime.deploymentEnvironment,
      dataEnvironment: runtime.dataEnvironment,
      legalEntityKey: fields.legalEntityKey,
      importKey: fields.importKey ?? null,
      transactionKey: fields.transactionKey ?? null,
      invoiceNumber: fields.invoiceNumber ?? null,
      amountMinor: fields.amountMinor ?? null,
      currency: fields.currency ?? null,
      matchMethod: fields.matchMethod ?? null,
    }),
  );
}
