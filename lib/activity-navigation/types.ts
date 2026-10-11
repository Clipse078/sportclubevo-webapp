/**
 * SCE-ACTIVITY-NAV-01 — shared activity detail navigation types.
 */

export type ActivityNavigationKind = "TRAINING" | "MATCH" | "TOURNAMENT" | "CLUB_EVENT";

/** Stable tab keys used in URLs (`?tab=`) and configuration. */
export type ActivityTabKey =
  | "uebersicht"
  | "teilnahme"
  | "aufgebot"
  | "planung"
  | "spielbetrieb"
  | "kommunikation"
  | "mehr";

export type ActivityTabDefinition = {
  key: ActivityTabKey;
  label: string;
  /** Primary row vs overflow (Mehr dropdown). */
  placement: "primary" | "overflow";
  /** When false, tab is omitted from navigation entirely. */
  visible?: boolean;
  /** Optional future badge/count (not rendered unless provided). */
  count?: number | string | null;
};

export type ActivityTabNavigationConfig = {
  kind: ActivityNavigationKind;
  defaultTab: ActivityTabKey;
  tabs: ActivityTabDefinition[];
};
