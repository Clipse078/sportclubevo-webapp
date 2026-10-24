import type { ForecastRevisionReason } from "@/lib/finance/forecast/forecast-revision-reason";
import type { ForecastRevisionSource } from "@/lib/finance/forecast/rolling-forecast-architecture-contract";

/**
 * Internal persistence input for a formal forecast revision (FIN-04C-02).
 * Tenant-facing mutation wiring belongs in FIN-04C-03.
 */
export type PersistFormalForecastRevisionInput = {
  tenantId: string;
  financeYearId: string;
  expectedCurrentForecastVersionId: string;
  asOfDate: string;
  actualsThroughDate: string;
  revisionSource: ForecastRevisionSource;
  revisionLabel?: string | null;
  revisionReason?: ForecastRevisionReason | null;
  revisionContext?: string | null;
  note?: string | null;
  sourceProjectionVersionId?: string | null;
  previousVersionId?: string | null;
  createdByUserId?: string | null;
};

export type FormalForecastRevisionResult = {
  forecastId: string;
  supersededVersionId: string;
  newCurrentVersionId: string;
  newVersionNumber: number;
};
