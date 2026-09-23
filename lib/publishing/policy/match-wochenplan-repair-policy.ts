/**
 * Idempotent repair eligibility for SFV HOME matches stuck with
 * wochenplanVisible=false from the pre-HOTFIX-WOCHENPLAN-01 import default.
 *
 * There is no persisted "explicit override" flag on Event rows. This policy
 * uses conservative heuristics only — operators must review skipped rows.
 */

import { normalizeMatchHomeAway } from "./match-publication-defaults";

export type WochenplanRepairCandidate = {
  type: string;
  source: string;
  homeAway: string | null;
  wochenplanVisible: boolean;
  infoboardVisible: boolean;
};

export type WochenplanRepairDecision = {
  eligible: boolean;
  reason:
    | "ELIGIBLE_BROKEN_HOME_DEFAULT"
    | "NOT_SFV_MATCH"
    | "ALREADY_WOCHENPLAN_ON"
    | "AWAY_UNCHANGED"
    | "AWAY_WOCHENPLAN_ON_MANUAL_OVERRIDE"
    | "HOME_AWAY_UNKNOWN"
    | "HOME_INFOBOARD_OFF_POTENTIAL_MANUAL";
};

export function evaluateSfvHomeWochenplanRepair(
  event: WochenplanRepairCandidate,
): WochenplanRepairDecision {
  if (event.type !== "MATCH" || event.source !== "SFV") {
    return { eligible: false, reason: "NOT_SFV_MATCH" };
  }

  const side = normalizeMatchHomeAway(event.homeAway);

  if (side === "AWAY") {
    if (event.wochenplanVisible) {
      return { eligible: false, reason: "AWAY_WOCHENPLAN_ON_MANUAL_OVERRIDE" };
    }
    return { eligible: false, reason: "AWAY_UNCHANGED" };
  }

  if (side !== "HOME") {
    return { eligible: false, reason: "HOME_AWAY_UNKNOWN" };
  }

  if (event.wochenplanVisible) {
    return { eligible: false, reason: "ALREADY_WOCHENPLAN_ON" };
  }

  if (!event.infoboardVisible) {
    return { eligible: false, reason: "HOME_INFOBOARD_OFF_POTENTIAL_MANUAL" };
  }

  return { eligible: true, reason: "ELIGIBLE_BROKEN_HOME_DEFAULT" };
}
