/**
 * SCE-ACTIVITY-NAV-01 — activity detail navigation types (01B: extends generic context tabs).
 */

import type {
  ContextTabDefinition,
  ContextTabNavigationConfig,
} from "@/lib/context-tabs/types";

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

export type ActivityTabDefinition = ContextTabDefinition<ActivityTabKey>;

export type ActivityTabNavigationConfig = ContextTabNavigationConfig<ActivityTabKey> & {
  kind: ActivityNavigationKind;
};
