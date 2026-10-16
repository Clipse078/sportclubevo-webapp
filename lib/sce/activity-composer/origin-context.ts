/** Where activity creation was initiated — transient, not persisted (01G integrates restoration). */
export type SceActivityCreateOriginKind =
  | "PLANNING_SURFACE"
  | "TEAM_PROGRAMME"
  | "QUICK_ACTION"
  | "DIRECT_ROUTE"
  | "DASHBOARD";

export type SceActivityCreateOriginContext = {
  kind: SceActivityCreateOriginKind;
  pathname?: string;
  searchParams?: Record<string, string>;
  /** Planning context when supplied by host surface. */
  selectedWeek?: string;
  selectedDate?: string;
  selectedMonth?: string;
  teamId?: string;
  seasonId?: string;
};
