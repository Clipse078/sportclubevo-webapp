import type { FinanceManagementReportingDetailReadModel } from "@/lib/finance/reporting/finance-management-reporting-detail-read-model";

export type SerializedFinanceManagementReportingDetailReadModel = Omit<
  FinanceManagementReportingDetailReadModel,
  "archivedAt" | "actualCutoffDate" | "actualEvidence"
> & {
  archivedAt: string | null;
  actualCutoffDate: string | null;
  actualEvidence: {
    availability: FinanceManagementReportingDetailReadModel["actualEvidence"]["availability"];
    entries: Array<
      Omit<FinanceManagementReportingDetailReadModel["actualEvidence"]["entries"][number], "effectiveDate"> & {
        effectiveDate: string;
      }
    >;
  };
};

export function serializeFinanceManagementReportingDetailReadModel(
  model: FinanceManagementReportingDetailReadModel,
): SerializedFinanceManagementReportingDetailReadModel {
  return {
    ...model,
    archivedAt: model.archivedAt?.toISOString() ?? null,
    actualCutoffDate: model.actualCutoffDate?.toISOString() ?? null,
    actualEvidence: {
      availability: model.actualEvidence.availability,
      entries: model.actualEvidence.entries.map((entry) => ({
        ...entry,
        effectiveDate: entry.effectiveDate.toISOString(),
      })),
    },
  };
}
