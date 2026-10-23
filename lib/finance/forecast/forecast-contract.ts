/** FIN-04A — explicit annual grain; no implicit monthly/quarterly phasing. */
export const FORECAST_PHASING_SUPPORTED = false as const;

export type ForecastCreationMode = "EMPTY" | "FROM_BASELINE";
