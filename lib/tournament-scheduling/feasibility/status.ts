export type TournamentFeasibilityStatus =
  | "FEASIBLE"
  | "TIGHT"
  | "INFEASIBLE"
  /** Structural checks passed; complete proof skipped or candidate grid too large (not invalid tournament). */
  | "UNRESOLVED";
