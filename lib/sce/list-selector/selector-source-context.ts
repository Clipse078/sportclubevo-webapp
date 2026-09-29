import type { SceSelectorAuthorizationContext } from "@/lib/sce/list-selector/selector-authorization-context";

/** Source-provider hint derived from feature authorization (not send scope). */
export type SceSelectorSourceContext = "DIRECT" | "ORGANISATION" | "TARGET_GROUP_MANAGEMENT";

export function selectorAuthorizationContextToSourceContext(
  context: SceSelectorAuthorizationContext | "DIRECT_MESSAGE",
): SceSelectorSourceContext {
  if (context === "DIRECT_MESSAGE") return "DIRECT";
  if (context === "TARGET_GROUP_MANAGEMENT") return "TARGET_GROUP_MANAGEMENT";
  return "ORGANISATION";
}
