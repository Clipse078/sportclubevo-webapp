/**
 * SCE-COMM-03 — Stage E: communication preferences seam (COMM-17 deferred).
 */

import type { CommunicationChannel } from "@/lib/communication/platform/channels";
import type { CommunicationPreferenceCategory } from "@/lib/communication/platform/preference-categories";

export type PreferenceEvaluationMode = "DEFERRED_DEFAULT_ALLOW" | "EVALUATED";

/**
 * Until COMM-17 persistence exists, operational/informational categories default
 * to allowed; sponsor commercial still respects category/channel matrix only.
 */
export function evaluateCommunicationPreferenceSeam(input: {
  category: CommunicationPreferenceCategory;
  channel: CommunicationChannel;
}): { allowed: boolean; mode: PreferenceEvaluationMode } {
  void input;
  return { allowed: true, mode: "DEFERRED_DEFAULT_ALLOW" };
}
