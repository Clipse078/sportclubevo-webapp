/**
 * FIN-04B automatic forecast — presentation-only money formatting.
 * Domain calculations persist full minor-unit precision; UI uses whole currency units.
 */

export {
  AUTOMATIC_FORECAST_PRESENTATION_PRECISION,
  formatFinanceAutomaticForecastMoneyMinor,
  formatFinanceAutomaticForecastSignedMinor,
  formatFinanceAutomaticForecastSignedWholeMajorNumber,
  formatFinanceAutomaticForecastWholeMajorNumber,
  roundAmountMinorToWholeMajorPresentation,
} from "@/lib/finance/presentation/finance-money-presentation";
