import type { FinancePublicationSummaryReadModel } from "@/lib/finance/services/finance-publication-query-service";

export type SerializedFinancePublicationSummaryReadModel = FinancePublicationSummaryReadModel;

export function serializeFinancePublicationSummaryReadModel(
  summary: FinancePublicationSummaryReadModel,
): SerializedFinancePublicationSummaryReadModel {
  return structuredClone(summary);
}
