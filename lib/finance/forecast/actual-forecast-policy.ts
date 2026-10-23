/**
 * FIN-04A — partial-year actual must not be semantically compared to full-year forecast.
 * Contextual YTD reference is allowed; favorability / Abweichung labels are not.
 */
export type ActualVersusAnnualForecastPresentation = {
  actualYtdMinor: number | null;
  annualForecastMinor: number | null;
  mayShowActualYtdReference: boolean;
  mayShowVarianceLabels: false;
  favorability: null;
  rawDeltaMinor: null;
};

export function resolveActualVersusAnnualForecastPresentation(input: {
  actualYtdMinor: number | null;
  annualForecastMinor: number | null;
}): ActualVersusAnnualForecastPresentation {
  return {
    actualYtdMinor: input.actualYtdMinor,
    annualForecastMinor: input.annualForecastMinor,
    mayShowActualYtdReference:
      input.actualYtdMinor !== null && input.annualForecastMinor !== null,
    mayShowVarianceLabels: false,
    favorability: null,
    rawDeltaMinor: null,
  };
}
