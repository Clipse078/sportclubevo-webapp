import {
  buildAufgabenBereichHref,
  buildPersonalInboxFilterHref,
  parsePersonalInboxFilter,
} from "@/lib/personal-actions/aufgaben-scope";
import { requirementPersonalExecutionHref as requirementPersonalExecutionHrefFromNotifications } from "@/lib/notifications/deduplication";

/** Personal execution surface for a RequirementRecipient (not management). */
export function personalRequirementExecutionHref(recipientId: string): string {
  return requirementPersonalExecutionHrefFromNotifications(recipientId);
}

export function buildPersonalRequirementReturnHref(
  searchParams: Record<string, string | undefined>,
  basePath = "/dashboard/aufgaben",
): string {
  const filter = parsePersonalInboxFilter(searchParams.filter);
  if (filter !== "all") {
    return buildPersonalInboxFilterHref(filter, basePath);
  }
  return buildAufgabenBereichHref("meine", basePath);
}
