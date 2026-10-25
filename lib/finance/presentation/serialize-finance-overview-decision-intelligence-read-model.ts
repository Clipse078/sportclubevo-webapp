import type { FinanceOverviewDecisionIntelligenceReadModel } from "@/lib/finance/reporting/finance-overview-decision-intelligence-read-model";
import type { FinanceForecastTimingVisualModel } from "@/lib/finance/forecast/finance-forecast-timing-visual-types";
import type { FinanceVarianceDriver } from "@/lib/finance/reporting/reporting-contribution-analysis";
import type { FinanceManagementOverviewReadModel } from "@/lib/finance/reporting/finance-management-overview-read-model";

export type SerializedFinanceVarianceDriver = Omit<FinanceVarianceDriver, "comparison"> & {
  comparison: FinanceVarianceDriver["comparison"];
};

export type SerializedFinanceOverviewDecisionIntelligenceReadModel = {
  management: Omit<FinanceManagementOverviewReadModel, "actualCutoffDate"> & {
    actualCutoffDateIso: string | null;
  };
  conclusion: FinanceOverviewDecisionIntelligenceReadModel["conclusion"];
  drivers: {
    favourable: SerializedFinanceVarianceDriver[];
    unfavourable: SerializedFinanceVarianceDriver[];
    maxPerSide: number;
  };
  attentionItems: FinanceOverviewDecisionIntelligenceReadModel["attentionItems"];
  expectedMovement: Omit<
    FinanceOverviewDecisionIntelligenceReadModel["expectedMovement"],
    "visualModel"
  > & {
    visualModel: FinanceForecastTimingVisualModel | null;
  };
  capabilities: FinanceOverviewDecisionIntelligenceReadModel["capabilities"];
};

function serializeDriver(driver: FinanceVarianceDriver): SerializedFinanceVarianceDriver {
  return { ...driver };
}

export function serializeFinanceOverviewDecisionIntelligenceReadModel(
  model: FinanceOverviewDecisionIntelligenceReadModel,
): SerializedFinanceOverviewDecisionIntelligenceReadModel {
  return {
    management: {
      ...model.management,
      actualCutoffDateIso: model.management.actualCutoffDate
        ? model.management.actualCutoffDate.toISOString().slice(0, 10)
        : null,
    },
    conclusion: model.conclusion,
    drivers: {
      favourable: model.drivers.favourable.map(serializeDriver),
      unfavourable: model.drivers.unfavourable.map(serializeDriver),
      maxPerSide: model.drivers.maxPerSide,
    },
    attentionItems: model.attentionItems,
    expectedMovement: model.expectedMovement,
    capabilities: model.capabilities,
  };
}
